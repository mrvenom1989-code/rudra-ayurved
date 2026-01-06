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
  // ✅ REQ 4: Changed PT- to RA-
  const prefix = type === 'patient' ? 'RA-' : (type === 'opd' ? 'RAOPD' : 'RAIPD');
  
  try {
    const counter = await db.counter.upsert({
      where: { name: counterName },
      update: { value: { increment: 1 } },
      create: { name: counterName, value: 1001 }
    });
    return `${prefix}${counter.value}`;
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

    return await db.patient.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 50
    });
  } catch (error) {
    return [];
  }
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
            prescriptions: {
              include: { items: { include: { medicine: true } } }
            }
          }
        }
      }
    });
  } catch (error) {
    return null;
  }
}

export async function createPatient(data: any) {
  try {
    // ❌ REMOVED: Phone uniqueness check to allow duplicate numbers
    // const existing = await db.patient.findUnique({ where: { phone: data.phone } });
    // if (existing) return { success: false, error: "Patient with this phone already exists." };

    const readableId = await generateReadableId('patient');

    await db.patient.create({
      data: {
        readableId,
        name: data.name,
        phone: data.phone,
        age: parseInt(data.age) || 0,
        gender: data.gender,
        bloodGroup: data.bloodGroup,
        prakriti: data.prakriti,
        initialWeight: data.initialWeight,
        currentWeight: data.currentWeight,
        history: data.history,
        // ✅ REQ 3: New Fields Added
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

    revalidatePath('/patients');
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to create patient" };
  }
}

export async function updatePatient(id: string, data: any) {
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
        currentWeight: data.currentWeight,
        history: data.history,
        // ✅ REQ 3: New Fields Added
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
    revalidatePath('/patients');
    return { success: true };
  } catch (error) {
    return { success: false, error: "Update failed" };
  }
}

export async function deletePatient(id: string) {
  try {
    await db.patient.delete({ where: { id } });
    revalidatePath('/patients');
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete" };
  }
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
    select: { id: true, name: true, phone: true, readableId: true }
  });
}

// ==========================================
// 2. 📅 APPOINTMENT & CALENDAR
// ==========================================

export async function getAppointments(start?: string, end?: string) {
  try {
    const where: any = {};
    if (start && end) {
      where.date = { gte: start, lte: end };
    }
    return await db.appointment.findMany({
      where,
      orderBy: { startTime: 'asc' }
    });
  } catch (error) {
    return [];
  }
}

export async function completeAppointment(id: string, discount: number = 0) {
  try {
    await db.appointment.update({
      where: { id },
      data: { 
        status: "COMPLETED",
        discount: discount // Save the discount permanently
      }
    });
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to complete appointment" };
  }
}

export async function createAppointment(data: any) {
  try {
    // 1. CONFLICT DETECTION 🚨
    if (data.type !== "Unavailable") {
      const conflict = await db.appointment.findFirst({
        where: {
          doctor: data.doctor,
          type: data.type,
          date: data.date,
          status: { not: "CANCELLED" },
          AND: [
            { startTime: { lt: data.endTime || data.startTime } },
            { endTime: { gt: data.startTime } }
          ]
        }
      });

      if (conflict) {
        return { success: false, error: `Doctor is already booked for ${data.type} at this time.` };
      }
    }

    // 2. GENERATE READABLE ID
    const idType = data.type.includes('Panchkarma') ? 'ipd' : 'opd';
    const readableId = await generateReadableId(idType);

    // 3. ENSURE PATIENT EXISTS
    let patientId = data.patientId;
    if (!patientId && data.phone) {
      // ✅ CHANGED: findUnique -> findFirst (since phone is not unique anymore)
      const existingPatient = await db.patient.findFirst({
        where: { phone: data.phone }
      });

      if (existingPatient) {
        patientId = existingPatient.id;
      } else {
        const newPatient = await db.patient.create({
          data: {
            readableId: await generateReadableId('patient'),
            name: data.patientName,
            phone: data.phone,
            age: 0,
            gender: "Unknown"
          }
        });
        patientId = newPatient.id;
      }
    }

    // 4. CREATE APPOINTMENT
    await db.appointment.create({
      data: {
        readableId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime || data.startTime,
        type: data.type,
        patientName: data.patientName,
        phone: data.phone,
        doctor: data.doctor,
        status: "SCHEDULED",
        patientId,
        fee: 500, // Default fee
        discount: 0
      }
    });
    
    revalidatePath("/calendar");
    return { success: true };
  } catch (error) {
    console.error("Booking Error:", error);
    return { success: false, error: "Failed to book appointment" };
  }
}

