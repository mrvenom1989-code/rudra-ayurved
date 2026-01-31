"use server";

import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSession, logout, getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

// ==========================================
// 🛠️ HELPER: SMART ID GENERATOR
// ==========================================
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

// ✅ HELPER: Get Role
export async function getCurrentUserRole() {
  const session = await getSession();
  return session?.role || "STAFF";
}

// ✅ HELPER: Parse Time for Validation
function parseTime(timeStr: string) {
    if (!timeStr) return 0;
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (hours === 12) hours = 0;
    if (modifier === 'PM') hours += 12;
    return hours * 60 + minutes;
}

// ==========================================
// 1. 🏥 PATIENT MANAGEMENT
// ==========================================

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
    return await db.patient.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 50 });
  } catch (error) { return []; }
}

export async function getPatientData(patientId: string) {
  try {
    return await db.patient.findUnique({
      where: { id: patientId },
      include: {
        consultations: {
          orderBy: { createdAt: 'desc' },
          include: {
            appointment: true, 
            prescriptions: { include: { items: { include: { medicine: true } } } }
          }
        }
      }
    });
  } catch (error) { return null; }
}

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
        walletBalance: 0.0 // ✅ Initialize Wallet
      }
    });
    revalidatePath('/patients');
    return { success: true, patient: newPatient }; 
  } catch (error) { return { success: false, error: "Failed to create patient" }; }
}

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

export async function deletePatient(id: string) {
  try {
    await db.patient.delete({ where: { id } });
    revalidatePath('/patients');
    return { success: true };
  } catch (error) { return { success: false, error: "Failed to delete" }; }
}

export async function searchPatients(query: string) {
  if (!query) return [];
  return await db.patient.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query } },
        { readableId: { contains: query, mode: 'insensitive' } }
      ]
    },
    take: 5,
    select: { id: true, name: true, phone: true, readableId: true, walletBalance: true }
  });
}

// ✅ NEW ACTION: Update Wallet (Credit / Due)
export async function updatePatientWallet(patientId: string, amount: number, type: 'CREDIT' | 'DUE') {
  try {
    const numericAmount = parseFloat(amount.toString());
    if (isNaN(numericAmount) || numericAmount <= 0) return { success: false, error: "Invalid amount" };

    // Credit = Add to balance (Positive is Advance)
    // Due = Subtract from balance (Negative is Due)
    const adjustment = type === 'CREDIT' ? numericAmount : -numericAmount;

    await db.patient.update({
      where: { id: patientId },
      data: { walletBalance: { increment: adjustment } }
    });

    revalidatePath('/patients');
    revalidatePath(`/patients/${patientId}`);
    revalidatePath('/pharmacy');
    
    return { success: true };
  } catch (error) {
    console.error("Wallet Update Error:", error);
    return { success: false, error: "Failed to update wallet" };
  }
}

// ==========================================
// 2. 📅 APPOINTMENT & CALENDAR
// ==========================================

export async function getAppointments(start?: string, end?: string) {
  try {
    const where: any = {};
    if (start && end) where.date = { gte: start, lte: end };
    return await db.appointment.findMany({ where, orderBy: { startTime: 'asc' } });
  } catch (error) { return []; }
}

export async function completeAppointment(id: string, discount: number = 0) {
  try {
    await db.appointment.update({
      where: { id },
      data: { status: "COMPLETED", discount: discount }
    });
    revalidatePath("/dashboard"); revalidatePath("/calendar");
    return { success: true };
  } catch (error) { return { success: false, error: "Failed to complete appointment" }; }
}

export async function markReminderSent(id: string) {
    try {
        await db.appointment.update({ where: { id }, data: { reminderSent: true } });
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) { return { success: false }; }
}

