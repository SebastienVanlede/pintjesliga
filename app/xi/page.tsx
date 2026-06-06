'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useGameStore } from '@/lib/store';
import { FORMATION_POSITIONS } from '@/lib/types';
import FormationPitch from '@/components/FormationPitch';

export default function XIPage() {
  const router = useRouter();
  const { formation, pickedPlayers, reset } = useGameStore();

  useEffect(() => {
    if (!formation || pickedPlayers.length < 11) router.replace('/');
  }, [formation, pickedPlayers.length, router]);

  if (!formation || pickedPlayers.length < 11) return null;

  const pickedByIndex = Object.fromEntries(pickedPlayers.map((p) => [p.positionIndex, p]));
  const avgOverall = Math.round(pickedPlayers.reduce((s, p) => s + p.player.overall, 0) / 11);
  const positions = FORMATION_POSITIONS[formation];

  // Unique teams used
  const teamsUsed = [...new Set(pickedPlayers.map((p) => p.teamName))];

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8 gap-8">
      {/* Belgian stripe */}
      <div className="fixed top-0 left-0 right-0 flex h-1 z-50">
        <div className="flex-1" style={{ background: '#1A1A1A' }} />
        <div className="flex-1" style={{ background: 'var(--gold)' }} />
        <div className="flex-1" style={{ background: 'var(--red)' }} />
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center flex flex-col items-center gap-2"
      >
        <span className="text-xs tracking-[0.3em] uppercase" style={{ color: 'var(--muted)' }}>
          Jouw droomelf
        </span>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
          color: 'var(--gold)',
          letterSpacing: '0.08em',
          lineHeight: 1,
        }}>
          PINTJESLIGA XI
        </h1>
        <div className="flex items-center gap-4 mt-1">
          <Stat label="Formatie" value={formation} />
          <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
          <Stat label="Gem. Overall" value={String(avgOverall)} highlight />
          <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
          <Stat label="Teams" value={String(teamsUsed.length)} />
        </div>
      </motion.header>

      {/* Two-column layout */}
      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8 items-start justify-center">

        {/* Pitch */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex-shrink-0"
        >
          <FormationPitch
            formation={formation}
            pickedByIndex={pickedByIndex}
            size="lg"
          />
        </motion.div>

        {/* Player list */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="flex-1 flex flex-col gap-2"
        >
          <h2 className="text-xs tracking-[0.2em] uppercase mb-2" style={{ color: 'var(--muted)' }}>
            Spelerslijst
          </h2>
          {positions.map((pos, i) => {
            const pick = pickedByIndex[i];
            if (!pick) return null;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.04 }}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                style={{ background: 'var(--surface)', border: `1px solid ${pick.teamPrimaryColor}40` }}
              >
                {/* Position badge */}
                <span className="w-10 text-center flex-shrink-0"
                  style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', color: pick.teamPrimaryColor, letterSpacing: '0.06em' }}>
                  {pos}
                </span>
                {/* Overall */}
                <div className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0"
                  style={{ background: overallBg(pick.player.overall), fontFamily: 'var(--font-display)', fontSize: '1rem', color: overallColor(pick.player.overall) }}>
                  {pick.player.overall}
                </div>
                {/* Name + info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                    {pick.player.name}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                    {pick.teamName} · {pick.season}
                  </p>
                </div>
                {/* Nationality */}
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--muted)' }}>
                  {pick.player.nationality}
                </span>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex gap-4"
      >
        <button
          onClick={() => router.push('/simulate')}
          className="px-10 py-4 rounded transition-all duration-150"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.15rem',
            letterSpacing: '0.15em',
            background: 'var(--gold)',
            color: '#090907',
            border: '2px solid var(--gold)',
            boxShadow: '0 0 30px rgba(212,148,10,0.3)',
          }}
        >
          Simuleer het Seizoen →
        </button>
        <button
          onClick={() => { reset(); router.push('/'); }}
          className="px-6 py-4 rounded transition-all duration-150 text-sm"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1rem',
            letterSpacing: '0.1em',
            background: 'transparent',
            color: 'var(--muted)',
            border: '2px solid var(--border)',
          }}
        >
          Opnieuw
        </button>
      </motion.div>
    </main>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs" style={{ color: 'var(--muted)' }}>{label}</span>
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.2rem',
        color: highlight ? 'var(--gold)' : 'var(--text)',
        letterSpacing: '0.06em',
      }}>
        {value}
      </span>
    </div>
  );
}

function overallBg(o: number) { return o >= 80 ? 'rgba(212,148,10,0.25)' : o >= 70 ? 'rgba(237,233,224,0.1)' : 'rgba(107,101,96,0.15)'; }
function overallColor(o: number) { return o >= 80 ? 'var(--gold)' : o >= 70 ? 'var(--text)' : 'var(--muted)'; }
