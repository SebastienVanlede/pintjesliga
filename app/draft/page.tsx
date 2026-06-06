'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/store';
import { getAvailableRolls, loadSquad } from '@/lib/data';
import { FORMATION_POSITIONS, FORMATION_DOTS, Player, Squad, Team, PickedPlayer, Position } from '@/lib/types';

type Phase = 'idle' | 'spinning' | 'squad' | 'placing';

interface Roll { team: Team; season: string; squad: Squad }

export default function DraftPage() {
  const router = useRouter();
  const { formation, pickedPlayers, pickPlayer } = useGameStore();

  const [phase, setPhase] = useState<Phase>('idle');
  const [roll, setRoll] = useState<Roll | null>(null);
  const [spinLabel, setSpinLabel] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const positions = formation ? FORMATION_POSITIONS[formation] : [];
  const dots = formation ? FORMATION_DOTS[formation] : [];
  const pickedByIndex = Object.fromEntries(pickedPlayers.map((p) => [p.positionIndex, p]));
  const filledCount = pickedPlayers.length;

  useEffect(() => { if (!formation) router.replace('/'); }, [formation, router]);
  useEffect(() => { if (filledCount >= positions.length && positions.length > 0) router.push('/xi'); }, [filledCount, positions.length, router]);

  const rollDice = useCallback(() => {
    setPhase('spinning');
    setRoll(null);
    setSelectedPlayer(null);
    const available = getAvailableRolls();
    let ticks = 0;

    const interval = setInterval(() => {
      const r = available[Math.floor(Math.random() * available.length)];
      setSpinLabel(`${r.team.name.toUpperCase()} · ${r.season}`);
      ticks++;
      if (ticks >= 18) {
        clearInterval(interval);
        const final = available[Math.floor(Math.random() * available.length)];
        loadSquad(final.team.id, final.season).then((squad) => {
          if (!squad) { rollDice(); return; }
          setRoll({ team: final.team, season: final.season, squad });
          setPhase('squad');
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

  // Which player IDs are already drafted (no duplicates)
  const pickedPlayerIds = new Set(pickedPlayers.map((p) => p.player.id));

  // How many slots per position type are already filled
  const filledPerPosition: Record<string, number> = {};
  for (const p of pickedPlayers) {
    filledPerPosition[p.position] = (filledPerPosition[p.position] ?? 0) + 1;
  }
  const totalPerPosition: Record<string, number> = {};
  for (const pos of positions) {
    totalPerPosition[pos] = (totalPerPosition[pos] ?? 0) + 1;
  }
  function isPositionFull(pos: Position): boolean {
    return (filledPerPosition[pos] ?? 0) >= (totalPerPosition[pos] ?? 0);
  }

  // In placing mode, which indices accept this player?
  const eligibleIndices: Set<number> =
    selectedPlayer
      ? new Set(
          positions
            .map((pos, i) => ({ pos, i }))
            .filter(({ pos, i }) => pos === selectedPlayer.position && !pickedByIndex[i])
            .map(({ i }) => i)
        )
      : new Set();

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8 gap-6">
      {/* Belgian stripe */}
      <div className="fixed top-0 left-0 right-0 flex h-1 z-50">
        <div className="flex-1" style={{ background: '#1A1A1A' }} />
        <div className="flex-1" style={{ background: 'var(--gold)' }} />
        <div className="flex-1" style={{ background: 'var(--red)' }} />
      </div>

      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between pt-1">
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--gold)', letterSpacing: '0.1em' }}>
          PINTJESLIGA
        </span>
        <span className="text-sm" style={{ color: 'var(--muted)' }}>
          {filledCount}/11 · {formation}
        </span>
      </div>

      {/* Main two-column layout */}
      <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-6">

        {/* Left: Pitch */}
        <div className="flex-shrink-0 flex flex-col items-center w-full lg:w-auto">
          <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>
            {phase === 'placing' ? `Klik op een ${selectedPlayer?.position}-positie` : 'Jouw opstelling'}
          </p>
          <FormationPitch
            positions={positions}
            dots={dots}
            pickedByIndex={pickedByIndex}
            eligibleIndices={phase === 'placing' ? eligibleIndices : new Set()}
            onAssign={phase === 'placing' ? handleAssignPosition : undefined}
          />
        </div>

        {/* Right: Action area */}
        <div className="flex-1 flex flex-col gap-4">
          <AnimatePresence mode="wait">

            {/* IDLE */}
            {phase === 'idle' && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-4 flex-1 min-h-64">
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                  {filledCount === 0 ? 'Rol de dobbelstenen om te starten' : `Nog ${positions.length - filledCount} posities te vullen`}
                </p>
                <button onClick={rollDice}
                  className="px-10 py-4 rounded transition-all duration-150"
                  style={{
                    fontFamily: 'var(--font-display)', fontSize: '1.2rem', letterSpacing: '0.15em',
                    background: 'var(--gold)', color: '#090907',
                    border: '2px solid var(--gold)', boxShadow: '0 0 30px rgba(212,148,10,0.25)',
                  }}>
                  🎲 ROL DE DOBBELSTENEN
                </button>
              </motion.div>
            )}

            {/* SPINNING */}
            {phase === 'spinning' && (
              <motion.div key="spinning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-4 flex-1 min-h-64">
                <div className="w-full rounded-xl px-6 py-8 flex items-center justify-center"
                  style={{ border: '2px solid var(--border)', background: 'var(--surface)' }}>
                  <motion.span key={spinLabel} initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.07 }}
                    style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1rem,4vw,1.5rem)', color: 'var(--gold)', letterSpacing: '0.1em', textAlign: 'center' }}>
                    {spinLabel}
                  </motion.span>
                </div>
                <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--muted)' }}>Aan het rollen…</span>
              </motion.div>
            )}

            {/* SQUAD */}
            {phase === 'squad' && roll && (
              <motion.div key="squad" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-3">
                {/* Team banner */}
                <div className="rounded-xl p-4 flex items-center justify-between"
                  style={{ background: 'var(--surface)', border: `2px solid ${roll.team.primaryColor}`, boxShadow: `0 0 20px ${roll.team.primaryColor}22` }}>
                  <div>
                    <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--muted)' }}>Gerold</p>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: roll.team.primaryColor, letterSpacing: '0.06em' }}>
                      {roll.team.name}
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--muted)' }}>Seizoen</p>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text)', letterSpacing: '0.06em' }}>
                      {roll.season}
                    </p>
                  </div>
                </div>

                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Kies een speler — je wijst daarna de positie toe op het veld
                </p>

                <div className="flex flex-col gap-1.5 max-h-[420px] overflow-y-auto pr-1">
                  {[...roll.squad.players].sort((a, b) => b.overall - a.overall).map((player) => {
                    const alreadyPicked = pickedPlayerIds.has(player.id);
                    const posFull = isPositionFull(player.position);
                    const disabled = alreadyPicked || posFull;
                    const disabledReason = alreadyPicked ? 'Al gekozen' : posFull ? 'Positie vol' : null;
                    return (
                      <PlayerRow key={player.id} player={player} teamColor={roll.team.primaryColor}
                        disabled={disabled} disabledReason={disabledReason ?? undefined}
                        onPick={() => !disabled && handleSelectPlayer(player)} />
                    );
                  })}
                </div>

                <button onClick={rollDice} className="text-xs underline self-center mt-1" style={{ color: 'var(--muted)' }}>
                  Opnieuw rollen
                </button>
              </motion.div>
            )}

            {/* PLACING */}
            {phase === 'placing' && selectedPlayer && roll && (
              <motion.div key="placing" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-4 items-center justify-center flex-1 min-h-64">
                <div className="w-full rounded-xl p-4 flex items-center gap-4"
                  style={{ background: 'var(--surface)', border: '2px solid var(--gold)' }}>
                  <div className="w-12 h-12 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: overallBg(selectedPlayer.overall), fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: overallColor(selectedPlayer.overall) }}>
                    {selectedPlayer.overall}
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--text)' }}>{selectedPlayer.name}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {selectedPlayer.position} · {roll.team.name} · {roll.season}
                    </p>
                  </div>
                </div>

                {eligibleIndices.size === 0 ? (
                  <p className="text-sm text-center" style={{ color: 'var(--red)' }}>
                    Geen vrije {selectedPlayer.position}-positie beschikbaar in {formation}.
                    <br />Kies een andere speler.
                  </p>
                ) : (
                  <p className="text-sm text-center" style={{ color: 'var(--muted)' }}>
                    ← Klik op een oplichtende {selectedPlayer.position}-positie op het veld
                  </p>
                )}

                <button onClick={() => { setSelectedPlayer(null); setPhase('squad'); }}
                  className="text-xs underline" style={{ color: 'var(--muted)' }}>
                  ← Andere speler kiezen
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

// ─── Pitch ───────────────────────────────────────────────────────────────────

// Displayed size — larger for readability
const PITCH_W = 330;
const PITCH_H = 440;

function FormationPitch({
  positions, dots, pickedByIndex, eligibleIndices, onAssign,
}: {
  positions: Position[];
  dots: [number, number][];
  pickedByIndex: Record<number, PickedPlayer>;
  eligibleIndices: Set<number>;
  onAssign?: (i: number) => void;
}) {
  // Scale original 60x80 space → PITCH_W x PITCH_H
  const scaleX = PITCH_W / 60;
  const scaleY = PITCH_H / 80;
  const R = 19; // node radius

  return (
    <svg
      viewBox={`0 0 ${PITCH_W} ${PITCH_H}`}
      width={PITCH_W}
      height={PITCH_H}
      xmlns="http://www.w3.org/2000/svg"
      style={{ borderRadius: 10, border: '1px solid var(--border)', maxWidth: '100%' }}
    >
      {/* Pitch stripes */}
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x="0" y={i * (PITCH_H / 8)} width={PITCH_W} height={PITCH_H / 8}
          fill={i % 2 === 0 ? '#2D5A27' : '#2A5424'} />
      ))}
      {/* Outline */}
      <rect x="5" y="5" width={PITCH_W - 10} height={PITCH_H - 10}
        fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      {/* Center line */}
      <line x1="5" y1={PITCH_H / 2} x2={PITCH_W - 5} y2={PITCH_H / 2}
        stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" />
      {/* Center circle */}
      <circle cx={PITCH_W / 2} cy={PITCH_H / 2} r="38"
        fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" />
      <circle cx={PITCH_W / 2} cy={PITCH_H / 2} r="2" fill="rgba(255,255,255,0.6)" />
      {/* Top penalty area */}
      <rect x={PITCH_W * 0.22} y="5" width={PITCH_W * 0.56} height={PITCH_H * 0.16}
        fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      {/* Top 6-yard box */}
      <rect x={PITCH_W * 0.36} y="5" width={PITCH_W * 0.28} height={PITCH_H * 0.065}
        fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
      {/* Bottom penalty area */}
      <rect x={PITCH_W * 0.22} y={PITCH_H * 0.84} width={PITCH_W * 0.56} height={PITCH_H * 0.16}
        fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      {/* Bottom 6-yard box */}
      <rect x={PITCH_W * 0.36} y={PITCH_H * 0.935} width={PITCH_W * 0.28} height={PITCH_H * 0.065}
        fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />

      {/* Position nodes */}
      {dots.map(([dx, dy], i) => {
        const cx = dx * scaleX;
        const cy = dy * scaleY;
        const pick = pickedByIndex[i];
        const isEligible = eligibleIndices.has(i);
        const isClickable = isEligible && !!onAssign;
        const pos = positions[i];

        if (pick) {
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={R}
                fill={pick.teamPrimaryColor}
                stroke="rgba(255,255,255,0.7)"
                strokeWidth="1.8"
              />
              <text x={cx} y={cy - 5} textAnchor="middle" fontSize="7" fill="white" fontWeight="700">
                {pick.player.name.split(' ').pop()?.slice(0, 9)}
              </text>
              <text x={cx} y={cy + 5} textAnchor="middle" fontSize="8.5" fill="rgba(255,255,255,0.95)"
                fontFamily="var(--font-display)" fontWeight="400">
                {pick.player.overall}
              </text>
              <text x={cx} y={cy + 13} textAnchor="middle" fontSize="5.5" fill="rgba(255,255,255,0.65)">
                {pos}
              </text>
            </g>
          );
        }

        if (isClickable) {
          return (
            <g key={i} style={{ cursor: 'pointer' }} onClick={() => onAssign!(i)}>
              <circle cx={cx} cy={cy} r={R} fill="rgba(212,148,10,0.35)"
                stroke="#D4940A" strokeWidth="2.5">
                <animate attributeName="r" values={`${R - 1};${R + 2};${R - 1}`} dur="1.1s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.85;1;0.85" dur="1.1s" repeatCount="indefinite" />
              </circle>
              <text x={cx} y={cy + 3} textAnchor="middle" fontSize="8" fill="#D4940A"
                fontFamily="var(--font-display)">
                {pos}
              </text>
              <text x={cx} y={cy + 11.5} textAnchor="middle" fontSize="6" fill="#D4940A" opacity="0.8">
                +
              </text>
            </g>
          );
        }

        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={R - 2}
              fill="rgba(0,0,0,0.4)"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="1.2"
              opacity={eligibleIndices.size > 0 ? 0.35 : 0.85}
            />
            <text x={cx} y={cy + 3} textAnchor="middle" fontSize="7.5"
              fill="rgba(255,255,255,0.65)" fontFamily="var(--font-display)">
              {pos}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Player row ───────────────────────────────────────────────────────────────

function PlayerRow({
  player, teamColor, onPick, disabled, disabledReason,
}: {
  player: Player;
  teamColor: string;
  onPick: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <button
      onClick={!disabled ? onPick : undefined}
      disabled={disabled}
      className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-left transition-all duration-100 group"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = teamColor;
        el.style.background = `${teamColor}12`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = 'var(--border)';
        el.style.background = 'var(--surface)';
      }}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0"
          style={{ background: overallBg(player.overall), fontFamily: 'var(--font-display)', fontSize: '1rem', color: overallColor(player.overall) }}>
          {player.overall}
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{player.name}</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {player.position} · {player.nationality} · {player.goals}D {player.assists}A
          </p>
        </div>
      </div>
      {disabled ? (
        <span className="px-2.5 py-1 rounded text-xs flex-shrink-0"
          style={{ background: 'var(--border)', color: 'var(--muted)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', fontSize: '0.65rem' }}>
          {disabledReason}
        </span>
      ) : (
        <span className="px-2.5 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          style={{ background: teamColor, color: '#090907', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>
          KIES
        </span>
      )}
    </button>
  );
}

function overallBg(o: number) { return o >= 80 ? 'rgba(212,148,10,0.25)' : o >= 70 ? 'rgba(237,233,224,0.1)' : 'rgba(107,101,96,0.15)'; }
function overallColor(o: number) { return o >= 80 ? 'var(--gold)' : o >= 70 ? 'var(--text)' : 'var(--muted)'; }
