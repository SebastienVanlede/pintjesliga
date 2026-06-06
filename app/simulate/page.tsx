'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/store';
import { getAvailableRolls, loadSquad, CURRENT_SEASON } from '@/lib/data';
import {
  simulateSeason,
  buildSimTeams,
  generateFullSchedule,
  generatePlayoffSchedule,
  simulateRound,
  computeStandings,
  SimTeamPublic,
} from '@/lib/simulation/engine';
import { Squad, SimulatedSeason, SimulatedPhase, StandingRow, SimulatedMatch, Formation, PickedPlayer } from '@/lib/types';

type SimMode = 'auto' | 'manual';
type TabId = 'regular' | 'po1' | 'po2' | 'relegation';

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SimulatePage() {
  const router = useRouter();
  const { formation, pickedPlayers, simulatedSeason, setSimulatedSeason, reset, teamName, setTeamName } = useGameStore();
  const [mode, setMode] = useState<SimMode | null>(null);
  const [squads, setSquads] = useState<Squad[] | null>(null);

  useEffect(() => {
    if (!formation || pickedPlayers.length < 11) { router.replace('/'); return; }
  }, []);

  useEffect(() => {
    if (!formation || pickedPlayers.length < 11) return;
    // Pre-load squads so both modes can use them
    const currentRolls = getAvailableRolls().filter(r => r.season === CURRENT_SEASON);
    Promise.all(currentRolls.map(r => loadSquad(r.team.id, r.season)))
      .then(results => setSquads(results.filter(Boolean) as Squad[]));
  }, []);

  if (!formation || pickedPlayers.length < 11) return null;

  const sim = simulatedSeason as SimulatedSeason | null;

  // Already have a completed result → show it
  if (sim) {
    return <ResultsView sim={sim} onReset={() => { reset(); router.push('/'); }} onBack={() => router.push('/xi')} />;
  }

  // Mode not yet chosen
  if (!mode) {
    return <ModeSelector teamName={teamName} setTeamName={setTeamName} onSelect={setMode} />;
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
        onDone={result => { setSimulatedSeason(result as any); }}
      />
    );
  }

  return (
    <ManualSim
      squads={squads}
      pickedPlayers={pickedPlayers}
      teamName={teamName}
      onDone={result => { setSimulatedSeason(result as any); }}
    />
  );
}

// ─── Mode selector ────────────────────────────────────────────────────────────

function ModeSelector({ teamName, setTeamName, onSelect }: {
  teamName: string; setTeamName: (n: string) => void; onSelect: (m: SimMode) => void;
}) {
  return (
    <PageShell>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem,6vw,3rem)', color: 'var(--gold)', letterSpacing: '0.08em' }}>
        KIES SIMULATIEMODUS
      </h1>
      <div className="w-full max-w-xl flex flex-col gap-1.5">
        <label className="text-xs tracking-widest uppercase px-1" style={{ color: 'var(--muted)' }}>
          Naam van jouw team
        </label>
        <input
          value={teamName}
          onChange={e => setTeamName(e.target.value)}
          onBlur={e => { if (!e.target.value.trim()) setTeamName('Mijn Droomelftal'); }}
          maxLength={28}
          placeholder="Mijn Droomelftal"
          className="rounded px-4 py-2 text-sm w-full"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }}
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xl">
        <ModeCard
          icon="⚡"
          title="Automatisch"
          description="Volledig seizoen in één klik. Direct de eindstand, play-offs en uitslag."
          onClick={() => onSelect('auto')}
        />
        <ModeCard
          icon="▶"
          title="Handmatig"
          description="Speeldag per speeldag. Jij bepaalt wanneer je doorgaat. Zie de stand live evolueren."
          onClick={() => onSelect('manual')}
          highlight
        />
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

// ─── Auto simulation ──────────────────────────────────────────────────────────

