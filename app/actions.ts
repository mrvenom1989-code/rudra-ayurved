"use server";

import { prisma } from "@/lib/prisma"; // Fixes 'prisma' error
import { revalidatePath } from "next/cache"; // Fixes 'revalidatePath' error

// --- 1. GET ALL APPOINTMENTS (For Calendar) ---
export async function getAppointments() {
  try {
    const appointments = await prisma.appointment.findMany({
      orderBy: { createdAt: 'desc' } 
    });
    return appointments;
  } catch (error) {
    console.error("Fetch Error:", error);
    return [];
  }
}

// --- 2. SMART CREATE (Auto-creates Patient Profile) ---
export async function createAppointment(data: any) {
  try {
    let patient = await prisma.patient.findUnique({
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
        endTime: data.endTime,
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

// --- 4. DELETE ---
export async function deleteAppointment(id: string) {
  try {
    await prisma.appointment.delete({ where: { id } });
    revalidatePath("/calendar");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete" };
  }
}

// --- 5. GET FULL PATIENT PROFILE (For Patient Page) ---
export async function getPatientProfile(id: string) {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        appointments: { orderBy: { createdAt: 'desc' } },
        consultations: { 
          orderBy: { createdAt: 'desc' },
          // 👇 DEEP FETCH: Get the prescriptions and the medicine details
          include: {
            prescriptions: {
              include: {
                items: {
                  include: {
                    medicine: true
                  }
                }
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
    
    // 1. Find or Create Appointment
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

    // 2. Create Consultation
    const consultation = await prisma.consultation.create({
      data: {
        symptoms: data.symptoms,
        diagnosis: data.diagnosis,
        doctorName: appointment.doctor,
        appointmentId: appointment.id,
        patientId: patientId,
      }
    });

    // 3. Save Prescriptions (ACTUAL SAVING LOGIC)
    if (data.prescription && data.prescription.length > 0) {
      
      // A. Create the Prescription Sheet linked to this Consultation
      const prescriptionSheet = await prisma.prescription.create({
        data: { consultationId: consultation.id }
      });

      // B. Loop through items and save them
      for (const item of data.prescription) {
        // Upsert Medicine (Create if new)
        const medicine = await prisma.medicine.upsert({
          where: { name: item.medicine },
          update: {},
          create: { name: item.medicine, type: "Tablet", stock: 100 }
        });

        // Add Item to Prescription Sheet
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

    // 4. Close Appointment
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
}// --- 7. PHARMACY: GET INVENTORY ---
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

// --- 9. PHARMACY: GET LIVE QUEUE ---
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
          include: { items: { include: { medicine: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return consultations;
  } catch (error) {
    return [];
  }
}

// --- 10. PHARMACY: DISPENSE ITEM (With Quantity) ---
export async function dispenseMedicine(itemId: string, quantity: number) {
  try {
    const item = await prisma.prescriptionItem.findUnique({
      where: { id: itemId },
      include: { medicine: true }
    });

    if (!item || item.status === 'DISPENSED') return { success: false };

    // Reduce Stock by the specific quantity provided
    await prisma.medicine.update({
      where: { id: item.medicineId },
      data: { stock: { decrement: quantity } }
    });

    // Mark as Dispensed
    await prisma.prescriptionItem.update({
      where: { id: itemId },
      data: { status: 'DISPENSED' }
    });

    revalidatePath('/pharmacy');
    return { success: true };
  } catch (error) {
    return { success: false, error: "Stock Error" };
  }
}

// --- 11. PHARMACY: ADD NEW MEDICINE (Check if you have this!) ---
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
}// --- 13. DASHBOARD STATS (For the Staff Dashboard) ---
export async function getDashboardStats() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Count Appointments Today
    const appointmentCount = await prisma.appointment.count({
      where: { date: today }
    });

    // 2. Count Patients Waiting in Pharmacy (Pending Prescriptions)
    const queueCount = await prisma.prescriptionItem.count({
      where: { 
        status: 'PENDING',
        prescription: {
           createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) }
        }
      }
    });

    // 3. Count Low Stock Medicines (Below 10 units)
    const lowStockCount = await prisma.medicine.count({
      where: { stock: { lte: 10 } }
    });

    // 4. Get 5 Most Recent Appointments for the list
    const recentAppointments = await prisma.appointment.findMany({
      where: { date: today },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    return { 
      appointments: appointmentCount, 
      queue: queueCount, 
      lowStock: lowStockCount,
      recent: recentAppointments
    };
  } catch (error) {
    return { appointments: 0, queue: 0, lowStock: 0, recent: [] };
  }
}

// --- 14. AUTHENTICATION (Simple Mock) ---
export async function loginAction(email: string, password: string) {
  // Hardcoded for now. 
  // Admin Credentials: admin@rudra.com / admin123
  if (email === "admin@rudra.com" && password === "admin123") {
    return { success: true };
  }
  return { success: false };
}