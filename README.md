# Sistem Penomoran & Kontrol Dokumen — PT Nirwana Bhumi Energi (NBE)

Aplikasi web modern berbasis **React + TypeScript + Vite** untuk pencatatan, penomoran otomatis, pengarsipan terkontrol, dan pelacakan seluruh dokumen resmi PT Nirwana Bhumi Energi sesuai dengan dokumen prosedur baku:
`0001-SOP-GNR-CEO-IX-2026` (*Documents and Records Control Procedure*).

---

## 🚀 Fitur Utama

1. **Penomoran Dokumen Otomatis (NBE Standard Format)**:
   - Format: `0000-XXX-YYY-OOO-IX-2026`
     * `0000`: Nomor urut sekuensial 4-digit otomatis per kategori dokumen (*per document type*).
     * `XXX`: Kode Kategori Dokumen (*Document Type*):
       - `SOP`: Standard Operating Procedure
       - `WIK`: Work Instruction
       - `MNL`: Manual
       - `KB`: Policy
     * `YYY`: Kode Divisi Penerbit (*Division Code*):
       - `GNR`: General
       - `ENG`: Engineering
       - `OPR`: Operation
       - `FNC`: Finance
     * `OOO`: Kode Pejabat Pengesah (*Approving Authority*):
       - `CEO`: President Director
       - `CTO`: Technical Director
       - `COO`: Operational Director
       - `CFO`: Finance Director
       - `MNG`: Manager
       - `SPV`: Supervisor
     * `IX`: Angka Romawi bulan penerbitan (I - XII)
     * `2026`: Tahun penerbitan dokumen
   - Contoh: `0001-SOP-ENG-CTO-IX-2026`

2. **Tombol Salin Cepat (1-Click Copy)**:
   - Menyalin kode yang telah digenerate langsung ke clipboard dengan feedback visual.

3. **Aturan Ketat Unik: 1 Kode Surat = 1 Dokumen**:
   - Sistem memvalidasi database secara real-time. Jika kode yang sama sudah pernah terdaftar, sistem akan memblokir dan menampilkan peringatan dokumen yang bentrok.

4. **Akses Pengubahan Kode Dokumen (Manual / Backdating)**:
   - Tersedia toggle **Mode Edit / Ubah Kode Manual** untuk menginputkan dokumen lampau (pra-sistem) yang belum sempat terdata, atau menyesuaikan nomor urut khusus.

5. **Upload Dokumen Langsung**:
   - Unggah file dokumen (PDF, Word, Excel) dengan penyimpanan lokal terenkripsi (IndexedDB) dan penampil pratinjau (PDF viewer) bawaan.

6. **Integrasi Database Google Drive**:
   - Menautkan link Google Drive perusahaan ke setiap dokumen sehingga siapapun dapat menelusuri kembali arsip dokumen lama kapan saja.
   - Fitur ekspor seluruh database ke CSV (kompatibel Google Sheets & Excel).

7. **Jaminan Data Tidak Hilang (Persistent Storage + Backup)**:
   - Dual-engine: IndexedDB + LocalStorage.
   - Fitur backup & restore database dalam format JSON & CSV.

8. **Database Convex Cloud Ready**:
   - Skema dan mutation/query siap pakai pada folder `convex/` (`schema.ts`, `documents.ts`).

---

## 🛠️ Menjalankan Proyek Lokal

```bash
# 1. Jalankan development server
npm run dev

# 2. Build untuk produksi
npm run build
```

---

## ☁️ Deployment

### 1. Vercel
File konfigurasi `vercel.json` sudah disediakan.
```bash
npx vercel --prod
```

### 2. Cloudflare Pages
File konfigurasi `wrangler.toml` dan `dist/` sudah siap dideploy ke Cloudflare Pages:
```bash
npx wrangler pages deploy dist --project-name nbe-surat
```

### 3. Convex Database
```bash
npx convex dev
```

---

## 🤖 Konfigurasi GitHub MCP

GitHub MCP telah dikonfigurasikan pada:
- Global: `~/.gemini/config/mcp_config.json`
- Workspace: `.agents/mcp_config.json`

Menggunakan `github-mcp-server.exe` dengan Personal Access Token aktif.
