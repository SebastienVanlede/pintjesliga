'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Formation, FORMATIONS } from '@/lib/types';
import { useGameStore } from '@/lib/store';
import FormationCard from '@/components/FormationCard';

export default function HomePage() {
  const router = useRouter();
  const { setFormation } = useGameStore();
  const [selected, setSelected] = useState<Formation | null>(null);

  function handleStart() {
    if (!selected) return;
    setFormation(selected);
    router.push('/draft');
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      {/* Belgian flag stripe accent */}
      <div className="fixed top-0 left-0 right-0 flex h-1">
        <div className="flex-1" style={{ background: '#1A1A1A' }} />
        <div className="flex-1" style={{ background: 'var(--gold)' }} />
        <div className="flex-1" style={{ background: 'var(--red)' }} />
      </div>

      <div className="flex flex-col items-center gap-10 max-w-3xl w-full">
        {/* Header */}
        <header className="flex flex-col items-center gap-3 text-center">
          <span
            className="text-xs tracking-[0.3em] uppercase"
            style={{ color: 'var(--muted)' }}
          >
            Belgische Pro League Simulator
          </span>
          <h1
            className="leading-none"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(4rem, 12vw, 8rem)',
              color: 'var(--gold)',
              letterSpacing: '0.04em',
              textShadow: '0 0 60px rgba(212,148,10,0.3)',
            }}
          >
            PINTJES
            <span style={{ color: 'var(--text)' }}>LIGA</span>
          </h1>
          <p style={{ color: 'var(--muted)', maxWidth: '38ch' }}>
            Rol de dobbelstenen, pak je spelers en bouw de beste historische
            Belgische droomploeg ooit.
          </p>
        </header>

        {/* Divider */}
        <div className="flex items-center gap-4 w-full">
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          <span
            className="text-xs tracking-[0.25em] uppercase"
            style={{ color: 'var(--muted)' }}
          >
            Kies je formatie
          </span>
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        </div>

        {/* Formation grid */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 w-full">
          {FORMATIONS.map((f) => (
            <FormationCard
              key={f}
              formation={f}
              selected={selected === f}
              onClick={() => setSelected(f)}
            />
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleStart}
          disabled={!selected}
          className="relative px-12 py-4 text-sm tracking-[0.2em] uppercase transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.15rem',
            letterSpacing: '0.15em',
            background: selected ? 'var(--gold)' : 'transparent',
            color: selected ? '#090907' : 'var(--muted)',
            border: '2px solid',
            borderColor: selected ? 'var(--gold)' : 'var(--border)',
            borderRadius: '4px',
            boxShadow: selected ? '0 0 30px rgba(212,148,10,0.3)' : 'none',
          }}
        >
          Start de Draft →
        </button>

        {/* Footer hint */}
        <p
          className="text-xs text-center"
          style={{ color: 'var(--muted)', opacity: 0.5 }}
        >
          5 beschikbare teams · Meer seizoenen komen eraan
        </p>
      </div>
    </main>
  );
}
