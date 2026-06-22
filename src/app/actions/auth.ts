"use server";

import { cookies } from "next/headers";
import { hashPassword } from "@/lib/auth-helper";

export async function loginAction(password: string) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminPassword) {
    return { success: false, error: "Password admin belum diatur di server." };
  }

  if (password === adminPassword) {
    const token = await hashPassword(adminPassword);
    const cookieStore = await cookies();
    
    cookieStore.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
    
    return { success: true };
  }

  return { success: false, error: "Password salah!" };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");
  return { success: true };
}