export async function createAppointment(data: any) {
  try {
    if (data.endTime && parseTime(data.startTime) >= parseTime(data.endTime)) {
       return { success: false, error: "End time must be after start time." };
    }
    const count = data.recurring?.count || 1; 
    const frequency = data.recurring?.frequency || 'daily';
    const customDates = data.recurring?.customDates || [];
    let targetDates: string[] = [];

    if (frequency === 'custom') {
        targetDates.push(data.date);
        if (Array.isArray(customDates)) {
            customDates.forEach((d: string) => { if (d && !targetDates.includes(d)) targetDates.push(d); });
        }
    } else {
        for (let i = 0; i < count; i++) {
            const dateObj = new Date(data.date);
            if (frequency === 'daily') dateObj.setDate(dateObj.getDate() + i);
            else if (frequency === 'weekly') dateObj.setDate(dateObj.getDate() + (i * 7));
            else if (frequency === 'biweekly') dateObj.setDate(dateObj.getDate() + (i * 14));
            else if (frequency === 'monthly') dateObj.setMonth(dateObj.getMonth() + i);
            targetDates.push(dateObj.toISOString().split('T')[0]);
        }
    }

    if (data.type !== "Unavailable") {
        for (const dateString of targetDates) {
            const conflict = await db.appointment.findFirst({
              where: {
                doctor: data.doctor, date: dateString, status: { not: "CANCELLED" },
                AND: [{ startTime: { lt: data.endTime || data.startTime } }, { endTime: { gt: data.startTime } }]
              }
            });
            if (conflict) return { success: false, error: `Slot busy on ${dateString}. Booking failed.` };
        }
    }

    let patientId = data.patientId;
    if (!patientId && data.phone) {
      const cleanPhone = data.phone.trim().replace(/\s/g, ''); 
      const isDummyPhone = cleanPhone === "+91" || cleanPhone.length < 10;
      let existingPatient = null;
      if (!isDummyPhone) {
        existingPatient = await db.patient.findFirst({
            where: { phone: data.phone, name: { equals: data.patientName, mode: 'insensitive' } }
        });
      }
      if (existingPatient) {
        patientId = existingPatient.id;
      } else {
        const newPatient = await db.patient.create({
          data: {
            readableId: await generateReadableId('patient'),
            name: data.patientName, phone: data.phone, age: 0, gender: "Unknown"
          }
        });
        patientId = newPatient.id;
      }
    }

    const idType = data.type.includes('Panchkarma') ? 'ipd' : 'opd';
    for (const dateString of targetDates) {
        const readableId = await generateReadableId(idType);
        await db.appointment.create({
          data: {
            readableId, date: dateString, startTime: data.startTime, endTime: data.endTime || data.startTime,
            type: data.type, patientName: data.patientName, phone: data.phone, doctor: data.doctor,
            status: "SCHEDULED", patientId, fee: 500, discount: 0
          }
        });
    }
    revalidatePath("/calendar");
    return { success: true };
  } catch (error) { return { success: false, error: "Failed to book appointment" }; }
}

export async function updateAppointment(data: any) {
  try {
    if (data.endTime && parseTime(data.startTime) >= parseTime(data.endTime)) {
        return { success: false, error: "End time must be after start time." };
    }
    if (data.type !== "Unavailable") {
        const conflict = await db.appointment.findFirst({
          where: {
            doctor: data.doctor, date: data.date, status: { not: "CANCELLED" }, id: { not: data.id },
            AND: [{ startTime: { lt: data.endTime || data.startTime } }, { endTime: { gt: data.startTime } }]
          }
        });
        if (conflict) return { success: false, error: `Doctor is already booked during this time.` };
    }
    await db.appointment.update({
      where: { id: data.id },
      data: {
        date: data.date, startTime: data.startTime, endTime: data.endTime, type: data.type,
        patientName: data.patientName, phone: data.phone, doctor: data.doctor, patientId: data.patientId 
      },
    });
    revalidatePath("/calendar");
    return { success: true };
  } catch (error) { return { success: false, error: "Failed to update" }; }
}

export async function deleteAppointment(id: string) {
  try { await db.appointment.delete({ where: { id } }); revalidatePath("/calendar"); return { success: true }; } catch (error) { return { success: false, error: "Failed to delete" }; }
}

// ==========================================
// 3. 📝 CONSULTATION & PRESCRIPTION
// ==========================================