function AutoSim({ squads, pickedPlayers, teamName, onDone }: {
  squads: Squad[]; pickedPlayers: any[]; teamName: string; onDone: (r: SimulatedSeason) => void;
}) {
  useEffect(() => {
    const result = simulateSeason(pickedPlayers, squads, teamName.trim() || 'Mijn Droomelftal');
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

function ManualSim({ squads, pickedPlayers, teamName, onDone }: {
  squads: Squad[]; pickedPlayers: any[]; teamName: string; onDone: (r: SimulatedSeason) => void;
}) {
  const myTeam = teamName.trim() || 'Mijn Droomelftal';
  // Ensure 16 teams total (drop last squad if needed for even number)
  const validSquads = (squads.length + 1) % 2 !== 0 ? squads.slice(0, -1) : squads;

  const teams      = useRef<SimTeamPublic[]>(buildSimTeams(pickedPlayers, validSquads, myTeam));
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

  function startPlayoffs() {
    const finalStandings = computeStandings(teamNames.current, regMatches);
    const po1Names = finalStandings.slice(0, 6).map(r => r.team);
    const po2Names = finalStandings.slice(6, 12).map(r => r.team);
    const relNames = finalStandings.slice(12).map(r => r.team); // 4 teams

    const po1Sched = generateFullSchedule(po1Names);   // home + away: 10 rounds
    const po2Sched = generatePlayoffSchedule(po2Names); // single: 5 rounds
    const relSched = generatePlayoffSchedule(relNames);  // single: 3 rounds
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

    // All three playoff groups advance simultaneously
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
          {isRegular ? 'Regulier Seizoen' : 'Play-offs — PO1 · PO2 · Relegate PO gelijktijdig'}
        </p>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1rem,4vw,1.6rem)', color: 'var(--gold)', letterSpacing: '0.1em' }}>
          {isRegular
            ? (regDone ? 'Regulier seizoen afgelopen!' : `Speeldag ${regRound + 1} van ${totalRegRounds}`)
            : (playoffsDone ? 'Play-offs afgelopen!' : `PO speeldag ${playoffs.round + 1} van ${playoffs.maxRounds}`)}
        </p>
        <div className="h-1 rounded-full mt-2 w-full" style={{ background: 'var(--border)' }}>
          <div className="h-1 rounded-full transition-all duration-300"
            style={{ background: 'var(--gold)', width: `${isRegular ? (regRound / totalRegRounds) * 100 : playoffs ? (playoffs.round / playoffs.maxRounds) * 100 : 100}%` }} />
        </div>
      </div>

      {/* Last round results */}
      {lastRound && lastRound.length > 0 && (
        <motion.div key={`${regRound}-${playoffs?.round}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl flex flex-col gap-1.5">
          <p className="text-xs uppercase tracking-widest px-1" style={{ color: 'var(--muted)' }}>
            {isRegular ? `Resultaten speeldag ${regRound}` : `Resultaten PO speeldag ${playoffs!.round}`}
          </p>
          {lastRound.map((m, i) => <MatchRow key={i} match={m} />)}
        </motion.div>
      )}

      {/* Upcoming fixtures preview (regular season) */}
      {isRegular && !regDone && (
        <div className="w-full max-w-2xl flex flex-col gap-1.5">
          <p className="text-xs uppercase tracking-widest px-1" style={{ color: 'var(--muted)' }}>
            Speeldag {regRound + 1} — aankomende wedstrijden
          </p>
          {upcomingPairs.map(([h, a], i) => {
            const isUser = h === myTeam || a === myTeam;
            return (
              <div key={i} className="flex items-center justify-between rounded-lg px-4 py-2"
                style={{ background: isUser ? 'rgba(212,148,10,0.06)' : 'var(--surface)', border: `1px solid ${isUser ? 'var(--gold-dim)' : 'var(--border)'}` }}>
                <span className="text-xs flex-1 text-right truncate" style={{ color: h === myTeam ? 'var(--gold)' : 'var(--text)', fontWeight: h === myTeam ? 600 : 400 }}>{h}</span>
                <span className="mx-3 text-xs flex-shrink-0" style={{ color: 'var(--muted)' }}>vs</span>
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
            PO speeldag {poUpcomingR + 1} — aankomende wedstrijden
          </p>
          {(['po1', 'po2', 'rel'] as const).map(group => {
            const g = playoffs[group];
            if (poUpcomingR >= g.schedule.length) return null;
            const label = group === 'po1' ? 'PO1 Championship' : group === 'po2' ? 'PO2 Europa' : 'Relegate PO';
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
                      <span className="mx-3 text-xs flex-shrink-0" style={{ color: 'var(--muted)' }}>vs</span>
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
            <p className="text-xs uppercase tracking-widest px-1" style={{ color: 'var(--muted)' }}>Huidige stand</p>
            <CompactStandings rows={regStandings} directlyRelegate="" />
          </>
        )}
        {playoffs && po1Standings && po2Standings && relStandings && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'PO1 Championship', rows: po1Standings, color: 'var(--gold)' },
              { label: 'PO2 Europa',       rows: po2Standings, color: '#3a8fd1' },
              { label: 'Relegate PO',      rows: relStandings, color: 'var(--red)' },
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

      {/* Action button */}
      <div>
        {isRegular && !regDone && (
          <button onClick={simulateRegularRound}
            className="px-10 py-3 rounded transition-all duration-150"
            style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.12em', background: 'var(--gold)', color: '#090907', border: '2px solid var(--gold)', boxShadow: '0 0 20px rgba(212,148,10,0.3)' }}>
            ▶ Simuleer speeldag {regRound + 1}
          </button>
        )}
        {isRegular && regDone && (
          <button onClick={startPlayoffs}
            className="px-10 py-3 rounded transition-all duration-150"
            style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.12em', background: 'var(--gold)', color: '#090907', border: '2px solid var(--gold)' }}>
            → Start Play-offs
          </button>
        )}
        {isPlayoffs && (
          <button onClick={simulatePlayoffRound}
            className="px-10 py-3 rounded transition-all duration-150"
            style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.12em', background: 'var(--gold)', color: '#090907', border: '2px solid var(--gold)', boxShadow: '0 0 20px rgba(212,148,10,0.3)' }}>
            ▶ Simuleer PO speeldag {playoffs.round + 1}
          </button>
        )}
        {playoffsDone && (
          <button onClick={finishSimulation}
            className="px-10 py-3 rounded transition-all duration-150"
            style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.12em', background: 'var(--gold)', color: '#090907', border: '2px solid var(--gold)' }}>
            → Bekijk eindresultaat
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
  const { pickedPlayers, formation, teamName } = useGameStore();
  const myTeam = teamName.trim() || 'Mijn Droomelftal';

  const TABS: { id: TabId; label: string; sublabel: string }[] = [
    { id: 'regular',    label: 'Regulier',    sublabel: '30 speeldagen' },
    { id: 'po1',        label: 'PO1',         sublabel: 'Championship' },
    { id: 'po2',        label: 'PO2',         sublabel: 'Europa' },
    { id: 'relegation', label: 'Relegate PO', sublabel: 'Plaatsen 13–16' },
  ];

  const phaseForTab: Record<TabId, SimulatedPhase> = {
    regular:    sim.regularSeason,
    po1:        sim.po1,
    po2:        sim.po2,
    relegation: sim.poRelegation,
  };

  const userInPO1  = sim.po1.standings.some(r => r.team === myTeam);
  const userInPO2  = sim.po2.standings.some(r => r.team === myTeam);
  const userInRele = sim.poRelegation.standings.some(r => r.team === myTeam);

  return (
    <PageShell>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem,6vw,3rem)', color: 'var(--gold)', letterSpacing: '0.08em' }}>
        SEIZOENSRESULTATEN
      </h1>

      <div className="w-full max-w-3xl flex flex-col gap-5">
        {/* Outcomes banner */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(212,148,10,0.1)', border: '2px solid var(--gold)' }}>
            <p className="text-xs tracking-widest uppercase mb-1" style={{ color: 'var(--muted)' }}>Kampioen</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--gold)', letterSpacing: '0.05em' }}>
              {sim.champion === myTeam ? `⭐ ${myTeam}` : sim.champion}
            </p>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid #1a3a6e' }}>
            <p className="text-xs tracking-widest uppercase mb-1" style={{ color: 'var(--muted)' }}>Europa (top 4 PO1)</p>
            <div className="flex flex-col gap-0.5">
              {sim.europeanSpots.map((t, i) => (
                <p key={i} className="text-xs leading-tight" style={{ color: t === myTeam ? 'var(--gold)' : 'var(--text)' }}>
                  {t === myTeam ? `⭐ ${myTeam}` : t}
                </p>
              ))}
            </div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(196,30,58,0.08)', border: '1px solid rgba(196,30,58,0.3)' }}>
            <p className="text-xs tracking-widest uppercase mb-1" style={{ color: 'var(--muted)' }}>Gedegradeerd</p>
            <div className="flex flex-col gap-0.5">
              {sim.relegated.map((t, i) => (
                <p key={i} className="text-xs leading-tight" style={{ color: t === myTeam ? 'var(--red)' : 'var(--muted)' }}>
                  {t === myTeam ? `⭐ ${myTeam}` : t}
                </p>
              ))}
              <p className="text-xs leading-tight mt-1 pt-1" style={{ color: sim.directlyRelegate === myTeam ? 'var(--red)' : 'var(--muted)', borderTop: '1px solid rgba(196,30,58,0.2)' }}>
                <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>Rechtstreeks: </span>
                {sim.directlyRelegate === myTeam ? `⭐ ${myTeam}` : sim.directlyRelegate}
              </p>
            </div>
          </div>
        </div>

        {/* User journey */}
        <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--muted)' }}>{myTeam} belandde in: </span>
          <span style={{
            color: sim.directlyRelegate === myTeam ? 'var(--red)' : 'var(--gold)',
            fontFamily: 'var(--font-display)', letterSpacing: '0.06em',
          }}>
            {userInPO1  ? 'Championship Play-off (PO1)' :
             userInPO2  ? 'Europa Play-off (PO2)' :
             userInRele ? 'Relegation Play-off' :
             sim.directlyRelegate === myTeam ? 'Rechtstreeks gedegradeerd (17e)' : ''}
          </span>
          {sim.champion === myTeam && <span style={{ color: 'var(--gold)' }}> · KAMPIOEN!</span>}
        </div>

        {/* Phase tabs */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface)' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
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
            const phase = phaseForTab[tab.id];
            return (
              <motion.div key={tab.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {tab.id !== 'regular' && (
                  <p className="text-xs mb-3 px-1" style={{ color: 'var(--muted)' }}>
                    {tab.id === 'relegation'
                      ? 'Startpunten = volledig regulier seizoen.'
                      : 'Startpunten = helft regulier seizoen (afgerond naar boven).'}
                  </p>
                )}
                <StandingsTable rows={phase.standings} tab={tab.id}
                  champion={sim.champion} relegated={sim.relegated}
                  europeanSpots={sim.europeanSpots} directlyRelegate={sim.directlyRelegate} />
                {phase.matches.length > 0 && (
                  <div className="mt-4">
                    <MatchList matches={phase.matches} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Share card */}
        <ShareSection sim={sim} pickedPlayers={pickedPlayers as PickedPlayer[]} formation={formation!} />

        {/* Actions */}
        <div className="flex gap-4 justify-center mt-2">
          <button onClick={onBack} className="px-6 py-3 rounded text-sm transition-all duration-150"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.1em', background: 'transparent', color: 'var(--muted)', border: '2px solid var(--border)' }}>
            ← {myTeam}
          </button>
          <button onClick={onReset} className="px-8 py-3 rounded transition-all duration-150"
            style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.12em', background: 'var(--gold)', color: '#090907', border: '2px solid var(--gold)' }}>
            Nieuw team samenstellen
          </button>
        </div>
      </div>
    </PageShell>
  );
}

// ─── Shared UI components ─────────────────────────────────────────────────────

// ─── Share section ────────────────────────────────────────────────────────────

function ShareSection({ sim, pickedPlayers, formation }: {
  sim: SimulatedSeason;
  pickedPlayers: PickedPlayer[];
  formation: string;
}) {
  const [copied, setCopied] = useState(false);
  const [copiedImg, setCopiedImg] = useState(false);
  const { teamName } = useGameStore();
  const myTeam = teamName.trim() || 'Mijn Droomelftal';

  const userInPO1   = sim.po1.standings.some(r => r.team === myTeam);
  const userInPO2   = sim.po2.standings.some(r => r.team === myTeam);
  const userInRele  = sim.poRelegation.standings.some(r => r.team === myTeam);
  const po1Rank     = userInPO1 ? sim.po1.standings.findIndex(r => r.team === myTeam) + 1 : null;
  const isChampion  = sim.champion === myTeam;
  const avgOverall  = pickedPlayers.length
    ? Math.round(pickedPlayers.reduce((s, p) => s + p.player.overall, 0) / pickedPlayers.length)
    : 0;

  const resultLabel = isChampion ? 'KAMPIOEN!'
    : userInPO1  ? `${po1Rank}e — PO1 Championship`
    : userInPO2  ? 'Europa PO (PO2)'
    : userInRele ? 'Relegation PO'
    : 'Rechtstreeks gedegradeerd';

  const degraded = [...sim.relegated, sim.directlyRelegate].filter(Boolean).join(', ');

  function getShareText() {
    const sorted = [...pickedPlayers].sort((a, b) => a.positionIndex - b.positionIndex);
    const lines = [
      '🍺 PINTJESLIGA — Mijn droomelf',
      '',
      `Formatie: ${formation}  |  Gem. overall: ${avgOverall}`,
      '',
      ...sorted.map(p =>
        `${p.position.padEnd(4)} ${p.player.name} (${p.player.overall}) — ${p.teamName} ${p.season}`
      ),
      '',
      '─────────────────────',
      `🏆 Kampioen: ${sim.champion}`,
      `⭐ ${myTeam}: ${resultLabel}`,
      ...(degraded ? [`🔴 Gedegradeerd: ${degraded}`] : []),
      '',
      'Maak je eigen droomelf: pintjesliga.be',
    ];
    return lines.join('\n');
  }

  function handleCopy() {
    navigator.clipboard.writeText(getShareText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function buildCanvasBlob(): Promise<Blob> {
    return new Promise(resolve => {
      const W = 800;
      const PLAYER_H = 40;
      const PAD = 44;
      const H = 180 + pickedPlayers.length * PLAYER_H + 180;

      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d')!;

      const GOLD = '#D4940A', RED = '#C41E3A', DARK = '#090907',
            BORDER = '#1E1D1A', TEXT = '#EDE9E0', MUTED = '#6B6560';

      ctx.fillStyle = DARK;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#1A1A1A'; ctx.fillRect(0, 0, W / 3, 7);
      ctx.fillStyle = GOLD;      ctx.fillRect(W / 3, 0, W / 3, 7);
      ctx.fillStyle = RED;       ctx.fillRect((W / 3) * 2, 0, W / 3, 7);

      let y = 60;

      ctx.font = '700 52px Impact, Arial Black, sans-serif';
      ctx.fillStyle = GOLD;
      ctx.textAlign = 'left';
      ctx.fillText('PINTJESLIGA', PAD, y);

      ctx.font = '700 18px Arial, sans-serif';
      ctx.fillStyle = MUTED;
      ctx.textAlign = 'right';
      ctx.fillText(formation, W - PAD, y);

      y += 26;
      ctx.font = '14px Arial, sans-serif';
      ctx.fillStyle = MUTED;
      ctx.textAlign = 'left';
      ctx.fillText(`Gem. overall: ${avgOverall}  ·  Belgische Pro League Simulator`, PAD, y);
      y += 20;

      ctx.strokeStyle = BORDER; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
      y += 18;

      ctx.font = '11px Arial, sans-serif';
      ctx.fillStyle = MUTED;
      ctx.textAlign = 'left';
      ctx.letterSpacing = '2px';
      ctx.fillText('JOUW ELF', PAD, y);
      y += 22;

      const sorted = [...pickedPlayers].sort((a, b) => a.positionIndex - b.positionIndex);
      for (let i = 0; i < sorted.length; i++) {
        const p = sorted[i];
        if (i % 2 === 1) {
          ctx.fillStyle = 'rgba(255,255,255,0.025)';
          ctx.fillRect(PAD - 10, y - 22, W - 2 * PAD + 20, PLAYER_H);
        }
        ctx.font = 'bold 12px Arial, sans-serif';
        ctx.fillStyle = GOLD;
        ctx.textAlign = 'left';
        ctx.fillText(p.position, PAD, y);
        ctx.font = '15px Arial, sans-serif';
        ctx.fillStyle = TEXT;
        ctx.fillText(p.player.name, PAD + 50, y);
        const ovColor = p.player.overall >= 80 ? GOLD : p.player.overall >= 70 ? TEXT : MUTED;
        ctx.font = 'bold 15px Arial, sans-serif';
        ctx.fillStyle = ovColor;
        ctx.textAlign = 'center';
        ctx.fillText(String(p.player.overall), W / 2 + 40, y);
        ctx.font = '12px Arial, sans-serif';
        ctx.fillStyle = MUTED;
        ctx.textAlign = 'right';
        ctx.fillText(`${p.teamName}  ${p.season}`, W - PAD, y);
        y += PLAYER_H;
      }

      y += 16;
      ctx.strokeStyle = BORDER; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
      y += 22;

      ctx.font = '11px Arial, sans-serif';
      ctx.fillStyle = MUTED;
      ctx.textAlign = 'left';
      ctx.fillText('SEIZOENSRESULTAAT', PAD, y);
      y += 34;

      ctx.font = 'bold 22px Arial, sans-serif';
      ctx.fillStyle = GOLD;
      ctx.fillText(`Kampioen: ${sim.champion}`, PAD, y);
      y += 34;

      ctx.font = 'bold 22px Arial, sans-serif';
      ctx.fillStyle = isChampion ? GOLD : TEXT;
      ctx.fillText(`${myTeam}: ${resultLabel}`, PAD, y);
      y += 34;

      if (degraded) {
        ctx.font = '16px Arial, sans-serif';
        ctx.fillStyle = RED;
        ctx.fillText(`Gedegradeerd: ${degraded}`, PAD, y);
        y += 30;
      }

      y += 16;
      ctx.strokeStyle = BORDER;
      ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
      y += 22;

      ctx.font = '14px Arial, sans-serif';
      ctx.fillStyle = MUTED;
      ctx.textAlign = 'center';
      ctx.fillText('pintjesliga.be', W / 2, y);

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

  function handleShareImage() {
    buildCanvasBlob().then(blob => {
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(() => {
        setCopiedImg(true);
        setTimeout(() => setCopiedImg(false), 2000);
      });
    });
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--muted)' }}>Deel je resultaat</span>
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      {/* Preview card */}
      <div style={{
        background: '#090907', borderRadius: 12, overflow: 'hidden',
        border: '1px solid #1E1D1A', fontFamily: 'system-ui, Arial, sans-serif',
      }}>
        {/* Belgian stripe */}
        <div style={{ display: 'flex', height: 5 }}>
          <div style={{ flex: 1, background: '#1A1A1A' }} />
          <div style={{ flex: 1, background: '#D4940A' }} />
          <div style={{ flex: 1, background: '#C41E3A' }} />
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <span style={{ fontFamily: 'Impact, Arial Black, sans-serif', fontSize: 28, color: '#D4940A', letterSpacing: 2 }}>
              PINTJESLIGA
            </span>
            <span style={{ fontSize: 13, color: '#6B6560' }}>
              {formation} · gem. {avgOverall}
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#6B6560', marginBottom: 14 }}>
            Belgische Pro League Simulator
          </div>

          {/* Players */}
          <div style={{ borderTop: '1px solid #1E1D1A', paddingTop: 10, marginBottom: 10 }}>
            {[...pickedPlayers]
              .sort((a, b) => a.positionIndex - b.positionIndex)
              .map((p, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0',
                  background: i % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent',
                }}>
                  <span style={{ fontSize: 10, color: '#D4940A', width: 32, fontWeight: 700, flexShrink: 0 }}>
                    {p.position}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, color: '#EDE9E0', fontWeight: 500 }}>
                    {p.player.name}
                  </span>
                  <span style={{
                    fontSize: 13, fontWeight: 700, width: 28, textAlign: 'center',
                    color: p.player.overall >= 80 ? '#D4940A' : p.player.overall >= 70 ? '#EDE9E0' : '#6B6560',
                  }}>
                    {p.player.overall}
                  </span>
                  <span style={{ fontSize: 10, color: '#6B6560', textAlign: 'right', width: 160, flexShrink: 0 }}>
                    {p.teamName} {p.season}
                  </span>
                </div>
              ))}
          </div>

          {/* Results */}
          <div style={{ borderTop: '1px solid #1E1D1A', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: '#D4940A', fontWeight: 700 }}>
                Kampioen:
              </span>
              <span style={{ fontSize: 14, color: sim.champion === myTeam ? '#D4940A' : '#EDE9E0' }}>
                {sim.champion}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: '#6B6560' }}>{myTeam}:</span>
              <span style={{ fontSize: 14, color: isChampion ? '#D4940A' : '#EDE9E0', fontWeight: 600 }}>
                {resultLabel}
              </span>
            </div>
            {degraded && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#6B6560' }}>Gedegradeerd:</span>
                <span style={{ fontSize: 12, color: '#C41E3A' }}>{degraded}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid #1E1D1A', fontSize: 11, color: '#6B6560', textAlign: 'center' }}>
            pintjesliga.be
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 justify-center flex-wrap">
        <button onClick={handleCopy}
          className="px-5 py-3 rounded transition-all duration-150 text-sm"
          style={{
            fontFamily: 'var(--font-display)', letterSpacing: '0.1em',
            background: copied ? 'rgba(74,222,128,0.15)' : 'var(--surface)',
            color: copied ? '#4ade80' : 'var(--text)',
            border: `1px solid ${copied ? '#4ade80' : 'var(--border)'}`,
          }}>
          {copied ? '✓ Gekopieerd!' : '📋 Kopieer tekst'}
        </button>
        <button onClick={handleShareImage}
          className="px-5 py-3 rounded transition-all duration-150 text-sm"
          style={{
            fontFamily: 'var(--font-display)', letterSpacing: '0.1em',
            background: copiedImg ? 'rgba(74,222,128,0.15)' : 'var(--gold)',
            color: copiedImg ? '#4ade80' : '#090907',
            border: `1px solid ${copiedImg ? '#4ade80' : 'var(--gold)'}`,
          }}>
          {copiedImg ? '✓ Afbeelding gekopieerd!' : '🖼 Kopieer afbeelding'}
        </button>
        <button onClick={handleDownload}
          className="px-5 py-3 rounded transition-all duration-150 text-sm"
          style={{
            fontFamily: 'var(--font-display)', letterSpacing: '0.1em',
            background: 'var(--surface)', color: 'var(--muted)',
            border: '1px solid var(--border)',
          }}>
          📥 Download
        </button>
      </div>
    </div>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[calc(100svh-56px)] flex flex-col items-center px-4 py-8 gap-6">
      {children}
    </main>
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
  const myTeam = teamName.trim() || 'Mijn Droomelftal';
  const isUser = match.home === myTeam || match.away === myTeam;
  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2"
      style={{ background: isUser ? 'rgba(212,148,10,0.06)' : 'var(--surface)', border: `1px solid ${isUser ? 'var(--gold-dim)' : 'var(--border)'}` }}>
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
  );
}

function CompactStandings({ rows, directlyRelegate }: { rows: StandingRow[]; directlyRelegate: string }) {
  const { teamName } = useGameStore();
  const myTeam = teamName.trim() || 'Mijn Droomelftal';
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div className="grid px-3 py-1.5 text-xs uppercase tracking-widest"
        style={{ background: 'var(--surface)', color: 'var(--muted)', gridTemplateColumns: '1.5rem 1fr 2rem 2rem 3rem' }}>
        <span>#</span><span>Team</span><span className="text-center">Pld</span>
        <span className="text-center">+/-</span><span className="text-center">Pts</span>
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
  const myTeam = teamName.trim() || 'Mijn Droomelftal';
  const showCarryover = tab !== 'regular' && rows.some(r => r.carryoverPoints !== undefined);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div className="grid px-3 py-2 text-xs uppercase tracking-widest"
        style={{
          background: 'var(--surface)', color: 'var(--muted)',
          gridTemplateColumns: showCarryover ? '1.5rem 1fr 1.8rem 1.8rem 1.8rem 2rem 2.5rem 2.8rem' : '1.5rem 1fr 1.8rem 1.8rem 1.8rem 2rem 2.8rem',
        }}>
        <span>#</span><span>Team</span>
        <span className="text-center">W</span><span className="text-center">G</span>
        <span className="text-center">V</span><span className="text-center">+/-</span>
        {showCarryover && <span className="text-center">Start</span>}
        <span className="text-center">Pts</span>
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
  const myTeam = teamName.trim() || 'Mijn Droomelftal';
  const userMatches = matches.filter(m => m.home === myTeam || m.away === myTeam);
  const displayed = showAll ? matches : userMatches;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          Uitslagen ({matches.length} wedstrijden)
        </span>
        <button className="text-xs underline" style={{ color: 'var(--muted)' }} onClick={() => setShowAll(v => !v)}>
          {showAll ? `Enkel ${myTeam}` : `Toon alle ${matches.length}`}
        </button>
      </div>
      {displayed.map((m, i) => <MatchRow key={i} match={m} />)}
    </div>
  );
}
