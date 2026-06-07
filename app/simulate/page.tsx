'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/store';
import { getAvailableRolls, loadSquad, selectClassicOpponents, CURRENT_SEASON } from '@/lib/data';
import { ClassicOpponent } from '@/lib/store';
import {
  simulateSeason,
  buildSimTeams,
  generateFullSchedule,
  simulateRound,
  computeStandings,
  calculateOdds,
  SimTeamPublic,
  SeasonOdds,
} from '@/lib/simulation/engine';
import { Squad, SimulatedSeason, SimulatedPhase, StandingRow, SimulatedMatch, Formation, PickedPlayer } from '@/lib/types';
import { calculateScore, ScoreBreakdown } from '@/lib/scoring';
import { useT } from '@/lib/useT';

type SimMode = 'auto' | 'manual';
type TabId = 'regular' | 'po1' | 'po2' | 'relegation' | 'scorers';

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SimulatePage() {
  const router = useRouter();
  const {
    formation, pickedPlayers, simulatedSeason, setSimulatedSeason, reset,
    teamName, setTeamName, simSeason, setSimSeason,
    classicSquads, setClassicSquads,
  } = useGameStore();
  const [mode, setMode] = useState<SimMode | null>(null);
  const [squads, setSquads] = useState<Squad[] | null>(null);
  const [mounted, setMounted] = useState(false);
  const [odds, setOdds] = useState<SeasonOdds | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!formation || pickedPlayers.length < 11) { router.replace('/'); }
  }, [mounted, formation, pickedPlayers.length, router]);

  // Bereken kansen op de achtergrond zodra squads klaar zijn — blokkeert de UI niet
  useEffect(() => {
    if (!squads || odds) return;
    const name = teamName.trim() || 'Mijn Droomelftal';
    const id = setTimeout(() => {
      setOdds(calculateOdds(pickedPlayers, squads, name, formation ?? undefined, 1000));
    }, 50);
    return () => clearTimeout(id);
  }, [squads]);


  useEffect(() => {
    if (!formation || pickedPlayers.length < 11) return;
    setSquads(null);
    if (classicSquads && classicSquads.length > 0) {
      // Classic mode — laad de geselecteerde 16 ploegen
      Promise.all(classicSquads.map(s => loadSquad(s.teamId, s.season)))
        .then(results => setSquads(results.filter(Boolean) as Squad[]));
    } else {
      // Seizoen mode — laad alle ploegen van het gekozen seizoen
      const rolls = getAvailableRolls().filter(r => r.season === simSeason);
      Promise.all(rolls.map(r => loadSquad(r.team.id, r.season)))
        .then(results => setSquads(results.filter(Boolean) as Squad[]));
    }
  }, [simSeason, classicSquads]);

  if (!mounted || !formation || pickedPlayers.length < 11) return null;

  const sim = simulatedSeason as SimulatedSeason | null;

  if (sim) {
    return <ResultsView sim={sim} onReset={() => {
      if (window.confirm('Weet je zeker dat je opnieuw wil beginnen? Je resultaten gaan verloren.')) {
        reset(); router.push('/');
      }
    }} onBack={() => router.push('/xi')} />;
  }

  function handleModeSelect(simMode: SimMode, opponents?: ClassicOpponent[]) {
    if (opponents) setClassicSquads(opponents);
    setMode(simMode);
  }

  if (!mode) {
    return (
      <ModeSelector
        teamName={teamName} setTeamName={setTeamName}
        simSeason={simSeason} setSimSeason={setSimSeason}
        odds={odds}
        onSelect={handleModeSelect}
      />
    );
  }

  if (!squads) {
    return <LoadingView label="Squads laden…" />;
  }

  if (mode === 'auto') {
    return (
      <AutoSim
        squads={squads}
        pickedPlayers={pickedPlayers}
        teamName={teamName}
        formation={formation ?? undefined}
        onDone={result => { setSimulatedSeason(result as any); }}
      />
    );
  }

  return (
    <ManualSim
      squads={squads}
      pickedPlayers={pickedPlayers}
      teamName={teamName}
      formation={formation ?? undefined}
      onDone={result => { setSimulatedSeason(result as any); }}
    />
  );
}

// ─── Mode selector ────────────────────────────────────────────────────────────

const SIM_SEASONS = ['2025-26', '2024-25', '2023-24', '2022-23', '2021-22', '2020-21', '2019-20', '2018-19', '2017-18'] as const;

