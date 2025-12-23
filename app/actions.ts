"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs"; 
import { createSession, logout } from "@/lib/auth"; 

// --- 1. GET APPOINTMENTS (Updated for Calendar Date Filtering) ---
export async function getAppointments(start?: string, end?: string) {
  try {
    const where: any = {};
    
    // Add date filter if provided by the Calendar
    if (start && end) {
      where.date = {
        gte: start,
        lte: end
      };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { startTime: 'asc' }
    });

    // Map database fields to what the Frontend expects
    return appointments.map((apt: any) => ({
      ...apt,
      patientPhone: apt.phone, // Fixes missing phone in Calendar
      duration: 30             // Fixes missing duration in Calendar
    }));

  } catch (error) {
    console.error("Fetch Error:", error);
    return [];
  }
}

// --- 2. SMART CREATE (Auto-creates Patient Profile) ---
export async function createAppointment(data: any) {
  try {
    let patient = await prisma.patient.findFirst({
      where: { phone: data.phone }
    });

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          name: data.patientName,
          phone: data.phone,
          gender: "Unknown", 
          age: 0,
        }
      });
    }

    await prisma.appointment.create({
      data: {
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime || data.startTime, // Fallback if missing
        type: data.type,
        patientName: data.patientName,
        phone: data.phone,
        doctor: data.doctor,
        status: "SCHEDULED",
        patientId: patient.id
      },
    });
    
    revalidatePath("/calendar");
    return { success: true };
  } catch (error) {
    console.error("Create Error:", error);
    return { success: false, error: "Failed to book" };
  }
}

// --- 3. UPDATE APPOINTMENT ---
export async function updateAppointment(data: any) {
  try {
    await prisma.appointment.update({
      where: { id: data.id },
      data: {
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        type: data.type,
        patientName: data.patientName,
        phone: data.phone,
        doctor: data.doctor,
      },
    });

    revalidatePath("/calendar");
    return { success: true };
  } catch (error) {
    console.error("Update Error:", error);
    return { success: false, error: "Failed to update" };
  }
}

// --- 4. DELETE APPOINTMENT ---
export async function deleteAppointment(id: string) {
  try {
    await prisma.appointment.delete({ where: { id } });
    revalidatePath("/calendar");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete" };
  }
}

// --- 5. GET FULL PATIENT PROFILE ---
export async function getPatientProfile(id: string) {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        appointments: { orderBy: { createdAt: 'desc' } },
        consultations: { 
          orderBy: { createdAt: 'desc' },
          include: {
            prescriptions: {
              include: {
                items: { include: { medicine: true } }
              }
            }
          }
        }
      }
    });
    return patient;
  } catch (error) {
    console.error("Profile Error:", error);
    return null;
  }
}

// --- 6. SAVE CONSULTATION & PRESCRIPTION ---
export async function saveConsultation(patientId: string, data: any) {
  try {
    const today = new Date().toISOString().split('T')[0]; 
    
    let appointment = await prisma.appointment.findFirst({
      where: { patientId: patientId, status: "SCHEDULED" },
      orderBy: { createdAt: 'desc' }
    });

    if (!appointment) {
      appointment = await prisma.appointment.create({
        data: {
          patientId,
          patientName: "Walk-in Patient", 
          phone: "-",
          doctor: "Dr. Chirag",
          date: today,
          startTime: new Date().toLocaleTimeString(),
          endTime: new Date().toLocaleTimeString(),
          type: "Walk-in",
          status: "COMPLETED"
        }
      });
    }

    const consultation = await prisma.consultation.create({
      data: {
        symptoms: data.symptoms,
        diagnosis: data.diagnosis,
        doctorName: appointment.doctor,
        appointmentId: appointment.id,
        patientId: patientId,
      }
    });

    if (data.prescription && data.prescription.length > 0) {
      const prescriptionSheet = await prisma.prescription.create({
        data: { consultationId: consultation.id }
      });

      for (const item of data.prescription) {
        const medicine = await prisma.medicine.upsert({
          where: { name: item.medicine },
          update: {},
          create: { name: item.medicine, type: "Tablet", stock: 100 }
        });

        await prisma.prescriptionItem.create({
          data: {
            prescriptionId: prescriptionSheet.id,
            medicineId: medicine.id,
            dosage: item.dosage,
            duration: item.duration,
            instruction: item.instruction
          }
        });
      }
    }

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: "COMPLETED" }
    });

    revalidatePath(`/patients/${patientId}`);
    return { success: true };

  } catch (error) {
    console.error("Save Error:", error);
    return { success: false, error: "Failed to save consultation" };
  }
}

// --- 7. PHARMACY: GET INVENTORY ---
export async function getInventory() {
  try {
    const medicines = await prisma.medicine.findMany({ orderBy: { name: 'asc' } });
    return medicines;
  } catch (error) {
    return [];
  }
}

