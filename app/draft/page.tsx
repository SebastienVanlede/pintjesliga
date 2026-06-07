'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/store';
import { useT } from '@/lib/useT';
import { getAvailableRolls, loadSquad } from '@/lib/data';
import { FORMATION_POSITIONS, Player, Squad, Team, PickedPlayer, Position, playerPositions } from '@/lib/types';
import FormationPitch from '@/components/FormationPitch';

type Phase = 'idle' | 'spinning' | 'squad' | 'placing';
interface Roll { team: Team; season: string; squad: Squad }

const POSITION_ORDER = ['GK','RB','CB','LB','CDM','CM','CAM','RM','LM','RW','LW','ST'];

export default function DraftPage() {
  const router = useRouter();
  const { formation, pickedPlayers, pickPlayer, draftMode, rerollsUsed, useReroll } = useGameStore();
  const t = useT();
  const blind = draftMode === 'blind';

  const [phase, setPhase] = useState<Phase>('idle');
  const [roll, setRoll] = useState<Roll | null>(null);
  const [spinLabel, setSpinLabel] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [sortBy, setSortBy] = useState<'position' | 'rating'>('position');

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
  const nextPos = positions[filledCount] ?? null;

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!formation) router.replace('/');
  }, [mounted, formation, router]);

  useEffect(() => {
    if (!mounted) return;
    if (filledCount >= positions.length && positions.length > 0) router.push('/xi');
  }, [mounted, filledCount, positions.length, router]);

  const rollDice = useCallback((isReroll = false) => {
    if (isReroll) useReroll();
    setPhase('spinning');
    setRoll(null);
    setSelectedPlayer(null);
    const allRolls = getAvailableRolls();
    let ticks = 0;
    const interval = setInterval(() => {
      const r = allRolls[Math.floor(Math.random() * allRolls.length)];
      setSpinLabel(`${r.team.name} · ${r.season}`);
      ticks++;
      if (ticks >= 20) {
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
          .catch(() => setPhase('idle'));
      }
    }, 80);
  }, [useReroll]);

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

  const pickedPlayerIds   = new Set(pickedPlayers.map((p) => p.player.id));
  const pickedPlayerNames = new Set(pickedPlayers.map((p) => p.player.name.toLowerCase()));
  const filledPerPosition: Record<string, number> = {};
  for (const p of pickedPlayers) filledPerPosition[p.position] = (filledPerPosition[p.position] ?? 0) + 1;
  const totalPerPosition: Record<string, number> = {};
  for (const pos of positions) totalPerPosition[pos] = (totalPerPosition[pos] ?? 0) + 1;
  function isPositionFull(pos: Position) { return (filledPerPosition[pos] ?? 0) >= (totalPerPosition[pos] ?? 0); }

  const eligibleIndices: Set<number> = selectedPlayer
    ? new Set(positions.map((pos, i) => ({ pos, i }))
        .filter(({ pos, i }) => playerPositions(selectedPlayer).includes(pos) && !pickedByIndex[i])
        .map(({ i }) => i))
    : new Set();

  const progressPct = Math.round((filledCount / positions.length) * 100);

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100svh-56px)]">

      {/* ── Links: Pitch + Lineup ─────────────────────────────────────── */}
      <div
        className="flex flex-col gap-5 px-5 py-6 lg:py-8 lg:px-7 lg:w-[360px] xl:w-[400px] flex-shrink-0"
        style={{ borderRight: '1px solid var(--border)', background: 'rgba(0,0,0,0.15)' }}
      >
        {/* Voortgangsbalk */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="label-xs">{t.draft.yourLineup}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: 'var(--gold)', letterSpacing: '0.06em' }}>
              {filledCount}/{positions.length}
            </span>
          </div>
          <div className="h-1 rounded-full w-full" style={{ background: 'var(--border)' }}>
            <motion.div
              className="h-1 rounded-full"
              style={{ background: 'var(--gold)' }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Formatie tag + placing hint */}
        <div className="flex items-center gap-2">
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.12em',
            color: 'var(--muted)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 4,
          }}>
            {formation}
          </span>
          {phase === 'placing' && (
            <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              className="text-xs" style={{ color: 'var(--gold)' }}>
              {t.draft.clickPos}
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
          blind={blind}
        />

      </div>

      {/* ── Rechts: Actie ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col px-6 py-6 lg:px-10 lg:py-8 gap-6 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* IDLE */}
          {phase === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-8 flex-1 min-h-72">

              {/* Rol knop */}
              <motion.button
                onClick={() => rollDice(false)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="flex flex-col items-center gap-3 rounded-2xl"
                style={{
                  background: 'var(--gold)',
                  border: '2px solid var(--gold)',
                  boxShadow: '0 0 60px rgba(212,148,10,0.35), 0 0 120px rgba(212,148,10,0.15)',
                  cursor: 'pointer',
                  padding: '28px 56px',
                }}
              >
                <span style={{ fontSize: '2.8rem', lineHeight: 1 }}>🎲</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: '#07070A', letterSpacing: '0.2em' }}>
                  ROL
                </span>
              </motion.button>

              <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>
                {t.draft.randomHint}
              </p>
            </motion.div>
          )}

          {/* SPINNING — slot machine */}
          {phase === 'spinning' && (
            <motion.div key="spinning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-6 flex-1 min-h-72">

              <span className="label-xs">{t.draft.rolling}</span>

              {/* Slot machine box */}
              <div style={{
                width: '100%',
                maxWidth: 420,
                border: '2px solid var(--gold-dim)',
                borderRadius: 16,
                background: 'var(--surface)',
                boxShadow: '0 0 40px rgba(212,148,10,0.12), inset 0 0 40px rgba(0,0,0,0.3)',
                overflow: 'hidden',
                position: 'relative',
              }}>
                {/* Bovenste fade */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 40,
                  background: 'linear-gradient(to bottom, var(--surface), transparent)',
                  zIndex: 1, pointerEvents: 'none',
                }} />
                {/* Onderste fade */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
                  background: 'linear-gradient(to top, var(--surface), transparent)',
                  zIndex: 1, pointerEvents: 'none',
                }} />
                {/* Gouden lijn indicator */}
                <div style={{
                  position: 'absolute', top: '50%', left: 16, right: 16,
                  height: 1, background: 'var(--gold-dim)', zIndex: 2,
                  transform: 'translateY(-50%)',
                }} />

                <div style={{ padding: '28px 24px', textAlign: 'center' }}>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={spinLabel}
                      initial={{ opacity: 0, y: -16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 16 }}
                      transition={{ duration: 0.06 }}
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'clamp(1.1rem,4vw,1.6rem)',
                        color: 'var(--gold)',
                        letterSpacing: '0.1em',
                      }}
                    >
                      {spinLabel}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>

              {/* Pulserende dots */}
              <div className="flex gap-2">
                {[0, 1, 2].map(i => (
                  <motion.div key={i}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.5, delay: i * 0.12, repeat: Infinity }}
                    style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)' }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* SQUAD — teamreveal + spelerslijst */}
          {phase === 'squad' && roll && (
            <motion.div key="squad" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col gap-4 flex-1">

              {/* Team reveal banner */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${roll.team.primaryColor}20 0%, transparent 70%)`,
                  border: `1.5px solid ${roll.team.primaryColor}50`,
                  boxShadow: `0 0 32px ${roll.team.primaryColor}18`,
                }}
              >
                <div className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <span className="label-xs block mb-1.5" style={{ color: `${roll.team.primaryColor}cc` }}>{t.draft.drawnTeam}</span>
                    <h2 style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(1.5rem,5vw,2.2rem)',
                      color: roll.team.primaryColor,
                      letterSpacing: '0.06em',
                      lineHeight: 1,
                      textShadow: `0 0 40px ${roll.team.primaryColor}50`,
                    }}>
                      {roll.team.name}
                    </h2>
                  </div>
                  <div className="text-right">
                    <span className="label-xs block mb-1.5">{t.draft.season}</span>
                    <p style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.6rem',
                      color: 'var(--text)',
                      letterSpacing: '0.08em',
                      lineHeight: 1,
                    }}>
                      {roll.season}
                    </p>
                  </div>
                </div>
                <div style={{
                  height: 3,
                  background: `linear-gradient(to right, ${roll.team.primaryColor}, transparent)`,
                }} />
              </div>

              {/* Herroll balk */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>{t.draft.rerolls}</span>
                  <div className="flex gap-1.5">
                    {Array.from({ length: MAX_REROLLS }).map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ scale: i < rerollsLeft ? 1 : 0.7 }}
                        style={{
                          width: 10, height: 10, borderRadius: '50%',
                          background: i < rerollsLeft ? 'var(--gold)' : 'var(--border-2)',
                          boxShadow: i < rerollsLeft ? '0 0 6px rgba(212,148,10,0.5)' : 'none',
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
                  }}
                >
                  {rerollsLeft > 0 ? t.draft.rerollBtn(rerollsLeft) : t.draft.noRerolls}
                </button>
              </div>

              {/* Instructie + sort toggle */}
              <div className="flex items-center justify-between px-1">
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {t.draft.chooseHint}
                </p>
                {!blind && (
                  <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    {(['position', 'rating'] as const).map(opt => (
                      <button
                        key={opt}
                        onClick={() => setSortBy(opt)}
                        style={{
                          padding: '3px 10px',
                          fontSize: '0.6rem',
                          letterSpacing: '0.08em',
                          fontFamily: 'var(--font-display)',
                          background: sortBy === opt ? 'var(--gold)' : 'transparent',
                          color: sortBy === opt ? '#07070A' : 'var(--muted)',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {opt === 'position' ? 'POS' : 'OVR'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Spelerslijst */}
              <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto pr-1" style={{ maxHeight: 440 }}>
                {[...roll.squad.players]
                  .sort((a, b) => blind || sortBy === 'position'
                    ? POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position)
                    : b.overall - a.overall)
                  .map((player, idx) => {
                    const alreadyPicked = pickedPlayerIds.has(player.id) || pickedPlayerNames.has(player.name.toLowerCase());
                    const posFull = playerPositions(player).every(pos => isPositionFull(pos));
                    const disabled = alreadyPicked || posFull;
                    return (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.025, duration: 0.2 }}
                      >
                        <PlayerCard
                          player={player}
                          teamColor={roll.team.primaryColor}
                          disabled={disabled}
                          disabledReason={alreadyPicked ? t.draft.taken : posFull ? t.draft.full : undefined}
                          blind={blind}
                          pickLabel={t.draft.choose}
                          onPick={() => !disabled && handleSelectPlayer(player)}
                        />
                      </motion.div>
                    );
                  })}
              </div>
            </motion.div>
          )}

          {/* PLACING */}
          {phase === 'placing' && selectedPlayer && roll && (
            <motion.div key="placing" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col gap-5 flex-1 justify-center items-center max-w-lg mx-auto w-full">

              {/* Gekozen speler card */}
              <div className="w-full rounded-2xl p-5" style={{
                background: 'var(--surface)',
                border: '2px solid var(--gold)',
                boxShadow: '0 0 50px rgba(212,148,10,0.18)',
              }}>
                <span className="label-xs block mb-3" style={{ color: 'var(--gold-dim)' }}>{t.draft.chosenPlayer}</span>
                <div className="flex items-center gap-4">
                  <OverallBadge overall={selectedPlayer.overall} size="lg" blind={blind} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate" style={{ color: 'var(--text)', fontSize: '1.1rem' }}>
                      {selectedPlayer.name}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      {playerPositions(selectedPlayer).map(pos => (
                        <span key={pos} style={{
                          fontSize: '0.65rem', letterSpacing: '0.06em',
                          padding: '2px 7px', borderRadius: 4,
                          background: 'var(--surface-2)', color: 'var(--text-2)',
                          fontFamily: 'var(--font-display)',
                          border: '1px solid var(--border)',
                        }}>{pos}</span>
                      ))}
                      <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>
                        {roll.team.name} · {roll.season}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructie */}
              {eligibleIndices.size === 0 ? (
                <div className="w-full text-center p-4 rounded-xl" style={{ background: 'var(--red-dim)', border: '1px solid var(--red)' }}>
                  <p className="text-sm" style={{ color: 'var(--red)' }}>
                    {t.draft.noFreePos(playerPositions(selectedPlayer).join('/'), formation)}
                  </p>
                </div>
              ) : (
                <div className="w-full flex items-center gap-3 p-4 rounded-xl" style={{
                  background: 'rgba(212,148,10,0.06)',
                  border: '1px solid var(--gold-dim)',
                }}>
                  <span style={{ fontSize: '1.5rem' }}>←</span>
                  <p className="text-sm" style={{ color: 'var(--gold)' }}>
                    {t.draft.clickHighlight(playerPositions(selectedPlayer).join('/'))}
                  </p>
                </div>
              )}

              <button
                onClick={() => { setSelectedPlayer(null); setPhase('squad'); }}
                className="text-sm"
                style={{ color: 'var(--muted)', textDecoration: 'underline', cursor: 'pointer' }}
              >
                {t.draft.otherPlayer}
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Player card ──────────────────────────────────────────────────────────────

function PlayerCard({ player, teamColor, onPick, disabled, disabledReason, blind, pickLabel }: {
  player: Player; teamColor: string; onPick: () => void;
  disabled?: boolean; disabledReason?: string; blind?: boolean; pickLabel: string;
}) {
  const allPositions = playerPositions(player);
  return (
    <button
      onClick={!disabled ? onPick : undefined}
      disabled={disabled}
      className="w-full text-left rounded-xl transition-all duration-100 group"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        padding: '9px 12px',
        opacity: disabled ? 0.38 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={e => {
        if (disabled) return;
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = `${teamColor}90`;
        el.style.background = `${teamColor}12`;
        el.style.transform = 'translateX(2px)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = 'var(--border)';
        el.style.background = 'var(--surface)';
        el.style.transform = 'translateX(0)';
      }}
    >
      <div className="flex items-center gap-3">
        <OverallBadge overall={player.overall} size="sm" blind={blind} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
            {player.name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {allPositions.map(pos => (
              <span key={pos} style={{
                fontSize: '0.58rem', letterSpacing: '0.06em',
                padding: '1px 5px', borderRadius: 3,
                background: 'var(--surface-2)', color: 'var(--text-2)',
                fontFamily: 'var(--font-display)',
              }}>{pos}</span>
            ))}
            <span style={{ fontSize: '0.62rem', color: 'var(--muted)' }}>· {player.nationality}</span>
            {!blind && <span style={{ fontSize: '0.62rem', color: 'var(--muted)' }}>· {player.goals}G {player.assists}A</span>}
          </div>
          {!blind && player.awards && player.awards.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {player.awards.slice(0, 2).map(award => (
                <span key={award} style={{
                  fontSize: '0.55rem', padding: '1px 5px', borderRadius: 3,
                  background: 'rgba(212,148,10,0.1)', color: 'var(--gold)',
                  border: '1px solid rgba(212,148,10,0.2)',
                }}>🏆 {award}</span>
              ))}
            </div>
          )}
        </div>

        {disabled ? (
          <span style={{
            fontSize: '0.58rem', letterSpacing: '0.06em',
            padding: '3px 7px', borderRadius: 4,
            background: 'var(--border)', color: 'var(--muted)',
            fontFamily: 'var(--font-display)', flexShrink: 0,
          }}>{disabledReason}</span>
        ) : (
          <span
            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            style={{
              fontSize: '0.62rem', letterSpacing: '0.12em',
              padding: '5px 12px', borderRadius: 6,
              background: teamColor, color: '#07070A',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
            }}
          >
            {pickLabel}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Overall badge ────────────────────────────────────────────────────────────

function OverallBadge({ overall, size, blind }: { overall: number; size: 'sm' | 'lg'; blind?: boolean }) {
  const color = blind ? 'var(--muted)'
    : overall >= 80 ? 'var(--gold)'
    : overall >= 73 ? '#A8E6CF'
    : overall >= 66 ? 'var(--text-2)'
    : 'var(--muted)';
  const bg = blind ? 'rgba(104,100,92,0.1)'
    : overall >= 80 ? 'rgba(212,148,10,0.22)'
    : overall >= 73 ? 'rgba(168,230,207,0.12)'
    : overall >= 66 ? 'rgba(237,234,228,0.08)'
    : 'rgba(104,100,92,0.12)';
  const dim = size === 'sm'
    ? { width: 38, height: 38, fontSize: '0.88rem', borderRadius: 8 }
    : { width: 58, height: 58, fontSize: '1.5rem', borderRadius: 12 };

  return (
    <div style={{
      ...dim, background: bg,
      border: `1px solid ${color}50`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', color, flexShrink: 0,
      letterSpacing: '0.02em',
      boxShadow: !blind && overall >= 80 ? `0 0 12px ${color}30` : 'none',
    }}>
      {blind ? '?' : overall}
    </div>
  );
}
