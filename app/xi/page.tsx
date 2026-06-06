'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useGameStore } from '@/lib/store';
import { FORMATION_POSITIONS, playerPositions } from '@/lib/types';
import FormationPitch from '@/components/FormationPitch';

export default function XIPage() {
  const router = useRouter();
  const { formation, pickedPlayers, reset } = useGameStore();

  useEffect(() => {
    if (!formation || pickedPlayers.length < 11) router.replace('/');
  }, [formation, pickedPlayers.length, router]);

  if (!formation || pickedPlayers.length < 11) return null;

  const pickedByIndex = Object.fromEntries(pickedPlayers.map((p) => [p.positionIndex, p]));
  const positions = FORMATION_POSITIONS[formation];
  const avgOverall = Math.round(pickedPlayers.reduce((s, p) => s + p.player.overall, 0) / 11);
  const teamsUsed = [...new Set(pickedPlayers.map((p) => p.teamName))].length;
  const topPlayer = [...pickedPlayers].sort((a, b) => b.player.overall - a.player.overall)[0];

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100svh-56px)]">

      {/* ── Left: Pitch ─────────────────────────────────────────────────── */}
      <div
        className="flex flex-col items-center gap-5 px-6 py-8 lg:px-10 lg:py-10 lg:w-[420px] flex-shrink-0"
        style={{ borderRight: '1px solid var(--border)', background: 'rgba(0,0,0,0.15)' }}
      >
        {/* Title */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="w-full">
          <span className="label-xs block mb-1">Jouw droomelf</span>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem,5vw,2.8rem)',
            color: 'var(--text)',
            letterSpacing: '0.06em',
            lineHeight: 1,
          }}>
            PINTJESLIGA XI
          </h1>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="w-full grid grid-cols-3 gap-2"
        >
          {[
            { label: 'Formatie', value: formation },
            { label: 'Gem. OVR', value: String(avgOverall), highlight: true },
            { label: 'Teams', value: String(teamsUsed) },
          ].map(({ label, value, highlight }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 rounded-lg py-3"
              style={{ background: highlight ? 'rgba(212,148,10,0.08)' : 'var(--surface)', border: `1px solid ${highlight ? 'var(--gold-dim)' : 'var(--border)'}` }}
            >
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: highlight ? 'var(--gold)' : 'var(--text)', letterSpacing: '0.04em' }}>{value}</span>
              <span className="label-xs">{label}</span>
            </div>
          ))}
        </motion.div>

        {/* Pitch */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.12 }}>
          <FormationPitch formation={formation} pickedByIndex={pickedByIndex} size="md" />
        </motion.div>

        {/* Actions */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="w-full flex flex-col gap-2">
          <button
            onClick={() => router.push('/simulate')}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.1rem',
              letterSpacing: '0.14em',
              padding: '13px 0',
              width: '100%',
              background: 'var(--gold)',
              color: '#07070A',
              border: '2px solid var(--gold)',
              borderRadius: 8,
              cursor: 'pointer',
              boxShadow: '0 0 40px rgba(212,148,10,0.25)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          >
            Simuleer het Seizoen →
          </button>
          <button
            onClick={() => { reset(); router.push('/'); }}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.85rem',
              letterSpacing: '0.1em',
              padding: '10px 0',
              width: '100%',
              background: 'transparent',
              color: 'var(--muted)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Opnieuw beginnen
          </button>
        </motion.div>
      </div>

      {/* ── Right: Player list ────────────────────────────────────────── */}
      <div className="flex-1 px-6 py-8 lg:px-10 lg:py-10 overflow-y-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mb-6">
          <span className="label-xs block mb-1">Spelerslijst</span>
          <div className="flex items-center gap-3">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text)', letterSpacing: '0.06em' }}>
              {formation.toUpperCase()}
            </h2>
            {topPlayer && (
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                Beste: {topPlayer.player.name} ({topPlayer.player.overall})
              </span>
            )}
          </div>
        </motion.div>

        <div className="flex flex-col gap-2">
          {positions.map((pos, i) => {
            const pick = pickedByIndex[i];
            if (!pick) return null;
            const overall = pick.player.overall;
            const color = overall >= 80 ? 'var(--gold)' : overall >= 73 ? '#A8E6CF' : overall >= 66 ? 'var(--text-2)' : 'var(--muted)';
            const bg = overall >= 80 ? 'rgba(212,148,10,0.18)' : overall >= 73 ? 'rgba(168,230,207,0.1)' : 'rgba(237,234,228,0.06)' ;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 + i * 0.04 }}
                className="flex items-center gap-4 rounded-xl px-4 py-3"
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${pick.teamPrimaryColor}30`,
                  borderLeft: `4px solid ${pick.teamPrimaryColor}`,
                }}
              >
                {/* Position */}
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.75rem',
                  letterSpacing: '0.08em',
                  color: 'var(--muted)',
                  width: 38,
                  flexShrink: 0,
                }}>
                  {pos}
                </span>

                {/* Overall */}
                <div style={{
                  width: 42, height: 42,
                  borderRadius: 8,
                  background: bg,
                  border: `1px solid ${color}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.05rem',
                  color,
                  flexShrink: 0,
                }}>
                  {overall}
                </div>

                {/* Player info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: 'var(--text)' }}>
                    {pick.player.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span style={{ fontSize: '0.65rem', color: pick.teamPrimaryColor, fontWeight: 600 }}>
                      {pick.teamName}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>
                      · {pick.season}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>
                      · {pick.player.nationality}
                    </span>
                  </div>
                </div>

                {/* Positions */}
                <div className="flex gap-1 flex-shrink-0">
                  {playerPositions(pick.player).map(p => (
                    <span key={p} style={{
                      fontSize: '0.55rem', letterSpacing: '0.06em',
                      padding: '2px 5px', borderRadius: 3,
                      background: 'var(--surface-2)',
                      color: 'var(--text-2)',
                      fontFamily: 'var(--font-display)',
                    }}>{p}</span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
