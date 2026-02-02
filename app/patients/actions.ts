"use server";

import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js"; 

// 🛠️ HELPER: ID GENERATOR
async function generateReadableId(type: 'patient' | 'opd' | 'ipd') {
  const counterName = type === 'patient' ? 'patient' : (type === 'opd' ? 'appointment_opd' : 'appointment_ipd');
  const prefix = type === 'patient' ? 'RA-' : (type === 'opd' ? 'RAOPD' : 'RAIPD');
  
  try {
    const counter = await db.counter.upsert({
      where: { name: counterName },
      update: { value: { increment: 1 } },
      create: { name: counterName, value: 663 } 
    });
    return `${prefix}${counter.value.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error("ID Gen Error:", error);
    return `${prefix}${Date.now().toString().slice(-4)}`;
  }
}

// 1. Fetch Patient Details & Consultations
export async function getPatientData(patientId: string) {
  try {
    const patient = await db.patient.findUnique({
      where: { id: patientId },
      include: {
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

// 2. Search Patients (Updated to include Today's Appointment)
export async function searchPatients(query: string) {
  if (!query) return [];
  
  // ✅ FIX: Use IST Date to ensure we get the correct "Today"
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  const today = istDate.toISOString().split('T')[0];

  const patients = await db.patient.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query } },
        { readableId: { contains: query, mode: 'insensitive' } }
      ]
    },
    take: 5,
    select: { 
        id: true, 
        name: true, 
        phone: true, 
        readableId: true, 
        walletBalance: true,
        // ✅ Fetch active appointment for today
        appointments: {
            where: {
                date: today,
                status: "SCHEDULED"
            },
            select: {
                readableId: true
            }
        }
    } 
  });
  
  return patients;
}

// 3. Get Medicine Inventory
export async function getPharmacyInventory() {
  const medicines = await db.medicine.findMany({
    where: { stock: { gt: 0 } },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, stock: true, type: true, price: true } 
  });
  return medicines;
}

// ✅ NEW: Main Get Patients List (Updated for Table View)
export async function getPatients(query?: string) {
  try {
    const where: any = {};
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query } },
        { readableId: { contains: query, mode: 'insensitive' } }
      ];
    }

    // ✅ FIX: Use IST Date
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    const today = istDate.toISOString().split('T')[0];

    return await db.patient.findMany({ 
        where, 
        orderBy: { updatedAt: 'desc' }, 
        take: 50,
        include: {
            // ✅ Include Today's Scheduled Appointment
            appointments: {
                where: {
                    date: today,
                    status: "SCHEDULED"
                },
                select: {
                    readableId: true
                },
                take: 1
            }
        }
    });
  } catch (error) { return []; }
}

// 4. Update Patient Details
export async function updatePatientDetails(id: string, data: any) {
  try {
    await db.patient.update({
      where: { id },
      data: {
        name: data.name,
        age: parseInt(data.age) || undefined, 
        gender: data.gender,
        phone: data.phone,
        bloodGroup: data.bloodGroup,
        prakriti: data.prakriti,
        initialWeight: data.initialWeight,
        currentWeight: data.currentWeight,
        history: data.history, 
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
    const today = new Date().toISOString().split('T')[0];
    let finalAppointmentId = visitData.appointmentId;

    // ✅ FIX: Resolve Readable ID (e.g., RAOPD1201) to UUID
    // This prevents the P2025 error when the URL passes a string ID
    if (finalAppointmentId && typeof finalAppointmentId === 'string' && finalAppointmentId.startsWith('RA')) {
        const appointmentObj = await db.appointment.findUnique({ 
            where: { readableId: finalAppointmentId } 
        });
        // If found, use the UUID. If not, set to null so the code creates a new one below.
        finalAppointmentId = appointmentObj ? appointmentObj.id : null;
    }

    // A. Handle Guest
    if (patientId === "GUEST") {
        let guest = await db.patient.findFirst({ where: { phone: "9999999999" } });
        if (!guest) {
            guest = await db.patient.create({
                data: { readableId: "GUEST", name: "Guest Patient", phone: "9999999999", age: 0, gender: "Unknown", walletBalance: 0 }
            });
        }
        patientId = guest.id;
    }

    // B. Ensure Appointment Exists (For Fee Status)
    if (!finalAppointmentId) {
        const existing = await db.appointment.findFirst({ where: { patientId, date: today, status: "SCHEDULED" } });
        if (existing) finalAppointmentId = existing.id;
    }

    // If still no appointment (Ad-hoc visit), create "Walk-in"
    if (!finalAppointmentId && visitData.doctorName !== "Pharmacy Direct Sale") {
        const p = await db.patient.findUnique({ where: { id: patientId } });
        const readableId = await generateReadableId('opd');
        const newAppt = await db.appointment.create({
            data: {
                readableId,
                date: today,
                startTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                endTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                type: "Walk-in",
                patientName: p?.name || "Unknown",
                phone: p?.phone || "",
                doctor: visitData.doctorName || "Dr. Chirag Raval",
                status: "COMPLETED",
                patientId: patientId,
                fee: 500,
                discount: 0
            }
        });
        finalAppointmentId = newAppt.id;
    }

    const apptDiscount = Number(visitData.appointmentDiscount ?? 0); 
    const pharmacyDiscount = Number(visitData.discount ?? 0); 
    const paidAmount = Number(visitData.paidAmount ?? 0);
    const paymentMode = visitData.paymentMode || "Cash";

    // ❌ REMOVED: Auto-calculation of wallet delta. 
    // The wallet will NOT be updated automatically based on this transaction.

    // D. Database Operations (Transaction)
    await db.$transaction(async (tx) => {
        
        // 1. Update Appointment Fee Status (Only if we have a valid ID)
        if (finalAppointmentId) {
            const aptExists = await tx.appointment.findUnique({ where: { id: finalAppointmentId } });
            if (aptExists) {
                await tx.appointment.update({
                    where: { id: finalAppointmentId },
                    data: { status: "COMPLETED", discount: apptDiscount }
                });
            }
        }

        // 2. Create/Update Consultation
        let consultId = consultationId;
        
        if (consultId) {
            // Edit Mode
            await tx.prescriptionItem.deleteMany({ where: { prescription: { consultationId: consultId } } });
            await tx.consultation.update({
                where: { id: consultId },
                data: {
                    diagnosis: visitData.diagnosis,
                    notes: visitData.notes,
                    discount: pharmacyDiscount,
                    paidAmount: paidAmount,
                    paymentMode: paymentMode
                }
            });
        } else {
            // New Mode
            const newConsult = await tx.consultation.create({
                data: {
                    patientId,
                    doctorName: "Dr. Chirag Raval",
                    symptoms: visitData.diagnosis,
                    diagnosis: visitData.diagnosis,
                    notes: visitData.notes,
                    discount: pharmacyDiscount,
                    appointmentId: finalAppointmentId,
                    paidAmount: paidAmount,
                    paymentMode: paymentMode,
                    createdAt: new Date()
                }
            });
            consultId = newConsult.id;
        }

        // 3. Create Prescription Items
        let prescription = await tx.prescription.findFirst({ where: { consultationId: consultId } });
        if (!prescription) {
            prescription = await tx.prescription.create({ data: { consultationId: consultId! } });
        }

        if (visitData.prescriptions.length > 0) {
            await tx.prescriptionItem.createMany({
                data: visitData.prescriptions.map((p: any) => ({
                    prescriptionId: prescription!.id,
                    medicineId: p.medicineId,
                    dosage: p.dosage,
                    unit: p.unit,
                    duration: p.duration,
                    instruction: p.instruction,
                    panchkarma: p.panchkarma,
                    status: "PENDING"
                }))
            });
        }

        // ❌ REMOVED: The logic that updated tx.patient walletBalance is gone.
    });

    revalidatePath(`/patients/${patientId}`);
    revalidatePath(`/pharmacy`);
    return { success: true };

  } catch (error) {
    console.error("Save Error:", error);
    return { success: false, error: "Failed to save visit" };
  }
}

// 6. Delete Patient
export async function deletePatient(id: string) {
  try {
    await db.patient.delete({ where: { id } });
    revalidatePath('/patients');
    return { success: true };
  } catch (error) { return { success: false, error: "Failed to delete" }; }
}

// 7. Create Patient
export async function createPatient(data: any) {
  try {
    const readableId = await generateReadableId('patient');
    const newPatient = await db.patient.create({
      data: {
        readableId,
        name: data.name, phone: data.phone, age: parseInt(data.age) || 0,
        gender: data.gender, bloodGroup: data.bloodGroup, prakriti: data.prakriti,
        initialWeight: data.initialWeight, currentWeight: data.currentWeight, history: data.history,
        chiefComplaints: data.chiefComplaints, kco: data.kco, currentMedications: data.currentMedications,
        investigations: data.investigations, pastHistory: data.pastHistory, familyHistory: data.familyHistory,
        mentalGenerals: data.mentalGenerals, obsGynHistory: data.obsGynHistory, physicalGenerals: data.physicalGenerals,
        walletBalance: 0.0 
      }
    });
    revalidatePath('/patients');
    return { success: true, patient: newPatient }; 
  } catch (error) { return { success: false, error: "Failed to create patient" }; }
}

// 8. Update Patient
export async function updatePatient(id: string, data: any) {
  try {
    const ageVal = isNaN(parseInt(data.age)) ? undefined : parseInt(data.age);
    await db.patient.update({
      where: { id },
      data: {
        name: data.name, age: ageVal, gender: data.gender, phone: data.phone,
        bloodGroup: data.bloodGroup, prakriti: data.prakriti,
        initialWeight: data.initialWeight, currentWeight: data.currentWeight, history: data.history,
        chiefComplaints: data.chiefComplaints, kco: data.kco, currentMedications: data.currentMedications,
        investigations: data.investigations, pastHistory: data.pastHistory, familyHistory: data.familyHistory,
        mentalGenerals: data.mentalGenerals, obsGynHistory: data.obsGynHistory, physicalGenerals: data.physicalGenerals
      }
    });
    revalidatePath(`/patients/${id}`); revalidatePath('/patients');
    return { success: true };
  } catch (error) { return { success: false, error: "Update failed" }; }
}

// 9. Delete Consultation
export async function deleteVisit(consultationId: string, patientId: string) {
  try {
    await db.consultation.delete({ where: { id: consultationId } });
    revalidatePath(`/patients/${patientId}`);
  } catch (error) {
    console.error("Delete Error:", error);
  }
}

// 10. Upload Report Action
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

// ✅ Update Patient Wallet (This is now the ONLY way to update wallet)
export async function updatePatientWallet(patientId: string, amount: number, type: 'CREDIT' | 'DUE') {
  try {
    const numericAmount = parseFloat(amount.toString());
    if (isNaN(numericAmount) || numericAmount <= 0) return { success: false, error: "Invalid amount" };

    const adjustment = type === 'CREDIT' ? numericAmount : -numericAmount;

    await db.patient.update({
      where: { id: patientId },
      data: { walletBalance: { increment: adjustment } }
    });

    revalidatePath('/patients');
    revalidatePath(`/patients/${patientId}`);
    
    return { success: true };
  } catch (error) {
    console.error("Wallet Update Error:", error);
    return { success: false, error: "Failed to update wallet" };
  }
}