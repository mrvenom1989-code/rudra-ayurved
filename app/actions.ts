"use server";

import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createSession, logout } from "@/lib/auth"; 
import bcrypt from "bcryptjs";

// ==========================================
// 🛠️ HELPER: SMART ID GENERATOR
// ==========================================
async function generateReadableId(type: 'patient' | 'opd' | 'ipd') {
  const counterName = type === 'patient' ? 'patient' : (type === 'opd' ? 'appointment_opd' : 'appointment_ipd');
  const prefix = type === 'patient' ? 'PT-' : (type === 'opd' ? 'RAOPD' : 'RAIPD');
  
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

// ✅ FIXED: Added `appointment: true` so ID shows correctly in history
export async function getPatientData(patientId: string) {
  try {
    return await db.patient.findUnique({
      where: { id: patientId },
      include: {
        consultations: {
          orderBy: { createdAt: 'desc' },
          include: {
            appointment: true, // 👈 KEY FIX FOR "WALK-IN" BUG
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
    const existing = await db.patient.findUnique({ where: { phone: data.phone } });
    if (existing) return { success: false, error: "Patient with this phone already exists." };

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
        history: data.history
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
        history: data.history
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

    // 3. ENSURE PATIENT EXISTS (Fixes crash on blocking)
    let patientId = data.patientId;
    if (!patientId && data.phone) {
      const existingPatient = await db.patient.findUnique({
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
        patientId
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

// ✅ FIXED: Handles Missing Symptoms & Resolves Readable IDs
export async function savePrescription(patientId: string, visitData: any, consultationId?: string) {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. RESOLVE APPOINTMENT ID (Fixes "RAOPD..." vs UUID mismatch)
    let finalAppointmentId = visitData.appointmentId;
    
    // If we have an ID and it looks like a Readable ID (starts with RA), find the real UUID
    if (finalAppointmentId && finalAppointmentId.startsWith('RA')) {
        const appointmentObj = await db.appointment.findUnique({
            where: { readableId: finalAppointmentId }
        });
        if (appointmentObj) {
            finalAppointmentId = appointmentObj.id;
        } else {
            finalAppointmentId = null; // Invalid ID passed
        }
    }

    // If no ID passed, try to auto-find today's scheduled appointment
    if (!finalAppointmentId) {
        const appointment = await db.appointment.findFirst({
            where: { patientId, date: today, status: "SCHEDULED" }
        });
        if(appointment) finalAppointmentId = appointment.id;
    }

    // 2. PREPARE DATA (Fixes Missing Symptoms)
    const diagnosisText = visitData.diagnosis || "Consultation";
    const symptomsText = visitData.symptoms || diagnosisText; // 👈 Fallback ensures this is never empty

    // CASE 1: EDIT EXISTING RECORD
    if (consultationId) {
       await db.prescriptionItem.deleteMany({
           where: { prescription: { consultationId: consultationId } }
       });
       
       await db.consultation.update({
           where: { id: consultationId },
           data: {
               diagnosis: diagnosisText,
               symptoms: symptomsText, // ✅ Fixed
               notes: visitData.notes,
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
        appointmentId: finalAppointmentId || null, // ✅ Uses resolved UUID
        doctorName: visitData.doctorName || "Dr. Chirag Raval",
        diagnosis: diagnosisText,
        symptoms: symptomsText, // ✅ Fixed
        notes: visitData.notes,
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

// ✅ FIXED: Only show queue if items are PENDING (Fixes Issue #10)
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
      appointment: true, // Needed for Bill ID
      prescriptions: {
        include: { items: { include: { medicine: true }, orderBy: { id: 'asc' } } }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

// ✅ UPDATED: Supports Date Range & Default View (Last 20 items)
export async function getDispensedHistory(query: string, startDate?: string, endDate?: string) {
  // Build dynamic where clause
  const where: any = {
    prescriptions: { some: {} } // Always ensure it has prescriptions
  };

  // 1. Search Query (Optional)
  if (query) {
    where.OR = [
      { patient: { name: { contains: query, mode: 'insensitive' } } },
      { patient: { phone: { contains: query } } },
      { patient: { readableId: { contains: query, mode: 'insensitive' } } }
    ];
  }

  // 2. Date Range Filter (Optional)
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
        where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
       // Set end date to the very end of that day (23:59:59)
       const end = new Date(endDate);
       end.setHours(23, 59, 59, 999);
       where.createdAt.lte = end;
    }
  }

  // 3. Fetch Data (Always returns something now)
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
    take: 20 // Default limit
  });
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
  await db.medicine.create({
    data: {
      name: data.name,
      type: data.type || "Tablet",
      stock: parseInt(data.stock) || 0,
      price: parseFloat(data.price) || 0
    }
  });
  revalidatePath('/pharmacy');
  return { success: true };
}

export async function updateMedicine(id: string, data: any) {
  await db.medicine.update({
    where: { id },
    data: { stock: parseInt(data.stock), price: parseFloat(data.price) }
  });
  revalidatePath('/pharmacy');
  return { success: true };
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
  // 1. Fix Date: Force IST (UTC+5:30)
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  const todayStr = istDate.toISOString().split('T')[0];
  
  // Calculate Tomorrow
  const tomorrow = new Date(istDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // 2. Start of Day UTC calculation for Queue
  const startOfDayIST = new Date(todayStr); 
  const startOfDayUTC = new Date(startOfDayIST.getTime() - istOffset);

  const [appointments, requests, queueCount, lowStock, completed, upcoming] = await Promise.all([
    // Count Today's Appointments
    db.appointment.count({ 
        where: { date: todayStr, status: { not: "CANCELLED" } } 
    }),

    // Web Requests
    db.appointmentRequest.findMany({ orderBy: { createdAt: 'desc' } }),

    // Queue (Patients with pending items)
    db.consultation.count({
        where: {
            createdAt: { gte: startOfDayUTC },
            prescriptions: { some: { items: { some: { status: 'PENDING' } } } }
        }
    }),

    // Low Stock
    db.medicine.count({ where: { stock: { lte: 10 } } }),

    // Recent Activity: Only COMPLETED appointments
    db.appointment.findMany({ 
        where: { status: 'COMPLETED' }, 
        take: 5, 
        orderBy: { updatedAt: 'desc' } // Most recently finished
    }),

    // Upcoming: Today & Tomorrow
    db.appointment.findMany({
        where: { 
            date: { in: [todayStr, tomorrowStr] },
            status: { not: "CANCELLED" }
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
    })
  ]);

  return { appointments, requests, queue: queueCount, lowStock, recent: completed, upcoming };
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