// --- 8. PHARMACY: UPDATE STOCK/PRICE ---
export async function updateMedicine(id: string, data: any) {
  try {
    await prisma.medicine.update({
      where: { id },
      data: {
        stock: parseInt(data.stock),
        price: parseFloat(data.price)
      }
    });
    revalidatePath('/pharmacy');
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

// --- 9. PHARMACY: GET LIVE QUEUE (Updated for Stability) ---
export async function getPharmacyQueue() {
  try {
    const consultations = await prisma.consultation.findMany({
      where: {
        createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) },
        prescriptions: { some: {} }
      },
      include: {
        patient: true,
        prescriptions: {
          include: { 
            items: { 
              include: { medicine: true },
              orderBy: { id: 'asc' } // Keep items in stable order
            } 
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return consultations;
  } catch (error) {
    return [];
  }
}

// --- 10. PHARMACY: DISPENSE ITEM (Updated for dispensedQty) ---
export async function dispenseMedicine(itemId: string, quantity: number) {
  try {
    const item = await prisma.prescriptionItem.findUnique({
      where: { id: itemId },
      include: { medicine: true }
    });

    if (!item || item.status === 'DISPENSED') return { success: false };

    // 1. Deduct Stock
    await prisma.medicine.update({
      where: { id: item.medicineId },
      data: { stock: { decrement: quantity } }
    });

    // 2. Mark as Dispensed AND Save Quantity
    await prisma.prescriptionItem.update({
      where: { id: itemId },
      data: { 
        status: 'DISPENSED',
        dispensedQty: quantity // 👈 Now saving the actual quantity given
      }
    });

    revalidatePath('/pharmacy');
    return { success: true };
  } catch (error) {
    return { success: false, error: "Stock Error" };
  }
}

// --- 11. PHARMACY: ADD NEW MEDICINE ---
export async function createMedicine(data: any) {
  try {
    await prisma.medicine.create({
      data: {
        name: data.name,
        type: data.type || "Tablet",
        stock: parseInt(data.stock) || 0,
        price: parseFloat(data.price) || 0
      }
    });
    revalidatePath('/pharmacy');
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to add" };
  }
}

// --- 12. PHARMACY: DELETE MEDICINE ---
export async function deleteMedicine(id: string) {
  try {
    await prisma.medicine.delete({ where: { id } });
    revalidatePath('/pharmacy');
    return { success: true };
  } catch (error) {
    return { success: false, error: "Cannot delete used medicine" };
  }
}

// --- 13. DASHBOARD STATS ---
export async function getDashboardStats() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Appointments Today
    const appointmentCount = await prisma.appointment.count({ where: { date: today } });
    
    // 2. Pending Requests
    const requests = await prisma.appointmentRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // 3. Pending Pharmacy Queue
    const queueCount = await prisma.prescriptionItem.count({
      where: { 
        status: 'PENDING',
        prescription: {
           createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) }
        }
      }
    });

    // 4. Low Stock Count
    const lowStockCount = await prisma.medicine.count({
      where: { stock: { lte: 10 } }
    });

    // 5. Recent Appointments
    const recentAppointments = await prisma.appointment.findMany({
      where: { date: today },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    return { 
      appointments: appointmentCount, 
      queue: queueCount, 
      lowStock: lowStockCount,
      recent: recentAppointments,
      requests: requests 
    };
  } catch (error) {
    return { appointments: 0, queue: 0, lowStock: 0, recent: [], requests: [] };
  }
}

// --- 14. AUTHENTICATION (SECURE) ---

export async function loginAction(email: string, password: string) {
  if (!email || !password) {
    return { success: false, error: "Please provide valid credentials." };
  }

  try {
    // A. Find User
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { success: false, error: "Invalid credentials." };
    }

    // B. Check Password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return { success: false, error: "Invalid credentials." };
    }

    // C. Create Session
    await createSession({
      userId: user.id,
      name: user.name,
      role: user.role,
      email: user.email
    });

    return { success: true };
    
  } catch (error) {
    console.error("Login Error:", error);
    return { success: false, error: "Something went wrong." };
  }
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}

// --- 15. APPOINTMENT REQUESTS (Landing Page) ---
export async function createConsultationRequest(data: any) {
  try {
    if (!data.phone) return { success: false, error: "Phone number is required" };

    await prisma.appointmentRequest.create({
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
    return await prisma.appointmentRequest.findMany({
      orderBy: { createdAt: 'desc' },
      where: { status: 'PENDING' }
    });
  } catch (error) {
    return [];
  }
}

// --- 16. DELETE/COMPLETE REQUEST ---
export async function completeRequest(id: string) {
  try {
    await prisma.appointmentRequest.delete({ where: { id } });
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}