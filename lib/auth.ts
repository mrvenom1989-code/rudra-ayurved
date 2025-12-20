import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretKey = "RUDRA_SECURE_KEY_CHANGE_THIS_IN_PROD"; 
const key = new TextEncoder().encode(secretKey);

// 1. Create Session
export async function createSession(payload: any) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Hours
  const session = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(key);

  const cookieStore = await cookies();
  cookieStore.set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

// 2. Verify Session (Middleware helper)
export async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return payload;
  } catch (error) {
    return null;
  }
}

// 3. Logout
export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}