export async function savePrescription(patientId: string, visitData: any, consultationId?: string) {
  try {
    const today = new Date().toISOString().split('T')[0];
    let finalAppointmentId = visitData.appointmentId;
    
    // 1. Handle Guest
    if (patientId === "GUEST") {
        let guestPatient = await db.patient.findFirst({ where: { phone: "9999999999" } });
        if (!guestPatient) {
            guestPatient = await db.patient.create({
                data: { name: "Guest Patient", phone: "9999999999", readableId: "GUEST", age: 0, gender: "Unknown" }
            });
        }
        patientId = guestPatient.id;
    }
    
    // 2. Link or Create Appointment
    if (finalAppointmentId && finalAppointmentId.startsWith('RA')) {
        const appointmentObj = await db.appointment.findUnique({ where: { readableId: finalAppointmentId } });
        finalAppointmentId = appointmentObj ? appointmentObj.id : null;
    }
    if (!finalAppointmentId) {
        const appointment = await db.appointment.findFirst({ where: { patientId, date: today, status: "SCHEDULED" } });
        if(appointment) finalAppointmentId = appointment.id;
    }
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

    // 3. Update Fee Status
    if (finalAppointmentId) {
        await db.appointment.update({
            where: { id: finalAppointmentId },
            data: { status: "COMPLETED", discount: apptDiscount }
        });
    }

    // 4. Create/Update Consultation & Wallet
    if (consultationId) {
       // ... (Update Logic - Simplified for brevity, typically we don't change wallet on Edit to avoid double counting, unless we implement complex diffing. For now, assume payment updates are for new visits or handled manually)
       await db.prescriptionItem.deleteMany({ where: { prescription: { consultationId } } });
       await db.consultation.update({
           where: { id: consultationId },
           data: {
               diagnosis: visitData.diagnosis, 
               symptoms: visitData.symptoms || "Consultation", 
               notes: visitData.notes,
               discount: pharmacyDiscount,
               appointmentId: finalAppointmentId,
               // ✅ Update payment info
               paidAmount: paidAmount,
               paymentMode: paymentMode
           }
       });
       const presc = await db.prescription.findFirst({ where: { consultationId } });
       if(presc) {
           await db.prescriptionItem.createMany({
               data: visitData.prescriptions.map((p: any) => ({
                   prescriptionId: presc.id, medicineId: p.medicineId, dosage: p.dosage, unit: p.unit, duration: p.duration, instruction: p.instruction, panchkarma: p.panchkarma, status: "PENDING"
               }))
           });
       }
    } else {
        // ✅ NEW ENTRY: Handle Wallet Logic
        // Calculate Bill roughly to update wallet
        let estimatedBill = 0;
        if(visitData.prescriptions.length > 0) {
             const medIds = visitData.prescriptions.map((p:any) => p.medicineId);
             const meds = await db.medicine.findMany({ where: { id: { in: medIds } } });
             visitData.prescriptions.forEach((p:any) => {
                 const med = meds.find(m => m.id === p.medicineId);
                 if(med) estimatedBill += med.price;
             });
        }
        
        // Fee (500) + Meds - Discount
        const fee = apptDiscount >= 500 ? 0 : 500;
        const totalBill = fee + estimatedBill - pharmacyDiscount;
        const walletDelta = paidAmount - totalBill;

        await db.$transaction(async (tx) => {
            await tx.consultation.create({
                data: {
                    patientId, 
                    appointmentId: finalAppointmentId || null, 
                    doctorName: visitData.doctorName || "Dr. Chirag Raval",
                    diagnosis: visitData.diagnosis, symptoms: visitData.symptoms || "Consultation", notes: visitData.notes,
                    discount: pharmacyDiscount, 
                    paidAmount: paidAmount,
                    paymentMode: paymentMode,
                    createdAt: new Date(),
                    prescriptions: {
                        create: {
                            items: {
                                create: visitData.prescriptions.map((p: any) => ({
                                    medicineId: p.medicineId, dosage: p.dosage, unit: p.unit, duration: p.duration, instruction: p.instruction, panchkarma: p.panchkarma, status: "PENDING"
                                }))
                            }
                        }
                    }
                }
            });

            // Update Wallet
            if (walletDelta !== 0) {
                await tx.patient.update({
                    where: { id: patientId },
                    data: { walletBalance: { increment: walletDelta } }
                });
            }
        });
    }

    revalidatePath(`/patients/${patientId}`);
    revalidatePath(`/pharmacy`);
    return { success: true };

  } catch (error) {
    console.error("Save Error:", error);
    return { success: false, error: "Failed to save visit" };
  }
}

