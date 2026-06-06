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
        border: selected ? '2px solid var(--gold)' : '2px solid var(--border)',
        background: selected ? 'rgba(212,148,10,0.08)' : 'var(--surface)',
        boxShadow: selected ? '0 0 20px rgba(212,148,10,0.15)' : 'none',
      }}
      className="relative flex flex-col items-center gap-2 rounded-lg p-4 cursor-pointer transition-all duration-150 hover:border-[var(--gold-dim)] group"
    >
      <svg
        viewBox="0 0 60 80"
        width="72"
        height="96"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Pitch lines */}
        <rect x="0" y="0" width="60" height="80" fill="var(--pitch)" rx="3" />
        <rect x="0" y="0" width="60" height="80" fill="none" stroke="var(--pitch-line)" strokeWidth="0.8" rx="3" />
        <line x1="0" y1="40" x2="60" y2="40" stroke="var(--pitch-line)" strokeWidth="0.5" />
        <ellipse cx="30" cy="40" rx="8" ry="8" fill="none" stroke="var(--pitch-line)" strokeWidth="0.5" />
        {/* Position dots */}
        {dots.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={i === 0 ? 2.8 : 2.4}
            fill={selected ? 'var(--gold)' : '#EDE9E0'}
            opacity={selected ? 1 : 0.7}
          />
        ))}
      </svg>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          color: selected ? 'var(--gold)' : 'var(--text)',
          fontSize: '1.1rem',
          letterSpacing: '0.05em',
        }}
      >
        {formation}
      </span>
    </button>
  );
}
