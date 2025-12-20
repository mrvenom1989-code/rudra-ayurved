"use server";

import { prisma as db } from "@/lib/prisma"; // Use your actual prisma path
import { revalidatePath } from "next/cache";

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
      // Note: Address/History fields missing in your Patient schema? 
      // If you added them, uncomment below:
      // address: data.address, 
      // history: data.history 
    }
  });
  revalidatePath(`/patients/${id}`);
}

// 5. SAVE CONSULTATION & PRESCRIPTION
export async function savePrescription(patientId: string, visitData: any) {
  try {
    // A. Find Medicine IDs first (Since your schema links by ID, not name)
    // We assume the frontend passes 'medicineId' in the prescription items
    
    // B. Create the Consultation
    const consultation = await db.consultation.create({
      data: {
        patientId,
        doctorName: "Dr. Chirag Raval", // Or pass from frontend
        symptoms: visitData.diagnosis, // Mapping 'notes' to 'symptoms' or 'diagnosis'
        diagnosis: visitData.diagnosis,
        createdAt: new Date(),
        
        // C. Create Prescription & Items
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
  // Use a transaction to clean up linked prescriptions first if strict
  await db.consultation.delete({ where: { id: consultationId } });
  revalidatePath(`/patients/${patientId}`);
}