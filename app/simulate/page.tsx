'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/store';
import { getAvailableRolls, loadSquad, CURRENT_SEASON } from '@/lib/data';
import { simulateSeason } from '@/lib/simulation/engine';
import { Squad, SimulatedSeason, SimulatedPhase, StandingRow, SimulatedMatch } from '@/lib/types';

type TabId = 'regular' | 'po1' | 'po2' | 'relegation';

const TABS: { id: TabId; label: string; sublabel: string }[] = [
  { id: 'regular',    label: 'Regulier',    sublabel: '30 speeldagen' },
  { id: 'po1',        label: 'PO1',         sublabel: 'Championship' },
  { id: 'po2',        label: 'PO2',         sublabel: 'Europa' },
  { id: 'relegation', label: 'Relegate PO', sublabel: 'Plaatsen 13–16' },
];

export default function SimulatePage() {
  const router = useRouter();
  const { formation, pickedPlayers, simulatedSeason, setSimulatedSeason, reset } = useGameStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('regular');

  useEffect(() => {
    if (!formation || pickedPlayers.length < 11) { router.replace('/'); return; }
    if (simulatedSeason) return;
    runSimulation();
  }, []);

  async function runSimulation() {
    setLoading(true);
    const currentRolls = getAvailableRolls().filter(r => r.season === CURRENT_SEASON);
    const squads: Squad[] = [];
    for (const r of currentRolls) {
      const sq = await loadSquad(r.team.id, r.season);
      if (sq) squads.push(sq);
    }
    const result = simulateSeason(pickedPlayers, squads);
    setSimulatedSeason(result as any);
    setLoading(false);
  }

  if (!formation || pickedPlayers.length < 11) return null;

  const sim = simulatedSeason as SimulatedSeason | null;

  const phaseForTab: Record<TabId, SimulatedPhase | null> = {
    regular:    sim?.regularSeason ?? null,
    po1:        sim?.po1 ?? null,
    po2:        sim?.po2 ?? null,
    relegation: sim?.poRelegation ?? null,
  };

  const userInPO1 = sim?.po1.standings.some(r => r.team === 'Jouw XI');
  const userInPO2 = sim?.po2.standings.some(r => r.team === 'Jouw XI');
  const userInRele = sim?.poRelegation.standings.some(r => r.team === 'Jouw XI');

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8 gap-6">
      {/* Belgian stripe */}
      <div className="fixed top-0 left-0 right-0 flex h-1 z-50">
        <div className="flex-1" style={{ background: '#1A1A1A' }} />
        <div className="flex-1" style={{ background: 'var(--gold)' }} />
        <div className="flex-1" style={{ background: 'var(--red)' }} />
      </div>

      <div className="text-center flex flex-col items-center gap-1">
        <span className="text-xs tracking-[0.3em] uppercase" style={{ color: 'var(--muted)' }}>
          Pintjesliga Simulator
        </span>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.8rem, 6vw, 3.5rem)',
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
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-12">
            <div className="w-12 h-12 rounded-full border-2 animate-spin"
              style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
            <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>
              SEIZOEN SIMULEREN…
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {sim && !loading && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-3xl flex flex-col gap-5">

          {/* Outcomes banner */}
          <div className="grid grid-cols-3 gap-3">
            {/* Champion */}
            <div className="rounded-xl p-4 text-center"
              style={{ background: 'rgba(212,148,10,0.1)', border: '2px solid var(--gold)' }}>
              <p className="text-xs tracking-widest uppercase mb-1" style={{ color: 'var(--muted)' }}>Kampioen</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--gold)', letterSpacing: '0.05em' }}>
                {sim.champion === 'Jouw XI' ? '⭐ Jouw XI' : sim.champion}
              </p>
            </div>
            {/* European spots */}
            <div className="rounded-xl p-4 text-center"
              style={{ background: 'var(--surface)', border: '1px solid #1a3a6e' }}>
              <p className="text-xs tracking-widest uppercase mb-1" style={{ color: 'var(--muted)' }}>Europa (top 4 PO1)</p>
              <div className="flex flex-col gap-0.5">
                {sim.europeanSpots.map((t, i) => (
                  <p key={i} className="text-xs leading-tight"
                    style={{ color: t === 'Jouw XI' ? 'var(--gold)' : 'var(--text)' }}>
                    {t === 'Jouw XI' ? '⭐ Jouw XI' : t}
                  </p>
                ))}
              </div>
            </div>
            {/* Relegated */}
            <div className="rounded-xl p-4 text-center"
              style={{ background: 'rgba(196,30,58,0.08)', border: '1px solid rgba(196,30,58,0.3)' }}>
              <p className="text-xs tracking-widest uppercase mb-1" style={{ color: 'var(--muted)' }}>Gedegradeerd</p>
              <div className="flex flex-col gap-0.5">
                {sim.relegated.map((t, i) => (
                  <p key={i} className="text-xs leading-tight"
                    style={{ color: t === 'Jouw XI' ? 'var(--red)' : 'var(--muted)' }}>
                    {t === 'Jouw XI' ? '⭐ Jouw XI' : t}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* User's journey highlight */}
          <div className="rounded-lg px-4 py-3 text-sm"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--muted)' }}>Jouw XI belandde in: </span>
            <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em' }}>
              {userInPO1 ? 'Championship Play-off (PO1)' :
               userInPO2 ? 'Europa Play-off (PO2)' :
               userInRele ? 'Relegation Play-off' : ''}
            </span>
            {sim.champion === 'Jouw XI' && (
              <span style={{ color: 'var(--gold)' }}> · KAMPIOEN!</span>
            )}
          </div>

          {/* Phase tabs */}
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface)' }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex-1 py-2 rounded flex flex-col items-center transition-all duration-150"
                style={{
                  background: activeTab === tab.id ? 'var(--gold)' : 'transparent',
                  color: activeTab === tab.id ? '#090907' : 'var(--muted)',
                }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.08em' }}>
                  {tab.label}
                </span>
                <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>{tab.sublabel}</span>
              </button>
            ))}
          </div>

          {/* Phase content */}
          <AnimatePresence mode="wait">
            {TABS.map(tab => {
              if (tab.id !== activeTab) return null;
              const phase = phaseForTab[tab.id];
              if (!phase) return null;
              return (
                <motion.div key={tab.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {tab.id !== 'regular' && (
                    <p className="text-xs mb-3 px-1" style={{ color: 'var(--muted)' }}>
                      {tab.id === 'relegation'
                        ? 'Puntentotaal regulier seizoen volledig meegenomen.'
                        : 'Startpunten = helft van regulier seizoen (afgerond naar boven).'}
                    </p>
                  )}
                  <StandingsTable rows={phase.standings} tab={tab.id}
                    champion={sim.champion} relegated={sim.relegated} europeanSpots={sim.europeanSpots} />
                  <div className="mt-4">
                    <MatchList matches={phase.matches} />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex gap-4 justify-center mt-2">
            <button onClick={() => router.push('/xi')}
              className="px-6 py-3 rounded text-sm transition-all duration-150"
              style={{
                fontFamily: 'var(--font-display)', letterSpacing: '0.1em',
                background: 'transparent', color: 'var(--muted)', border: '2px solid var(--border)',
              }}>
              ← Jouw XI
            </button>
            <button onClick={() => { reset(); router.push('/'); }}
              className="px-8 py-3 rounded transition-all duration-150"
              style={{
                fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.12em',
                background: 'var(--gold)', color: '#090907', border: '2px solid var(--gold)',
              }}>
              Nieuw team samenstellen
            </button>
          </div>
        </motion.div>
      )}
    </main>
  );
}

// ─── Standings table ──────────────────────────────────────────────────────────

function StandingsTable({ rows, tab, champion, relegated, europeanSpots }: {
  rows: StandingRow[];
  tab: TabId;
  champion: string;
  relegated: string[];
  europeanSpots: string[];
}) {
  const showCarryover = tab !== 'regular' && rows.some(r => r.carryoverPoints !== undefined);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="grid px-3 py-2 text-xs uppercase tracking-widest"
        style={{
          background: 'var(--surface)',
          color: 'var(--muted)',
          gridTemplateColumns: showCarryover
            ? '1.5rem 1fr 1.8rem 1.8rem 1.8rem 2rem 2.5rem 2.8rem'
            : '1.5rem 1fr 1.8rem 1.8rem 1.8rem 2rem 2.8rem',
        }}>
        <span>#</span>
        <span>Team</span>
        <span className="text-center">W</span>
        <span className="text-center">G</span>
        <span className="text-center">V</span>
        <span className="text-center">+/-</span>
        {showCarryover && <span className="text-center">Start</span>}
        <span className="text-center">Pts</span>
      </div>

      {rows.map((row, i) => {
        const isUser = row.team === 'Jouw XI';
        const isChampion = tab === 'po1' && row.team === champion;
        const isRelegate = tab === 'relegation' && relegated.includes(row.team);
        const isEU = tab === 'po1' && europeanSpots.includes(row.team);
        const gd = row.goalsFor - row.goalsAgainst;

        const rowBg = isUser
          ? 'rgba(212,148,10,0.08)'
          : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)';

        const leftBorderColor = isChampion ? 'var(--gold)'
          : isRelegate ? 'var(--red)'
          : isEU ? '#1a3a6e'
          : 'transparent';

        return (
          <motion.div key={row.team}
            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="grid items-center px-3 py-2.5 text-sm"
            style={{
              gridTemplateColumns: showCarryover
                ? '1.5rem 1fr 1.8rem 1.8rem 1.8rem 2rem 2.5rem 2.8rem'
                : '1.5rem 1fr 1.8rem 1.8rem 1.8rem 2rem 2.8rem',
              background: rowBg,
              borderTop: '1px solid var(--border)',
              borderLeft: `3px solid ${leftBorderColor}`,
              color: isUser ? 'var(--gold)' : 'var(--text)',
            }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: i === 0 ? 'var(--gold)' : 'var(--muted)' }}>
              {i + 1}
            </span>
            <span className="font-medium truncate text-xs" style={{ color: isUser ? 'var(--gold)' : 'var(--text)' }}>
              {isUser ? '⭐ Jouw XI' : row.team}
            </span>
            <span className="text-center text-xs">{row.won}</span>
            <span className="text-center text-xs">{row.drawn}</span>
            <span className="text-center text-xs">{row.lost}</span>
            <span className="text-center text-xs" style={{ color: gd > 0 ? '#4ade80' : gd < 0 ? 'var(--red)' : 'var(--muted)' }}>
              {gd > 0 ? '+' : ''}{gd}
            </span>
            {showCarryover && (
              <span className="text-center text-xs" style={{ color: 'var(--muted)' }}>
                {row.carryoverPoints ?? 0}
              </span>
            )}
            <span className="text-center font-bold" style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
              {row.points}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Match list ───────────────────────────────────────────────────────────────

function MatchList({ matches }: { matches: SimulatedMatch[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  // Group by every 8 matches as a "speeldag" block
  const rounds = matches.reduce<Record<number, SimulatedMatch[]>>((acc, m) => {
    const block = Math.ceil(m.round / 1);
    (acc[m.round] ??= []).push(m);
    return acc;
  }, {});

  // Show at most 6 rounds expanded by default — show the rest collapsed
  const roundKeys = Object.keys(rounds).map(Number).sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          Uitslagen ({matches.length} wedstrijden)
        </span>
        <button className="text-xs underline" style={{ color: 'var(--muted)' }}
          onClick={() => setExpanded(expanded === -1 ? null : -1)}>
          {expanded === -1 ? 'Alles inklappen' : 'Alles uitklappen'}
        </button>
      </div>

      {/* Show only matches involving Jouw XI by default, or all if expanded */}
      {(expanded === -1 ? matches : matches.filter(m => m.home === 'Jouw XI' || m.away === 'Jouw XI'))
        .map((m, i) => {
          const userPlaying = m.home === 'Jouw XI' || m.away === 'Jouw XI';
          return (
            <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2"
              style={{
                background: userPlaying ? 'rgba(212,148,10,0.06)' : 'var(--surface)',
                border: `1px solid ${userPlaying ? 'var(--gold-dim)' : 'var(--border)'}`,
              }}>
              <span className="text-xs text-right flex-1 truncate"
                style={{ color: m.home === 'Jouw XI' ? 'var(--gold)' : 'var(--text)', fontWeight: m.home === 'Jouw XI' ? 600 : 400 }}>
                {m.home}
              </span>
              <span className="mx-3 flex-shrink-0"
                style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text)', letterSpacing: '0.1em', minWidth: 48, textAlign: 'center' }}>
                {m.homeGoals} – {m.awayGoals}
              </span>
              <span className="text-xs flex-1 truncate"
                style={{ color: m.away === 'Jouw XI' ? 'var(--gold)' : 'var(--text)', fontWeight: m.away === 'Jouw XI' ? 600 : 400 }}>
                {m.away}
              </span>
            </div>
          );
        })}

      {expanded !== -1 && (
        <p className="text-xs text-center mt-1" style={{ color: 'var(--muted)' }}>
          Enkel wedstrijden van Jouw XI getoond.{' '}
          <button className="underline" onClick={() => setExpanded(-1)}>Toon alle {matches.length} wedstrijden</button>
        </p>
      )}
    </div>
  );
}
