"use server";

/**
 * patients/actions.ts
 *
 * This file is the single source of truth for patient-related server actions
 * used by pages under app/patients/.
 *
 * ARCHITECTURE NOTE (BUG-5 FIX):
 * Previously this file duplicated many functions from app/actions.ts, causing
 * bugs where fixes in one file were not reflected in the other.
 *
 * Shared/duplicate functions are now RE-EXPORTED from app/actions.ts.
 * Only functions unique to this module (patient profile & history retrieval)
 * are defined here.
 */

import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getISTDateString } from "@/utils/date";

// The shared functions (createPatient, updatePatient, deletePatient, deleteVisit, savePrescription, uploadConsultationReport, updatePatientWallet, getPharmacyInventory) 
// are now imported directly from "@/app/actions" where they are used.

// ─── HELPER: ID GENERATOR (local — not exported from app/actions.ts) ─────────
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

// ─── UNIQUE: Fetch Full Patient Profile (with consultation history) ───────────
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

// ─── UNIQUE: Search Patients (with today's appointment linking) ───────────────
export async function searchPatients(query: string) {
  if (!query) return [];

  const today = getISTDateString();

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

// ─── UNIQUE: Get Patients List (with today's appointment badge) ───────────────
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

    const today = getISTDateString();

    return await db.patient.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: {
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

// ─── UNIQUE: Update Patient Details (from Patient Profile page) ───────────────
// Note: This is distinct from updatePatient (used in Patient Manager list).
// updatePatientDetails updates the full profile including medical history.
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
        location: data.location,
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