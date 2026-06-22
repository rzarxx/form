# Product Requirements Document (PRD)
## Nama Proyek Sistem Formulir Pribadi (Personal Form Builder)
## Versi 1.0.0
## Tanggal 22 Juni 2026

---

### 1. Ringkasan Proyek (Project Overview)
Proyek ini bertujuan untuk membangun sebuah sistem pengisian formulir online mandiri yang menyerupai Google Forms, namun disesuaikan hanya untuk penggunaan pribadiinternal. Fokus utama sistem ini adalah kemudahan pengaturan (fast setup), antarmuka yang modern, responsif, dan biaya operasional yang gratis (ServerlessFree Tier). 

### 2. Tujuan (Goals)
 Memiliki kontrol penuh atas data respons formulir.
 Mengurangi ketergantungan pada layanan pihak ketiga.
 Menyediakan antarmuka yang indah dan profesional bagi pengisi formulir maupun pengelola (admin).
 Waktu peluncuran (deployment) yang instan tanpa perlu manajemen server (Serverless).

### 3. Tumpukan Teknologi (Tech Stack)
 Hosting & Infrastruktur Vercel (Serverless)
 Framework Utama Next.js (App Router) dengan TypeScriptJavaScript
 Tampilan (UIUX) Tailwind CSS + Komponen shadcnui
 Validasi Formulir React Hook Form + Zod
 Database & Backend Supabase (PostgreSQL)  Vercel Postgres
 Autentikasi Admin Next.js Middleware (Environment Variable base) atau Supabase Auth.

---

### 4. Kebutuhan Fitur (Feature Requirements)

#### A. Halaman Publik (Pengisi Formulir)
1. Halaman Formulir Dinamis
   - Menampilkan formulir dengan berbagai jenis input (Teks pendek, Paragraf, Dropdown, Radio button).
   - Antarmuka yang bersih (minimalis) menyerupai standar modern.
2. Validasi Input Secara Langsung (Real-time Validation)
   - Mencegah pengiriman formulir jika ada kolom wajib yang kosong.
   - Memastikan format email atau nomor telepon sesuai.
   - Pesan kesalahan (error message) yang jelas dan estetik (menggunakan desain dari shadcnui).
3. Status Pengiriman
   - Loading state pada tombol Submit saat memproses data.
   - Pesan sukses (Sukses Page  Toast Notification) setelah formulir berhasil dikirim.

#### B. Panel Admin (Pengelola)
1. Sistem Keamanan (Login)
   - Halaman login sederhana `login`.
   - Menggunakan password tunggal (disimpan di `.env`) atau emailpassword untuk melindungi rute `admin`.
2. Dasbor Ringkasan (Dashboard)
   - Menampilkan kartu ringkasan (Total Respons, Respons Terbaru).
3. Tabel Data (Data Table)
   - Menampilkan seluruh data yang masuk dalam bentuk tabel rapi (menggunakan TanStack Table via shadcnui).
   - Fitur paginasi (halaman 1, 2, 3...) untuk menangani data dalam jumlah besar.
   - Fitur pencarianfilter sederhana.
4. Fitur Ekspor (Export)
   - Tombol Unduh CSV untuk mengekspor data respons yang ada di tabel ke dalam format yang bisa dibuka oleh Microsoft ExcelGoogle Sheets.

---

### 5. Alur Pengguna (User Flow)

 Pengisi Formulir 
  Membuka Tautan - Melihat Formulir - Mengisi Data - Klik Submit - Sistem Memvalidasi - Data Tersimpan di Database - Pengguna Melihat Pesan Sukses.

 Admin (Pemilik)
  Membuka `admin` - Dialihkan ke halaman `login` jika belum masuk - Memasukkan kata sandi - Masuk ke Panel Dasbor - Melihat statistik dan tabel data - (Opsional) Mengunduh data CSV.

---

### 6. Struktur Basis Data (Database Schema - SupabasePostgres)
Nama Tabel `form_responses`

 Nama Kolom   Tipe Data    Keterangan                           
 ---         ---         ---                                 
 id           UUID  Int   Primary Key, Auto-incrementGenerate 
 created_at   Timestamp    Waktu ketika formulir di-submit      
 full_name    Varchar      Nama pengisi formulir                
 email        Varchar      Email pengisi formulir               
 message      Text         Jawabanpesan formulir               
(Catatan Kolom disesuaikan dengan kebutuhan form saat dibuat)

---

### 7. Keamanan & Performa (Non-Functional Requirements)
 Performa Loading halaman tidak boleh lebih dari 2 detik (terjamin dengan Next.js di Vercel).
 Keamanan Mencegah serangan SQL Injection dengan menggunakan ORM atau SDK resmi (seperti Supabase Client  Server Actions).
 Responsif Halaman formulir dan panel admin harus nyaman digunakan baik di Smartphone maupun Desktop (Mobile-first approach).

### 8. Panduan Rilis (Deployment Guide)
1. Buat repositori di GitHub.
2. Push kode ke GitHub.
3. Hubungkan repositori GitHub ke Vercel.
4. Tambahkan Environment Variables (Kredensial Database & Password Admin) di pengaturan Vercel.
5. Klik Deploy.
