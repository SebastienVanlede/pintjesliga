'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Formation, FORMATIONS } from '@/lib/types';
import { useGameStore } from '@/lib/store';
import FormationCard from '@/components/FormationCard';

const HOW_IT_WORKS = [
  { n: '01', title: 'Kies een formatie', desc: 'Bepaal met welk systeem jouw XI speelt.' },
  { n: '02', title: 'Rol & kies spelers', desc: 'Dobbelstenen bepalen welk team je trekt. Jij kiest de beste speler.' },
  { n: '03', title: 'Simuleer het seizoen', desc: 'Speel het volledige Belgische playoffsysteem — PO1, PO2 en meer.' },
];

export default function HomePage() {
  const router = useRouter();
  const { setFormation, draftMode, setDraftMode } = useGameStore();
  const [selected, setSelected] = useState<Formation | null>(null);

  function handleStart() {
    if (!selected) return;
    setFormation(selected);
    router.push('/draft');
  }

  return (
    <div className="min-h-[calc(100svh-56px)] flex flex-col lg:flex-row">

      {/* ── Left: Hero ──────────────────────────────────────────────────── */}
      <div
        className="flex flex-col justify-between px-8 py-12 lg:px-16 lg:py-16 lg:w-[44%] lg:min-h-[calc(100svh-56px)]"
        style={{ borderRight: '1px solid var(--border)' }}
      >
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-5"
        >
          <span className="label-xs">Belgische Pro League Simulator</span>

          <h1
            className="leading-none"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(4.5rem, 10vw, 8rem)',
              lineHeight: 0.9,
              color: 'var(--text)',
              letterSpacing: '0.02em',
            }}
          >
            PINTJES
            <br />
            <span style={{ color: 'var(--gold)', textShadow: '0 0 80px rgba(212,148,10,0.4)' }}>
              LIGA
            </span>
          </h1>

          <p style={{ color: 'var(--text-2)', maxWidth: '36ch', lineHeight: 1.6, fontSize: '0.95rem' }}>
            Bouw je ultieme Belgische Pro League droomelf uit 8 seizoenen historische squads — en bewijs dat jij de beste coach bent.
          </p>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex flex-col gap-4 mt-12 lg:mt-0"
        >
          <span className="label-xs">Hoe het werkt</span>
          <div className="flex flex-col gap-3">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="flex items-start gap-4 p-4 rounded-lg"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.5rem',
                    color: 'var(--gold)',
                    letterSpacing: '0.05em',
                    lineHeight: 1,
                    flexShrink: 0,
                    opacity: 0.7,
                  }}
                >
                  {step.n}
                </span>
                <div>
                  <p className="font-medium text-sm" style={{ color: 'var(--text)', marginBottom: 2 }}>{step.title}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-4 pt-8 mt-4 flex-wrap"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {[
            ['129', 'squads'],
            ['8', 'seizoenen'],
            ['3', 'herrolls'],
            ['PO1 · PO2', 'playoffs'],
          ].map(([val, label]) => (
            <div key={label} className="flex flex-col">
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text)', letterSpacing: '0.05em' }}>{val}</span>
              <span className="label-xs" style={{ marginTop: 1 }}>{label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Right: Formation selector ─────────────────────────────────── */}
      <div className="flex flex-col justify-center px-8 py-12 lg:px-16 lg:py-16 flex-1 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <span className="label-xs block mb-2">Stap 1 van 3</span>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              color: 'var(--text)',
              letterSpacing: '0.06em',
              lineHeight: 1,
            }}
          >
            KIES JE FORMATIE
          </h2>
          <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
            Dit bepaalt welke posities je moet invullen tijdens de draft.
          </p>
        </motion.div>

        {/* Formation grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3"
        >
          {FORMATIONS.map((f, i) => (
            <motion.div
              key={f}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.04 }}
            >
              <FormationCard
                formation={f}
                selected={selected === f}
                onClick={() => setSelected(f)}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Draft mode toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex flex-col gap-2"
        >
          <span className="label-xs">Speelmodus</span>
          <div className="flex gap-2">
            {([
              { value: 'normal', label: 'Normaal', desc: 'Ratings zichtbaar' },
              { value: 'blind',  label: 'From Memory', desc: 'Ratings verborgen' },
            ] as const).map(({ value, label, desc }) => (
              <button
                key={value}
                onClick={() => setDraftMode(value)}
                className="flex-1 flex flex-col items-start px-4 py-3 rounded-lg transition-all duration-150"
                style={{
                  background: draftMode === value ? 'rgba(212,148,10,0.1)' : 'var(--surface)',
                  border: `1.5px solid ${draftMode === value ? 'var(--gold)' : 'var(--border)'}`,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.08em', color: draftMode === value ? 'var(--gold)' : 'var(--text)' }}>
                  {label}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 2 }}>{desc}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col gap-3"
        >
          <button
            onClick={handleStart}
            disabled={!selected}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.1rem',
              letterSpacing: '0.15em',
              padding: '14px 40px',
              background: selected ? 'var(--gold)' : 'var(--surface)',
              color: selected ? '#07070A' : 'var(--muted)',
              border: `2px solid ${selected ? 'var(--gold)' : 'var(--border)'}`,
              borderRadius: 8,
              cursor: selected ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              boxShadow: selected ? '0 0 40px rgba(212,148,10,0.25)' : 'none',
              alignSelf: 'flex-start',
            }}
          >
            {selected ? `Start de Draft → ${selected}` : 'Selecteer een formatie'}
          </button>

          {selected && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs"
              style={{ color: 'var(--muted)' }}
            >
              Je vult 11 posities in via de dobbelsteendraft.
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
