"use server";

import { cookies, headers } from "next/headers";
import { sql } from "@/lib/db";
import { initDatabase } from "@/lib/db-init";
import { verifyAdminSession } from "@/lib/auth-helper";

// Helper to enforce authentication in admin actions
async function requireAuth() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("admin_session")?.value;
  const isAuthenticated = await verifyAdminSession(sessionToken);
  if (!isAuthenticated) {
    throw new Error("Unauthorized: Anda harus masuk sebagai admin.");
  }
}

export async function createFormAction(
  title: string,
  description: string,
  fields: any[],
  bannerUrl?: string,
  maxResponses: number = 0,
  isActive: boolean = true
) {
  try {
    await requireAuth();
    await initDatabase();

    if (!title) {
      return { success: false, error: "Judul formulir wajib diisi." };
    }

    const fieldsJson = JSON.stringify(fields);

    const result = await sql`
      INSERT INTO forms (title, description, fields, banner_url, max_responses, is_active)
      VALUES (${title}, ${description || null}, ${fieldsJson}, ${bannerUrl || null}, ${maxResponses}, ${isActive})
      RETURNING id, title, created_at
    `;

    return { success: true, data: result[0] };
  } catch (error: any) {
    console.error("Error creating form:", error);
    return { success: false, error: error.message || "Gagal membuat formulir." };
  }
}

export async function getFormsAction() {
  try {
    await requireAuth();
    await initDatabase();

    // Fetch forms along with response counts using a LEFT JOIN and GROUP BY
    const forms = await sql`
      SELECT f.id, f.title, f.description, f.created_at, f.fields, f.banner_url, f.max_responses, f.is_active,
             COUNT(r.id)::int as response_count
      FROM forms f
      LEFT JOIN form_responses r ON f.id = r.form_id
      GROUP BY f.id
      ORDER BY f.created_at DESC
    `;

    return { success: true, data: forms };
  } catch (error: any) {
    console.error("Error fetching forms:", error);
    return { success: false, error: error.message || "Gagal memuat daftar formulir." };
  }
}

export async function getFormDetailAction(formId: string) {
  try {
    await requireAuth();
    await initDatabase();

    // Fetch form configuration
    const formResult = await sql`
      SELECT id, title, description, created_at, fields, banner_url, max_responses, is_active
      FROM forms
      WHERE id = ${formId}
    `;

    if (formResult.length === 0) {
      return { success: false, error: "Formulir tidak ditemukan." };
    }

    // Fetch responses for this form
    const responses = await sql`
      SELECT id, created_at, answers, ip_address
      FROM form_responses
      WHERE form_id = ${formId}
      ORDER BY created_at DESC
    `;

    return {
      success: true,
      data: {
        form: formResult[0],
        responses: responses,
      },
    };
  } catch (error: any) {
    console.error("Error fetching form details:", error);
    return { success: false, error: error.message || "Gagal memuat detail formulir." };
  }
}

export async function deleteFormAction(formId: string) {
  try {
    await requireAuth();
    await initDatabase();

    await sql`
      DELETE FROM forms
      WHERE id = ${formId}
    `;

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting form:", error);
    return { success: false, error: error.message || "Gagal menghapus formulir." };
  }
}

export async function submitResponseAction(formId: string, answers: Record<string, any>) {
  try {
    await initDatabase();

    if (!formId) {
      return { success: false, error: "ID formulir tidak valid." };
    }

    // 1. Get client IP address
    const headerList = await headers();
    const ip = headerList.get("x-forwarded-for")?.split(",")[0] || headerList.get("x-real-ip") || "127.0.0.1";

    // 2. Fetch form details to verify if active and check response limits
    const formResult = await sql`
      SELECT is_active, max_responses FROM forms WHERE id = ${formId}
    `;

    if (formResult.length === 0) {
      return { success: false, error: "Formulir tidak ditemukan." };
    }

    const form = formResult[0];

    // 3. Check if form is active
    if (!form.is_active) {
      return { success: false, error: "Formulir ini sudah ditutup dan tidak menerima tanggapan lagi." };
    }

    // 4. Check if max responses per IP is limited (e.g. limit to 1 response)
    if (form.max_responses === 1) {
      const existingResponse = await sql`
        SELECT id FROM form_responses 
        WHERE form_id = ${formId} AND ip_address = ${ip} 
        LIMIT 1
      `;
      if (existingResponse.length > 0) {
        return { success: false, error: "Anda sudah mengirimkan tanggapan untuk formulir ini (Batasi 1 Tanggapan per IP)." };
      }
    }

    // 5. Insert response (using sql.json helper for proper JSONB serialization)
    await sql`
      INSERT INTO form_responses (form_id, answers, ip_address)
      VALUES (${formId}, ${sql.json(answers)}, ${ip})
    `;

    return { success: true };
  } catch (error: any) {
    console.error("Error submitting response:", error);
    return { success: false, error: error.message || "Gagal mengirim tanggapan." };
  }
}

export async function getPublicFormAction(formId: string) {
  try {
    await initDatabase();

    const formResult = await sql`
      SELECT id, title, description, fields, banner_url, max_responses, is_active
      FROM forms
      WHERE id = ${formId}
    `;

    if (formResult.length === 0) {
      return { success: false, error: "Formulir tidak ditemukan." };
    }

    return { success: true, data: formResult[0] };
  } catch (error: any) {
    console.error("Error fetching public form:", error);
    return { success: false, error: error.message || "Gagal memuat formulir." };
  }
}

export async function checkIpSubmissionAction(formId: string) {
  try {
    await initDatabase();
    
    const headerList = await headers();
    const ip = headerList.get("x-forwarded-for")?.split(",")[0] || headerList.get("x-real-ip") || "127.0.0.1";

    const existing = await sql`
      SELECT id FROM form_responses
      WHERE form_id = ${formId} AND ip_address = ${ip}
      LIMIT 1
    `;

    return { success: true, submitted: existing.length > 0 };
  } catch (error: any) {
    console.error("Error checking IP submission:", error);
    return { success: false, error: error.message };
  }
}

export async function toggleFormActiveAction(formId: string, isActive: boolean) {
  try {
    await requireAuth();
    await initDatabase();

    await sql`
      UPDATE forms
      SET is_active = ${isActive}
      WHERE id = ${formId}
    `;

    return { success: true };
  } catch (error: any) {
    console.error("Error toggling form active status:", error);
    return { success: false, error: error.message || "Gagal memperbarui status formulir." };
  }
}