// ✅ UPDATED ACTION: Handles Discounts, Part-Payment, and Wallet Updates
export async function updateConsultationFinancials(
  id: string, 
  discount: number, 
  paidAmount?: number, 
  paymentMode?: string
) {
  try {
    // 1. Fetch current state to calculate delta
    const current = await db.consultation.findUnique({
       where: { id },
       include: { 
         prescriptions: { include: { items: { include: { medicine: true } } } },
         patient: true
       }
    });

    if (!current) return { success: false, error: "Consultation not found" };

    // 2. Calculate TOTAL BILL (Sum of items - New Discount)
    // Note: We use the *prescription items* to calculate true bill.
    let totalBill = 0;
    current.prescriptions.forEach(p => {
        p.items.forEach(item => {
            // Use dispensedQty if available, else 1 (assuming intent to dispense)
            const qty = item.dispensedQty && item.dispensedQty > 0 ? item.dispensedQty : 1;
            totalBill += (qty * (item.medicine?.price || 0));
        });
    });

    // 3. Calculate "Wallet Delta" (Difference between New Impact and Old Impact)
    // Formula: Impact = Paid - (Bill - Discount)
    // If Paid > Bill, Impact is +ve (Advance). If Paid < Bill, Impact is -ve (Due).
    
    const oldDiscount = current.discount || 0;
    const oldPaid = current.paidAmount || 0;
    const oldBill = totalBill - oldDiscount;
    const oldImpact = oldPaid - oldBill;

    const newDiscount = discount;
    const newPaid = paidAmount !== undefined ? paidAmount : oldPaid;
    const newBill = totalBill - newDiscount;
    const newImpact = newPaid - newBill;

    const walletDelta = newImpact - oldImpact;

    // 4. Update Consultation and Patient Wallet atomically
    await db.$transaction([
        db.consultation.update({
            where: { id },
            data: { 
                discount: newDiscount,
                paidAmount: newPaid,
                paymentMode: paymentMode || current.paymentMode
            }
        }),
        db.patient.update({
            where: { id: current.patientId },
            data: { walletBalance: { increment: walletDelta } }
        })
    ]);

    revalidatePath('/pharmacy'); 
    revalidatePath(`/patients/${current.patientId}`);
    return { success: true };
  } catch (error) {
    console.error("Financial Update Error:", error);
    return { success: false, error: "Failed to save financials" };
  }
}

export async function reopenConsultation(consultationId: string) {
  try {
    const prescription = await db.prescription.findFirst({ where: { consultationId }, include: { items: true } });
    if (!prescription) return { success: false, error: "Record not found" };

    for (const item of prescription.items) {
      if (item.status === 'DISPENSED' && item.dispensedQty && item.dispensedQty > 0) {
        await db.medicine.update({ where: { id: item.medicineId }, data: { stock: { increment: item.dispensedQty } } });
      }
    }
    await db.prescriptionItem.updateMany({ where: { prescriptionId: prescription.id }, data: { status: 'PENDING' } });

    revalidatePath('/pharmacy');
    return { success: true };
  } catch (error) { return { success: false, error: "Failed to reopen" }; }
}

