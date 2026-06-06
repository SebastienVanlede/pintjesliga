'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/store';
import { getAvailableRolls, loadSquad, CURRENT_SEASON } from '@/lib/data';
import { simulateSeason } from '@/lib/simulation/engine';
import { Squad, SimulatedSeason, StandingRow, SimulatedMatch } from '@/lib/types';

export default function SimulatePage() {
  const router = useRouter();
  const { formation, pickedPlayers, simulatedSeason, setSimulatedSeason, reset } = useGameStore();

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'standings' | 'matches'>('standings');

  useEffect(() => {
    if (!formation || pickedPlayers.length < 11) { router.replace('/'); return; }
    if (simulatedSeason) return; // already simulated
    runSimulation();
  }, []);

  async function runSimulation() {
    setLoading(true);
    // Opponents are always the current Pro League teams (2024-25)
    const currentRolls = getAvailableRolls().filter(r => r.season === CURRENT_SEASON);
    const squads: Squad[] = [];
    for (const r of currentRolls) {
      const sq = await loadSquad(r.team.id, r.season);
      if (sq) squads.push(sq);
    }
    const result = simulateSeason(pickedPlayers, squads);
    setSimulatedSeason(result);
    setLoading(false);
  }

  if (!formation || pickedPlayers.length < 11) return null;

  const userRank = simulatedSeason
    ? simulatedSeason.standings.findIndex((s) => s.team === 'Jouw XI') + 1
    : null;

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8 gap-8">
      {/* Belgian stripe */}
      <div className="fixed top-0 left-0 right-0 flex h-1 z-50">
        <div className="flex-1" style={{ background: '#1A1A1A' }} />
        <div className="flex-1" style={{ background: 'var(--gold)' }} />
        <div className="flex-1" style={{ background: 'var(--red)' }} />
      </div>

      {/* Header */}
      <div className="text-center flex flex-col items-center gap-2">
        <span className="text-xs tracking-[0.3em] uppercase" style={{ color: 'var(--muted)' }}>
          Pintjesliga Simulator
        </span>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2rem, 7vw, 4rem)',
          color: 'var(--gold)',
          letterSpacing: '0.08em',
          lineHeight: 1,
        }}>
          SEIZOENSRESULTATEN
        </h1>
      </div>

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
            <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>
              SEIZOEN SIMULEREN…
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {simulatedSeason && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-3xl flex flex-col gap-6"
        >
          {/* Your result banner */}
          <div className="rounded-xl p-5 text-center"
            style={{
              background: userRank === 1 ? 'rgba(212,148,10,0.12)' : 'var(--surface)',
              border: `2px solid ${userRank === 1 ? 'var(--gold)' : 'var(--border)'}`,
              boxShadow: userRank === 1 ? '0 0 40px rgba(212,148,10,0.2)' : 'none',
            }}>
            <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
              Jouw XI eindigde
            </p>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 8vw, 4rem)',
              color: userRank === 1 ? 'var(--gold)' : 'var(--text)',
              letterSpacing: '0.1em',
            }}>
              {userRank === 1 ? '🏆 KAMPIOEN!' : `${userRank}${ordinal(userRank!)} plaats`}
            </p>
            {userRank === 1 && (
              <p style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>
                Proficiat! Je historische droomelf won de Pintjesliga!
              </p>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface)' }}>
            {(['standings', 'matches'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-2 rounded text-sm transition-all duration-150"
                style={{
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '0.1em',
                  background: activeTab === tab ? 'var(--gold)' : 'transparent',
                  color: activeTab === tab ? '#090907' : 'var(--muted)',
                }}
              >
                {tab === 'standings' ? 'STAND' : 'WEDSTRIJDEN'}
              </button>
            ))}
          </div>

          {/* Standings */}
          <AnimatePresence mode="wait">
            {activeTab === 'standings' && (
              <motion.div key="standings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <StandingsTable rows={simulatedSeason.standings} />
              </motion.div>
            )}
            {activeTab === 'matches' && (
              <motion.div key="matches" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <MatchList matches={simulatedSeason.matches} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex gap-4 justify-center mt-2">
            <button
              onClick={() => router.push('/xi')}
              className="px-6 py-3 rounded text-sm transition-all duration-150"
              style={{
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.1em',
                background: 'transparent',
                color: 'var(--muted)',
                border: '2px solid var(--border)',
              }}
            >
              ← Jouw XI
            </button>
            <button
              onClick={() => { reset(); router.push('/'); }}
              className="px-8 py-3 rounded transition-all duration-150"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1rem',
                letterSpacing: '0.12em',
                background: 'var(--gold)',
                color: '#090907',
                border: '2px solid var(--gold)',
              }}
            >
              Nieuw team samenstellen
            </button>
          </div>
        </motion.div>
      )}
    </main>
  );
}

