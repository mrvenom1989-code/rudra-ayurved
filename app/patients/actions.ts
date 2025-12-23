"use server";

import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js"; // 👈 Added for Storage

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
            prescriptions: {
              include: {
                items: {
                  include: { medicine: true } // Include Medicine details
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
        { phone: { contains: query } }
      ]
    },
    take: 5,
    select: { id: true, name: true, phone: true }
  });
  
  return patients;
}

// 3. Get Medicine Inventory
export async function getPharmacyInventory() {
  const medicines = await db.medicine.findMany({
    where: { stock: { gt: 0 } },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, stock: true }
  });
  return medicines;
}

// 4. Update Patient Details
export async function updatePatientDetails(id: string, data: any) {
  await db.patient.update({
    where: { id },
    data: {
      name: data.name,
      age: parseInt(data.age),
      gender: data.gender,
      phone: data.phone,
      history: data.history 
    }
  });
  revalidatePath(`/patients/${id}`);
}

// 5. SAVE CONSULTATION & PRESCRIPTION
export async function savePrescription(patientId: string, visitData: any) {
  try {
    // A. Create the Consultation
    const consultation = await db.consultation.create({
      data: {
        patientId,
        doctorName: "Dr. Chirag Raval", 
        symptoms: visitData.diagnosis, 
        diagnosis: visitData.diagnosis,
        createdAt: new Date(),
        
        // B. Create Prescription & Items
        prescriptions: {
          create: {
            items: {
              create: visitData.prescriptions.map((p: any) => ({
                medicineId: p.medicineId, // Needs valid ID from DB
                dosage: p.dosage,
                duration: p.duration,
                instruction: p.instruction,
                status: "PENDING" // Goes to Pharmacy Queue
              }))
            }
          }
        }
      }
    });

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
    // Note: Ensure your Prisma Schema has 'onDelete: Cascade' for relations
    // otherwise this might fail if prescriptions exist.
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

    // Initialize Supabase Client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Create unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${consultationId}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`; // Path inside the bucket

    // Upload to 'medical-reports' bucket
    const { error: uploadError } = await supabase.storage
      .from("medical-reports")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Supabase Upload Error:", uploadError);
      throw uploadError;
    }

    // Get Public URL
    const { data } = supabase.storage
      .from("medical-reports")
      .getPublicUrl(filePath);

    // Save URL to Database
    await db.consultation.update({
      where: { id: consultationId },
      data: { reportUrl: data.publicUrl }
    });

    // Determine patient ID to revalidate the correct page
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