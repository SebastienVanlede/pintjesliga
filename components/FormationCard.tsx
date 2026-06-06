'use client';
import { Formation, FORMATION_DOTS } from '@/lib/types';

interface Props {
  formation: Formation;
  selected: boolean;
  onClick: () => void;
}

export default function FormationCard({ formation, selected, onClick }: Props) {
  const dots = FORMATION_DOTS[formation];

  return (
    <button
      onClick={onClick}
      style={{
        background: selected ? 'rgba(212,148,10,0.1)' : 'var(--surface)',
        border: `2px solid ${selected ? 'var(--gold)' : 'var(--border)'}`,
        borderRadius: 10,
        padding: '12px 8px 10px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        transition: 'all 0.15s ease',
        boxShadow: selected ? '0 0 24px rgba(212,148,10,0.2)' : 'none',
        transform: selected ? 'scale(1.04)' : 'scale(1)',
        width: '100%',
      }}
      onMouseEnter={e => {
        if (!selected) {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.borderColor = 'var(--gold-dim)';
          el.style.background = 'var(--surface-2)';
        }
      }}
      onMouseLeave={e => {
        if (!selected) {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.borderColor = 'var(--border)';
          el.style.background = 'var(--surface)';
        }
      }}
    >
      {/* Mini pitch SVG */}
      <svg viewBox="0 0 60 80" width="56" height="75" xmlns="http://www.w3.org/2000/svg">
        {/* Pitch stripes */}
        {[0, 1, 2, 3].map(i => (
          <rect key={i} x="0" y={i * 20} width="60" height="20"
            fill={i % 2 === 0 ? 'var(--pitch)' : 'var(--pitch-alt)'} />
        ))}
        {/* Pitch outline */}
        <rect x="1" y="1" width="58" height="78" fill="none"
          stroke="rgba(255,255,255,0.15)" strokeWidth="1" rx="2" />
        {/* Center line */}
        <line x1="1" y1="40" x2="59" y2="40" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" />
        {/* Center circle */}
        <circle cx="30" cy="40" r="7" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" />
        {/* Position dots */}
        {dots.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={i === 0 ? 3 : 2.5}
            fill={selected ? 'var(--gold)' : 'rgba(255,255,255,0.55)'}
            style={{ transition: 'fill 0.15s' }}
          />
        ))}
      </svg>

      {/* Formation label */}
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.85rem',
          letterSpacing: '0.06em',
          color: selected ? 'var(--gold)' : 'var(--text-2)',
          transition: 'color 0.15s',
        }}
      >
        {formation}
      </span>
    </button>
  );
}
