-- ==============================================================================
-- SKEMA DATABASE SUPABASE: SISTEM PENOMORAN SURAT & DOKUMEN PT NIRWANA BHUMI ENERGI
-- ==============================================================================
-- Jalankan skrip ini langsung di menu "SQL Editor" pada Dashboard Supabase Anda.
-- Skrip ini idempotent (aman dijalankan berulang kali tanpa menghapus data yang ada).

-- Aktifkan ekstensi UUID (jika belum ada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. TABEL: documents (Arsip & Penomoran Dokumen Terkontrol)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.documents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    code TEXT NOT NULL UNIQUE,
    seq_number INTEGER NOT NULL,
    type_code TEXT NOT NULL,
    sub_category_code TEXT,
    sub_sub_category_code TEXT,
    division_code TEXT NOT NULL,
    approver_code TEXT NOT NULL,
    month_roman TEXT NOT NULL,
    year INTEGER NOT NULL,
    
    title TEXT NOT NULL,
    description TEXT,
    revision INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Published' CHECK (status IN ('Draft', 'In Review', 'Approved', 'Published', 'Archived')),
    
    created_by TEXT NOT NULL,
    approved_by TEXT,
    verified_by TEXT,
    issue_date TEXT NOT NULL,
    
    file_name TEXT,
    file_size BIGINT,
    file_type TEXT,
    file_url TEXT,
    google_drive_link TEXT,
    drive_folder_id TEXT,
    drive_folder_url TEXT,
    is_fixed BOOLEAN DEFAULT FALSE,
    
    is_folder BOOLEAN DEFAULT FALSE,
    folder_name TEXT,
    files JSONB DEFAULT '[]'::JSONB,
    
    is_manual_code BOOLEAN DEFAULT FALSE,
    legacy_notes TEXT,
    
    revisions JSONB DEFAULT '[]'::JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index performa query pencarian dan filter
CREATE INDEX IF NOT EXISTS idx_documents_code ON public.documents(code);
CREATE INDEX IF NOT EXISTS idx_documents_type_div ON public.documents(type_code, division_code);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_year ON public.documents(year);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);

-- ==============================================================================
-- 2. TABEL: master_codes (Kategori, Sub-Kategori, Divisi, Approver)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.master_codes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    category_group TEXT NOT NULL CHECK (category_group IN ('documentTypes', 'subCategories', 'subSubCategories', 'divisions', 'approvers')),
    code TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    is_custom BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_master_codes_group_code UNIQUE (category_group, code)
);

CREATE INDEX IF NOT EXISTS idx_master_codes_group ON public.master_codes(category_group);

-- ==============================================================================
-- 3. TABEL: activity_logs (Audit Trail Riwayat Aktivitas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_name TEXT NOT NULL,
    user_role TEXT DEFAULT 'Staff',
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    document_code TEXT,
    type TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('create', 'update', 'delete', 'export', 'system')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_doc_code ON public.activity_logs(document_code);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(timestamp DESC);

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) & ACCESS POLICIES
-- ==============================================================================
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Izinkan Read & Write bagi Anon Key (API publik aplikasi internal NBE)
DROP POLICY IF EXISTS "Allow anon read documents" ON public.documents;
CREATE POLICY "Allow anon read documents" ON public.documents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon insert documents" ON public.documents;
CREATE POLICY "Allow anon insert documents" ON public.documents FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update documents" ON public.documents;
CREATE POLICY "Allow anon update documents" ON public.documents FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow anon delete documents" ON public.documents;
CREATE POLICY "Allow anon delete documents" ON public.documents FOR DELETE USING (true);

-- Master codes policies
DROP POLICY IF EXISTS "Allow anon read master_codes" ON public.master_codes;
CREATE POLICY "Allow anon read master_codes" ON public.master_codes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon write master_codes" ON public.master_codes;
CREATE POLICY "Allow anon write master_codes" ON public.master_codes FOR ALL USING (true);

-- Activity logs policies
DROP POLICY IF EXISTS "Allow anon read activity_logs" ON public.activity_logs;
CREATE POLICY "Allow anon read activity_logs" ON public.activity_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon insert activity_logs" ON public.activity_logs;
CREATE POLICY "Allow anon insert activity_logs" ON public.activity_logs FOR INSERT WITH CHECK (true);

