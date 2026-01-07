"use server";

import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js"; 

// 1. Fetch Patient Details & Consultations
export async function getPatientData(patientId: string) {
  try {
    const patient = await db.patient.findUnique({
      where: { id: patientId },
      include: {
        // Fetch consultations (Visit History)
        consultations: {
          orderBy: { createdAt: 'desc' },
          include: {
            appointment: true,
            prescriptions: {
              include: {
                items: {
                  include: { medicine: true } 
                }
              }
            }
          }
        }
      }
    });
    return patient;
  } catch (error) {
    console.error("Error fetching patient:", error);
    return null;
  }
}

// 2. Search Patients
export async function searchPatients(query: string) {
  if (!query) return [];
  
  const patients = await db.patient.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query } },
        { readableId: { contains: query, mode: 'insensitive' } } // Added search by ID
      ]
    },
    take: 5,
    select: { id: true, name: true, phone: true, readableId: true } // ✅ Added readableId
  });
  
  return patients;
}

// 3. Get Medicine Inventory
export async function getPharmacyInventory() {
  const medicines = await db.medicine.findMany({
    where: { stock: { gt: 0 } },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, stock: true, type: true, price: true } // Added useful fields
  });
  return medicines;
}

// 4. Update Patient Details
export async function updatePatientDetails(id: string, data: any) {
  try {
    await db.patient.update({
      where: { id },
      data: {
        name: data.name,
        age: parseInt(data.age) || undefined, // Safety check for NaN
        gender: data.gender,
        phone: data.phone,
        bloodGroup: data.bloodGroup,
        prakriti: data.prakriti,
        
        // ✅ FIXED: Now saving Weight and New Medical Fields
        initialWeight: data.initialWeight,
        currentWeight: data.currentWeight,
        
        history: data.history, // Basic history
        
        // Extended Medical History
        chiefComplaints: data.chiefComplaints,
        kco: data.kco,
        currentMedications: data.currentMedications,
        investigations: data.investigations,
        pastHistory: data.pastHistory,
        familyHistory: data.familyHistory,
        mentalGenerals: data.mentalGenerals,
        obsGynHistory: data.obsGynHistory,
        physicalGenerals: data.physicalGenerals
      }
    });
    
    revalidatePath(`/patients/${id}`);
    return { success: true };
  } catch (error) {
    console.error("Update Error:", error);
    return { success: false, error: "Failed to update patient" };
  }
}

// 5. SAVE CONSULTATION & PRESCRIPTION
export async function savePrescription(patientId: string, visitData: any, consultationId?: string) {
  try {
    // If updating an existing visit (Edit Mode)
    if (consultationId) {
        // 1. Delete old items
        await db.prescriptionItem.deleteMany({
            where: { prescription: { consultationId } }
        });

        // 2. Update Consultation Details
        await db.consultation.update({
            where: { id: consultationId },
            data: {
                diagnosis: visitData.diagnosis,
                notes: visitData.notes,
                discount: visitData.discount
            }
        });

        // 3. Re-create Items
        const presc = await db.prescription.findFirst({ where: { consultationId } });
        if(presc) {
            await db.prescriptionItem.createMany({
                data: visitData.prescriptions.map((p: any) => ({
                    prescriptionId: presc.id,
                    medicineId: p.medicineId,
                    dosage: p.dosage,
                    unit: p.unit, // ✅ Added Unit
                    duration: p.duration,
                    instruction: p.instruction,
                    panchkarma: p.panchkarma, // ✅ Added Panchkarma
                    status: "PENDING"
                }))
            });
        }
        revalidatePath(`/patients/${patientId}`);
        return { success: true };
    }

    // A. Create NEW Consultation
    const consultation = await db.consultation.create({
      data: {
        patientId,
        doctorName: "Dr. Chirag Raval", 
        symptoms: visitData.diagnosis, // Map diagnosis to symptoms for search
        diagnosis: visitData.diagnosis,
        notes: visitData.notes,
        discount: visitData.discount,
        appointmentId: visitData.appointmentId || null,
        createdAt: new Date(),
        
        // B. Create Prescription & Items
        prescriptions: {
          create: {
            items: {
              create: visitData.prescriptions.map((p: any) => ({
                medicineId: p.medicineId, 
                dosage: p.dosage,
                unit: p.unit, // ✅ Added Unit
                duration: p.duration,
                instruction: p.instruction,
                panchkarma: p.panchkarma, // ✅ Added Panchkarma
                status: "PENDING" 
              }))
            }
          }
        }
      }
    });

    // Mark appointment as completed if linked
    if (visitData.appointmentId) {
        await db.appointment.update({
            where: { readableId: visitData.appointmentId },
            data: { status: "COMPLETED", discount: visitData.discount }
        }).catch(() => {}); // Ignore error if appointment ID is invalid/not found
    }

    revalidatePath(`/patients/${patientId}`);
    revalidatePath(`/pharmacy`);
    return { success: true };

  } catch (error) {
    console.error("Save Error:", error);
    return { success: false, error: "Failed to save visit" };
  }
}

// 6. Delete Consultation
export async function deleteVisit(consultationId: string, patientId: string) {
  try {
    await db.consultation.delete({ where: { id: consultationId } });
    revalidatePath(`/patients/${patientId}`);
  } catch (error) {
    console.error("Delete Error:", error);
  }
}

// 7. 🆕 UPLOAD REPORT ACTION
export async function uploadConsultationReport(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    const consultationId = formData.get("consultationId") as string;

    if (!file || !consultationId) return { success: false, error: "Missing file" };

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const fileExt = file.name.split('.').pop();
    const fileName = `${consultationId}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`; 

    const { error: uploadError } = await supabase.storage
      .from("medical-reports")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("medical-reports")
      .getPublicUrl(filePath);

    await db.consultation.update({
      where: { id: consultationId },
      data: { reportUrl: data.publicUrl }
    });

    const consultation = await db.consultation.findUnique({
        where: { id: consultationId },
        select: { patientId: true }
    });

    if (consultation) {
        revalidatePath(`/patients/${consultation.patientId}`);
    }
    
    return { success: true, url: data.publicUrl };

  } catch (error) {
    console.error("Upload Action Error:", error);
    return { success: false, error: "Upload failed" };
  }
}