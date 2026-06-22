import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { verifyAdminSession } from "@/lib/auth-helper";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get("formId");
    const fieldId = searchParams.get("fieldId");

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    }

    // Server-side check: enforce 5MB limit
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Ukuran berkas melebihi batas maksimal 5MB." }, { status: 400 });
    }

    // Check if client is admin (useful for banner uploads which don't have formId yet)
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("admin_session")?.value;
    const isAdmin = await verifyAdminSession(sessionToken);

    // If upload is from a form submission (has formId/fieldId), check schema
    if (formId && fieldId) {
      const formResult = await sql`
        SELECT fields FROM forms WHERE id = ${formId}
      `;

      if (formResult.length === 0) {
        return NextResponse.json({ error: "Formulir tidak ditemukan." }, { status: 404 });
      }

      const form = formResult[0];
      const fields = Array.isArray(form.fields)
        ? form.fields
        : typeof form.fields === "string"
          ? JSON.parse(form.fields)
          : [];

      const field = fields.find((f: any) => f.id === fieldId);
      if (!field) {
        return NextResponse.json({ error: "Input formulir tidak ditemukan." }, { status: 404 });
      }

      const fileTypes = field.fileTypes || "*";
      if (fileTypes !== "*") {
        const fileExt = `.${file.name.split(".").pop()?.toLowerCase()}`;
        
        if (fileTypes === "image/*" && !file.type.startsWith("image/")) {
          return NextResponse.json({ error: "Hanya berkas gambar (PNG, JPG, WebP, GIF) yang diizinkan." }, { status: 400 });
        }
        
        if (fileTypes === "audio/*" && !file.type.startsWith("audio/")) {
          return NextResponse.json({ error: "Hanya berkas audio (MP3, WAV, OGG) yang diizinkan." }, { status: 400 });
        }
        
        if (fileTypes.includes(".")) {
          const allowedExts = fileTypes.toLowerCase().split(",").map((e: string) => e.trim());
          if (!allowedExts.includes(fileExt)) {
            return NextResponse.json({ error: `Hanya berkas dengan ekstensi (${fileTypes}) yang diizinkan.` }, { status: 400 });
          }
        }
      }
    } else {
      // If no formId/fieldId is provided, we only allow upload if client is admin (e.g. uploading banners)
      if (!isAdmin) {
        return NextResponse.json({ error: "Akses ditolak: Hanya admin yang dapat mengunggah berkas umum." }, { status: 403 });
      }

      // Check that banners are images
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "Hanya berkas gambar yang dapat diunggah sebagai banner." }, { status: 400 });
      }
    }

    const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    // Fallback: If Vercel Blob token is set, use Vercel Blob
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(filename, file, {
          access: "public",
        });
        return NextResponse.json({ url: blob.url });
      } catch (blobError: any) {
        console.warn("Public upload failed. Checking if store is private...", blobError.message);
        if (
          blobError.message?.includes("private store") || 
          blobError.message?.includes("private access") || 
          blobError.message?.includes("access")
        ) {
          console.log("Retrying upload with access set to private...");
          const blob = await put(filename, file, {
            access: "private",
          });
          return NextResponse.json({ url: blob.url });
        }
        throw blobError;
      }
    }

    // Local Development Fallback: Save file to public/uploads
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);

    const fileUrl = `/uploads/${filename}`;
    return NextResponse.json({ url: fileUrl });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengunggah berkas." },
      { status: 500 }
    );
  }
}
