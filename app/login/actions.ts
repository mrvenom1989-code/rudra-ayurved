"use server";

import { prisma as db } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Please enter both email and password." };
  }

  // 1. Find User
  const user = await db.user.findUnique({
    where: { email },
  });

  if (!user) {
    return { error: "Invalid email or password." };
  }

  // 2. Check Password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return { error: "Invalid email or password." };
  }

  // 3. Create Session
  await createSession({
    userId: user.id,
    name: user.name,
    role: user.role,
    email: user.email
  });

  // 4. Redirect
  redirect("/dashboard");
}