// ─── Standings table ──────────────────────────────────────────────────────────

function StandingsTable({ rows }: { rows: StandingRow[] }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="grid px-4 py-2 text-xs uppercase tracking-widest"
        style={{ background: 'var(--surface)', color: 'var(--muted)', gridTemplateColumns: '2rem 1fr 2rem 2rem 2rem 2rem 3rem 3rem' }}>
        <span>#</span>
        <span>Team</span>
        <span className="text-center">W</span>
        <span className="text-center">G</span>
        <span className="text-center">V</span>
        <span className="text-center">+/-</span>
        <span className="text-center">Ptn</span>
        <span className="text-center">OVR</span>
      </div>
      {rows.map((row, i) => {
        const isUser = row.team === 'Jouw XI';
        const gd = row.goalsFor - row.goalsAgainst;
        return (
          <motion.div
            key={row.team}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="grid items-center px-4 py-3 text-sm"
            style={{
              gridTemplateColumns: '2rem 1fr 2rem 2rem 2rem 2rem 3rem 3rem',
              background: isUser ? 'rgba(212,148,10,0.08)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
              borderTop: '1px solid var(--border)',
              color: isUser ? 'var(--gold)' : 'var(--text)',
            }}
          >
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: i === 0 ? 'var(--gold)' : 'var(--muted)' }}>
              {i + 1}
            </span>
            <span className="font-medium truncate" style={{ color: isUser ? 'var(--gold)' : 'var(--text)' }}>
              {isUser ? '⭐ Jouw XI' : row.team}
            </span>
            <span className="text-center">{row.won}</span>
            <span className="text-center">{row.drawn}</span>
            <span className="text-center">{row.lost}</span>
            <span className="text-center" style={{ color: gd > 0 ? '#4ade80' : gd < 0 ? 'var(--red)' : 'var(--muted)' }}>
              {gd > 0 ? '+' : ''}{gd}
            </span>
            <span className="text-center font-bold" style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>
              {row.points}
            </span>
            <span className="text-center text-xs" style={{ color: 'var(--muted)' }}>
              {Math.round((row.goalsFor / Math.max(row.played, 1)) * 10) / 10}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Match list ───────────────────────────────────────────────────────────────

function MatchList({ matches }: { matches: SimulatedMatch[] }) {
  // Group by round
  const byRound = matches.reduce<Record<number, SimulatedMatch[]>>((acc, m) => {
    (acc[m.round] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-4">
      {Object.entries(byRound).map(([round, ms]) => (
        <div key={round}>
          <p className="text-xs tracking-widest uppercase mb-2 px-1" style={{ color: 'var(--muted)' }}>
            Speeldag {round}
          </p>
          {ms.map((m, i) => {
            const userPlaying = m.home === 'Jouw XI' || m.away === 'Jouw XI';
            return (
              <div key={i} className="flex items-center justify-between rounded-lg px-4 py-3 mb-1.5"
                style={{
                  background: userPlaying ? 'rgba(212,148,10,0.06)' : 'var(--surface)',
                  border: `1px solid ${userPlaying ? 'var(--gold-dim)' : 'var(--border)'}`,
                }}>
                <span className="text-sm text-right flex-1 truncate"
                  style={{ color: m.home === 'Jouw XI' ? 'var(--gold)' : 'var(--text)', fontWeight: m.home === 'Jouw XI' ? 600 : 400 }}>
                  {m.home}
                </span>
                <span className="mx-4 flex-shrink-0"
                  style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--text)', letterSpacing: '0.1em' }}>
                  {m.homeGoals} – {m.awayGoals}
                </span>
                <span className="text-sm flex-1 truncate"
                  style={{ color: m.away === 'Jouw XI' ? 'var(--gold)' : 'var(--text)', fontWeight: m.away === 'Jouw XI' ? 600 : 400 }}>
                  {m.away}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ordinal(n: number): string {
  if (n === 1) return 'e';
  return 'e';
}
