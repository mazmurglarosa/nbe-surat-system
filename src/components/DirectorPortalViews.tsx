import React from 'react';
import {
  ClipboardCheck,
  Calendar,
  FileSpreadsheet,
  FolderLock,
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Download,
  PlusCircle,
} from 'lucide-react';
import { DocumentRecord } from '../types';

interface ViewProps {
  documents: DocumentRecord[];
  onNavigateToCreate: () => void;
  onViewDocument: (doc: DocumentRecord) => void;
}

export const JobDeskView: React.FC = () => {
  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>
      <div style={{ margin: '1.75rem 0 1.25rem 0' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <ClipboardCheck color="var(--primary)" size={26} />
          Job Desk Direksi & Otoritas Dokumen
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
          Wewenang pengesahan dokumen PT Nirwana Bhumi Energi berdasarkan Prosedur 0001-SOP-GNR-CEO-IX-2026.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>
            Direktur Keuangan (CFO)
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Memiliki wewenang peninjauan dan pengesahan seluruh SOP, Instruksi Kerja, dan Formulir Divisi Finance (FNC).
          </p>
          <ul style={{ fontSize: '0.85rem', color: 'var(--text-main)', paddingLeft: '1.2rem', lineHeight: 1.8 }}>
            <li>Menyetujui SOP Finansial, Akuntansi, dan Anggaran Belanja</li>
            <li>Memverifikasi kepatuhan rekaman dokumen audit keuangan</li>
            <li>Pengarsipan dokumen legal & kontrak komersial PT Nirwana Bhumi Energi</li>
          </ul>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.5rem' }}>
            Direktur Utama (CEO)
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Pengesahan kebijakan utama (*Company Policy*), *Company Manual*, dan prosedur lintas departemen (*General*).
          </p>
          <ul style={{ fontSize: '0.85rem', color: 'var(--text-main)', paddingLeft: '1.2rem', lineHeight: 1.8 }}>
            <li>Menandatangani Kebijakan Mutu & Sistem Manajemen Terintegrasi</li>
            <li>Mengesahkan Prosedur Induk Pengendalian Dokumen & Rekaman</li>
            <li>Menetapkan arah strategis energi dan investasi perusahaan</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export const AgendaView: React.FC = () => {
  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>
      <div style={{ margin: '1.75rem 0 1.25rem 0' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Calendar color="var(--primary)" size={26} />
          Agenda Kegiatan Direksi & Jadwal Review Dokumen
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
          Jadwal berkala peninjauan ulang dokumen Sistem Manajemen Mutu NBE.
        </p>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '8px', background: 'var(--bg-secondary)' }}>
            <Calendar size={24} color="#0284c7" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Audit & Review Berkala Prosedur Keuangan (Q4 2026)</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>15 Oktober 2026 • Bersama Tim Finance & Auditor Internal</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '8px', background: 'var(--bg-secondary)' }}>
            <Calendar size={24} color="#10b981" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Rapat Manajemen Terintegrasi (IMS Meeting)</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>28 Oktober 2026 • Ruang Direksi & Online</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FinanceView: React.FC<ViewProps> = ({ documents, onViewDocument }) => {
  const financeDocs = documents.filter((d) => d.divisionCode === 'FNC' || d.approverCode === 'CFO');
  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>
      <div style={{ margin: '1.75rem 0 1.25rem 0' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <FileSpreadsheet color="var(--primary)" size={26} />
          Dokumen & Prosedur Divisi Keuangan (Finance)
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
          Daftar seluruh surat, SOP, dan rekaman yang diterbitkan atau disetujui oleh Direktur Keuangan.
        </p>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem' }}>
        {financeDocs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Belum ada dokumen khusus Finance yang terdaftar. Anda dapat mendaftarkannya pada menu "Daftarkan Surat".</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {financeDocs.map((d) => (
              <li key={d.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>{d.code}</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '0.2rem' }}>{d.title}</div>
                </div>
                <button onClick={() => onViewDocument(d)} className="btn btn-secondary btn-sm">Lihat Detail</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export const DataView: React.FC<{ type: 'personal' | 'shared' }> = ({ type }) => {
  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>
      <div style={{ margin: '1.75rem 0 1.25rem 0' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {type === 'personal' ? <FolderLock color="var(--primary)" size={26} /> : <Users color="var(--primary)" size={26} />}
          {type === 'personal' ? 'Data Pribadi Direktur Keuangan' : 'Data Bersama Direksi NBE'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
          {type === 'personal' ? 'Berkas internal dan arsip pribadi yang hanya dapat diakses oleh Direktur Keuangan.' : 'Pusat penyimpanan berkas kolaboratif jajaran direksi PT Nirwana Bhumi Energi.'}
        </p>
      </div>

      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p>Semua berkas dan catatan terenkripsi dan terhubung langsung dengan Google Drive aman perusahaan.</p>
      </div>
    </div>
  );
};
