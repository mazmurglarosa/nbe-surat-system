import React from 'react';
import {
  BarChart3,
  FileText,
  Layers,
  CheckCircle2,
  Clock,
  Archive,
  TrendingUp,
  Building2,
  Shield,
  FileCheck,
} from 'lucide-react';
import { DocumentRecord, DOCUMENT_TYPES, DIVISIONS, APPROVERS } from '../types';

interface AnalyticsDashboardProps {
  documents: DocumentRecord[];
  onNavigateToGenerator: () => void;
  onFilterByType: (type: string) => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  documents,
  onNavigateToGenerator,
  onFilterByType,
}) => {
  const total = documents.length;

  // Breakdown by Type
  const typeCounts = DOCUMENT_TYPES.map((t) => ({
    ...t,
    count: documents.filter((d) => d.typeCode === t.code).length,
  }));

  // Breakdown by Division
  const divisionCounts = DIVISIONS.map((d) => ({
    ...d,
    count: documents.filter((d) => d.divisionCode === d.code).length,
  }));

  // Breakdown by Status
  const publishedCount = documents.filter((d) => d.status === 'Published').length;
  const approvedCount = documents.filter((d) => d.status === 'Approved').length;
  const inReviewCount = documents.filter((d) => d.status === 'In Review').length;
  const draftCount = documents.filter((d) => d.status === 'Draft').length;

  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ margin: '1.75rem 0 1.5rem 0' }}>
        <h1
          style={{
            fontSize: '1.85rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
          }}
        >
          <BarChart3 color="var(--primary)" size={26} />
          Ringkasan & Analisis Dokumen NBE
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
          Distribusi dokumen Sistem Manajemen Terintegrasi PT Nirwana Bhumi Energi berdasarkan
          kategori, divisi, dan status.
        </p>
      </div>

      {/* Top 4 KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        {/* Total Documents */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Total Dokumen Terdaftar
            </span>
            <div style={{ background: 'var(--primary-glow)', padding: '0.45rem', borderRadius: '10px' }}>
              <FileText size={20} color="var(--primary)" />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.5rem' }} className="mono">
            {total}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            100% nomor unik terverifikasi
          </div>
        </div>

        {/* Published */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Diterbitkan (Published)
            </span>
            <div style={{ background: 'var(--success-bg)', padding: '0.45rem', borderRadius: '10px' }}>
              <CheckCircle2 size={20} color="var(--success)" />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.5rem' }} className="mono">
            {publishedCount}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Dokumen aktif berlaku
          </div>
        </div>

        {/* In Review / Draft */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Review & Draft
            </span>
            <div style={{ background: 'var(--warning-bg)', padding: '0.45rem', borderRadius: '10px' }}>
              <Clock size={20} color="var(--warning)" />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--warning)', marginTop: '0.5rem' }} className="mono">
            {inReviewCount + draftCount}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {inReviewCount} review, {draftCount} konsep
          </div>
        </div>

        {/* Approved */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Telah Disetujui
            </span>
            <div style={{ background: 'rgba(2, 132, 199, 0.15)', padding: '0.45rem', borderRadius: '10px' }}>
              <Shield size={20} color="#38bdf8" />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.5rem' }} className="mono">
            {approvedCount}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Siap untuk diterbitkan
          </div>
        </div>
      </div>

      {/* Grid: Document Type Breakdown & Division Breakdown */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* Kategori Surat Breakdown */}
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <h3
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Layers size={18} color="var(--primary)" />
            Distribusi per Kategori Dokumen (Document Type)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {typeCounts.map((t) => {
              const pct = total > 0 ? Math.round((t.count / total) * 100) : 0;
              return (
                <div key={t.code}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.35rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge badge-purple mono">{t.code}</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                        {t.label.split('(')[0]}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }} className="mono">
                      {t.count} ({pct}%)
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #818cf8, var(--primary))',
                        borderRadius: '4px',
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Divisi Breakdown */}
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <h3
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Building2 size={18} color="#0284c7" />
            Distribusi per Divisi Penerbit (Division)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {divisionCounts.map((d) => {
              const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
              return (
                <div key={d.code}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.35rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge badge-blue mono">{d.code}</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                        {d.label.split('(')[0]}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }} className="mono">
                      {d.count} ({pct}%)
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
                        borderRadius: '4px',
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
