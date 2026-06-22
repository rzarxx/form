import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
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
    
    // Ensure the directory exists
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
