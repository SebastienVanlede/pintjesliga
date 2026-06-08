'use client';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/store';
import { useT } from '@/lib/useT';
import { getAvailableRolls, loadSquad, SEASON_COUNT } from '@/lib/data';
import { FORMATION_POSITIONS, Player, Squad, Team, PickedPlayer, Position, playerPositions } from '@/lib/types';
import FormationPitch from '@/components/FormationPitch';

type Phase = 'idle' | 'spinning' | 'squad' | 'placing';
interface Roll { team: Team; season: string; squad: Squad }
interface ReelItem { team: Team; season: string }

const POSITION_ORDER = ['GK','RB','CB','LB','CDM','CM','CAM','RM','LM','RW','LW','ST'];
const GROUP_ORDER = ['GK','DEF','MID','ATT'] as const;
type GroupKey = typeof GROUP_ORDER[number];
function positionGroup(pos: Position): GroupKey {
  if (pos === 'GK') return 'GK';
  if (pos === 'CB' || pos === 'LB' || pos === 'RB') return 'DEF';
  if (pos === 'CDM' || pos === 'CM' || pos === 'CAM' || pos === 'RM' || pos === 'LM') return 'MID';
  return 'ATT';
}

const REEL_ITEM_H = 84;
const REEL_LENGTH = 26;
const REEL_DURATION_MS = 1500;

