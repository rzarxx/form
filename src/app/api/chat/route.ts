import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Fungsi wrapper khusus dengan algoritma Exponential Backoff (jeda 1s, 2s, 4s)
 * untuk menangani transient error dari API Google Gemini (status 429 dan 503).
 * Batas maksimal retry adalah 3 kali.
 */
async function runWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      
      // Deteksi error 429 (Rate Limit) atau 503 (Service Unavailable)
      const errorMsg = error?.message || "";
      const errorStatus = error?.status;
      
      const isRateLimit = 
        errorStatus === 429 || 
        errorMsg.includes("429") || 
        errorMsg.toLowerCase().includes("too many requests");
        
      const isServiceUnavailable = 
        errorStatus === 503 || 
        errorMsg.includes("503") || 
        errorMsg.toLowerCase().includes("service unavailable");

      const isTransient = isRateLimit || isServiceUnavailable;

      if (isTransient && attempt <= maxRetries) {
        // Jeda waktu: 2^(attempt-1) * 1000 milidetik (1s, 2s, 4s)
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.warn(
          `[Gemini API] Mengalami transient error (${isRateLimit ? "429/Rate Limit" : "503/Service Unavailable"}). ` +
          `Mencoba kembali dalam ${delay}ms... (Percobaan ke-${attempt} dari ${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Jika bukan transient error atau percobaan habis, lempar error asli
      throw error;
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Format request tidak valid atau riwayat pesan kosong." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[Gemini API Router] Kredensial GEMINI_API_KEY tidak dikonfigurasi.");
      return NextResponse.json(
        { error: "Layanan asisten saat ini sedang sibuk. Mohon tunggu beberapa saat dan coba lagi." },
        { status: 500 }
      );
    }

    // 1. OPTIMASI TOKEN: Sliding Window (mengambil maksimal 4 pesan terakhir)
    const lastMessages = messages.slice(-4);

    // Konversi ke format content schema Google Gemini SDK
    const contents = lastMessages.map((msg: any) => {
      // Map role 'assistant' ke 'model' sesuai spesifikasi Gemini SDK
      const role = msg.role === "assistant" || msg.role === "model" ? "model" : "user";
      const text = msg.content || msg.text || (msg.parts && msg.parts[0]?.text) || "";
      
      return {
        role,
        parts: [{ text }],
      };
    });

    // Inisialisasi SDK Google Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Terapkan systemInstruction untuk mengatur persona dan batasi output dengan maxOutputTokens
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: 
        "Anda adalah asisten AI yang cerdas, sopan, dan solutif. " +
        "Harap berikan respons secara ringkas, padat, dan jelas dalam Bahasa Indonesia. " +
        "Jika pengguna meminta format data tertentu seperti JSON, berikan respons dalam JSON yang valid tanpa blok kode markdown.",
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
    });

    // Jalankan pemanggilan model dengan wrapper exponential backoff
    const result = await runWithExponentialBackoff(async () => {
      return await model.generateContent({
        contents,
      });
    });

    const response = result.response;
    const responseText = response.text();

    return NextResponse.json({
      success: true,
      content: responseText,
    });

  } catch (error: any) {
    console.error("[Gemini API Router Error]:", error);
    
    // Kembalikan NextResponse 500 dengan pesan ramah pengguna tanpa membocorkan raw error message
    return NextResponse.json(
      { error: "Layanan asisten saat ini sedang sibuk. Mohon tunggu beberapa saat dan coba lagi." },
      { status: 500 }
    );
  }
}