export async function uploadConsultationReport(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    const consultationId = formData.get("consultationId") as string;
    if (!file || !consultationId) return { success: false, error: "Missing file" };

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const fileExt = file.name.split('.').pop();
    const fileName = `${consultationId}_${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("medical-reports").upload(fileName, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("medical-reports").getPublicUrl(fileName);

    await db.consultation.update({ where: { id: consultationId }, data: { reportUrl: data.publicUrl } });
    const consult = await db.consultation.findUnique({ where: { id: consultationId } });
    if(consult) revalidatePath(`/patients/${consult.patientId}`);
    return { success: true, url: data.publicUrl };
  } catch (error) { return { success: false, error: "Upload failed" }; }
}

export async function deleteVisit(consultationId: string, patientId: string) {
  try {
    // 1. Get the consultation details BEFORE deleting
    const consult = await db.consultation.findUnique({
      where: { id: consultationId },
      include: {
        prescriptions: {
          include: { items: { include: { medicine: true } } }
        }
      }
    });

    if (!consult) return { success: false, error: "Record not found" };

    // 2. Calculate the Financial Impact this visit had
    let totalBill = 0;
    
    // Calculate Bill from items (if any)
    consult.prescriptions.forEach(p => {
        p.items.forEach(item => {
            // Use dispensedQty if it was dispensed, otherwise 1 (estimated intent)
            const qty = item.dispensedQty && item.dispensedQty > 0 ? item.dispensedQty : 1;
            totalBill += (qty * (item.medicine?.price || 0));
        });
    });

    // Add Consultation Fee (Logic: If discount < 500, fee was applied. Approximate check.)
    let fee = 0;
    if (consult.appointmentId) {
        const appt = await db.appointment.findUnique({ where: { id: consult.appointmentId } });
        // If appt discount was 0, fee was 500.
        if (appt && appt.discount < 500) fee = 500; 
    } else if (consult.doctorName === "Dr. Chirag Raval") {
        fee = 500; 
    }

    const discount = consult.discount || 0;
    const paidAmount = consult.paidAmount || 0;
    const finalBill = totalBill + fee - discount;

    // The amount that was added/subtracted from wallet
    const walletImpact = paidAmount - finalBill; 

    // 3. Transaction: Delete Record AND Reverse Wallet
    await db.$transaction([
        db.consultation.delete({ where: { id: consultationId } }),
        db.patient.update({
            where: { id: patientId },
            data: { 
                // We SUBTRACT the impact to reverse it.
                walletBalance: { decrement: walletImpact } 
            }
        })
    ]);

    revalidatePath(`/patients/${patientId}`);
    revalidatePath('/pharmacy');
    return { success: true };

  } catch (error) {
    console.error("Delete Error:", error);
    return { success: false, error: "Failed to delete" };
  }
}

// ==========================================
// 4. 💊 PHARMACY & INVENTORY
// ==========================================

// ✅ UPDATED ACTION: Direct Sale with Strict Guest Handling (No New Patients)
export async function createDirectSale(data: any) {
  try {
    let patientId = data.patientId;

    // 1. Handle Missing Patient ID (Guest Case)
    if (!patientId) {
        
        // ⚠️ LOGIC CHANGE: 
        // If it's a Guest sale (no ID provided from frontend), force use of Master Guest Record.
        // We DO NOT search by phone/name to avoid linking to random existing patients.
        // We DO NOT create a new patient record with the typed name.
        
        let guestPatient = await db.patient.findUnique({ where: { readableId: "GUEST" } });
        
        if (!guestPatient) {
             // Create the Single Master Guest Record if it doesn't exist
             guestPatient = await db.patient.create({
                data: { 
                    readableId: "GUEST", 
                    name: "Guest Patient", 
                    phone: "9999999999", 
                    age: 0, 
                    gender: "Unknown", 
                    walletBalance: 0 
                }
             });
        }
        patientId = guestPatient.id;
    }

    // 2. Fetch Medicines & Calculate Bill
    let totalBill = 0;
    const discount = parseFloat(data.discount) || 0;
    
    if (data.items && data.items.length > 0) {
        const medIds = data.items.map((i:any) => i.medicineId);
        const meds = await db.medicine.findMany({ where: { id: { in: medIds } } });
        const medMap = new Map(meds.map(m => [m.id, m.price]));
        
        data.items.forEach((item: any) => {
            const price = medMap.get(item.medicineId) || 0;
            const qty = parseInt(item.quantity) || 1;
            totalBill += (price * qty);
        });
    }
    
    // 3. Wallet Logic
    const paidAmount = data.paidAmount !== undefined ? parseFloat(data.paidAmount) : 0; 
    const netBill = totalBill - discount;
    const walletDelta = paidAmount - netBill; 

    // 4. Create Consultation + Prescriptions + Update Wallet atomically
    await db.$transaction(async (tx) => {
        
        // ✅ Store Guest Name in Symptoms/Diagnosis so it's visible in Queue
        // Since we are using a generic "Guest Patient" ID, the real name (e.g. "John") 
        // needs to be saved somewhere visible.
        const guestDisplayName = (!data.patientId && data.name) ? `Guest: ${data.name}` : "Direct Sale";

        const consultation = await tx.consultation.create({
            data: {
                patientId,
                doctorName: "Pharmacy Direct Sale", 
                diagnosis: guestDisplayName, // Storing guest name here
                symptoms: data.phone || "-", // Storing guest phone here
                discount: discount,
                paidAmount: paidAmount, 
                paymentMode: data.paymentMode || "Cash",
                createdAt: new Date(),
            }
        });

        if (data.items && data.items.length > 0) {
            await tx.prescription.create({
                data: {
                    consultationId: consultation.id,
                    items: {
                        create: data.items.map((item: any) => ({
                            medicineId: item.medicineId,
                            dosage: item.quantity?.toString() || "1",
                            unit: "Qty",
                            duration: "0", 
                            instruction: "Direct Pharmacy Sale",
                            status: "PENDING"
                        }))
                    }
                }
            });
        }
        
        // Only update wallet if payment details were explicitly handled or a bill exists
        if (totalBill > 0 || paidAmount > 0) {
             await tx.patient.update({
                 where: { id: patientId },
                 data: { walletBalance: { increment: walletDelta } }
             });
        }
    });

    revalidatePath('/pharmacy');
    return { success: true };

  } catch (error) {
      console.error("Direct Sale Error:", error);
      return { success: false, error: "Failed to create direct sale" };
  }
}

export async function getPharmacyInventory(query: string = "", limit: number = 50, showLowStock: boolean = false) {
  try {
    const where: any = {
      name: { contains: query, mode: 'insensitive' }
    };

    if (showLowStock) {
        where.stock = { lt: 10 }; 
    }

    return await db.medicine.findMany({
      where,
      orderBy: { name: 'asc' },
      take: limit
    });
  } catch (error) {
    return [];
  }
}

export async function getPharmacyQueue() {
  return await db.consultation.findMany({
    where: {
      prescriptions: { some: { items: { some: { status: 'PENDING' } } } }
    },
    include: {
      patient: true, appointment: true,
      prescriptions: { include: { items: { include: { medicine: true }, orderBy: { id: 'asc' } } } }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getDispensedHistory(query: string, startDate?: string, endDate?: string) {
  try {
    const where: any = { 
        prescriptions: { 
            some: { 
                items: { some: { status: 'DISPENSED' } } 
            } 
        } 
    };

    if (query) {
      where.OR = [
        { patient: { name: { contains: query, mode: 'insensitive' } } },
        { patient: { phone: { contains: query } } },
        { patient: { readableId: { contains: query, mode: 'insensitive' } } }
      ];
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
         const end = new Date(endDate);
         end.setHours(23, 59, 59, 999);
         where.createdAt.lte = end;
      }
    }
    return await db.consultation.findMany({
      where,
      include: {
        patient: true, appointment: true,
        prescriptions: { include: { items: { include: { medicine: true } } } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50 
    });
  } catch (error) { return []; }
}

export async function dispenseMedicine(itemId: string, quantity: number) {
  try {
    const item = await db.prescriptionItem.findUnique({ where: { id: itemId }, include: { medicine: true } });
    if (!item) return { success: false };

    await db.medicine.update({ where: { id: item.medicineId }, data: { stock: { decrement: quantity } } });
    await db.prescriptionItem.update({ where: { id: itemId }, data: { status: 'DISPENSED', dispensedQty: quantity } });

    revalidatePath('/pharmacy');
    return { success: true };
  } catch (error) { return { success: false, error: "Stock Error" }; }
}

export async function createMedicine(data: any) {
  try {
    await db.medicine.create({
      data: {
        name: data.name, type: data.type || "Tablet",
        stock: parseInt(data.stock) || 0, price: parseFloat(data.price) || 0,
        minStock: parseInt(data.minStock) || 10,
        mfgDate: data.mfgDate ? new Date(data.mfgDate) : null,
        expDate: data.expDate ? new Date(data.expDate) : null,
      }
    });
    revalidatePath('/pharmacy');
    return { success: true };
  } catch (error) { return { success: false, error: "Failed to create medicine" }; }
}

export async function updateMedicine(id: string, data: any) {
  try {
    const updateData: any = {
      stock: parseInt(data.stock),
      price: parseFloat(data.price),
    };
    if (data.name) updateData.name = data.name;
    if (data.minStock) updateData.minStock = parseInt(data.minStock);
    if (data.mfgDate) updateData.mfgDate = new Date(data.mfgDate);
    if (data.expDate) updateData.expDate = new Date(data.expDate);
    if (data.type) updateData.type = data.type;

    await db.medicine.update({ where: { id }, data: updateData });
    revalidatePath('/pharmacy');
    return { success: true };
  } catch (error) { return { success: false, error: "Failed to update" }; }
}

export async function deleteMedicine(id: string) {
  try {
    await db.medicine.delete({ where: { id } });
    revalidatePath('/pharmacy');
    return { success: true };
  } catch (error) { return { success: false, error: "Cannot delete used medicine" }; }
}

// ==========================================
// 5. 📊 DASHBOARD
// ==========================================

export async function getDashboardStats() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  const todayStr = istDate.toISOString().split('T')[0];
  
  const tomorrow = new Date(istDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const session = await getSession();
  const userName = session?.name || "Doctor"; 

  const [appointments, requests, queueCount, allMeds, completed, upcoming] = await Promise.all([
    db.appointment.count({ where: { date: todayStr, status: { not: "CANCELLED" } } }),
    db.appointmentRequest.findMany({ orderBy: { createdAt: 'desc' } }),
    db.consultation.count({ where: { prescriptions: { some: { items: { some: { status: 'PENDING' } } } } } }),
    db.medicine.findMany({ select: { stock: true, minStock: true } }),
    db.appointment.findMany({ where: { status: 'COMPLETED' }, take: 5, orderBy: { updatedAt: 'desc' } }),
    db.appointment.findMany({ where: { date: { in: [todayStr, tomorrowStr] }, status: { not: "CANCELLED" } }, orderBy: [{ date: 'asc' }, { startTime: 'asc' }] })
  ]);

  const lowStockCount = allMeds.filter(m => m.stock < (m.minStock ?? 10)).length;

  return { appointments, requests, queue: queueCount, lowStock: lowStockCount, recent: completed, upcoming, userName };
}

// ==========================================
// 6. 🔐 AUTHENTICATION & REQUESTS
// ==========================================
export async function loginAction(email: string, password: string) {
  const user = await db.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
  if (!user || !(await bcrypt.compare(password, user.password))) return { success: false, error: "Invalid credentials" };
  await createSession({ userId: user.id, name: user.name, role: user.role, email: user.email });
  return { success: true };
}

export async function logoutAction() { await logout(); redirect("/login"); }

export async function updateUserPassword(userId: string, newPassword: string) {
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.user.update({ where: { id: userId }, data: { password: hashedPassword } });
    return { success: true };
  } catch (error) { return { success: false, error: "Failed to update" }; }
}

export async function createConsultationRequest(data: any) {
  try {
    if (!data.phone) return { success: false, error: "Phone number is required" };
    await db.appointmentRequest.create({ data: { name: data.name, phone: data.phone, symptoms: data.symptoms } });
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) { return { success: false, error: "Failed to submit" }; }
}

export async function getConsultationRequests() {
  try { return await db.appointmentRequest.findMany({ orderBy: { createdAt: 'desc' }, where: { status: 'PENDING' } }); } catch (error) { return []; }
}

export async function completeRequest(id: string) {
  try { await db.appointmentRequest.delete({ where: { id } }); revalidatePath('/dashboard'); return { success: true }; } catch (error) { return { success: false }; }
}

// ==========================================
// 8. 📈 REPORTING & ANALYTICS (UPDATED)
// ==========================================
export async function getReportData(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const consultations = await db.consultation.findMany({
    where: { createdAt: { gte: start, lte: end }, prescriptions: { some: { items: { some: { status: "DISPENSED" } } } } },
    include: { patient: true, appointment: true, prescriptions: { include: { items: { include: { medicine: true } } } } }
  });

  const appointments = await db.appointment.findMany({
    where: { date: { gte: startDate, lte: endDate }, status: "COMPLETED" },
    include: { patient: true }
  });

  const patientsWithWeight = await db.patient.findMany({
    where: { initialWeight: { not: null }, currentWeight: { not: null } },
    select: { id: true, name: true, readableId: true, initialWeight: true, currentWeight: true, gender: true }
  });

  let pharmacyRevenue = 0;
  let panchkarmaRevenue = 0; 
  let appointmentRevenue = 0;
  
  const dailyStats: { [key: string]: { pharmacy: number, panchkarma: number, appointment: number } } = {};
  const medicineSalesCount: { [key: string]: number } = {};
  const rawTransactions: any[] = [];
  let totalWeightLoss = 0;
  const weightLossByGender: { [key: string]: number } = { Male: 0, Female: 0, Other: 0 };
  const weightLossPatients: any[] = [];

  patientsWithWeight.forEach(p => {
      const init = parseFloat((p.initialWeight || "0").toString().replace(/[^0-9.]/g, ''));
      const curr = parseFloat((p.currentWeight || "0").toString().replace(/[^0-9.]/g, ''));
      if (!isNaN(init) && !isNaN(curr) && init > curr) {
          const loss = init - curr;
          totalWeightLoss += loss;
          const gender = p.gender || "Other";
          if (weightLossByGender[gender] !== undefined) weightLossByGender[gender] += loss;
          else weightLossByGender["Other"] += loss;
          weightLossPatients.push({ id: p.id, name: p.name, readableId: p.readableId, loss: loss.toFixed(1), initial: init, current: curr });
      }
  });

  consultations.forEach(consult => {
    const dateKey = new Date(consult.createdAt).toISOString().split('T')[0];
    if (!dailyStats[dateKey]) dailyStats[dateKey] = { pharmacy: 0, panchkarma: 0, appointment: 0 };

    let visitPharmacyTotal = 0;
    let visitPanchkarmaTotal = 0;

    consult.prescriptions.forEach(p => {
        p.items.forEach(item => {
            if(item.status === 'DISPENSED') {
                const amount = (item.dispensedQty || 1) * (item.medicine?.price || 0);
                
                // ✅ LOGIC: Case-insensitive Check
                const type = (item.medicine?.type || "").toLowerCase().trim();
                const isPanchkarma = type === 'panchkarma' || type === 'procedure' || item.panchkarma; 
                
                if (isPanchkarma) {
                    visitPanchkarmaTotal += amount;
                    dailyStats[dateKey].panchkarma += amount;
                } else {
                    visitPharmacyTotal += amount;
                    dailyStats[dateKey].pharmacy += amount;
                }

                const medName = item.medicine?.name || "Unknown";
                medicineSalesCount[medName] = (medicineSalesCount[medName] || 0) + (item.dispensedQty || 1);
                
                rawTransactions.push({
                    id: "PH-" + item.id, 
                    date: consult.createdAt, 
                    type: isPanchkarma ? "PANCHKARMA" : "PHARMACY", 
                    patient: consult.patient?.name || "Walk-in", 
                    detail: `${item.medicine?.name} (x${item.dispensedQty})`,
                    amount: amount, 
                    appointmentId: consult.appointment?.readableId || "WALK-IN"
                });
            }
        });
    });
    
    let discount = consult.discount || 0;
    
    if (visitPharmacyTotal >= discount) {
        visitPharmacyTotal -= discount;
        dailyStats[dateKey].pharmacy -= discount;
        discount = 0;
    } else {
        discount -= visitPharmacyTotal;
        dailyStats[dateKey].pharmacy -= visitPharmacyTotal;
        visitPharmacyTotal = 0;
        
        if (visitPanchkarmaTotal >= discount) {
            visitPanchkarmaTotal -= discount;
            dailyStats[dateKey].panchkarma -= discount;
        } else {
             dailyStats[dateKey].panchkarma -= visitPanchkarmaTotal;
             visitPanchkarmaTotal = 0;
        }
    }

    pharmacyRevenue += visitPharmacyTotal;
    panchkarmaRevenue += visitPanchkarmaTotal;
  });

  appointments.forEach(apt => {
    const amount = (apt.discount && apt.discount >= 500) ? 0 : 500;
    appointmentRevenue += amount;
    const dateKey = new Date(apt.date).toISOString().split('T')[0];
    if (!dailyStats[dateKey]) dailyStats[dateKey] = { pharmacy: 0, panchkarma: 0, appointment: 0 };
    dailyStats[dateKey].appointment += amount;
    
    rawTransactions.push({
        id: "APT-" + apt.id, date: apt.date, type: "APPOINTMENT",
        patient: apt.patient?.name || "Unknown", detail: amount === 0 ? "Consultation (Free)" : "Consultation Fee",
        amount: amount, appointmentId: apt.readableId || "-"
    });
  });

  const revenueChartData = Object.keys(dailyStats).map(date => ({
    date, 
    pharmacy: dailyStats[date].pharmacy, 
    panchkarma: dailyStats[date].panchkarma, 
    appointment: dailyStats[date].appointment,
    total: dailyStats[date].pharmacy + dailyStats[date].panchkarma + dailyStats[date].appointment
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const topMedicines = Object.entries(medicineSalesCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);

  return {
    summary: { 
        totalRevenue: pharmacyRevenue + panchkarmaRevenue + appointmentRevenue, 
        pharmacyRevenue, 
        panchkarmaRevenue, 
        appointmentRevenue, 
        totalPatients: appointments.length, 
        totalPrescriptions: consultations.length,
        totalWeightLoss, 
        weightLossByGender
    },
    charts: { revenueOverTime: revenueChartData, topMedicines },
    weightLossPatients: weightLossPatients.sort((a, b) => parseFloat(b.loss) - parseFloat(a.loss)),
    rawTransactions: rawTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  };
}