export default function DraftPage() {
  const router = useRouter();
  const { formation, pickedPlayers, pickPlayer, draftMode, rerollsUsed, useReroll, pendingRoll, setPendingRoll, isDailyChallenge, dailyDeck } = useGameStore();
  const t = useT();
  const blind = draftMode === 'blind';

  const [phase, setPhase] = useState<Phase>('idle');
  const [roll, setRoll] = useState<Roll | null>(null);
  const [reelItems, setReelItems] = useState<ReelItem[]>([]);
  const [rollKey, setRollKey] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const MAX_REROLLS = 3;
  const rerollsLeft = MAX_REROLLS - rerollsUsed;
  const deckRef = useRef<{ team: Team; season: string }[]>([]);

  // Voor daily mode: track hoeveel keer er voor de huidige pick gerold is (0 = basis, 1-3 = herrolls)
  const [dailyAttempt, setDailyAttempt] = useState(0);

  // Reset attempt counter zodra een pick is voltooid (pickedPlayers.length verandert)
  useEffect(() => {
    setDailyAttempt(0);
  }, [pickedPlayers.length]);

  useEffect(() => {
    // Daily mode gebruikt geen deck-shifting, maar pick-gebonden indexering (zie rollDice)
    if (isDailyChallenge && dailyDeck) {
      deckRef.current = [];
    } else {
      const rolls = getAvailableRolls();
      deckRef.current = [...rolls].sort(() => Math.random() - 0.5);
    }
  }, [isDailyChallenge, dailyDeck]);

  const positions = formation ? FORMATION_POSITIONS[formation] : [];
  const pickedByIndex = Object.fromEntries(pickedPlayers.map((p) => [p.positionIndex, p]));
  const filledCount = pickedPlayers.length;

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

  // Na refresh: herstel het gerolde team vanuit de store
  useEffect(() => {
    if (!mounted || !pendingRoll) return;
    setPhase('spinning');
    loadSquad(pendingRoll.teamId, pendingRoll.season).then(squad => {
      if (!squad) { setPhase('idle'); return; }
      const teamObj = getAvailableRolls().find(r => r.team.id === pendingRoll.teamId && r.season === pendingRoll.season)?.team;
      if (!teamObj) { setPhase('idle'); return; }
      setRoll({ team: teamObj, season: pendingRoll.season, squad });
      setPhase('squad');
    }).catch(() => setPhase('idle'));
  }, [mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  const rollDice = useCallback((isReroll = false) => {
    if (isReroll) useReroll();
    setPendingRoll(null);
    setRoll(null);
    setSelectedPlayer(null);

    const allRolls = getAvailableRolls();
    let final: { team: Team; season: string };

    if (isDailyChallenge && dailyDeck) {
      // Pick-gebonden indexering: zelfde slot voor iedereen, ongeacht herrolls op eerdere picks
      const pickIdx = pickedPlayers.length;
      const attemptIdx = isReroll ? dailyAttempt + 1 : 0;
      setDailyAttempt(attemptIdx);
      const deckIdx = pickIdx * 4 + attemptIdx;
      const entry = dailyDeck[deckIdx];
      const resolved = entry ? allRolls.find(r => r.team.id === entry.teamId && r.season === entry.season) : null;
      if (!resolved) {
        // Fallback (zou niet mogen gebeuren bij geldige challenge)
        final = allRolls[Math.floor(Math.random() * allRolls.length)];
      } else {
        final = resolved;
      }
    } else {
      if (deckRef.current.length === 0) {
        deckRef.current = [...allRolls].sort(() => Math.random() - 0.5);
      }
      final = deckRef.current.shift()!;
    }

    // Bouw de reel: random tussen-items + finaal item op het einde
    const reel: ReelItem[] = Array.from({ length: REEL_LENGTH - 1 }, () => {
      const r = allRolls[Math.floor(Math.random() * allRolls.length)];
      return { team: r.team, season: r.season };
    });
    reel.push({ team: final.team, season: final.season });

    setReelItems(reel);
    setRollKey(k => k + 1);
    setPhase('spinning');

    const animPromise = new Promise(r => setTimeout(r, REEL_DURATION_MS));
    const loadPromise = loadSquad(final.team.id, final.season);

    Promise.all([loadPromise, animPromise]).then(([squad]) => {
      if (!squad) { rollDice(isReroll); return; }
      setPendingRoll({ teamId: final.team.id, teamName: final.team.name, season: final.season, primaryColor: final.team.primaryColor });
      setRoll({ team: final.team, season: final.season, squad });
      setPhase('squad');
    });
  }, [useReroll, setPendingRoll, isDailyChallenge, dailyDeck, dailyAttempt, pickedPlayers.length]);

  function handleSelectPlayer(player: Player) {
    if (!roll) return;
    // B: Auto-place als er maar 1 vrije geldige positie is
    const eligible = positions
      .map((pos, i) => ({ pos, i }))
      .filter(({ pos, i }) => playerPositions(player).includes(pos) && !pickedByIndex[i])
      .map(({ i }) => i);

    if (eligible.length === 1) {
      pickPlayer({
        positionIndex: eligible[0],
        position: positions[eligible[0]],
        player,
        teamName: roll.team.name,
        teamPrimaryColor: roll.team.primaryColor,
        season: roll.season,
      } as PickedPlayer);
      setSelectedPlayer(null);
      setRoll(null);
      setPhase('idle');
      return;
    }

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

  const groupedPlayers = useMemo(() => {
    if (!roll) return null;
    const groups: Record<GroupKey, Player[]> = { GK: [], DEF: [], MID: [], ATT: [] };
    for (const p of roll.squad.players) groups[positionGroup(p.position)].push(p);
    for (const k of GROUP_ORDER) {
      groups[k].sort((a, b) => {
        const idx = POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position);
        if (idx !== 0) return idx;
        return b.overall - a.overall;
      });
    }
    return groups;
  }, [roll]);

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

  const showLeftMobile = phase === 'idle' || phase === 'placing';
  const showRightMobile = phase === 'spinning' || phase === 'squad';

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100svh-56px)] relative">

      {/* ── Links: Pitch + Lineup ─────────────────────────────────────── */}
      <div
        className={`${showLeftMobile ? 'flex' : 'hidden'} lg:flex flex-col gap-5 px-5 py-6 pb-40 lg:py-8 lg:px-7 lg:pb-8 lg:w-[360px] xl:w-[400px] flex-shrink-0`}
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
      <div className={`${showRightMobile ? 'flex' : 'hidden'} lg:flex flex-1 flex-col px-6 py-6 lg:px-10 lg:py-8 gap-5 lg:overflow-y-auto`}>
        <AnimatePresence mode="wait">

          {/* IDLE — desktop alleen, mobile gebruikt sticky bottom bar */}
          {phase === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="hidden lg:flex flex-col items-center justify-center gap-7 flex-1 min-h-72">

              <motion.button
                onClick={() => rollDice(false)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="flex flex-col items-center gap-3 rounded-2xl"
                style={{
                  background: 'var(--gold)',
                  border: '2px solid var(--gold)',
                  boxShadow: '0 0 32px rgba(212,148,10,0.22), 0 0 64px rgba(212,148,10,0.08)',
                  cursor: 'pointer',
                  padding: '26px 52px',
                }}
              >
                <span style={{ fontSize: '2.6rem', lineHeight: 1 }}>🎲</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: '#07070A', letterSpacing: '0.2em' }}>
                  ROL
                </span>
              </motion.button>

              <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>
                {t.draft.randomHint.replace('{seasons}', String(SEASON_COUNT))}
              </p>
            </motion.div>
          )}

          {/* SPINNING — reel animatie */}
          {phase === 'spinning' && (
            <motion.div key="spinning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-5 flex-1 min-h-72">

              <span className="label-xs">{t.draft.rolling}</span>

              {/* Reel viewport */}
              <div
                className="reel-mask"
                style={{
                  width: '100%',
                  maxWidth: 440,
                  height: REEL_ITEM_H,
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  background: 'var(--surface)',
                  position: 'relative',
                }}
              >
                {/* Gouden lock-indicator links */}
                <div style={{
                  position: 'absolute', top: 0, bottom: 0, left: 0,
                  width: 3, background: 'var(--gold)', zIndex: 3,
                  boxShadow: '0 0 12px rgba(212,148,10,0.5)',
                }} />

                <motion.div
                  key={rollKey}
                  initial={{ y: 0 }}
                  animate={{ y: -(reelItems.length - 1) * REEL_ITEM_H }}
                  transition={{ duration: REEL_DURATION_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
                >
                  {reelItems.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        height: REEL_ITEM_H,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 24px 0 28px',
                        background: `linear-gradient(90deg, ${item.team.primaryColor}24 0%, transparent 65%)`,
                      }}
                    >
                      <span style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'clamp(0.95rem, 3vw, 1.15rem)',
                        letterSpacing: '0.06em',
                        color: 'var(--text)',
                      }}>
                        {item.team.name}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.95rem',
                        color: 'var(--gold)',
                        letterSpacing: '0.08em',
                      }}>
                        {item.season}
                      </span>
                    </div>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* SQUAD — teamreveal + gegroepeerde spelerslijst */}
          {phase === 'squad' && roll && groupedPlayers && (
            <motion.div key="squad" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col gap-4 flex-1">

              {/* Team reveal banner — compacter, reroll inline, sticky top op mobile */}
              <div
                className="rounded-2xl overflow-hidden sticky top-[56px] lg:top-0 z-10"
                style={{
                  background: `linear-gradient(135deg, ${roll.team.primaryColor}1c 0%, var(--bg) 70%)`,
                  border: `1.5px solid ${roll.team.primaryColor}44`,
                  boxShadow: `0 0 18px ${roll.team.primaryColor}10`,
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="label-xs block mb-1.5" style={{ color: `${roll.team.primaryColor}cc` }}>{t.draft.drawnTeam}</span>
                    <h2 style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(1.4rem, 4.5vw, 2rem)',
                      color: roll.team.primaryColor,
                      letterSpacing: '0.06em',
                      lineHeight: 1.05,
                      textShadow: `0 0 20px ${roll.team.primaryColor}28`,
                    }}>
                      {roll.team.name}
                    </h2>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="text-right">
                      <span className="label-xs block mb-1.5">{t.draft.season}</span>
                      <p style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.4rem',
                        color: 'var(--text)',
                        letterSpacing: '0.08em',
                        lineHeight: 1,
                      }}>
                        {roll.season}
                      </p>
                    </div>
                    <button
                      onClick={() => rollDice(true)}
                      disabled={rerollsLeft === 0}
                      className="flex items-center gap-1.5"
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.65rem',
                        letterSpacing: '0.1em',
                        padding: '5px 10px',
                        borderRadius: 6,
                        border: `1px solid ${rerollsLeft > 0 ? 'var(--gold-dim)' : 'var(--border-2)'}`,
                        background: rerollsLeft > 0 ? 'rgba(212,148,10,0.08)' : 'transparent',
                        color: rerollsLeft > 0 ? 'var(--gold)' : 'var(--muted)',
                        cursor: rerollsLeft > 0 ? 'pointer' : 'not-allowed',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: '0.85rem' }}>⟲</span>
                      {rerollsLeft > 0 ? `${t.draft.rerolls.toUpperCase()} (${rerollsLeft})` : t.draft.noRerolls}
                    </button>
                  </div>
                </div>
                <div style={{
                  height: 2,
                  background: `linear-gradient(to right, ${roll.team.primaryColor}, transparent)`,
                }} />
              </div>

              {/* Gegroepeerde spelerslijst — 2-koloms op desktop, natuurlijke pagescroll op mobile */}
              <div className="flex flex-col gap-3 flex-1 lg:overflow-y-auto lg:max-h-[calc(100svh-280px)] lg:pr-1 pb-6">
                <p className="text-xs px-1 lg:hidden" style={{ color: 'var(--muted)' }}>
                  {t.draft.chooseHint}
                </p>
                {GROUP_ORDER.map(groupKey => {
                  const players = groupedPlayers[groupKey];
                  if (players.length === 0) return null;
                  return (
                    <div key={groupKey} className="flex flex-col gap-1.5">
                      <span className="label-xs px-1">{t.draft.groups[groupKey]}</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                        {players.map((player, idx) => {
                          const alreadyPicked = pickedPlayerIds.has(player.id) || pickedPlayerNames.has(player.name.toLowerCase());
                          const posFull = playerPositions(player).every(pos => isPositionFull(pos));
                          const disabled = alreadyPicked || posFull;
                          return (
                            <motion.div
                              key={player.id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.015, duration: 0.16 }}
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
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* PLACING — desktop alleen, mobile gebruikt sticky bottom bar */}
          {phase === 'placing' && selectedPlayer && roll && (
            <motion.div key="placing" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="hidden lg:flex flex-col gap-5 flex-1 justify-center items-center max-w-lg mx-auto w-full">

              {/* Gekozen speler card */}
              <div className="w-full rounded-2xl p-5" style={{
                background: 'var(--surface)',
                border: '2px solid var(--gold)',
                boxShadow: '0 0 22px rgba(212,148,10,0.10)',
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

      {/* ── MOBILE: sticky roll-knop tijdens idle ─────────────────────── */}
      {phase === 'idle' && (
        <div
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 px-4 pt-8 pb-5"
          style={{
            background: 'linear-gradient(to top, var(--bg) 55%, transparent)',
          }}
        >
          <motion.button
            onClick={() => rollDice(false)}
            whileTap={{ scale: 0.97 }}
            className="w-full flex items-center justify-center gap-3 rounded-2xl"
            style={{
              background: 'var(--gold)',
              border: '2px solid var(--gold)',
              boxShadow: '0 0 28px rgba(212,148,10,0.28)',
              padding: '18px 24px',
              cursor: 'pointer',
              color: '#07070A',
            }}
          >
            <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>🎲</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', letterSpacing: '0.22em' }}>
              ROL
            </span>
          </motion.button>
          <p className="text-center text-xs mt-2.5" style={{ color: 'var(--muted)' }}>
            {t.draft.randomHint.replace('{seasons}', String(SEASON_COUNT))}
          </p>
        </div>
      )}

      {/* ── MOBILE: sticky bar tijdens placing ───────────────────────── */}
      {phase === 'placing' && selectedPlayer && roll && (
        <div
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 px-3 pt-8 pb-4"
          style={{
            background: 'linear-gradient(to top, var(--bg) 55%, transparent)',
          }}
        >
          <div
            className="rounded-2xl p-3"
            style={{
              background: 'var(--surface)',
              border: '2px solid var(--gold)',
              boxShadow: '0 0 22px rgba(212,148,10,0.18)',
            }}
          >
            <div className="flex items-center gap-3">
              <OverallBadge overall={selectedPlayer.overall} size="sm" blind={blind} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                  {selectedPlayer.name}
                </p>
                <p className="text-xs truncate mt-0.5" style={{
                  color: eligibleIndices.size === 0 ? 'var(--red)' : 'var(--gold)',
                }}>
                  {eligibleIndices.size === 0
                    ? t.draft.noFreePos(playerPositions(selectedPlayer).join('/'), formation)
                    : t.draft.clickHighlight(playerPositions(selectedPlayer).join('/'))}
                </p>
              </div>
            </div>
            <button
              onClick={() => { setSelectedPlayer(null); setPhase('squad'); }}
              className="w-full mt-2.5 rounded-lg text-xs py-2"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-2)',
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.08em',
              }}
            >
              {t.draft.otherPlayer}
            </button>
          </div>
        </div>
      )}

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
      className="player-card w-full text-left rounded-xl"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        padding: '9px 12px',
        opacity: disabled ? 0.38 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ['--team-color' as string]: teamColor,
      } as React.CSSProperties}
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
            className="player-card-pick flex-shrink-0"
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
      boxShadow: !blind && overall >= 80 ? `0 0 10px ${color}25` : 'none',
    }}>
      {blind ? '?' : overall}
    </div>
  );
}