export async function updateAppointment(data: any) {
  try {
    await db.appointment.update({
      where: { id: data.id },
      data: {
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        type: data.type,
        patientName: data.patientName,
        phone: data.phone,
        doctor: data.doctor,
        patientId: data.patientId 
      },
    });

    revalidatePath("/calendar");
    return { success: true };
  } catch (error) {
    console.error("Update Error:", error);
    return { success: false, error: "Failed to update" };
  }
}

export async function deleteAppointment(id: string) {
  try {
    await db.appointment.delete({ where: { id } });
    revalidatePath("/calendar");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete" };
  }
}

// ==========================================
// 3. 📝 CONSULTATION & PRESCRIPTION
// ==========================================

export async function savePrescription(patientId: string, visitData: any, consultationId?: string) {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. RESOLVE APPOINTMENT ID
    let finalAppointmentId = visitData.appointmentId;
    
    if (finalAppointmentId && finalAppointmentId.startsWith('RA')) {
        const appointmentObj = await db.appointment.findUnique({
            where: { readableId: finalAppointmentId }
        });
        if (appointmentObj) {
            finalAppointmentId = appointmentObj.id;
        } else {
            finalAppointmentId = null;
        }
    }

    if (!finalAppointmentId) {
        const appointment = await db.appointment.findFirst({
            where: { patientId, date: today, status: "SCHEDULED" }
        });
        if(appointment) finalAppointmentId = appointment.id;
    }

    // 🚨 FIX: AUTO-DETECT EXISTING CONSULTATION (Prevents Duplicate Error)
    if (finalAppointmentId) {
        const existingConsultation = await db.consultation.findUnique({
            where: { appointmentId: finalAppointmentId }
        });
        // If one exists, we MUST edit it, regardless of what frontend passed
        if (existingConsultation) {
            consultationId = existingConsultation.id; 
        }
    }

    const diagnosisText = visitData.diagnosis || "Consultation";
    // ✅ Ensure symptoms is never null/undefined
    const symptomsText = visitData.symptoms || diagnosisText || "No Symptoms";
    
    // ✅ Extract Discount (Default to 0)
    const discountAmount = parseFloat(visitData.discount || "0");

    // ✅ REQ 1 FIX: Sync discount to Appointment so reports are accurate
    if (finalAppointmentId) {
        await db.appointment.update({
            where: { id: finalAppointmentId },
            data: { 
                status: "COMPLETED",
                discount: discountAmount 
            }
        });
    }

    // CASE 1: EDIT EXISTING RECORD
    if (consultationId) {
       await db.prescriptionItem.deleteMany({
           where: { prescription: { consultationId: consultationId } }
       });
       
       await db.consultation.update({
           where: { id: consultationId },
           data: {
               diagnosis: diagnosisText,
               symptoms: symptomsText, // ✅ Ensure updated
               notes: visitData.notes,
               discount: discountAmount // ✅ Update Discount
           }
       });

       const presc = await db.prescription.findFirst({ where: { consultationId } });
       if(presc) {
           await db.prescriptionItem.createMany({
               data: visitData.prescriptions.map((p: any) => ({
                   prescriptionId: presc.id,
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
       
       revalidatePath(`/patients/${patientId}`);
       return { success: true };
    }

    // CASE 2: CREATE NEW RECORD
    await db.consultation.create({
      data: {
        patientId,
        appointmentId: finalAppointmentId || null,
        doctorName: visitData.doctorName || "Dr. Chirag Raval",
        diagnosis: diagnosisText,
        symptoms: symptomsText, // ✅ Explicitly added symptoms
        notes: visitData.notes,
        discount: discountAmount, // ✅ Save Discount
        createdAt: new Date(),
        
        prescriptions: {
          create: {
            items: {
              create: visitData.prescriptions.map((p: any) => ({
                medicineId: p.medicineId,
                dosage: p.dosage,
                unit: p.unit,
                duration: p.duration,
                instruction: p.instruction,
                panchkarma: p.panchkarma,
                status: "PENDING"
              }))
            }
          }
        }
      }
    });

    if (finalAppointmentId) {
        await db.appointment.update({
            where: { id: finalAppointmentId },
            data: { status: "COMPLETED" }
        });
    }

    revalidatePath(`/patients/${patientId}`);
    revalidatePath(`/pharmacy`);
    revalidatePath(`/reports`);
    return { success: true };

  } catch (error) {
    console.error("Save Error:", error);
    return { success: false, error: "Failed to save visit" };
  }
}

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

    const { error: uploadError } = await supabase.storage
      .from("medical-reports")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("medical-reports")
      .getPublicUrl(fileName);

    await db.consultation.update({
      where: { id: consultationId },
      data: { reportUrl: data.publicUrl }
    });

    const consult = await db.consultation.findUnique({ where: { id: consultationId } });
    if(consult) revalidatePath(`/patients/${consult.patientId}`);
    
    return { success: true, url: data.publicUrl };
  } catch (error) {
    return { success: false, error: "Upload failed" };
  }
}

export async function deleteVisit(consultationId: string, patientId: string) {
  await db.consultation.delete({ where: { id: consultationId } });
  revalidatePath(`/patients/${patientId}`);
}

// ==========================================
// 4. 💊 PHARMACY & INVENTORY
// ==========================================

export async function getPharmacyInventory() {
  return await db.medicine.findMany({
    orderBy: { name: 'asc' }
  });
}

export async function getPharmacyQueue() {
  return await db.consultation.findMany({
    where: {
      createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) },
      prescriptions: {
        some: {
            items: {
                some: { status: 'PENDING' } 
            }
        }
      }
    },
    include: {
      patient: true,
      appointment: true,
      prescriptions: {
        include: { items: { include: { medicine: true }, orderBy: { id: 'asc' } } }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getDispensedHistory(query: string, startDate?: string, endDate?: string) {
  try {
    const where: any = {
      prescriptions: { some: {} }
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
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
         const end = new Date(endDate);
         end.setHours(23, 59, 59, 999);
         where.createdAt.lte = end;
      }
    }

    return await db.consultation.findMany({
      where,
      include: {
        patient: true,
        appointment: true,
        prescriptions: {
          include: {
            items: {
              include: { medicine: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  } catch (error) {
    console.error("History Fetch Error:", error);
    return []; 
  }
}

export async function dispenseMedicine(itemId: string, quantity: number) {
  try {
    const item = await db.prescriptionItem.findUnique({
      where: { id: itemId },
      include: { medicine: true }
    });

    if (!item) return { success: false };

    await db.medicine.update({
      where: { id: item.medicineId },
      data: { stock: { decrement: quantity } }
    });

    await db.prescriptionItem.update({
      where: { id: itemId },
      data: { status: 'DISPENSED', dispensedQty: quantity }
    });

    revalidatePath('/pharmacy');
    return { success: true };
  } catch (error) {
    return { success: false, error: "Stock Error" };
  }
}

export async function createMedicine(data: any) {
  try {
    await db.medicine.create({
      data: {
        name: data.name,
        type: data.type || "Tablet",
        stock: parseInt(data.stock) || 0,
        price: parseFloat(data.price) || 0,
        // ✅ NEW FIELDS
        minStock: parseInt(data.minStock) || 10,
        mfgDate: data.mfgDate ? new Date(data.mfgDate) : null,
        expDate: data.expDate ? new Date(data.expDate) : null,
      }
    });
    revalidatePath('/pharmacy');
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to create medicine" };
  }
}

export async function updateMedicine(id: string, data: any) {
  try {
    const updateData: any = {
      stock: parseInt(data.stock),
      price: parseFloat(data.price),
    };

    // Only update these if they are present in the data passed
    if (data.minStock) updateData.minStock = parseInt(data.minStock);
    if (data.mfgDate) updateData.mfgDate = new Date(data.mfgDate);
    if (data.expDate) updateData.expDate = new Date(data.expDate);
    if (data.type) updateData.type = data.type;

    await db.medicine.update({
      where: { id },
      data: updateData
    });
    
    revalidatePath('/pharmacy');
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update" };
  }
}

export async function deleteMedicine(id: string) {
  try {
    await db.medicine.delete({ where: { id } });
    revalidatePath('/pharmacy');
    return { success: true };
  } catch (error) {
    return { success: false, error: "Cannot delete used medicine" };
  }
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

  const startOfDayIST = new Date(todayStr); 
  const startOfDayUTC = new Date(startOfDayIST.getTime() - istOffset);

  // 1. GET SESSION USER
  const session = await getSession();
  const userName = session?.name || "Doctor"; 

  // 2. RUN QUERIES
  const [appointments, requests, queueCount, allMeds, completed, upcoming] = await Promise.all([
    db.appointment.count({ 
        where: { date: todayStr, status: { not: "CANCELLED" } } 
    }),

    db.appointmentRequest.findMany({ orderBy: { createdAt: 'desc' } }),

    db.consultation.count({
        where: {
            createdAt: { gte: startOfDayUTC },
            prescriptions: { some: { items: { some: { status: 'PENDING' } } } }
        }
    }),

    // ✅ FIXED: Fetch all meds to check MinStock dynamically
    db.medicine.findMany({
        select: { stock: true, minStock: true }
    }),

    db.appointment.findMany({ 
        where: { status: 'COMPLETED' }, 
        take: 5, 
        orderBy: { updatedAt: 'desc' } 
    }),

    db.appointment.findMany({
        where: { 
            date: { in: [todayStr, tomorrowStr] },
            status: { not: "CANCELLED" }
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
    })
  ]);

  // ✅ CALCULATE LOW STOCK (Stock < MinStock)
  const lowStockCount = allMeds.filter(m => m.stock < (m.minStock ?? 10)).length;

  return { 
      appointments, 
      requests, 
      queue: queueCount, 
      lowStock: lowStockCount, 
      recent: completed, 
      upcoming,
      userName 
  };
}

// ==========================================
// 6. 🔐 AUTHENTICATION
// ==========================================

export async function loginAction(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return { success: false, error: "Invalid credentials" };
  }
  await createSession({ userId: user.id, name: user.name, role: user.role, email: user.email });
  return { success: true };
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}

export async function updateUserPassword(userId: string, newPassword: string) {
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await db.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true };
  } catch (error) {
    console.error("Password Update Error:", error);
    return { success: false, error: "Failed to update password" };
  }
}

// ==========================================
// 7. 📥 ONLINE REQUESTS
// ==========================================

export async function createConsultationRequest(data: any) {
  try {
    if (!data.phone) return { success: false, error: "Phone number is required" };

    await db.appointmentRequest.create({
      data: {
        name: data.name,
        phone: data.phone,
        symptoms: data.symptoms
      }
    });
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to submit request" };
  }
}

export async function getConsultationRequests() {
  try {
    return await db.appointmentRequest.findMany({
      orderBy: { createdAt: 'desc' },
      where: { status: 'PENDING' }
    });
  } catch (error) {
    return [];
  }
}

export async function completeRequest(id: string) {
  try {
    await db.appointmentRequest.delete({ where: { id } });
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

// ==========================================
// 8. 📈 REPORTING & ANALYTICS (REWRITTEN)
// ==========================================

export async function getReportData(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // 1. FETCH PHARMACY SALES
  const consultations = await db.consultation.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      prescriptions: { some: { items: { some: { status: "DISPENSED" } } } }
    },
    include: {
      patient: true,
      appointment: true,
      prescriptions: {
        include: { items: { include: { medicine: true } } }
      }
    }
  });

  // 2. FETCH APPOINTMENTS
  const appointments = await db.appointment.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      status: "COMPLETED" 
    },
    include: { patient: true }
  });

  // ✅ 3. FETCH PATIENTS FOR WEIGHT LOSS (NEW)
  const patientsWithWeight = await db.patient.findMany({
    where: {
      initialWeight: { not: null },
      currentWeight: { not: null }
    },
    select: {
      id: true, // ✅ Need ID
      name: true, // ✅ Need Name
      readableId: true, // ✅ Need Readable ID
      initialWeight: true,
      currentWeight: true,
      gender: true
    }
  });

  // --- DATA PROCESSING ---

  let pharmacyRevenue = 0;
  let appointmentRevenue = 0;
  
  const dailyStats: { [key: string]: { pharmacy: number, appointment: number } } = {};
  const medicineSalesCount: { [key: string]: number } = {};
  const rawTransactions: any[] = [];

  // ✅ 4. PROCESS WEIGHT LOSS
  let totalWeightLoss = 0;
  const weightLossByGender: { [key: string]: number } = { Male: 0, Female: 0, Other: 0 };
  const weightLossPatients: any[] = []; // ✅ List for frontend modal

  patientsWithWeight.forEach(p => {
      // Clean strings to handle "80 kg", "80kg", "80" etc.
      const init = parseFloat((p.initialWeight || "0").toString().replace(/[^0-9.]/g, ''));
      const curr = parseFloat((p.currentWeight || "0").toString().replace(/[^0-9.]/g, ''));

      if (!isNaN(init) && !isNaN(curr) && init > curr) {
          const loss = init - curr;
          totalWeightLoss += loss;
          
          const gender = p.gender || "Other";
          if (weightLossByGender[gender] !== undefined) {
             weightLossByGender[gender] += loss;
          } else {
             weightLossByGender["Other"] += loss;
          }

          // ✅ Add to list
          weightLossPatients.push({
             id: p.id,
             name: p.name,
             readableId: p.readableId,
             loss: loss.toFixed(1),
             initial: init,
             current: curr
          });
      }
  });

  // A. PROCESS PHARMACY (WITH DISCOUNTS)
  consultations.forEach(consult => {
    let consultTotal = 0;
    const dateKey = new Date(consult.createdAt).toISOString().split('T')[0];

    // Sum up items
    consult.prescriptions.forEach(p => {
        p.items.forEach(item => {
            if(item.status === 'DISPENSED') {
                const amount = (item.dispensedQty || 1) * (item.medicine?.price || 0);
                consultTotal += amount;
                
                const medName = item.medicine?.name || "Unknown";
                medicineSalesCount[medName] = (medicineSalesCount[medName] || 0) + (item.dispensedQty || 1);

                rawTransactions.push({
                    id: "PH-" + item.id,
                    date: consult.createdAt,
                    type: "PHARMACY",
                    patient: consult.patient?.name || "Walk-in",
                    detail: `${item.medicine?.name} (x${item.dispensedQty})`,
                    amount: amount,
                    appointmentId: consult.appointment?.readableId || "WALK-IN"
                });
            }
        });
    });

    const discount = consult.discount || 0;
    const netTotal = consultTotal - discount;
    pharmacyRevenue += netTotal;

    if (!dailyStats[dateKey]) dailyStats[dateKey] = { pharmacy: 0, appointment: 0 };
    dailyStats[dateKey].pharmacy += netTotal;

    if(discount > 0) {
        rawTransactions.push({
            id: "DSC-" + consult.id,
            date: consult.createdAt,
            type: "PHARMACY",
            patient: consult.patient?.name || "Walk-in",
            detail: "DISCOUNT APPLIED",
            amount: -discount, 
            appointmentId: consult.appointment?.readableId || "WALK-IN"
        });
    }
  });

  // B. PROCESS APPOINTMENTS (WITH FEE & DISCOUNTS)
  appointments.forEach(apt => {
    const amount = (apt.discount && apt.discount >= 500) ? 0 : 500;
    
    appointmentRevenue += amount;

    const dateKey = new Date(apt.date).toISOString().split('T')[0];
    
    if (!dailyStats[dateKey]) dailyStats[dateKey] = { pharmacy: 0, appointment: 0 };
    dailyStats[dateKey].appointment += amount;

    rawTransactions.push({
        id: "APT-" + apt.id,
        date: apt.date, 
        type: "APPOINTMENT",
        patient: apt.patient?.name || "Unknown", 
        detail: amount === 0 ? "Consultation (Free)" : "Consultation Fee",
        amount: amount,
        appointmentId: apt.readableId || "-"
    });
  });

  const revenueChartData = Object.keys(dailyStats).map(date => ({
    date,
    pharmacy: dailyStats[date].pharmacy,
    appointment: dailyStats[date].appointment,
    total: dailyStats[date].pharmacy + dailyStats[date].appointment
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const topMedicines = Object.entries(medicineSalesCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    summary: {
      totalRevenue: pharmacyRevenue + appointmentRevenue,
      pharmacyRevenue,
      appointmentRevenue,
      totalPatients: appointments.length, 
      totalPrescriptions: consultations.length,
      // ✅ ADDED WEIGHT LOSS STATS
      totalWeightLoss,
      weightLossByGender
    },
    charts: {
      revenueOverTime: revenueChartData,
      topMedicines
    },
    weightLossPatients: weightLossPatients.sort((a, b) => parseFloat(b.loss) - parseFloat(a.loss)), // ✅ Sorted List
    rawTransactions: rawTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  };
}