function ModeSelector({ teamName, setTeamName, simSeason, setSimSeason, odds, onSelect }: {
  teamName: string; setTeamName: (n: string) => void;
  simSeason: string; setSimSeason: (s: string) => void;
  odds: SeasonOdds | null;
  onSelect: (m: SimMode, classicOpponents?: ClassicOpponent[]) => void;
}) {
  const t = useT();
  const [opponentMode, setOpponentMode] = useState<'classic' | 'season'>('season');
  const [pendingSimMode, setPendingSimMode] = useState<SimMode | null>(null);
  const [generatedOpponents, setGeneratedOpponents] = useState<ClassicOpponent[] | null>(null);

  function handleModeCardClick(simMode: SimMode) {
    if (opponentMode === 'classic') {
      // Genereer 16 unieke ploegen en toon preview
      const opponents = selectClassicOpponents();
      setGeneratedOpponents(opponents);
      setPendingSimMode(simMode);
    } else {
      onSelect(simMode);
    }
  }

  // Classic preview scherm
  if (pendingSimMode && generatedOpponents) {
    return (
      <PageShell>
        <div className="w-full max-w-xl">
          <button
            onClick={() => { setPendingSimMode(null); setGeneratedOpponents(null); }}
            className="text-xs mb-6 transition-all"
            style={{ color: 'var(--muted)', cursor: 'pointer', background: 'none', border: 'none' }}
          >
            {t.simMode.backToSetup}
          </button>

          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem,5vw,2.4rem)', color: 'var(--gold)', letterSpacing: '0.08em', marginBottom: 6 }}>
            {t.simMode.classicPreviewTitle}
          </h1>
          <p className="text-xs mb-6" style={{ color: 'var(--muted)' }}>{t.simMode.classicPreviewSubtitle}</p>

          {/* Lijst van 16 ploegen */}
          <div className="flex flex-col rounded-xl overflow-hidden mb-6" style={{ border: '1px solid var(--border)' }}>
            {generatedOpponents.map((opp, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 text-sm"
                style={{
                  borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  borderLeft: `3px solid ${opp.primaryColor}`,
                }}>
                <div className="flex items-center gap-3">
                  <span style={{
                    fontFamily: 'var(--font-display)', fontSize: '0.7rem', color: 'var(--muted)',
                    width: 20, textAlign: 'right', flexShrink: 0,
                  }}>{i + 1}</span>
                  <span style={{ color: 'var(--text)', fontWeight: 500 }}>{opp.teamName}</span>
                </div>
                <span style={{
                  fontSize: '0.7rem', fontFamily: 'var(--font-display)', letterSpacing: '0.06em',
                  padding: '2px 8px', borderRadius: 4,
                  background: 'var(--surface-2)', color: 'var(--muted)',
                }}>
                  {opp.season}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => onSelect(pendingSimMode, generatedOpponents)}
            className="w-full py-3.5 rounded-xl transition-all duration-150"
            style={{
              fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.12em',
              background: 'var(--gold)', color: '#07070A',
              border: '2px solid var(--gold)',
              boxShadow: '0 0 30px rgba(212,148,10,0.25)',
              cursor: 'pointer',
            }}
          >
            {pendingSimMode === 'auto' ? t.simMode.classicConfirmAuto : t.simMode.classicConfirmManual}
          </button>
        </div>
      </PageShell>
    );
  }

  // Normaal setup scherm
  return (
    <PageShell>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem,6vw,3rem)', color: 'var(--gold)', letterSpacing: '0.08em' }}>
        {t.simMode.title}
      </h1>

      {/* Team name */}
      <div className="w-full max-w-xl flex flex-col gap-1.5">
        <label className="text-xs tracking-widest uppercase px-1" style={{ color: 'var(--muted)' }}>
          {t.simMode.teamNameLabel}
        </label>
        <input
          value={teamName}
          onChange={e => setTeamName(e.target.value)}
          onBlur={e => { if (!e.target.value.trim()) setTeamName(t.simMode.teamNamePlaceholder); }}
          maxLength={28}
          placeholder={t.simMode.teamNamePlaceholder}
          className="rounded px-4 py-2 text-sm w-full"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }}
        />
      </div>

      {/* Opponent mode toggle */}
      <div className="w-full max-w-xl flex flex-col gap-2">
        <label className="text-xs tracking-widest uppercase px-1" style={{ color: 'var(--muted)' }}>
          {t.simMode.opponentModeLabel}
        </label>
        <div className="flex gap-3">
          {(['classic', 'season'] as const).map(m => {
            const isActive = opponentMode === m;
            const label = m === 'classic' ? t.simMode.classicMode : t.simMode.seasonMode;
            const desc  = m === 'classic' ? t.simMode.classicModeDesc : t.simMode.opponentSeasonLabel;
            return (
              <button key={m} onClick={() => setOpponentMode(m)}
                className="flex-1 flex flex-col items-start px-4 py-3 rounded-lg transition-all duration-150 text-left"
                style={{
                  background: isActive ? 'rgba(212,148,10,0.08)' : 'var(--surface)',
                  border: `1.5px solid ${isActive ? 'var(--gold)' : 'var(--border)'}`,
                  cursor: 'pointer',
                }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.08em', color: isActive ? 'var(--gold)' : 'var(--text)' }}>
                  {label}
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 3, lineHeight: 1.4 }}>{desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Season picker — enkel zichtbaar in seizoen-modus */}
      {opponentMode === 'season' && (
        <div className="w-full max-w-xl flex flex-col gap-1.5">
          <label className="text-xs tracking-widest uppercase px-1" style={{ color: 'var(--muted)' }}>
            {t.simMode.opponentSeasonLabel}
          </label>
          <div className="flex gap-2 flex-wrap">
            {SIM_SEASONS.map(s => (
              <button key={s} onClick={() => setSimSeason(s)}
                className="px-4 py-2 rounded text-sm transition-all duration-150"
                style={{
                  fontFamily: 'var(--font-display)', letterSpacing: '0.06em',
                  background: simSeason === s ? 'var(--gold)' : 'var(--surface)',
                  color: simSeason === s ? '#090907' : 'var(--muted)',
                  border: `1px solid ${simSeason === s ? 'var(--gold)' : 'var(--border)'}`,
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pre-season prognose — verschijnt zachtjes zodra klaar */}
      <div className="w-full max-w-xl">
        <AnimatePresence mode="wait">
          {odds && (
            <motion.div
              key="odds"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
            >
              <div className="px-4 py-2.5 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--gold)' }}>
                  {t.simMode.oddsTitle}
                </span>
                <span className="text-xs" style={{ color: 'var(--muted)', fontSize: '0.65rem' }}>
                  1000 sims
                </span>
              </div>
              <div className="grid grid-cols-5 divide-x" style={{ borderColor: 'var(--border)' }}>
                {ODDS_ROWS.map(({ key, icon, labelKey, color }) => {
                  const pct = odds[key];
                  return (
                    <div key={key} className="flex flex-col items-center justify-center py-3 px-1 gap-1">
                      <span style={{ fontSize: '1rem', lineHeight: 1 }}>{icon}</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color, letterSpacing: '0.02em', lineHeight: 1.2 }}>
                        {pct}%
                      </span>
                      <span className="text-center" style={{ fontSize: '0.55rem', color: 'var(--muted)', letterSpacing: '0.04em', lineHeight: 1.2 }}>
                        {t.simMode[labelKey].split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xl">
        <ModeCard icon="⚡" title={t.simMode.autoTitle}   description={t.simMode.autoDesc}   onClick={() => handleModeCardClick('auto')} />
        <ModeCard icon="▶" title={t.simMode.manualTitle} description={t.simMode.manualDesc} onClick={() => handleModeCardClick('manual')} highlight />
      </div>
    </PageShell>
  );
}

function ModeCard({ icon, title, description, onClick, highlight }: {
  icon: string; title: string; description: string; onClick: () => void; highlight?: boolean;
}) {
  return (
    <button onClick={onClick}
      className="flex-1 flex flex-col items-center gap-3 rounded-xl p-6 text-center transition-all duration-150 hover:scale-[1.02]"
      style={{
        background: highlight ? 'rgba(212,148,10,0.08)' : 'var(--surface)',
        border: `2px solid ${highlight ? 'var(--gold)' : 'var(--border)'}`,
        boxShadow: highlight ? '0 0 24px rgba(212,148,10,0.15)' : 'none',
      }}>
      <span style={{ fontSize: '2rem' }}>{icon}</span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: highlight ? 'var(--gold)' : 'var(--text)', letterSpacing: '0.08em' }}>
        {title}
      </span>
      <span className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>{description}</span>
    </button>
  );
}

// ─── Pre-season prognose ──────────────────────────────────────────────────────

const ODDS_ROWS: {
  key: keyof SeasonOdds;
  icon: string;
  labelKey: 'oddsChampion' | 'oddsPO1' | 'oddsPO2' | 'oddsRelSurvived' | 'oddsRelegated';
  color: string;
}[] = [
  { key: 'champion',    icon: '🥇', labelKey: 'oddsChampion',    color: '#D4940A' },
  { key: 'po1',         icon: '🏆', labelKey: 'oddsPO1',         color: '#C8A040' },
  { key: 'po2',         icon: '🌍', labelKey: 'oddsPO2',         color: '#3a8fd1' },
  { key: 'relSurvived', icon: '⚠️', labelKey: 'oddsRelSurvived', color: 'var(--text-2)' },
  { key: 'relegated',   icon: '🔴', labelKey: 'oddsRelegated',   color: 'var(--red)' },
];

// ─── Auto simulation ──────────────────────────────────────────────────────────

function AutoSim({ squads, pickedPlayers, teamName, formation, onDone }: {
  squads: Squad[]; pickedPlayers: any[]; teamName: string; formation?: string; onDone: (r: SimulatedSeason) => void;
}) {
  useEffect(() => {
    const result = simulateSeason(pickedPlayers, squads, teamName.trim() || 'Mijn Droomelftal', formation);
    onDone(result);
  }, []);
  return <LoadingView label="Seizoen simuleren…" />;
}

// ─── Manual simulation ────────────────────────────────────────────────────────

interface PlayoffGroup {
  names: string[];
  schedule: [string, string][][];
  carry: Record<string, number>;
  matches: SimulatedMatch[];
}
interface Playoffs {
  round: number;
  maxRounds: number; // max(5, 5, 3) = 5
  po1: PlayoffGroup;
  po2: PlayoffGroup;
  rel: PlayoffGroup;
  regularStandings: StandingRow[];
}

function ManualSim({ squads, pickedPlayers, teamName, formation, onDone }: {
  squads: Squad[]; pickedPlayers: any[]; teamName: string; formation?: string; onDone: (r: SimulatedSeason) => void;
}) {
  const t = useT();
  const myTeam = teamName.trim() || t.simMode.teamNamePlaceholder;
  const validSquads = (squads.length + 1) % 2 !== 0 ? squads.slice(0, -1) : squads;

  const teams      = useRef<SimTeamPublic[]>(buildSimTeams(pickedPlayers, validSquads, myTeam, formation));
  const teamNames  = useRef(teams.current.map(t => t.name));
  const regSched   = useRef(generateFullSchedule(teamNames.current)); // 30 rounds, 8 matches each

  // ── Regular season state ─────────────────────────────────────────────────
  const [regRound,    setRegRound]    = useState(0);
  const [regMatches,  setRegMatches]  = useState<SimulatedMatch[]>([]);
  const [lastRound,   setLastRound]   = useState<SimulatedMatch[] | null>(null);
  const [counter,     setCounter]     = useState(1);

  // ── Playoff state (null until regular season complete) ───────────────────
  const [playoffs, setPlayoffs] = useState<Playoffs | null>(null);

  const regDone       = regRound >= regSched.current.length;
  const playoffsDone  = playoffs !== null && playoffs.round >= playoffs.maxRounds;

  // Derived standings (computed from current matches)
  const regStandings = computeStandings(teamNames.current, regMatches);
  const po1Standings = playoffs ? computeStandings(playoffs.po1.names, playoffs.po1.matches, playoffs.po1.carry) : null;
  const po2Standings = playoffs ? computeStandings(playoffs.po2.names, playoffs.po2.matches, playoffs.po2.carry) : null;
  const relStandings = playoffs ? computeStandings(playoffs.rel.names, playoffs.rel.matches, playoffs.rel.carry) : null;

  function simulateRegularRound() {
    if (regDone) return;
    const pairs   = regSched.current[regRound];
    const results = simulateRound(pairs, teams.current, counter);
    setRegMatches(prev => [...prev, ...results]);
    setLastRound(results);
    setCounter(prev => prev + results.length);
    setRegRound(prev => prev + 1);
  }

  function simulateAllRegular() {
    if (regDone) return;
    let allMatches = [...regMatches];
    let c = counter;
    const remaining = regSched.current.slice(regRound);
    for (const pairs of remaining) {
      const results = simulateRound(pairs, teams.current, c);
      allMatches = [...allMatches, ...results];
      c += results.length;
    }
    setRegMatches(allMatches);
    setLastRound(null);
    setCounter(c);
    setRegRound(regSched.current.length);
  }

  function simulateNRegularRounds(n: number) {
    if (regDone) return;
    const slice = regSched.current.slice(regRound, regRound + n);
    if (slice.length === 0) return;
    let allMatches = [...regMatches];
    let c = counter;
    let lastBatch: SimulatedMatch[] = [];
    for (const pairs of slice) {
      const results = simulateRound(pairs, teams.current, c);
      allMatches = [...allMatches, ...results];
      c += results.length;
      lastBatch = results;
    }
    setRegMatches(allMatches);
    setLastRound(lastBatch);
    setCounter(c);
    setRegRound(prev => prev + slice.length);
  }

  function startPlayoffs() {
    const finalStandings = computeStandings(teamNames.current, regMatches);
    const po1Names = finalStandings.slice(0, 6).map(r => r.team);
    const po2Names = finalStandings.slice(6, 12).map(r => r.team);
    const relNames = finalStandings.slice(12).map(r => r.team); // 4 teams

    const po1Sched = generateFullSchedule(po1Names); // home + away: 10 rounds
    const po2Sched = generateFullSchedule(po2Names); // home + away: 10 rounds
    const relSched = generateFullSchedule(relNames);  // home + away:  6 rounds
    setPlayoffs({
      round: 0,
      maxRounds: Math.max(po1Sched.length, po2Sched.length, relSched.length),
      po1: { names: po1Names, schedule: po1Sched, carry: Object.fromEntries(finalStandings.slice(0, 6).map(r => [r.team, Math.ceil(r.points / 2)])), matches: [] },
      po2: { names: po2Names, schedule: po2Sched, carry: Object.fromEntries(finalStandings.slice(6, 12).map(r => [r.team, Math.ceil(r.points / 2)])), matches: [] },
      rel: { names: relNames, schedule: relSched, carry: Object.fromEntries(finalStandings.slice(12).map(r => [r.team, r.points])), matches: [] },
      regularStandings: finalStandings,
    });
    setLastRound(null);
  }

  function simulatePlayoffRound() {
    if (!playoffs || playoffsDone) return;
    const r = playoffs.round;
    let c = counter;

    const po1R = r < playoffs.po1.schedule.length ? simulateRound(playoffs.po1.schedule[r], teams.current, c) : [];
    c += po1R.length;
    const po2R = r < playoffs.po2.schedule.length ? simulateRound(playoffs.po2.schedule[r], teams.current, c) : [];
    c += po2R.length;
    const relR = r < playoffs.rel.schedule.length ? simulateRound(playoffs.rel.schedule[r], teams.current, c) : [];
    c += relR.length;

    setCounter(c);
    setLastRound([...po1R, ...po2R, ...relR]);
    setPlayoffs(prev => prev && ({
      ...prev,
      round: prev.round + 1,
      po1: { ...prev.po1, matches: [...prev.po1.matches, ...po1R] },
      po2: { ...prev.po2, matches: [...prev.po2.matches, ...po2R] },
      rel: { ...prev.rel, matches: [...prev.rel.matches, ...relR] },
    }));
  }

  function simulateAllPlayoffs() {
    if (!playoffs || playoffsDone) return;
    let po1M = [...playoffs.po1.matches];
    let po2M = [...playoffs.po2.matches];
    let relM = [...playoffs.rel.matches];
    let c = counter;
    const remaining = playoffs.maxRounds - playoffs.round;
    for (let step = 0; step < remaining; step++) {
      const r = playoffs.round + step;
      const po1R = r < playoffs.po1.schedule.length ? simulateRound(playoffs.po1.schedule[r], teams.current, c) : [];
      c += po1R.length;
      const po2R = r < playoffs.po2.schedule.length ? simulateRound(playoffs.po2.schedule[r], teams.current, c) : [];
      c += po2R.length;
      const relR = r < playoffs.rel.schedule.length ? simulateRound(playoffs.rel.schedule[r], teams.current, c) : [];
      c += relR.length;
      po1M = [...po1M, ...po1R];
      po2M = [...po2M, ...po2R];
      relM = [...relM, ...relR];
    }
    setCounter(c);
    setLastRound(null);
    setPlayoffs(prev => prev && ({
      ...prev,
      round: prev.maxRounds,
      po1: { ...prev.po1, matches: po1M },
      po2: { ...prev.po2, matches: po2M },
      rel: { ...prev.rel, matches: relM },
    }));
  }

  function simulateNPlayoffRounds(n: number) {
    if (!playoffs || playoffsDone) return;
    let po1M = [...playoffs.po1.matches];
    let po2M = [...playoffs.po2.matches];
    let relM = [...playoffs.rel.matches];
    let c = counter;
    const steps = Math.min(n, playoffs.maxRounds - playoffs.round);
    if (steps === 0) return;
    let lastBatch: SimulatedMatch[] = [];
    for (let step = 0; step < steps; step++) {
      const r = playoffs.round + step;
      const po1R = r < playoffs.po1.schedule.length ? simulateRound(playoffs.po1.schedule[r], teams.current, c) : [];
      c += po1R.length;
      const po2R = r < playoffs.po2.schedule.length ? simulateRound(playoffs.po2.schedule[r], teams.current, c) : [];
      c += po2R.length;
      const relR = r < playoffs.rel.schedule.length ? simulateRound(playoffs.rel.schedule[r], teams.current, c) : [];
      c += relR.length;
      po1M = [...po1M, ...po1R];
      po2M = [...po2M, ...po2R];
      relM = [...relM, ...relR];
      lastBatch = [...po1R, ...po2R, ...relR];
    }
    setCounter(c);
    setLastRound(lastBatch);
    setPlayoffs(prev => prev && ({
      ...prev,
      round: prev.round + steps,
      po1: { ...prev.po1, matches: po1M },
      po2: { ...prev.po2, matches: po2M },
      rel: { ...prev.rel, matches: relM },
    }));
  }

  function finishSimulation() {
    if (!playoffs || !po1Standings || !po2Standings || !relStandings) return;
    onDone({
      regularSeason:  { name: 'Regulier Seizoen',     matches: regMatches,           standings: playoffs.regularStandings },
      po1:            { name: 'Championship Play-off', matches: playoffs.po1.matches, standings: po1Standings },
      po2:            { name: 'Europa Play-off',       matches: playoffs.po2.matches, standings: po2Standings },
      poRelegation:   { name: 'Relegation Play-off',  matches: playoffs.rel.matches, standings: relStandings },
      champion:       po1Standings[0].team,
      europeanSpots:  po1Standings.slice(0, 4).map(r => r.team),
      relegated:      relStandings.slice(2).map(r => r.team),
      directlyRelegate: '',
    });
  }

  // ── What to show ─────────────────────────────────────────────────────────
  const isRegular  = !playoffs;
  const isPlayoffs = playoffs && !playoffsDone;

  const upcomingPairs = isRegular && !regDone ? regSched.current[regRound] : [];
  const poUpcomingR   = playoffs && !playoffsDone ? playoffs.round : -1;
  const totalRegRounds = regSched.current.length;

  return (
    <PageShell>
      {/* Header */}
      <div className="w-full max-w-2xl text-center">
        <p className="text-xs tracking-widest uppercase mb-1" style={{ color: 'var(--muted)' }}>
          {isRegular ? t.sim.regularSeason : t.sim.playoffsHeader}
        </p>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1rem,4vw,1.6rem)', color: 'var(--gold)', letterSpacing: '0.1em' }}>
          {isRegular
            ? (regDone ? t.sim.regularDone : t.sim.matchday(regRound + 1, totalRegRounds))
            : (playoffsDone ? t.sim.posDone : t.sim.poMatchday(playoffs.round + 1, playoffs.maxRounds))}
        </p>
        <div className="h-1 rounded-full mt-2 w-full" style={{ background: 'var(--border)' }}>
          <div className="h-1 rounded-full transition-all duration-300"
            style={{ background: 'var(--gold)', width: `${isRegular ? (regRound / totalRegRounds) * 100 : playoffs ? (playoffs.round / playoffs.maxRounds) * 100 : 100}%` }} />
        </div>
      </div>

      {/* Last round results — ingeklapt, opent via knop */}
      {lastRound && lastRound.length > 0 && (
        <LastRoundResults
          key={`${regRound}-${playoffs?.round}`}
          matches={lastRound}
          label={isRegular ? t.sim.resultsMatchday(regRound) : t.sim.resultsPOMatchday(playoffs!.round)}
        />
      )}

      {/* Upcoming fixtures preview (regular season) */}
      {isRegular && !regDone && (
        <div className="w-full max-w-2xl flex flex-col gap-1.5">
          <p className="text-xs uppercase tracking-widest px-1" style={{ color: 'var(--muted)' }}>
            {t.sim.upcomingMatchday(regRound + 1)}
          </p>
          {upcomingPairs.map(([h, a], i) => {
            const isUser = h === myTeam || a === myTeam;
            return (
              <div key={i} className="flex items-center justify-between rounded-lg px-4 py-2"
                style={{ background: isUser ? 'rgba(212,148,10,0.06)' : 'var(--surface)', border: `1px solid ${isUser ? 'var(--gold-dim)' : 'var(--border)'}` }}>
                <span className="text-xs flex-1 text-right truncate" style={{ color: h === myTeam ? 'var(--gold)' : 'var(--text)', fontWeight: h === myTeam ? 600 : 400 }}>{h}</span>
                <span className="mx-3 text-xs flex-shrink-0" style={{ color: 'var(--muted)' }}>{t.sim.vs}</span>
                <span className="text-xs flex-1 truncate" style={{ color: a === myTeam ? 'var(--gold)' : 'var(--text)', fontWeight: a === myTeam ? 600 : 400 }}>{a}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Upcoming fixtures preview (playoffs) */}
      {playoffs && !playoffsDone && poUpcomingR >= 0 && (
        <div className="w-full max-w-2xl flex flex-col gap-2">
          <p className="text-xs uppercase tracking-widest px-1" style={{ color: 'var(--muted)' }}>
            {t.sim.upcomingPOMatchday(poUpcomingR + 1)}
          </p>
          {(['po1', 'po2', 'rel'] as const).map(group => {
            const g = playoffs[group];
            if (poUpcomingR >= g.schedule.length) return null;
            const label = group === 'po1' ? t.sim.po1 : group === 'po2' ? t.sim.po2 : t.sim.rel;
            const color = group === 'po1' ? 'var(--gold)' : group === 'po2' ? '#3a8fd1' : 'var(--red)';
            return (
              <div key={group}>
                <p className="text-xs mb-1 px-1" style={{ color }}>{label}</p>
                {g.schedule[poUpcomingR].map(([h, a], i) => {
                  const isUser = h === myTeam || a === myTeam;
                  return (
                    <div key={i} className="flex items-center justify-between rounded-lg px-4 py-2 mb-1"
                      style={{ background: isUser ? 'rgba(212,148,10,0.06)' : 'var(--surface)', border: `1px solid ${isUser ? 'var(--gold-dim)' : 'var(--border)'}` }}>
                      <span className="text-xs flex-1 text-right truncate" style={{ color: h === myTeam ? 'var(--gold)' : 'var(--text)', fontWeight: h === myTeam ? 600 : 400 }}>{h}</span>
                      <span className="mx-3 text-xs flex-shrink-0" style={{ color: 'var(--muted)' }}>{t.sim.vs}</span>
                      <span className="text-xs flex-1 truncate" style={{ color: a === myTeam ? 'var(--gold)' : 'var(--text)', fontWeight: a === myTeam ? 600 : 400 }}>{a}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Standings */}
      <div className="w-full max-w-2xl flex flex-col gap-3">
        {isRegular && (
          <>
            <p className="text-xs uppercase tracking-widest px-1" style={{ color: 'var(--muted)' }}>{t.sim.currentStandings}</p>
            <CompactStandings rows={regStandings} directlyRelegate="" />
          </>
        )}
        {playoffs && po1Standings && po2Standings && relStandings && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: t.sim.po1, rows: po1Standings, color: 'var(--gold)' },
              { label: t.sim.po2, rows: po2Standings, color: '#3a8fd1' },
              { label: t.sim.rel, rows: relStandings, color: 'var(--red)' },
            ].map(({ label, rows, color }) => (
              <div key={label}>
                <p className="text-xs mb-1 px-1" style={{ color }}>{label}</p>
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  {rows.map((row, i) => {
                    const isUser = row.team === myTeam;
                    return (
                      <div key={row.team} className="flex items-center justify-between px-2 py-1.5 text-xs"
                        style={{ background: isUser ? 'rgba(212,148,10,0.06)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                        <span style={{ color: 'var(--muted)', width: 16 }}>{i + 1}</span>
                        <span className="flex-1 truncate mx-1" style={{ color: isUser ? 'var(--gold)' : 'var(--text)' }}>{isUser ? `⭐ ${myTeam}` : row.team}</span>
                        <span style={{ fontFamily: 'var(--font-display)', color: isUser ? 'var(--gold)' : 'var(--text)' }}>{row.points}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2 w-full max-w-2xl">
        {isRegular && !regDone && (
          <>
            <button onClick={simulateRegularRound}
              className="w-full px-10 py-3 rounded-lg transition-all duration-150"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', letterSpacing: '0.12em', background: 'var(--gold)', color: '#090907', border: '2px solid var(--gold)', boxShadow: '0 0 20px rgba(212,148,10,0.3)', cursor: 'pointer' }}>
              {t.sim.simulateMatchday(regRound + 1)}
            </button>
            <SpeedUpRow
              remaining={totalRegRounds - regRound}
              onSkipN={(n) => simulateNRegularRounds(n)}
              onSkipAll={simulateAllRegular}
            />
          </>
        )}
        {isRegular && regDone && (
          <button onClick={startPlayoffs}
            className="w-full px-10 py-3 rounded-lg transition-all duration-150"
            style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', letterSpacing: '0.12em', background: 'var(--gold)', color: '#090907', border: '2px solid var(--gold)', cursor: 'pointer' }}>
            {t.sim.startPlayoffs}
          </button>
        )}
        {isPlayoffs && (
          <>
            <button onClick={simulatePlayoffRound}
              className="w-full px-10 py-3 rounded-lg transition-all duration-150"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', letterSpacing: '0.12em', background: 'var(--gold)', color: '#090907', border: '2px solid var(--gold)', boxShadow: '0 0 20px rgba(212,148,10,0.3)', cursor: 'pointer' }}>
              {t.sim.simulatePOMatchday(playoffs.round + 1)}
            </button>
            <SpeedUpRow
              remaining={playoffs.maxRounds - playoffs.round}
              onSkipN={(n) => simulateNPlayoffRounds(n)}
              onSkipAll={simulateAllPlayoffs}
            />
          </>
        )}
        {playoffsDone && (
          <button onClick={finishSimulation}
            className="w-full px-10 py-3 rounded-lg transition-all duration-150"
            style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', letterSpacing: '0.12em', background: 'var(--gold)', color: '#090907', border: '2px solid var(--gold)', cursor: 'pointer' }}>
            {t.sim.viewResult}
          </button>
        )}
      </div>
    </PageShell>
  );
}

// ─── Results view (auto + after manual completes) ─────────────────────────────

function ResultsView({ sim, onReset, onBack }: {
  sim: SimulatedSeason; onReset: () => void; onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState<TabId>('regular');
  const [matchesOpen, setMatchesOpen] = useState(false);
  const { pickedPlayers, formation, teamName, draftMode, classicSquads, simSeason, recordPlayedGame, playHistory } = useGameStore();
  const t = useT();
  const myTeam = teamName.trim() || t.simMode.teamNamePlaceholder;
  const isBlind = draftMode === 'blind';
  const score = calculateScore(pickedPlayers as PickedPlayer[], sim, myTeam, isBlind);

  const TABS: { id: TabId; label: string; sublabel: string }[] = [
    { id: 'regular',    label: t.results.tabs.regular,    sublabel: t.results.tabs.regularSub },
    { id: 'po1',        label: t.results.tabs.po1,        sublabel: t.results.tabs.po1Sub },
    { id: 'po2',        label: t.results.tabs.po2,        sublabel: t.results.tabs.po2Sub },
    { id: 'relegation', label: t.results.tabs.relegation, sublabel: t.results.tabs.relegationSub },
    { id: 'scorers',    label: t.results.tabs.scorers,    sublabel: t.results.tabs.scorersSub },
  ];

  const phaseForTab: Partial<Record<TabId, SimulatedPhase>> = {
    regular:    sim.regularSeason,
    po1:        sim.po1,
    po2:        sim.po2,
    relegation: sim.poRelegation,
  };

  const userInPO1  = sim.po1.standings.some(r => r.team === myTeam);
  const userInPO2  = sim.po2.standings.some(r => r.team === myTeam);
  const userInRele = sim.poRelegation.standings.some(r => r.team === myTeam);
  const isChampion = sim.champion === myTeam;
  const isRelegate = [...sim.relegated, sim.directlyRelegate].includes(myTeam);

  const resultLabel = isChampion                      ? t.results.resultLabels.champion
    : userInPO1                                       ? t.results.resultLabels.po1
    : userInPO2                                       ? t.results.resultLabels.po2
    : userInRele                                      ? t.results.resultLabels.rel
    : sim.directlyRelegate === myTeam                 ? t.results.resultLabels.directRel
    : '';

  // Bereken doelpunten van eigen spelers in de hele sim
  const allMatches = [...sim.regularSeason.matches, ...sim.po1.matches, ...sim.po2.matches, ...sim.poRelegation.matches];
  const userPlayerNames = new Set((pickedPlayers as PickedPlayer[]).map(p => p.player.name));
  const userGoalsScored = allMatches.reduce(
    (sum, m) => sum + m.scorers.filter(s => userPlayerNames.has(s)).length, 0
  );

  // Sla deze run één keer op in history (idempotent — check laatste entry)
  useEffect(() => {
    if (!formation) return;
    const last = playHistory[0];
    // Identiek aan laatste = niet opnieuw opslaan (refresh-bestendig)
    if (last && last.totalScore === score.total && last.champion === sim.champion && last.teamName === myTeam) return;

    recordPlayedGame({
      formation,
      draftMode,
      opponentMode:  classicSquads && classicSquads.length > 0 ? 'classic' : 'season',
      opponentSeason: classicSquads && classicSquads.length > 0 ? undefined : simSeason,
      teamName: myTeam,
      avgOverall: Math.round(score.avgOverall),
      totalScore: score.total,
      resultLabel: score.resultLabel,
      isChampion,
      champion: sim.champion,
      players: (pickedPlayers as PickedPlayer[]).map(p => ({
        name: p.player.name, teamName: p.teamName, season: p.season,
        position: p.position, overall: p.player.overall,
      })),
      uniqueTeams: score.uniqueTeams,
      uniqueSeasons: score.uniqueSeasons,
      goalsScored: userGoalsScored,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageShell>
      <div className="w-full max-w-2xl flex flex-col gap-5">

        {/* Compact result header */}
        <div className="flex flex-col gap-2">
          <p className="label-xs">{t.results.seasonResults}</p>
          <div className="flex items-center justify-between gap-4 rounded-xl px-5 py-4"
            style={{ background: 'var(--surface)', border: `1px solid ${isChampion ? 'var(--gold)' : isRelegate ? 'rgba(196,30,58,0.4)' : 'var(--border)'}` }}>
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--muted)' }}>{myTeam}</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.1rem,3vw,1.5rem)', letterSpacing: '0.06em',
                color: isChampion ? 'var(--gold)' : isRelegate ? 'var(--red)' : 'var(--text)' }}>
                {resultLabel}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs mb-0.5" style={{ color: 'var(--muted)' }}>{t.results.champion}</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--gold)', letterSpacing: '0.05em' }}>
                {sim.champion}
              </p>
            </div>
          </div>
        </div>

        {/* Phase tabs */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface)' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setMatchesOpen(false); }}
              className="flex-1 py-2 rounded flex flex-col items-center transition-all duration-150"
              style={{ background: activeTab === tab.id ? 'var(--gold)' : 'transparent', color: activeTab === tab.id ? '#090907' : 'var(--muted)' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.08em' }}>{tab.label}</span>
              <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>{tab.sublabel}</span>
            </button>
          ))}
        </div>

        {/* Phase content */}
        <AnimatePresence mode="wait">
          {TABS.map(tab => {
            if (tab.id !== activeTab) return null;
            if (tab.id === 'scorers') {
              return (
                <motion.div key="scorers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <TopScorers sim={sim} pickedPlayers={pickedPlayers as PickedPlayer[]} myTeam={myTeam} />
                </motion.div>
              );
            }
            const phase = phaseForTab[tab.id]!;
            return (
              <motion.div key={tab.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
                {tab.id !== 'regular' && (
                  <p className="text-xs px-1" style={{ color: 'var(--muted)' }}>
                    {tab.id === 'relegation' ? t.results.carryFull : t.results.carryHalf}
                  </p>
                )}
                <StandingsTable rows={phase.standings} tab={tab.id}
                  champion={sim.champion} relegated={sim.relegated}
                  europeanSpots={sim.europeanSpots} directlyRelegate={sim.directlyRelegate} />
                {phase.matches.length > 0 && (
                  <div>
                    <button
                      onClick={() => setMatchesOpen(v => !v)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all duration-150"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer' }}>
                      <span>{t.results.matches(phase.matches.length)}</span>
                      <span>{matchesOpen ? t.results.collapse : t.results.expand}</span>
                    </button>
                    <AnimatePresence>
                      {matchesOpen && (
                        <motion.div key="matches" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                          <div className="mt-2">
                            <MatchList matches={phase.matches} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Score + submit */}
        <ScoreCard score={score} sim={sim} formation={formation!} />

        {/* Share card — ingeklapt, opent via knop */}
        <CollapsibleShare>
          <ShareSection sim={sim} pickedPlayers={pickedPlayers as PickedPlayer[]} formation={formation!} score={score} />
        </CollapsibleShare>

        {/* Data correction link */}
        <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>
          <a href="/corrections" style={{ color: 'var(--muted)', borderBottom: '1px dashed var(--border)' }}>
            {t.corrections.navLink}
          </a>
        </p>

        {/* Actions */}
        <div className="flex gap-4 justify-center mt-2">
          <button onClick={onBack} className="px-6 py-3 rounded text-sm transition-all duration-150"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.1em', background: 'transparent', color: 'var(--muted)', border: '2px solid var(--border)' }}>
            {t.results.backBtn(myTeam)}
          </button>
          <button onClick={onReset} className="px-8 py-3 rounded transition-all duration-150"
            style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.12em', background: 'var(--gold)', color: '#090907', border: '2px solid var(--gold)' }}>
            {t.results.newTeamBtn}
          </button>
        </div>
      </div>
    </PageShell>
  );
}

// ─── Top scorers ─────────────────────────────────────────────────────────────

function TopScorers({ sim, pickedPlayers, myTeam }: {
  sim: SimulatedSeason; pickedPlayers: PickedPlayer[]; myTeam: string;
}) {
  const t = useT();

  // Aggregate goals + assists across all phases
  const goalMap:   Record<string, number> = {};
  const assistMap: Record<string, number> = {};
  for (const m of [
    ...sim.regularSeason.matches, ...sim.po1.matches,
    ...sim.po2.matches, ...sim.poRelegation.matches,
  ]) {
    for (const s of m.scorers)            goalMap[s]   = (goalMap[s]   ?? 0) + 1;
    for (const a of (m.assisters ?? []))  assistMap[a] = (assistMap[a] ?? 0) + 1;
  }

  // Build per-player stats — include all XI players even with 0 goals
  const userByName = Object.fromEntries(pickedPlayers.map(p => [p.player.name, p]));
  const userNames  = new Set(pickedPlayers.map(p => p.player.name));

  const userStats: { name: string; pos: string; goals: number; assists: number; isUser: boolean }[] =
    pickedPlayers.map(p => ({
      name:    p.player.name,
      pos:     p.position as string,
      goals:   goalMap[p.player.name]   ?? 0,
      assists: assistMap[p.player.name] ?? 0,
      isUser:  true,
    })).sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists) || b.goals - a.goals);

  // Top 15 overall (may include non-user players)
  const allNames  = new Set([...Object.keys(goalMap), ...Object.keys(assistMap)]);
  const topOverall = [...allNames]
    .map(name => ({
      name, pos: '' as string,
      goals:   goalMap[name]   ?? 0,
      assists: assistMap[name] ?? 0,
      isUser:  userNames.has(name),
    }))
    .sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists) || b.goals - a.goals)
    .slice(0, 15);

  const StatsTable = ({ rows, showRank }: { rows: typeof userStats; showRank: boolean }) => (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div className="grid px-3 py-1.5 text-xs uppercase tracking-widest"
        style={{ background: 'var(--surface)', color: 'var(--muted)', gridTemplateColumns: showRank ? '1.5rem 1fr 2.5rem 3rem 3.5rem' : '1fr 2.5rem 3rem 3.5rem' }}>
        {showRank && <span>#</span>}
        <span>{t.scorers.player}</span>
        <span className="text-center">{t.scorers.goals}</span>
        <span className="text-center">{t.scorers.assists}</span>
        <span className="text-center">{t.scorers.contributions}</span>
      </div>
      {rows.map((row, i) => {
        const total = row.goals + row.assists;
        return (
          <div key={row.name} className="grid items-center px-3 py-2 text-xs"
            style={{
              gridTemplateColumns: showRank ? '1.5rem 1fr 2.5rem 3rem 3.5rem' : '1fr 2.5rem 3rem 3.5rem',
              background: row.isUser ? 'rgba(212,148,10,0.06)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
              borderTop: '1px solid var(--border)',
              borderLeft: `3px solid ${row.isUser ? 'var(--gold)' : 'transparent'}`,
            }}>
            {showRank && (
              <span style={{ color: i === 0 ? 'var(--gold)' : 'var(--muted)', fontFamily: 'var(--font-display)' }}>{i + 1}</span>
            )}
            <div className="min-w-0">
              <p className="truncate font-medium" style={{ color: row.isUser ? 'var(--gold)' : 'var(--text)' }}>
                {row.isUser ? `⭐ ${row.name}` : row.name}
              </p>
              {row.pos && (
                <span style={{ fontSize: '0.58rem', letterSpacing: '0.06em', color: 'var(--muted)', fontFamily: 'var(--font-display)' }}>
                  {row.pos}
                </span>
              )}
            </div>
            <span className="text-center font-bold" style={{ fontFamily: 'var(--font-display)', color: row.goals > 0 ? 'var(--text)' : 'var(--muted)' }}>
              {row.goals}
            </span>
            <span className="text-center" style={{ color: row.assists > 0 ? 'var(--text-2)' : 'var(--muted)' }}>
              {row.assists}
            </span>
            <span className="text-center font-bold" style={{ fontFamily: 'var(--font-display)', color: total > 0 ? 'var(--gold)' : 'var(--muted)' }}>
              {total}
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Jouw XI */}
      <div>
        <p className="text-xs uppercase tracking-widest px-1 mb-2" style={{ color: 'var(--muted)' }}>
          {t.scorers.yourXI}
        </p>
        <StatsTable rows={userStats} showRank={false} />
      </div>

      {/* Top 15 algemeen */}
      <div>
        <p className="text-xs uppercase tracking-widest px-1 mb-2" style={{ color: 'var(--muted)' }}>
          {t.scorers.topOverall}
        </p>
        {topOverall.length === 0
          ? <p className="text-xs px-1" style={{ color: 'var(--muted)' }}>{t.scorers.none}</p>
          : <StatsTable rows={topOverall} showRank />
        }
      </div>
    </div>
  );
}

// ─── Shared UI components ─────────────────────────────────────────────────────

// ─── Inklapbare share-sectie ──────────────────────────────────────────────────

function CollapsibleShare({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const t = useT();

  if (open) {
    return (
      <div className="flex flex-col gap-3">
        <button
          onClick={() => setOpen(false)}
          className="text-xs self-end transition-all"
          style={{ color: 'var(--muted)', cursor: 'pointer', background: 'none', border: 'none' }}
        >
          ▲ {t.results.collapse}
        </button>
        {children}
      </div>
    );
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="w-full py-3.5 rounded-xl transition-all duration-150 flex items-center justify-center gap-2.5"
      style={{
        fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.12em',
        background: 'var(--surface)', color: 'var(--gold)',
        border: '1px solid var(--gold-dim)',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: '1rem', lineHeight: 1 }}>↑</span>
      {t.share.title.toUpperCase()}
    </button>
  );
}

// ─── Share section ────────────────────────────────────────────────────────────

function ShareSection({ sim, pickedPlayers, formation, score }: {
  sim: SimulatedSeason;
  pickedPlayers: PickedPlayer[];
  formation: string;
  score: ScoreBreakdown;
}) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [twitterImgCopied, setTwitterImgCopied] = useState(false);
  const { teamName, simSeason, language } = useGameStore();
  const t = useT();
  const myTeam = teamName.trim() || t.simMode.teamNamePlaceholder;

  const userInPO1   = sim.po1.standings.some(r => r.team === myTeam);
  const userInPO2   = sim.po2.standings.some(r => r.team === myTeam);
  const userInRele  = sim.poRelegation.standings.some(r => r.team === myTeam);
  const po1Rank     = userInPO1 ? sim.po1.standings.findIndex(r => r.team === myTeam) + 1 : null;
  const isChampion  = sim.champion === myTeam;
  const avgOverall  = pickedPlayers.length
    ? Math.round(pickedPlayers.reduce((s, p) => s + p.player.overall, 0) / pickedPlayers.length)
    : 0;

  const resultLabel = isChampion ? t.results.resultLabels.champion
    : userInPO1  ? `${po1Rank}e — PO1 Championship`
    : userInPO2  ? t.results.resultLabels.po2
    : userInRele ? t.results.resultLabels.rel
    : t.results.resultLabels.directRel;

  const degraded = [...sim.relegated, sim.directlyRelegate].filter(Boolean).join(', ');

  // ── Spelerstatistieken ────────────────────────────────────────────────────
  const allMatches = [
    ...sim.regularSeason.matches, ...sim.po1.matches,
    ...sim.po2.matches,           ...sim.poRelegation.matches,
  ];
  const goalMap:   Record<string, number> = {};
  const assistMap: Record<string, number> = {};
  for (const m of allMatches) {
    for (const s of m.scorers)           goalMap[s]   = (goalMap[s]   ?? 0) + 1;
    for (const a of (m.assisters ?? [])) assistMap[a] = (assistMap[a] ?? 0) + 1;
  }
  // Clean sheets: wedstrijden waarbij myTeam 0 tegendoelpunten kreeg
  const cleanSheets = allMatches.filter(m =>
    (m.home === myTeam && m.awayGoals === 0) ||
    (m.away === myTeam && m.homeGoals === 0)
  ).length;

  function playerStat(p: PickedPlayer): string {
    if (p.position === 'GK') return `${cleanSheets} CS`;
    const g = goalMap[p.player.name] ?? 0;
    const a = assistMap[p.player.name] ?? 0;
    if (g === 0 && a === 0) return '—';
    const parts: string[] = [];
    if (g > 0) parts.push(`${g}G`);
    if (a > 0) parts.push(`${a}A`);
    return parts.join(' ');
  }

  function getShareText() {
    const sorted = [...pickedPlayers].sort((a, b) => a.positionIndex - b.positionIndex);
    const lines = [
      t.share.shareTextHeader,
      '',
      `Formatie: ${formation}  |  Gem. overall: ${avgOverall}`,
      '',
      ...sorted.map(p => {
        const stat = playerStat(p);
        const statStr = stat !== '—' ? ` · ${stat}` : '';
        return `${p.position.padEnd(4)} ${p.player.name} (${p.player.overall})${statStr} — ${p.teamName} ${p.season}`;
      }),
      '',
      '─────────────────────',
      `🏆 Kampioen: ${sim.champion}`,
      `⭐ ${myTeam}: ${resultLabel}`,
      ...(degraded ? [`🔴 Gedegradeerd: ${degraded}`] : []),
      '',
      `pintjesliga.vercel.app`,
    ];
    return lines.join('\n');
  }

  function getShortShareText() {
    // Twitter-vriendelijk (< 280 tekens)
    const sorted = [...pickedPlayers].sort((a, b) => a.positionIndex - b.positionIndex);
    const top3 = sorted.slice(0, 3).map(p => `${p.position} ${p.player.name} (${p.player.overall})`).join(' · ');
    return `${t.share.shortSharePrefix} — ${formation}\n${resultLabel} | ${t.score.avgOvr(avgOverall)}\n\n${top3}\n\npintjesliga.vercel.app #Pintjesliga`;
  }

  function handleCopy() {
    navigator.clipboard.writeText(getShareText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleNativeShare() {
    const text = getShortShareText();
    if (!navigator.share) {
      // Fallback: kopieer tekst
      navigator.clipboard.writeText(getShareText());
      setShared(true);
      setTimeout(() => setShared(false), 2000);
      return;
    }
    try {
      // Probeer eerst te delen met afbeelding
      const blob = await buildCanvasBlob();
      const file = new File([blob], 'pintjesliga-xi.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: 'Pintjesliga XI', text, files: [file] });
      } else {
        await navigator.share({ title: 'Pintjesliga XI', text });
      }
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // Gebruiker annuleerde of fout — geen actie nodig
    }
  }

  function handleTwitter() {
    // Open Twitter synchronously (must stay in the click handler to avoid popup blocker)
    const tweet = encodeURIComponent(getShortShareText());
    window.open(`https://twitter.com/intent/tweet?text=${tweet}`, '_blank', 'noopener');
    // Copy image to clipboard async so user can paste it in the tweet
    buildCanvasBlob().then(blob => {
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(() => {
        setTwitterImgCopied(true);
        setTimeout(() => setTwitterImgCopied(false), 4000);
      }).catch(() => {});
    });
  }

  function buildCanvasBlob(): Promise<Blob> {
    return new Promise(resolve => {
      const W           = 760;
      const PAD         = 28;
      const ROW_H       = 48;
      const HEADER_H    = 92;   // branding (incl. seizoen)
      const RESULT_H    = 88;   // resultaatblok
      const CHAMPION_H  = 64;   // kampioen footer
      const ROWS_H      = pickedPlayers.length * ROW_H + 16;
      const H           = 4 + HEADER_H + RESULT_H + ROWS_H + CHAMPION_H;

      const canvas = document.createElement('canvas');
      canvas.width  = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d')!;

      const GOLD   = '#D4940A';
      const DARK1  = '#0E0D0B';
      const DARK2  = '#07060A';
      const BORDER = '#1E1D1A';
      const TEXT   = '#EDE9E0';
      const MUTED  = '#6B6560';
      const SUBTLE = '#5a5853';
      const resultCanvasColor = isChampion ? GOLD : userInPO1 ? GOLD : userInPO2 ? '#3a8fd1' : userInRele ? '#C41E3A' : MUTED;

      // Achtergrond met subtiele gradient
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, DARK1);
      grad.addColorStop(1, DARK2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Belgische balk
      ctx.fillStyle = '#1A1A1A'; ctx.fillRect(0, 0, W / 3, 4);
      ctx.fillStyle = GOLD;      ctx.fillRect(W / 3, 0, W / 3, 4);
      ctx.fillStyle = '#C41E3A'; ctx.fillRect((W / 3) * 2, 0, W / 3, 4);

      // ── Header ─────────────────────────────────────────
      let y = 4;
      const headerBottom = y + HEADER_H;

      // Subtiele radial highlight rechtsboven
      const radial = ctx.createRadialGradient(W - 100, 30, 0, W - 100, 30, 280);
      radial.addColorStop(0, 'rgba(212,148,10,0.08)');
      radial.addColorStop(1, 'transparent');
      ctx.fillStyle = radial;
      ctx.fillRect(0, y, W, HEADER_H);

      ctx.font = '800 36px Impact, Arial Black, sans-serif';
      ctx.fillStyle = GOLD;
      ctx.textAlign = 'left';
      ctx.fillText('PINTJESLIGA', PAD, y + 44);

      ctx.font = '11px Arial, sans-serif';
      ctx.fillStyle = MUTED;
      ctx.letterSpacing = '1.5px';
      ctx.fillText(`${language === 'nl' ? 'SEIZOEN' : 'SEASON'} ${simSeason}`, PAD, y + 66);
      ctx.letterSpacing = '0px';

      // Formatie chip (rechts)
      const formationText = formation;
      ctx.font = 'bold 13px Arial, sans-serif';
      const fmTextW = ctx.measureText(formationText).width;
      const chipW = fmTextW + 22;
      const chipX = W - PAD - chipW;
      ctx.fillStyle = 'rgba(212,148,10,0.08)';
      ctx.strokeStyle = 'rgba(212,148,10,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(chipX, y + 28, chipW, 22, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = GOLD;
      ctx.textAlign = 'center';
      ctx.fillText(formationText, chipX + chipW / 2, y + 43);

      // Gem. OVR onder chip
      ctx.font = '11px Arial, sans-serif';
      ctx.fillStyle = MUTED;
      ctx.textAlign = 'right';
      const avgLabel = language === 'nl' ? 'gem. OVR ' : 'avg. OVR ';
      const avgValue = String(avgOverall);
      ctx.fillText(avgLabel, W - PAD - ctx.measureText(avgValue).width - 4, y + 66);
      ctx.fillStyle = TEXT;
      ctx.font = 'bold 11px Arial, sans-serif';
      ctx.fillText(avgValue, W - PAD, y + 66);

      // Separator
      ctx.strokeStyle = BORDER;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, headerBottom);
      ctx.lineTo(W, headerBottom);
      ctx.stroke();

      // ── Resultaat blok ─────────────────────────────────
      y = headerBottom;
      // Achtergrond (afhankelijk van uitkomst)
      if (isChampion) {
        const champG = ctx.createLinearGradient(0, y, W, y);
        champG.addColorStop(0, 'rgba(212,148,10,0.18)');
        champG.addColorStop(1, 'rgba(212,148,10,0.02)');
        ctx.fillStyle = champG;
        ctx.fillRect(0, y, W, RESULT_H);
      } else if (userInRele) {
        const releG = ctx.createLinearGradient(0, y, W, y);
        releG.addColorStop(0, 'rgba(196,30,58,0.12)');
        releG.addColorStop(1, 'rgba(196,30,58,0.02)');
        ctx.fillStyle = releG;
        ctx.fillRect(0, y, W, RESULT_H);
      }

      // Linker accent-rand
      ctx.fillStyle = resultCanvasColor;
      ctx.fillRect(0, y, 3, RESULT_H);

      // Teamnaam (klein label)
      ctx.font = '10px Arial, sans-serif';
      ctx.fillStyle = MUTED;
      ctx.textAlign = 'left';
      ctx.letterSpacing = '1.5px';
      ctx.fillText(myTeam.toUpperCase(), PAD, y + 26);
      ctx.letterSpacing = '0px';

      // Result label (groot)
      ctx.font = '800 22px Arial, sans-serif';
      ctx.fillStyle = resultCanvasColor;
      ctx.fillText(resultLabel, PAD, y + 56);

      // Score rechts
      ctx.font = '800 30px Impact, Arial Black, sans-serif';
      ctx.fillStyle = GOLD;
      ctx.textAlign = 'right';
      ctx.fillText(score.total.toLocaleString('nl-BE'), W - PAD, y + 50);

      ctx.font = '10px Arial, sans-serif';
      ctx.fillStyle = MUTED;
      ctx.letterSpacing = '1.5px';
      ctx.fillText(language === 'nl' ? 'PUNTEN' : 'POINTS', W - PAD, y + 68);
      ctx.letterSpacing = '0px';

      // Separator
      ctx.strokeStyle = BORDER;
      ctx.beginPath();
      ctx.moveTo(0, y + RESULT_H);
      ctx.lineTo(W, y + RESULT_H);
      ctx.stroke();

      // ── Spelersrijen ───────────────────────────────────
      y = y + RESULT_H + 8;
      const sorted = [...pickedPlayers].sort((a, b) => a.positionIndex - b.positionIndex);
      for (let i = 0; i < sorted.length; i++) {
        const p    = sorted[i];
        const stat = playerStat(p);
        const rowY = y + i * ROW_H;
        const midY = rowY + ROW_H / 2;

        // Lichte scheiding
        if (i > 0) {
          ctx.strokeStyle = 'rgba(30,29,26,0.5)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(PAD, rowY);
          ctx.lineTo(W - PAD, rowY);
          ctx.stroke();
        }

        // Positie
        ctx.font = 'bold 11px Arial, sans-serif';
        ctx.fillStyle = GOLD;
        ctx.textAlign = 'left';
        ctx.letterSpacing = '0.8px';
        ctx.fillText(p.position, PAD, midY + 4);
        ctx.letterSpacing = '0px';

        // Naam
        ctx.font = '600 15px Arial, sans-serif';
        ctx.fillStyle = TEXT;
        ctx.fillText(p.player.name, PAD + 48, midY - 4);

        // Club · seizoen
        ctx.font = '11px Arial, sans-serif';
        ctx.fillStyle = SUBTLE;
        ctx.fillText(`${p.teamName} · ${p.season}`, PAD + 48, midY + 13);

        // Stat badge
        if (stat !== '—') {
          ctx.font = 'bold 12px Arial, sans-serif';
          const sw = ctx.measureText(stat).width;
          const bw = sw + 18;
          ctx.fillStyle = 'rgba(212,148,10,0.14)';
          ctx.strokeStyle = 'rgba(212,148,10,0.25)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(W - PAD - bw, midY - 12, bw, 22, 5);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = GOLD;
          ctx.textAlign = 'right';
          ctx.fillText(stat, W - PAD - 9, midY + 4);
        } else {
          ctx.font = '12px Arial, sans-serif';
          ctx.fillStyle = '#2a2825';
          ctx.textAlign = 'right';
          ctx.fillText('—', W - PAD, midY + 4);
        }
      }

      // ── Kampioen footer ────────────────────────────────
      const footerTop = HEADER_H + RESULT_H + ROWS_H + 4;
      ctx.fillStyle = 'rgba(212,148,10,0.04)';
      ctx.fillRect(0, footerTop, W, CHAMPION_H);
      ctx.strokeStyle = BORDER;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, footerTop);
      ctx.lineTo(W, footerTop);
      ctx.stroke();

      // Trofee emoji
      ctx.font = '22px Arial, sans-serif';
      ctx.fillStyle = TEXT;
      ctx.textAlign = 'left';
      ctx.fillText('🏆', PAD, footerTop + 38);

      // Champion label + naam
      ctx.font = '10px Arial, sans-serif';
      ctx.fillStyle = MUTED;
      ctx.letterSpacing = '1.5px';
      ctx.fillText(language === 'nl' ? 'KAMPIOEN' : 'CHAMPION', PAD + 38, footerTop + 24);
      ctx.letterSpacing = '0px';

      ctx.font = 'bold 16px Arial, sans-serif';
      ctx.fillStyle = isChampion ? GOLD : TEXT;
      ctx.fillText(sim.champion, PAD + 38, footerTop + 46);

      // URL rechts
      ctx.font = '11px Arial, sans-serif';
      ctx.fillStyle = '#3a3835';
      ctx.textAlign = 'right';
      ctx.letterSpacing = '1px';
      ctx.fillText('pintjesliga.vercel.app', W - PAD, footerTop + 46);
      ctx.letterSpacing = '0px';

      canvas.toBlob(blob => resolve(blob!), 'image/png');
    });
  }

  function handleDownload() {
    buildCanvasBlob().then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pintjesliga-xi.png';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--muted)' }}>{t.share.title}</span>
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      {/* Preview card */}
      {(() => {
        const resultColor = isChampion ? '#D4940A' : userInPO1 ? '#D4940A' : userInPO2 ? '#3a8fd1' : userInRele ? '#C41E3A' : '#6B6560';
        return (
          <div style={{
            background: 'linear-gradient(180deg, #0E0D0B 0%, #07060A 100%)',
            borderRadius: 14,
            overflow: 'hidden',
            border: '1px solid #1E1D1A',
            fontFamily: 'system-ui, Arial, sans-serif',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}>
            {/* Belgian stripe */}
            <div style={{ display: 'flex', height: 3 }}>
              <div style={{ flex: 1, background: '#1A1A1A' }} />
              <div style={{ flex: 1, background: '#D4940A' }} />
              <div style={{ flex: 1, background: '#C41E3A' }} />
            </div>

            {/* ── Header ── */}
            <div style={{
              padding: '18px 22px 14px',
              borderBottom: '1px solid #1E1D1A',
              background: 'radial-gradient(ellipse at top right, rgba(212,148,10,0.08) 0%, transparent 60%)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <p style={{
                    fontFamily: 'Impact, Arial Black, sans-serif',
                    fontSize: 24, color: '#D4940A', letterSpacing: 2.5,
                    lineHeight: 1,
                  }}>
                    PINTJESLIGA
                  </p>
                  <p style={{ fontSize: 10, color: '#6B6560', marginTop: 5, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                    {language === 'nl' ? 'Seizoen' : 'Season'} {simSeason}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 11, color: '#D4940A', letterSpacing: 2,
                    padding: '2px 8px',
                    border: '1px solid rgba(212,148,10,0.35)',
                    borderRadius: 3,
                    background: 'rgba(212,148,10,0.06)',
                    display: 'inline-block',
                  }}>
                    {formation}
                  </p>
                  <p style={{ fontSize: 9.5, color: '#6B6560', marginTop: 5, letterSpacing: 0.6 }}>
                    {language === 'nl' ? 'gem. OVR' : 'avg. OVR'} <span style={{ color: '#EDE9E0', fontWeight: 600 }}>{avgOverall}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* ── Resultaat blok ── */}
            <div style={{
              padding: '14px 22px',
              borderBottom: '1px solid #1E1D1A',
              background: isChampion
                ? 'linear-gradient(90deg, rgba(212,148,10,0.18) 0%, rgba(212,148,10,0.04) 100%)'
                : userInRele
                ? 'linear-gradient(90deg, rgba(196,30,58,0.12) 0%, rgba(196,30,58,0.02) 100%)'
                : 'transparent',
              borderLeft: `3px solid ${resultColor}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 9, color: '#6B6560', letterSpacing: 1.5, textTransform: 'uppercase',
                    marginBottom: 3,
                  }}>
                    {myTeam}
                  </p>
                  <p style={{
                    fontSize: 18, fontWeight: 800, color: resultColor,
                    letterSpacing: 0.3, lineHeight: 1.15,
                  }}>
                    {resultLabel}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{
                    fontFamily: 'Impact, Arial Black, sans-serif',
                    fontSize: 26, color: '#D4940A', letterSpacing: 0.8,
                    lineHeight: 1,
                  }}>
                    {score.total.toLocaleString('nl-BE')}
                  </p>
                  <p style={{ fontSize: 9, color: '#6B6560', marginTop: 3, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                    {language === 'nl' ? 'punten' : 'points'}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Spelerslijst ── */}
            <div style={{ padding: '4px 18px' }}>
              {[...pickedPlayers].sort((a, b) => a.positionIndex - b.positionIndex).map((p, i) => {
                const stat = playerStat(p);
                const hasStat = stat !== '—';
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 4px',
                    borderBottom: i < 10 ? '1px solid rgba(30,29,26,0.5)' : 'none',
                  }}>
                    {/* Positie chip */}
                    <span style={{
                      fontSize: 9, color: '#D4940A', width: 30,
                      fontWeight: 700, flexShrink: 0, letterSpacing: 0.8,
                      textAlign: 'left',
                    }}>
                      {p.position}
                    </span>
                    {/* Naam + club */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 13.5, color: '#EDE9E0', fontWeight: 600,
                        margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        letterSpacing: 0.1,
                      }}>
                        {p.player.name}
                      </p>
                      <p style={{ fontSize: 9.5, color: '#5a5853', margin: 0, marginTop: 1, letterSpacing: 0.2 }}>
                        {p.teamName} · {p.season}
                      </p>
                    </div>
                    {/* Stat badge */}
                    {hasStat ? (
                      <span style={{
                        fontSize: 10, fontWeight: 700, flexShrink: 0,
                        padding: '3px 8px', borderRadius: 4,
                        background: 'rgba(212,148,10,0.14)',
                        color: '#D4940A',
                        letterSpacing: 0.4,
                        border: '1px solid rgba(212,148,10,0.2)',
                      }}>
                        {stat}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#2a2825', minWidth: 42, textAlign: 'right', flexShrink: 0 }}>—</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Kampioen footer ── */}
            <div style={{
              padding: '12px 22px',
              borderTop: '1px solid #1E1D1A',
              background: 'rgba(212,148,10,0.04)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>🏆</span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 9, color: '#6B6560', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                    {language === 'nl' ? 'Kampioen' : 'Champion'}
                  </p>
                  <p style={{
                    fontSize: 13, fontWeight: 700,
                    color: isChampion ? '#D4940A' : '#EDE9E0',
                    letterSpacing: 0.3, marginTop: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {sim.champion}
                  </p>
                </div>
              </div>
              <p style={{ fontSize: 9.5, color: '#3a3835', letterSpacing: 1.2, flexShrink: 0 }}>
                pintjesliga.vercel.app
              </p>
            </div>
          </div>
        );
      })()}

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        {/* Primary: native share (mobile) */}
        <button
          onClick={handleNativeShare}
          className="w-full py-3.5 rounded-lg transition-all duration-150"
          style={{
            fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.12em',
            background: shared ? 'rgba(74,222,128,0.15)' : 'var(--gold)',
            color: shared ? '#4ade80' : '#07070A',
            border: `2px solid ${shared ? '#4ade80' : 'var(--gold)'}`,
            cursor: 'pointer',
          }}>
          {shared ? t.share.shared : t.share.shareBtn}
        </button>

        {/* Secondary row */}
        <div className="flex gap-2">
          {/* Twitter/X */}
          <div className="flex-1 flex flex-col gap-1">
            <button
              onClick={handleTwitter}
              className="w-full py-3 rounded-lg transition-all duration-150 flex items-center justify-center gap-2"
              style={{
                fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.1em',
                background: 'var(--surface)', color: 'var(--text)',
                border: '1px solid var(--border)', cursor: 'pointer',
              }}>
              <span style={{ fontWeight: 900, fontSize: '1rem' }}>𝕏</span> Tweet
            </button>
            {twitterImgCopied && (
              <p className="text-center" style={{ fontSize: '0.65rem', color: '#4ade80' }}>
                {t.share.imgCopied}
              </p>
            )}
          </div>

          {/* Copy text */}
          <button
            onClick={handleCopy}
            className="flex-1 py-3 rounded-lg transition-all duration-150"
            style={{
              fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.1em',
              background: copied ? 'rgba(74,222,128,0.1)' : 'var(--surface)',
              color: copied ? '#4ade80' : 'var(--muted)',
              border: `1px solid ${copied ? '#4ade80' : 'var(--border)'}`,
              cursor: 'pointer',
            }}>
            {copied ? t.share.copied : t.share.copy}
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="flex-1 py-3 rounded-lg transition-all duration-150"
            style={{
              fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.1em',
              background: 'var(--surface)', color: 'var(--muted)',
              border: '1px solid var(--border)', cursor: 'pointer',
            }}>
            {t.share.download}
          </button>
        </div>

        <p className="text-xs text-center" style={{ color: 'var(--muted)', opacity: 0.6 }}>
          {t.share.mobileHint}
        </p>
      </div>
    </div>
  );
}

// ─── Score card ───────────────────────────────────────────────────────────────

function ScoreCard({ score, sim, formation }: { score: ScoreBreakdown; sim: SimulatedSeason; formation: string }) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const router = useRouter();
  const t = useT();

  async function handleSubmit() {
    if (!name.trim() || status === 'submitting') return;
    setStatus('submitting');
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_name: name.trim(),
          score: score.total,
          formation,
          avg_overall: Math.round(score.avgOverall),
          result_label: score.resultLabel,
          result_score: score.resultScore,
          underdog_bonus: score.underdogBonus,
          diversity_bonus: score.diversityBonus,
          unique_teams: score.uniqueTeams,
        }),
      });
      setStatus(res.ok ? 'done' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        <span className="label-xs">{t.score.yourScore}</span>
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      {/* Score display */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        {/* Big total */}
        <div className="flex items-center justify-between px-6 py-5" style={{ background: 'rgba(212,148,10,0.06)', borderBottom: '1px solid var(--border)' }}>
          <div>
            <span className="label-xs block mb-1">{t.score.total}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem,8vw,4rem)', color: 'var(--gold)', letterSpacing: '0.06em', lineHeight: 1 }}>
              {score.total.toLocaleString('nl-BE')}
            </span>
            <span className="text-xs block mt-1" style={{ color: 'var(--muted)' }}>{score.resultLabel}</span>
          </div>
          <button
            onClick={() => router.push('/leaderboard')}
            className="text-xs px-4 py-2 rounded transition-all"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', cursor: 'pointer' }}
          >
            {t.score.leaderboard}
          </button>
        </div>

        {/* Breakdown — rij 1: resultaat + underdog + doelpunten */}
        <div className="grid grid-cols-3 divide-x" style={{ borderColor: 'var(--border)', borderBottom: '1px solid var(--border)' }}>
          {[
            { label: t.score.result,   value: score.resultScore,          color: 'var(--text)' },
            { label: t.score.underdog, value: `+${score.underdogBonus}`,  sub: t.score.avgOvr(score.avgOverall), color: score.underdogBonus > 0 ? 'var(--gold)' : 'var(--muted)' },
            { label: t.score.goals,    value: `+${score.goalsBonus}`,     sub: t.score.goalsScored(score.goalsScored), color: score.goalsBonus > 50 ? 'var(--gold)' : 'var(--text-2)' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="flex flex-col items-center py-3 px-2 gap-0.5">
              <span className="label-xs">{label}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color, letterSpacing: '0.04em' }}>{value}</span>
              {sub && <span className="text-xs" style={{ color: 'var(--muted)' }}>{sub}</span>}
            </div>
          ))}
        </div>

        {/* Breakdown — rij 2: diversiteit + seizoenen + memory */}
        <div className={`grid divide-x ${score.isBlind ? 'grid-cols-3' : 'grid-cols-2'}`} style={{ borderColor: 'var(--border)' }}>
          {[
            { label: t.score.diversity, value: `+${score.diversityBonus}`, sub: t.score.clubs(score.uniqueTeams),         color: score.diversityBonus > 100 ? 'var(--gold)' : 'var(--text-2)' },
            { label: t.score.seasons,   value: `+${score.seasonsBonus}`,   sub: t.score.uniqueSeasons(score.uniqueSeasons), color: score.uniqueSeasons >= 5 ? 'var(--gold)' : 'var(--text-2)' },
            ...(score.isBlind ? [{ label: t.score.memory, value: `+${score.blindBonus}`, sub: t.score.blindBonus, color: 'var(--gold)' }] : []),
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="flex flex-col items-center py-3 px-2 gap-0.5">
              <span className="label-xs">{label}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color, letterSpacing: '0.04em' }}>{value}</span>
              {sub && <span className="text-xs" style={{ color: 'var(--muted)' }}>{sub}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Submit form */}
      {status === 'done' ? (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-lg px-4 py-3 flex items-center gap-3"
          style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.3)' }}>
          <span style={{ color: '#4ade80', fontSize: '1.2rem' }}>✓</span>
          <div>
            <p className="text-sm font-medium" style={{ color: '#4ade80' }}>{t.score.saved}</p>
            <button onClick={() => router.push('/leaderboard')} className="text-xs underline" style={{ color: 'var(--muted)' }}>
              {t.score.viewLeaderboard}
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="flex gap-2">
          <input
            value={name}
            onChange={e => { setName(e.target.value.slice(0, 24)); if (status === 'error') setStatus('idle'); }}
            placeholder={t.score.namePlaceholder}
            maxLength={24}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="flex-1 rounded-lg px-4 py-2.5 text-sm"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }}
          />
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || status === 'submitting'}
            className="px-5 py-2.5 rounded-lg text-sm transition-all"
            style={{
              fontFamily: 'var(--font-display)', letterSpacing: '0.1em',
              background: name.trim() ? 'var(--gold)' : 'var(--surface)',
              color: name.trim() ? '#07070A' : 'var(--muted)',
              border: `1px solid ${name.trim() ? 'var(--gold)' : 'var(--border)'}`,
              cursor: name.trim() ? 'pointer' : 'default',
              opacity: status === 'submitting' ? 0.6 : 1,
            }}
          >
            {status === 'submitting' ? '…' : t.score.submit}
          </button>
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'rgba(196,30,58,0.08)', border: '1px solid rgba(196,30,58,0.3)' }}>
          <p className="text-xs" style={{ color: 'var(--red)' }}>
            {t.score.errorMsg}
          </p>
          <button onClick={() => setStatus('idle')} className="text-xs underline ml-3 shrink-0" style={{ color: 'var(--red)', cursor: 'pointer' }}>
            {t.score.clearError}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[calc(100svh-56px)] flex flex-col items-center px-4 py-5 sm:py-8 gap-4 sm:gap-6">
      {children}
    </main>
  );
}

function SpeedUpRow({ remaining, onSkipN, onSkipAll }: {
  remaining: number;
  onSkipN: (n: number) => void;
  onSkipAll: () => void;
}) {
  const t = useT();
  // Bepaal welke skip-knoppen zinnig zijn
  const showThree = remaining > 3;
  const showFive  = remaining > 5;

  if (remaining <= 1) return null;

  return (
    <div className="flex gap-2 w-full">
      {showThree && (
        <button onClick={() => onSkipN(3)}
          className="flex-1 px-3 py-2.5 rounded-lg transition-all duration-150"
          style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '0.08em', background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
          +3 ⏭
        </button>
      )}
      {showFive && (
        <button onClick={() => onSkipN(5)}
          className="flex-1 px-3 py-2.5 rounded-lg transition-all duration-150"
          style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '0.08em', background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
          +5 ⏭
        </button>
      )}
      <button onClick={onSkipAll}
        className="flex-1 px-3 py-2.5 rounded-lg transition-all duration-150"
        style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '0.08em', background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)', cursor: 'pointer' }}>
        ⚡ {t.sim.skipAll ?? 'Sla alles over'} ({remaining})
      </button>
    </div>
  );
}

function LastRoundResults({ matches, label }: { matches: SimulatedMatch[]; label: string }) {
  const [open, setOpen] = useState(false);
  const { teamName } = useGameStore();
  const t = useT();
  const myTeam = teamName.trim() || t.simMode.teamNamePlaceholder;

  // Mini-samenvatting wedstrijd gebruiker
  const userMatch = matches.find(m => m.home === myTeam || m.away === myTeam);
  const summary = userMatch
    ? `${userMatch.home}  ${userMatch.homeGoals} — ${userMatch.awayGoals}  ${userMatch.away}`
    : `${matches.length} ${matches.length === 1 ? 'wedstrijd' : 'wedstrijden'}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl"
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between rounded-lg px-4 py-2.5 transition-all"
        style={{
          background: 'var(--surface)',
          border: `1px solid ${open ? 'var(--gold-dim)' : 'var(--border)'}`,
          cursor: 'pointer',
        }}
      >
        <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
          <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{label}</span>
          {!open && (
            <span className="text-xs truncate" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
              {summary}
            </span>
          )}
        </div>
        <span style={{ color: 'var(--muted)', fontSize: '0.75rem', marginLeft: 12 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
            className="flex flex-col gap-1.5 mt-2"
          >
            {matches.map((m, i) => <MatchRow key={i} match={m} />)}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function LoadingView({ label }: { label: string }) {
  return (
    <PageShell>
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="w-12 h-12 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
        <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>{label}</p>
      </div>
    </PageShell>
  );
}

function MatchRow({ match }: { match: SimulatedMatch }) {
  const { teamName } = useGameStore();
  const t = useT();
  const myTeam   = teamName.trim() || t.simMode.teamNamePlaceholder;
  const isUser   = match.home === myTeam || match.away === myTeam;

  // Scorers: first homeGoals entries = home team, rest = away team
  const homeScorers = match.scorers.slice(0, match.homeGoals);
  const awayScorers = match.scorers.slice(match.homeGoals);

  // Count occurrences for "Speler (2)" display
  const countNames = (names: string[]) =>
    [...names.reduce((map, n) => map.set(n, (map.get(n) ?? 0) + 1), new Map<string, number>())]
      .map(([n, c]) => c > 1 ? `${n.split(' ').pop()} (${c})` : n.split(' ').pop()!)
      .join(', ');

  const hasScorers = match.scorers.length > 0;

  return (
    <div className="rounded-lg overflow-hidden"
      style={{ background: isUser ? 'rgba(212,148,10,0.04)' : 'var(--surface)', border: `1px solid ${isUser ? 'var(--gold-dim)' : 'var(--border)'}` }}>

      {/* Score row */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs flex-1 text-right truncate"
          style={{ color: match.home === myTeam ? 'var(--gold)' : 'var(--text)', fontWeight: match.home === myTeam ? 600 : 400 }}>
          {match.home}
        </span>
        <span className="mx-3 flex-shrink-0"
          style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--text)', letterSpacing: '0.1em', minWidth: 44, textAlign: 'center' }}>
          {match.homeGoals} – {match.awayGoals}
        </span>
        <span className="text-xs flex-1 truncate"
          style={{ color: match.away === myTeam ? 'var(--gold)' : 'var(--text)', fontWeight: match.away === myTeam ? 600 : 400 }}>
          {match.away}
        </span>
      </div>

      {/* Scorers row */}
      {hasScorers && (
        <div className="flex items-start justify-between px-3 pb-2 gap-2"
          style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs flex-1 text-right leading-relaxed" style={{ color: 'var(--muted)' }}>
            {homeScorers.length > 0 && <span>⚽ {countNames(homeScorers)}</span>}
          </p>
          <div className="flex-shrink-0" style={{ width: 44 }} />
          <p className="text-xs flex-1 leading-relaxed" style={{ color: 'var(--muted)' }}>
            {awayScorers.length > 0 && <span>⚽ {awayScorers.length > 0 ? countNames(awayScorers) : ''}</span>}
          </p>
        </div>
      )}
    </div>
  );
}

function CompactStandings({ rows, directlyRelegate }: { rows: StandingRow[]; directlyRelegate: string }) {
  const { teamName } = useGameStore();
  const t = useT();
  const myTeam = teamName.trim() || t.simMode.teamNamePlaceholder;
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div className="grid px-3 py-1.5 text-xs uppercase tracking-widest"
        style={{ background: 'var(--surface)', color: 'var(--muted)', gridTemplateColumns: '1.5rem 1fr 2rem 2rem 3rem' }}>
        <span>{t.standings.rank}</span><span>{t.standings.team}</span><span className="text-center">{t.standings.played}</span>
        <span className="text-center">{t.standings.gd}</span><span className="text-center">{t.standings.pts}</span>
      </div>
      {rows.map((row, i) => {
        const isUser = row.team === myTeam;
        const isDirect = row.team === directlyRelegate;
        const gd = row.goalsFor - row.goalsAgainst;
        return (
          <div key={row.team} className="grid items-center px-3 py-1.5 text-xs"
            style={{
              gridTemplateColumns: '1.5rem 1fr 2rem 2rem 3rem',
              background: isUser ? 'rgba(212,148,10,0.06)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
              borderTop: '1px solid var(--border)',
              borderLeft: `3px solid ${isDirect ? 'var(--red)' : isUser ? 'var(--gold)' : 'transparent'}`,
              color: isUser ? 'var(--gold)' : 'var(--text)',
            }}>
            <span style={{ color: 'var(--muted)' }}>{i + 1}</span>
            <span className="truncate font-medium">{isUser ? `⭐ ${myTeam}` : row.team}</span>
            <span className="text-center" style={{ color: 'var(--muted)' }}>{row.played}</span>
            <span className="text-center" style={{ color: gd > 0 ? '#4ade80' : gd < 0 ? 'var(--red)' : 'var(--muted)' }}>
              {gd > 0 ? '+' : ''}{gd}
            </span>
            <span className="text-center font-bold" style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem' }}>{row.points}</span>
          </div>
        );
      })}
    </div>
  );
}

function StandingsTable({ rows, tab, champion, relegated, europeanSpots, directlyRelegate }: {
  rows: StandingRow[]; tab: TabId; champion: string;
  relegated: string[]; europeanSpots: string[]; directlyRelegate: string;
}) {
  const { teamName } = useGameStore();
  const t = useT();
  const myTeam = teamName.trim() || t.simMode.teamNamePlaceholder;
  const showCarryover = tab !== 'regular' && rows.some(r => r.carryoverPoints !== undefined);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div className="grid px-3 py-2 text-xs uppercase tracking-widest"
        style={{
          background: 'var(--surface)', color: 'var(--muted)',
          gridTemplateColumns: showCarryover ? '1.5rem 1fr 1.8rem 1.8rem 1.8rem 2rem 2.5rem 2.8rem' : '1.5rem 1fr 1.8rem 1.8rem 1.8rem 2rem 2.8rem',
        }}>
        <span>{t.standings.rank}</span><span>{t.standings.team}</span>
        <span className="text-center">{t.standings.w}</span><span className="text-center">{t.standings.d}</span>
        <span className="text-center">{t.standings.l}</span><span className="text-center">{t.standings.gd}</span>
        {showCarryover && <span className="text-center">{t.standings.carryover}</span>}
        <span className="text-center">{t.standings.pts}</span>
      </div>
      {rows.map((row, i) => {
        const isUser         = row.team === myTeam;
        const isChampion     = tab === 'po1' && row.team === champion;
        const isRelegate     = tab === 'relegation' && relegated.includes(row.team);
        const isDirectRel    = tab === 'regular' && row.team === directlyRelegate;
        const isEU           = tab === 'po1' && europeanSpots.includes(row.team);
        const gd             = row.goalsFor - row.goalsAgainst;
        const leftBorder     = isChampion ? 'var(--gold)' : isRelegate || isDirectRel ? 'var(--red)' : isEU ? '#1a3a6e' : 'transparent';
        return (
          <motion.div key={row.team} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
            className="grid items-center px-3 py-2.5 text-sm"
            style={{
              gridTemplateColumns: showCarryover ? '1.5rem 1fr 1.8rem 1.8rem 1.8rem 2rem 2.5rem 2.8rem' : '1.5rem 1fr 1.8rem 1.8rem 1.8rem 2rem 2.8rem',
              background: isUser ? 'rgba(212,148,10,0.08)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
              borderTop: '1px solid var(--border)',
              borderLeft: `3px solid ${leftBorder}`,
              color: isUser ? 'var(--gold)' : 'var(--text)',
            }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: i === 0 ? 'var(--gold)' : 'var(--muted)' }}>{i + 1}</span>
            <span className="font-medium truncate text-xs" style={{ color: isUser ? 'var(--gold)' : 'var(--text)' }}>
              {isUser ? `⭐ ${myTeam}` : row.team}
            </span>
            <span className="text-center text-xs">{row.won}</span>
            <span className="text-center text-xs">{row.drawn}</span>
            <span className="text-center text-xs">{row.lost}</span>
            <span className="text-center text-xs" style={{ color: gd > 0 ? '#4ade80' : gd < 0 ? 'var(--red)' : 'var(--muted)' }}>
              {gd > 0 ? '+' : ''}{gd}
            </span>
            {showCarryover && <span className="text-center text-xs" style={{ color: 'var(--muted)' }}>{row.carryoverPoints ?? 0}</span>}
            <span className="text-center font-bold" style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}>{row.points}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

function MatchList({ matches }: { matches: SimulatedMatch[] }) {
  const [showAll, setShowAll] = useState(false);
  const { teamName } = useGameStore();
  const t = useT();
  const myTeam = teamName.trim() || t.simMode.teamNamePlaceholder;
  const userMatches = matches.filter(m => m.home === myTeam || m.away === myTeam);
  const displayed = showAll ? matches : userMatches;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          {t.matchList.results(matches.length)}
        </span>
        <button className="text-xs underline" style={{ color: 'var(--muted)' }} onClick={() => setShowAll(v => !v)}>
          {showAll ? t.matchList.onlyTeam(myTeam) : t.matchList.showAll(matches.length)}
        </button>
      </div>
      {displayed.map((m, i) => <MatchRow key={i} match={m} />)}
    </div>
  );
}
