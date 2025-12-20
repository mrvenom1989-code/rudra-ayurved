"use server";

import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

// 1. GET ALL USERS
export async function getUsers() {
  return await db.user.findMany({
    orderBy: { name: 'asc' },
    select: { 
      id: true, 
      name: true, 
      email: true, 
      role: true, 
      specialty: true 
      // Password is NOT selected for security
    }
  });
}

// 2. CREATE USER (With Password Hashing)
export async function createUser(data: any) {
  try {
    // Check if email exists
    const existing = await db.user.findUnique({ where: { email: data.email } });
    if (existing) return { success: false, error: "Email already registered" };

    // Hash the password (salt rounds: 10)
    const hashedPassword = await bcrypt.hash(data.password, 10);

    await db.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword, // Store the HASH, not the real password
        role: data.role,
        specialty: data.specialty || null,
      }
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Create User Error:", error);
    return { success: false, error: "Failed to create user" };
  }
}

// 3. DELETE USER
export async function deleteUser(id: string) {
  try {
    await db.user.delete({ where: { id } });
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete user" };
  }
}

// 4. UPDATE USER (Without changing password usually)
export async function updateUser(id: string, data: any) {
  await db.user.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      specialty: data.specialty
    }
  });
  revalidatePath("/admin/users");
}