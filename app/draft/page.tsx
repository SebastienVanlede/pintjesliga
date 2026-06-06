'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/store';
import { getAvailableRolls, loadSquad } from '@/lib/data';
import { FORMATION_POSITIONS, Player, Squad, Team, PickedPlayer, Position, playerPositions } from '@/lib/types';
import FormationPitch from '@/components/FormationPitch';

type Phase = 'idle' | 'spinning' | 'squad' | 'placing';
interface Roll { team: Team; season: string; squad: Squad }

export default function DraftPage() {
  const router = useRouter();
  const { formation, pickedPlayers, pickPlayer, draftMode } = useGameStore();
  const blind = draftMode === 'blind';

  const [phase, setPhase] = useState<Phase>('idle');
  const [roll, setRoll] = useState<Roll | null>(null);
  const [spinLabel, setSpinLabel] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [rerollsUsed, setRerollsUsed] = useState(0);

  const MAX_REROLLS = 3;
  const rerollsLeft = MAX_REROLLS - rerollsUsed;

  const deckRef = useRef<{ team: Team; season: string }[]>([]);

  useEffect(() => {
    const rolls = getAvailableRolls();
    deckRef.current = [...rolls].sort(() => Math.random() - 0.5);
  }, []);

  const positions = formation ? FORMATION_POSITIONS[formation] : [];
  const pickedByIndex = Object.fromEntries(pickedPlayers.map((p) => [p.positionIndex, p]));
  const filledCount = pickedPlayers.length;

  useEffect(() => { if (!formation) router.replace('/'); }, [formation, router]);
  useEffect(() => { if (filledCount >= positions.length && positions.length > 0) router.push('/xi'); }, [filledCount, positions.length, router]);

  const rollDice = useCallback((isReroll = false) => {
    if (isReroll) setRerollsUsed(prev => prev + 1);
    else setRerollsUsed(0);
    setPhase('spinning');
    setRoll(null);
    setSelectedPlayer(null);
    const allRolls = getAvailableRolls();
    let ticks = 0;
    const interval = setInterval(() => {
      const r = allRolls[Math.floor(Math.random() * allRolls.length)];
      setSpinLabel(`${r.team.shortName || r.team.name.slice(0, 12)} · ${r.season}`);
      ticks++;
      if (ticks >= 18) {
        clearInterval(interval);
        if (deckRef.current.length === 0) {
          deckRef.current = [...allRolls].sort(() => Math.random() - 0.5);
        }
        const final = deckRef.current.shift()!;
        loadSquad(final.team.id, final.season)
          .then((squad) => {
            if (!squad) { rollDice(isReroll); return; }
            setRoll({ team: final.team, season: final.season, squad });
            setPhase('squad');
          })
          .catch(() => {
            // Laadprobleem: terug naar idle zodat de gebruiker opnieuw kan rollen
            setPhase('idle');
          });
      }
    }, 85);
  }, []);

  function handleSelectPlayer(player: Player) {
    setSelectedPlayer(player);
    setPhase('placing');
  }

  function handleAssignPosition(positionIndex: number) {
    if (!roll || !selectedPlayer) return;
    pickPlayer({
      positionIndex,
      position: positions[positionIndex],
      player: selectedPlayer,
      teamName: roll.team.name,
      teamPrimaryColor: roll.team.primaryColor,
      season: roll.season,
    } as PickedPlayer);
    setSelectedPlayer(null);
    setRoll(null);
    setPhase('idle');
  }

  if (!formation) return null;

  const pickedPlayerIds    = new Set(pickedPlayers.map((p) => p.player.id));
  const pickedPlayerNames  = new Set(pickedPlayers.map((p) => p.player.name.toLowerCase()));
  const filledPerPosition: Record<string, number> = {};
  for (const p of pickedPlayers) filledPerPosition[p.position] = (filledPerPosition[p.position] ?? 0) + 1;
  const totalPerPosition: Record<string, number> = {};
  for (const pos of positions) totalPerPosition[pos] = (totalPerPosition[pos] ?? 0) + 1;
  function isPositionFull(pos: Position) { return (filledPerPosition[pos] ?? 0) >= (totalPerPosition[pos] ?? 0); }

  const eligibleIndices: Set<number> = selectedPlayer
    ? new Set(positions.map((pos, i) => ({ pos, i })).filter(({ pos, i }) => playerPositions(selectedPlayer).includes(pos) && !pickedByIndex[i]).map(({ i }) => i))
    : new Set();

  const progressPct = Math.round((filledCount / positions.length) * 100);

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100svh-56px)]">

      {/* ── Left: Pitch column ─────────────────────────────────────────── */}
      <div
        className="flex flex-col items-center gap-4 px-6 py-6 lg:py-8 lg:px-8 lg:w-[380px] flex-shrink-0"
        style={{ borderRight: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}
      >
        {/* Progress */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-1.5">
            <span className="label-xs">Jouw opstelling</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--gold)', letterSpacing: '0.05em' }}>
              {filledCount}/{positions.length}
            </span>
          </div>
          <div className="h-1 rounded-full w-full" style={{ background: 'var(--border)' }}>
            <div
              className="h-1 rounded-full transition-all duration-500"
              style={{ background: 'var(--gold)', width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Formation label */}
        <div className="flex items-center gap-2 self-start">
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.75rem',
              letterSpacing: '0.12em',
              color: 'var(--muted)',
              border: '1px solid var(--border)',
              padding: '2px 8px',
              borderRadius: 4,
            }}
          >
            {formation}
          </span>
          {phase === 'placing' && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xs"
              style={{ color: 'var(--gold)' }}
            >
              ← klik op een positie
            </motion.span>
          )}
        </div>

        {/* Pitch */}
        <FormationPitch
          formation={formation}
          pickedByIndex={pickedByIndex}
          eligibleIndices={phase === 'placing' ? eligibleIndices : new Set()}
          onAssign={phase === 'placing' ? handleAssignPosition : undefined}
          size="md"
        />

        {/* Position chips — quick overview */}
        <div className="w-full flex flex-wrap gap-1">
          {positions.map((pos, i) => {
            const pick = pickedByIndex[i];
            return (
              <div
                key={i}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                style={{
                  background: pick ? `${pick.teamPrimaryColor}20` : 'var(--surface)',
                  border: `1px solid ${pick ? `${pick.teamPrimaryColor}50` : 'var(--border)'}`,
                  color: pick ? pick.teamPrimaryColor : 'var(--muted)',
                  fontFamily: pick ? 'inherit' : 'var(--font-display)',
                  fontSize: '0.65rem',
                  letterSpacing: pick ? 0 : '0.06em',
                }}
              >
                {pick ? `${pos} · ${pick.player.name.split(' ').pop()?.slice(0, 8)}` : pos}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: Action column ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col px-6 py-6 lg:px-10 lg:py-8 gap-6 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* IDLE */}
          {phase === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-6 flex-1 min-h-72">
              <div className="text-center">
                <p className="label-xs mb-2">
                  {filledCount === 0 ? 'Begin je draft' : `Speler ${filledCount + 1} van ${positions.length}`}
                </p>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem,4vw,2.2rem)', color: 'var(--text)', letterSpacing: '0.08em' }}>
                  ROL EEN TEAM + SEIZOEN
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                  {filledCount === 0 ? 'Een willekeurige Pro League squad wacht op je' : 'Jij kiest zelf de speler en positie na de rol'}
                </p>
              </div>

              <button
                onClick={() => rollDice(false)}
                className="flex flex-col items-center gap-3 px-12 py-6 rounded-xl transition-all duration-200"
                style={{
                  background: 'var(--gold)',
                  border: '2px solid var(--gold)',
                  boxShadow: '0 0 60px rgba(212,148,10,0.3)',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
              >
                <span style={{ fontSize: '2.5rem', lineHeight: 1 }}>🎲</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: '#07070A', letterSpacing: '0.15em' }}>
                  ROL
                </span>
              </button>
            </motion.div>
          )}

          {/* SPINNING */}
          {phase === 'spinning' && (
            <motion.div key="spinning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-6 flex-1 min-h-72">
              <div className="flex flex-col items-center gap-4">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                      style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)' }}
                    />
                  ))}
                </div>
                <motion.p
                  key={spinLabel}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.07 }}
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.4rem,5vw,2.2rem)',
                    color: 'var(--gold)',
                    letterSpacing: '0.12em',
                    textAlign: 'center',
                  }}
                >
                  {spinLabel}
                </motion.p>
                <p className="label-xs">squad laden…</p>
              </div>
            </motion.div>
          )}

          {/* SQUAD */}
          {phase === 'squad' && roll && (
            <motion.div key="squad" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col gap-5 flex-1">

              {/* Team banner */}
              <div
                className="rounded-xl p-4"
                style={{
                  background: `linear-gradient(135deg, ${roll.team.primaryColor}18 0%, transparent 60%)`,
                  border: `1px solid ${roll.team.primaryColor}40`,
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="label-xs mb-1">Gerold team</p>
                    <h2 style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(1.4rem,4vw,2rem)',
                      color: roll.team.primaryColor,
                      letterSpacing: '0.06em',
                      lineHeight: 1,
                      textShadow: `0 0 30px ${roll.team.primaryColor}40`,
                    }}>
                      {roll.team.name}
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="label-xs mb-1">Seizoen</p>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text)', letterSpacing: '0.08em' }}>
                      {roll.season}
                    </p>
                  </div>
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--text-2)' }}>
                  Kies een speler — je wijst daarna de positie toe op het veld
                </p>
              </div>

              {/* Reroll bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>Herrolls</span>
                  <div className="flex gap-1">
                    {Array.from({ length: MAX_REROLLS }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: 10, height: 10, borderRadius: '50%',
                          background: i < rerollsLeft ? 'var(--gold)' : 'var(--border-2)',
                          transition: 'background 0.2s',
                        }}
                      />
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => rollDice(true)}
                  disabled={rerollsLeft === 0}
                  className="text-xs transition-all duration-150"
                  style={{
                    color: rerollsLeft > 0 ? 'var(--text-2)' : 'var(--border-2)',
                    textDecoration: rerollsLeft > 0 ? 'underline' : 'none',
                    cursor: rerollsLeft > 0 ? 'pointer' : 'not-allowed',
                    padding: '4px 0',
                  }}
                >
                  {rerollsLeft > 0 ? `Opnieuw rollen (${rerollsLeft} over)` : 'Geen herrolls meer'}
                </button>
              </div>

              {/* Player list */}
              <div className="flex flex-col gap-2 flex-1 overflow-y-auto max-h-[420px] pr-1">
                {[...roll.squad.players]
                  .sort((a, b) => blind
                    ? ['GK','RB','CB','LB','CDM','CM','CAM','RM','LM','RW','LW','ST'].indexOf(a.position) - ['GK','RB','CB','LB','CDM','CM','CAM','RM','LM','RW','LW','ST'].indexOf(b.position)
                    : b.overall - a.overall)
                  .map((player) => {
                    const alreadyPicked = pickedPlayerIds.has(player.id) || pickedPlayerNames.has(player.name.toLowerCase());
                    const posFull = playerPositions(player).every(pos => isPositionFull(pos));
                    const disabled = alreadyPicked || posFull;
                    return (
                      <PlayerCard
                        key={player.id}
                        player={player}
                        teamColor={roll.team.primaryColor}
                        disabled={disabled}
                        disabledReason={alreadyPicked ? 'Gekozen' : posFull ? 'Vol' : undefined}
                        blind={blind}
                        onPick={() => !disabled && handleSelectPlayer(player)}
                      />
                    );
                  })}
              </div>
            </motion.div>
          )}

          {/* PLACING */}
          {phase === 'placing' && selectedPlayer && roll && (
            <motion.div key="placing" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col gap-5 flex-1 justify-center items-center max-w-lg mx-auto w-full">

              {/* Selected player card */}
              <div
                className="w-full rounded-xl p-5"
                style={{ background: 'var(--surface)', border: '2px solid var(--gold)', boxShadow: '0 0 40px rgba(212,148,10,0.15)' }}
              >
                <p className="label-xs mb-3">Gekozen speler</p>
                <div className="flex items-center gap-4">
                  <OverallBadge overall={selectedPlayer.overall} size="lg" blind={blind} />
                  <div className="flex-1">
                    <p className="font-semibold" style={{ color: 'var(--text)', fontSize: '1.05rem' }}>
                      {selectedPlayer.name}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      {playerPositions(selectedPlayer).map(pos => (
                        <span key={pos} className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--surface-2)', color: 'var(--text-2)', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>
                          {pos}
                        </span>
                      ))}
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>
                        {roll.team.name} · {roll.season}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {eligibleIndices.size === 0 ? (
                <div className="text-center p-4 rounded-xl" style={{ background: 'var(--red-dim)', border: '1px solid var(--red)' }}>
                  <p className="text-sm" style={{ color: 'var(--red)' }}>
                    Geen vrije {playerPositions(selectedPlayer).join('/')} positie beschikbaar in {formation}.
                  </p>
                </div>
              ) : (
                <div className="text-center p-4 rounded-xl" style={{ background: 'rgba(212,148,10,0.06)', border: '1px solid var(--gold-dim)' }}>
                  <p className="text-sm" style={{ color: 'var(--gold)' }}>
                    ← Klik op een oplichtende positie op het veld om te plaatsen
                  </p>
                </div>
              )}

              <button
                onClick={() => { setSelectedPlayer(null); setPhase('squad'); }}
                className="text-sm"
                style={{ color: 'var(--muted)', textDecoration: 'underline', cursor: 'pointer' }}
              >
                ← Andere speler kiezen
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Player card ──────────────────────────────────────────────────────────────

function PlayerCard({ player, teamColor, onPick, disabled, disabledReason, blind }: {
  player: Player; teamColor: string; onPick: () => void;
  disabled?: boolean; disabledReason?: string; blind?: boolean;
}) {
  const allPositions = playerPositions(player);
  return (
    <button
      onClick={!disabled ? onPick : undefined}
      disabled={disabled}
      className="w-full text-left rounded-lg transition-all duration-100 group"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        padding: '10px 12px',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={e => {
        if (disabled) return;
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = `${teamColor}80`;
        el.style.background = `${teamColor}10`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = 'var(--border)';
        el.style.background = 'var(--surface)';
      }}
    >
      <div className="flex items-center gap-3">
        <OverallBadge overall={player.overall} size="sm" blind={blind} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{player.name}</p>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {allPositions.map(pos => (
              <span key={pos} style={{
                fontSize: '0.6rem', letterSpacing: '0.06em',
                padding: '1px 5px', borderRadius: 3,
                background: 'var(--surface-2)',
                color: 'var(--text-2)',
                fontFamily: 'var(--font-display)',
              }}>{pos}</span>
            ))}
            <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>·</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>{player.nationality}</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>·</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>{player.goals}G {player.assists}A</span>
          </div>
          {!blind && player.awards && player.awards.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {player.awards.map(award => (
                <span key={award} style={{
                  fontSize: '0.58rem', letterSpacing: '0.03em',
                  padding: '1px 6px', borderRadius: 3,
                  background: 'rgba(212,148,10,0.12)',
                  color: 'var(--gold)',
                  border: '1px solid rgba(212,148,10,0.25)',
                }}>🏆 {award}</span>
              ))}
            </div>
          )}
        </div>

        {disabled ? (
          <span style={{
            fontSize: '0.6rem', letterSpacing: '0.06em',
            padding: '3px 7px', borderRadius: 4,
            background: 'var(--border)', color: 'var(--muted)',
            fontFamily: 'var(--font-display)', flexShrink: 0,
          }}>{disabledReason}</span>
        ) : (
          <span
            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            style={{
              fontSize: '0.65rem', letterSpacing: '0.1em',
              padding: '4px 10px', borderRadius: 4,
              background: teamColor, color: '#07070A',
              fontFamily: 'var(--font-display)',
            }}
          >
            KIES
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Overall badge ────────────────────────────────────────────────────────────

function OverallBadge({ overall, size, blind }: { overall: number; size: 'sm' | 'lg'; blind?: boolean }) {
  const color = blind ? 'var(--muted)' : overall >= 80 ? 'var(--gold)' : overall >= 73 ? '#A8E6CF' : overall >= 66 ? 'var(--text-2)' : 'var(--muted)';
  const bg    = blind ? 'rgba(104,100,92,0.1)' : overall >= 80 ? 'rgba(212,148,10,0.2)' : overall >= 73 ? 'rgba(168,230,207,0.12)' : overall >= 66 ? 'rgba(237,234,228,0.08)' : 'rgba(104,100,92,0.15)';
  const dim   = size === 'sm' ? { width: 38, height: 38, fontSize: '0.9rem' } : { width: 56, height: 56, fontSize: '1.4rem' };

  return (
    <div style={{
      ...dim,
      borderRadius: 8,
      background: bg,
      border: `1px solid ${color}40`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-display)',
      color,
      flexShrink: 0,
      letterSpacing: '0.02em',
    }}>
      {blind ? '?' : overall}
    </div>
  );
}
