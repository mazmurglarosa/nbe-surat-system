import React from 'react';
import { DocumentLanguage } from '../types';

interface LanguageSelectorProps {
  selectedLang: DocumentLanguage;
  onSelectLang: (lang: DocumentLanguage) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLang,
  onSelectLang,
}) => {
  const languages: {
    id: DocumentLanguage;
    label: string;
    flag: string;
    desc: string;
    sublabel: string;
  }[] = [
    {
      id: 'id',
      label: 'Bahasa Indonesia',
      flag: '🇮🇩',
      desc: 'Format Standar NBE (4 Halaman)',
      sublabel: 'Surat Keputusan Direksi, Konsiderans & Diktum Baku ID',
    },
    {
      id: 'en',
      label: 'British English',
      flag: '🇬🇧',
      desc: 'UK Corporate Standard (4 Pages)',
      sublabel: "Board of Directors' Resolution, Having Considered & Resolves",
    },
    {
      id: 'bi',
      label: 'Bilingual (ID - EN)',
      flag: '🌐',
      desc: 'Dual-Column Parallel (4 Pages)',
      sublabel: 'Kolom Kiri Indonesia, Kolom Kanan British English Berdampingan',
    },
  ];

  return (
    <div
      style={{
        margin: '1.25rem 0',
        padding: '1.25rem',
        borderRadius: '12px',
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-secondary)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.85rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.1rem' }}>🌐</span>
          <label
            style={{
              fontSize: '0.9rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            Pilih Bahasa Dokumen Output (Language Selector):
          </label>
        </div>
        <span
          style={{
            fontSize: '0.75rem',
            padding: '0.2rem 0.6rem',
            borderRadius: '9999px',
            background: 'rgba(2, 132, 199, 0.12)',
            color: '#0284c7',
            fontWeight: 600,
            border: '1px solid rgba(2, 132, 199, 0.25)',
          }}
        >
          Otomasi 4 Halaman Baku Sesuai Standar NBE
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.75rem',
        }}
      >
        {languages.map((l) => {
          const isSelected = selectedLang === l.id;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => onSelectLang(l.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '0.9rem 0.85rem',
                borderRadius: '10px',
                border: isSelected
                  ? '2px solid #003366'
                  : '1px solid var(--border-subtle)',
                background: isSelected
                  ? 'linear-gradient(145deg, #003366 0%, #002244 100%)'
                  : 'var(--bg-card, #ffffff)',
                color: isSelected ? '#ffffff' : 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isSelected
                  ? '0 6px 18px rgba(0, 51, 102, 0.28)'
                  : 'none',
                position: 'relative',
              }}
            >
              {isSelected && (
                <span
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: '0 0 6px #10b981',
                  }}
                />
              )}
              <span style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }}>
                {l.flag}
              </span>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: isSelected ? '#ffffff' : 'var(--text-primary)',
                }}
              >
                {l.label}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  marginTop: '0.25rem',
                  color: isSelected ? '#93c5fd' : '#0284c7',
                }}
              >
                {l.desc}
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  marginTop: '0.3rem',
                  color: isSelected ? '#cbd5e1' : 'var(--text-muted)',
                  lineHeight: '1.25',
                }}
              >
                {l.sublabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