-- ==============================================================================
-- 5. TRIGGER OTOMATIS: Update updated_at timestamp
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_documents_updated_at ON public.documents;
CREATE TRIGGER trigger_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 6. DATA AWAL (SEED DATA): Seed Dokumen & Default Master Codes
-- ==============================================================================
-- Masukkan Dokumen Seed Awal (Jika belum ada)
INSERT INTO public.documents (
    id, code, seq_number, type_code, division_code, approver_code,
    month_roman, year, title, description, revision, status,
    created_by, approved_by, verified_by, issue_date,
    file_name, file_size, file_type, file_url, google_drive_link,
    revisions
) VALUES (
    'seed-0001-sop-gnr-ceo-ix-2026',
    '0001-SOP-GNR-CEO-IX-2026',
    1,
    'SOP',
    'GNR',
    'CEO',
    'IX',
    2026,
    'DOCUMENTS AND RECORDS CONTROL PROCEDURE',
    'Prosedur pengendalian dokumen dan rekaman Sistem Manajemen Terintegrasi PT Nirwana Bhumi Energi.',
    0,
    'Published',
    'Abdul Q',
    'President Director (CEO)',
    'Management Representative (MR)',
    '2026-09-14',
    '0001-SOP-GNR-CEO-IX-2026.pdf',
    852122,
    'application/pdf',
    '/0001-SOP-GNR-CEO-IX-2026.pdf',
    'https://drive.google.com/drive/folders/1ntut9Zjoc8tT5neNR2wUKMCkxIZvoS8U',
    '[{"revision":0,"date":"14 Sept 2026","description":"Initial Issue","revisedBy":"Abdul Q"}]'::JSONB
) ON CONFLICT (code) DO NOTHING;

-- Masukkan Default Kategori Dokumen (Document Types)
INSERT INTO public.master_codes (category_group, code, label, description, is_custom) VALUES
('documentTypes', 'SOP', 'Standard Operating Procedure', 'Standar operasional prosedur terintegrasi', FALSE),
('documentTypes', 'WIK', 'Work Instruction', 'Instruksi kerja teknis operasional harian', FALSE),
('documentTypes', 'MNL', 'Manual', 'Pedoman dan manual sistem manajemen perusahaan', FALSE),
('documentTypes', 'KB', 'Kebijakan', 'Kebijakan strategis direksi perusahaan', FALSE),
('documentTypes', 'CSMS', 'Contractor Safety Management System', 'Sistem Manajemen Keselamatan Kontraktor', FALSE)
ON CONFLICT (category_group, code) DO NOTHING;

-- Masukkan Default Divisi (Divisions)
INSERT INTO public.master_codes (category_group, code, label, description, is_custom) VALUES
('divisions', 'GNR', 'General & Corporate Affairs', 'Divisi korporat dan urusan umum', FALSE),
('divisions', 'ENG', 'Engineering', 'Divisi teknik, perencanaan, dan konstruksi', FALSE),
('divisions', 'OPR', 'Operations', 'Divisi operasional dan pemeliharaan lapangan', FALSE),
('divisions', 'FNC', 'Finance & Commercial', 'Divisi keuangan, akuntansi, dan komersial', FALSE)
ON CONFLICT (category_group, code) DO NOTHING;

-- Masukkan Default Approver (Penyetuju)
INSERT INTO public.master_codes (category_group, code, label, description, is_custom) VALUES
('approvers', 'CEO', 'President Director (CEO)', 'Penyetujuan tingkat Direktur Utama', FALSE),
('approvers', 'CTO', 'Chief Technology Officer (CTO)', 'Penyetujuan tingkat Direktur Teknologi & Operasi', FALSE),
('approvers', 'COO', 'Chief Operating Officer (COO)', 'Penyetujuan tingkat Direktur Operasional', FALSE),
('approvers', 'CFO', 'Chief Financial Officer (CFO)', 'Penyetujuan tingkat Direktur Keuangan', FALSE),
('approvers', 'MNG', 'Department Manager', 'Penyetujuan tingkat General Manager / Manager Divisi', FALSE),
('approvers', 'SPV', 'Supervisor / Lead', 'Penyetujuan tingkat Penyelia / Project Lead', FALSE)
ON CONFLICT (category_group, code) DO NOTHING;
