"use server";

import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js"; 

// 🛠️ HELPER: ID GENERATOR (Added for Auto-Appointment Creation)
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
        { readableId: { contains: query, mode: 'insensitive' } }
      ]
    },
    take: 5,
    // ✅ ADDED walletBalance to selection
    select: { id: true, name: true, phone: true, readableId: true, walletBalance: true } 
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

// 5. SAVE CONSULTATION & PRESCRIPTION (Financial & Wallet Updates)
export async function savePrescription(patientId: string, visitData: any, consultationId?: string) {
  try {
    const today = new Date().toISOString().split('T')[0];
    let finalAppointmentId = visitData.appointmentId;

    // A. Handle Guest (Auto-create if needed)
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
    if (!finalAppointmentId) {
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

    // C. Financial Calculations (Wallet Logic)
    const apptDiscount = Number(visitData.appointmentDiscount ?? 0);
    const pharmacyDiscount = Number(visitData.discount ?? 0);
    const paidAmount = Number(visitData.paidAmount ?? 0);
    const paymentMode = visitData.paymentMode || "Cash";

    // Calculate Estimated Bill to update Wallet
    // (Fee + Medicine Prices - Discounts)
    let estimatedMedTotal = 0;
    if (visitData.prescriptions && visitData.prescriptions.length > 0) {
        const medIds = visitData.prescriptions.map((p: any) => p.medicineId);
        const meds = await db.medicine.findMany({ where: { id: { in: medIds } } });
        // Assume 1 unit per prescribed item for estimation
        visitData.prescriptions.forEach((p: any) => {
            const m = meds.find(x => x.id === p.medicineId);
            if(m) estimatedMedTotal += m.price;
        });
    }

    const consultationFee = apptDiscount >= 500 ? 0 : 500;
    const totalBill = consultationFee + estimatedMedTotal - pharmacyDiscount;
    
    // Only apply wallet logic for NEW visits to prevent double counting on edits
    let walletDelta = 0;
    if (!consultationId) {
        walletDelta = paidAmount - totalBill;
    }

    // D. Database Operations (Transaction)
    await db.$transaction(async (tx) => {
        
        // 1. Update Appointment Fee Status
        if (finalAppointmentId) {
            await tx.appointment.update({
                where: { id: finalAppointmentId },
                data: { status: "COMPLETED", discount: apptDiscount }
            });
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
                    paidAmount: paidAmount, // Update record
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
        // We need to fetch the prescription ID or create it
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

        // 4. Update Wallet (Only on new visits)
        if (walletDelta !== 0 && !consultationId) {
            await tx.patient.update({
                where: { id: patientId },
                data: { walletBalance: { increment: walletDelta } }
            });
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
    await db.consultation.delete({ where: { id: consultationId } });
    revalidatePath(`/patients/${patientId}`);
  } catch (error) {
    console.error("Delete Error:", error);
  }
}

// 7. Upload Report Action
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

// ✅ NEW: Update Patient Wallet Directly (Direct DB Update, NO Consultation created)
export async function updatePatientWallet(patientId: string, amount: number, type: 'CREDIT' | 'DUE') {
  try {
    const numericAmount = parseFloat(amount.toString());
    if (isNaN(numericAmount) || numericAmount <= 0) return { success: false, error: "Invalid amount" };

    // Credit = Advance (Positive)
    // Due = Debt (Negative)
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