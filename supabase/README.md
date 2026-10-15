# Panduan Integrasi Database Supabase - NBE Surat System

Dokumen ini menjelaskan langkah-langkah pengaturan database PostgreSQL di **Supabase** untuk aplikasi penomoran dokumen PT Nirwana Bhumi Energi.

---

## 1. Menjalankan Skrip SQL di Supabase

1. Buka dashboard proyek Supabase Anda: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Masuk ke proyek Anda, lalu klik menu **SQL Editor** pada sidebar kiri.
3. Klik **New query** (Query baru).
4. Buka file [`supabase/schema.sql`](file:///c:/Users/Mazmur%20Gusti%20Agung%20L/Documents/NBE/SURAT/supabase/schema.sql) di folder proyek ini, lalu salin (copy) seluruh kodenya.
5. Tempel (paste) ke dalam SQL Editor di Supabase.
6. Klik tombol **Run** (atau tekan `Ctrl + Enter`).

Tabel yang dibuat otomatis:
* **`documents`**: Menyimpan seluruh arsip penomoran surat, status, approver, revisi (JSONB), lampiran berkas, dan folder Google Drive.
* **`master_codes`**: Kategori surat (SOP, WIK, CSMS), sub-kategori, divisi, dan approver.
* **`activity_logs`**: Riwayat audit log aktivitas surat.
* **RLS & Policies**: Hak akses baca & tulis telah diatur otomatis dengan Row Level Security.
* **Seed Data**: Dokumen awal dan kategori default langsung terisi otomatis.

---

## 2. Memasang Environment Variables di Web

1. Buka menu **Project Settings** (ikon gear di kiri bawah dashboard Supabase) > **API**.
2. Salin nilai berikut:
   * **Project URL**: contoh `https://abcdefghijkl.supabase.co`
   * **Project API Keys (`anon` / `public`)**: string token panjang
3. Buka file [`.env`](file:///c:/Users/Mazmur%20Gusti%20Agung%20L/Documents/NBE/SURAT/.env) di root proyek ini, lalu masukkan nilainya:

```env
VITE_SUPABASE_URL="https://abcdefghijkl.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

4. Simpan file `.env`. Aplikasi web akan otomatis menyinkronkan data dokumen ke Supabase secara background!

---

## 3. Konfigurasi Supabase MCP Server

MCP Supabase telah dikonfigurasikan di sistem Anda melalui:
* File konfigurasi: `~/.gemini/config/mcp_config.json` dan `settings.json`
* Endpoint: `https://mcp.supabase.com/mcp?features=docs,account,database,debugging,development,functions,branching`
