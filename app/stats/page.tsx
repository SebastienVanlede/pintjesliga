'use client';
import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, PlayedGame } from '@/lib/store';
import { useT } from '@/lib/useT';
import { ACHIEVEMENTS, RARITY_COLOR, getAllEarnedAchievements, AchievementId } from '@/lib/achievements';

export default function StatsPage() {
  const router = useRouter();
  const t = useT();
  const { playHistory, clearPlayHistory, language } = useGameStore();
  const [mounted, setMounted] = useState(false);
  const [showAllGames, setShowAllGames] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const stats = useMemo(() => computeStats(playHistory), [playHistory]);
  const earnedSet = useMemo(() => getAllEarnedAchievements(playHistory), [playHistory]);

  if (!mounted) return null;

  if (playHistory.length === 0) {
    return (
      <main className="min-h-[calc(100svh-56px)] flex flex-col items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md flex flex-col items-center gap-6"
        >
          <span style={{ fontSize: '3rem' }}>📊</span>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.4rem,4vw,2rem)',
              color: 'var(--gold)',
              letterSpacing: '0.08em',
              lineHeight: 1.1,
            }}>
              {t.stats.empty}
            </h1>
            <p className="text-sm mt-3" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>{t.stats.emptyDesc}</p>
          </div>
          <button
            onClick={() => router.push('/')}
            style={{
              fontFamily: 'var(--font-display)', letterSpacing: '0.12em',
              padding: '12px 28px', borderRadius: 8,
              background: 'var(--gold)', color: '#07070A',
              border: '2px solid var(--gold)', cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            {t.stats.startGame}
          </button>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100svh-56px)] px-4 py-6 sm:py-10">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-4 flex-wrap"
        >
          <div>
            <span className="label-xs block mb-2">Pintjesliga</span>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.8rem,5vw,2.8rem)',
              color: 'var(--gold)',
              letterSpacing: '0.08em',
              lineHeight: 1,
            }}>
              {t.stats.title}
            </h1>
            <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>{t.stats.subtitle}</p>
          </div>
        </motion.div>

        {/* ── Overzichts-tiles ── */}
        <Section title={t.stats.overview}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Tile icon="🎮" label={t.stats.gamesPlayed} value={stats.gamesPlayed} highlight />
            <Tile icon="🏆" label={t.stats.titlesWon}   value={stats.championships} />
            <Tile icon="⭐" label={t.stats.bestScore}   value={stats.bestScore.toLocaleString('nl-BE')} highlight />
            <Tile icon="📊" label={t.stats.avgOverall}  value={stats.avgOverall} />
          </div>
        </Section>

        {/* ── Achievements ── */}
        <Section
          title={t.achievements.title}
          rightLabel={t.achievements.earned(earnedSet.size, ACHIEVEMENTS.length)}
        >
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
            {ACHIEVEMENTS.map(a => {
              const earned = earnedSet.has(a.id);
              const def    = t.achievements.defs[a.id];
              return (
                <AchievementBadge
                  key={a.id}
                  icon={a.icon}
                  name={def?.name ?? a.id}
                  desc={def?.desc ?? ''}
                  color={RARITY_COLOR[a.rarity]}
                  earned={earned}
                />
              );
            })}
          </div>
        </Section>

        {/* ── Favorieten ── */}
        <Section title={t.stats.favorites}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <FavRow label={t.stats.favoriteFormation} name={stats.fav.formation.name} sub={stats.fav.formation.count ? t.stats.times(stats.fav.formation.count) : t.stats.none} icon="📋" />
            <FavRow label={t.stats.favoriteClub}      name={stats.fav.club.name}      sub={stats.fav.club.count ? t.stats.times(stats.fav.club.count) : t.stats.none} icon="🏟️" />
            <FavRow label={t.stats.favoritePlayer}    name={stats.fav.player.name}    sub={stats.fav.player.count ? t.stats.times(stats.fav.player.count) : t.stats.none} icon="⚽" />
            <FavRow label={t.stats.favoriteSeason}    name={stats.fav.season.name}    sub={stats.fav.season.count ? t.stats.times(stats.fav.season.count) : t.stats.none} icon="📅" />
          </div>
        </Section>

        {/* ── Resultaten breakdown ── */}
        <Section title={t.stats.results}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <ResultPill icon="🥇" label={t.stats.championships} value={stats.championships}  total={stats.gamesPlayed} color="#D4940A" />
            <ResultPill icon="🏆" label={t.stats.po1Finishes}   value={stats.po1Finishes}    total={stats.gamesPlayed} color="#C8A040" />
            <ResultPill icon="🌍" label={t.stats.po2Finishes}   value={stats.po2Finishes}    total={stats.gamesPlayed} color="#3a8fd1" />
            <ResultPill icon="🔴" label={t.stats.relegations}   value={stats.relegations}    total={stats.gamesPlayed} color="var(--red)" />
          </div>
        </Section>

        {/* ── Speelmodi ── */}
        <Section title={t.stats.modes}>
          <div className="grid grid-cols-2 gap-2.5">
            <ModeBar label={t.stats.normalGames}  value={stats.normalGames}  other={stats.blindGames}    total={stats.gamesPlayed} />
            <ModeBar label={t.stats.blindGames}   value={stats.blindGames}   other={stats.normalGames}   total={stats.gamesPlayed} />
            <ModeBar label={t.stats.classicGames} value={stats.classicGames} other={stats.seasonGames}   total={stats.gamesPlayed} />
            <ModeBar label={t.stats.seasonGames}  value={stats.seasonGames}  other={stats.classicGames}  total={stats.gamesPlayed} />
          </div>
        </Section>

        {/* ── Totalen ── */}
        <Section title={t.stats.totals}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <Tile icon="⚽" label={t.stats.goalsScored}    value={stats.totalGoals} />
            <Tile icon="🏟️" label={t.stats.uniqueClubs}    value={stats.uniqueClubsTotal} />
            <Tile icon="📅" label={t.stats.uniqueSeasons}  value={stats.uniqueSeasonsTotal} />
          </div>
        </Section>

        {/* ── Recente seizoenen ── */}
        <Section title={t.stats.recent}>
          <div className="flex flex-col rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {(showAllGames ? playHistory : playHistory.slice(0, 5)).map((g, i) => (
              <GameRow key={g.id} game={g} rank={i + 1} language={language} />
            ))}
          </div>
          {playHistory.length > 5 && (
            <button
              onClick={() => setShowAllGames(v => !v)}
              className="text-xs self-center mt-3"
              style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
            >
              {showAllGames ? t.stats.hideAll : t.stats.seeAll(playHistory.length)}
            </button>
          )}
        </Section>

        {/* ── Wis history (klein, onderaan) ── */}
        <div className="flex justify-center pt-2">
          <button
            onClick={() => { if (window.confirm(t.stats.clearConfirm)) clearPlayHistory(); }}
            className="text-xs"
            style={{ color: 'var(--red)', opacity: 0.7, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            {t.stats.clearHistory}
          </button>
        </div>
      </div>
    </main>
  );
}

// ─── Computed stats ────────────────────────────────────────────────────────────

interface Stats {
  gamesPlayed: number;
  championships: number;
  po1Finishes: number;
  po2Finishes: number;
  relegations: number;
  normalGames: number;
  blindGames: number;
  classicGames: number;
  seasonGames: number;
  bestScore: number;
  avgOverall: number;
  totalGoals: number;
  uniqueClubsTotal: number;
  uniqueSeasonsTotal: number;
  fav: {
    formation: { name: string; count: number };
    club:      { name: string; count: number };
    player:    { name: string; count: number };
    season:    { name: string; count: number };
  };
}

function computeStats(games: PlayedGame[]): Stats {
  const empty = { name: '—', count: 0 };
  if (games.length === 0) {
    return {
      gamesPlayed: 0, championships: 0, po1Finishes: 0, po2Finishes: 0, relegations: 0,
      normalGames: 0, blindGames: 0, classicGames: 0, seasonGames: 0,
      bestScore: 0, avgOverall: 0, totalGoals: 0, uniqueClubsTotal: 0, uniqueSeasonsTotal: 0,
      fav: { formation: empty, club: empty, player: empty, season: empty },
    };
  }

  // Bepaal categorie per game: gebruik nieuwe resultCategory als beschikbaar,
  // anders fallback op de werkelijke labels van getResultLabel()
  function categorize(g: PlayedGame): import('@/lib/store').ResultCategory {
    if (g.resultCategory) return g.resultCategory;
    if (g.isChampion) return 'champion';
    const label = g.resultLabel;
    if (label.includes('PO1')) return 'po1';
    if (label.includes('PO2') || label.includes('Europa')) return 'po2';
    if (label.includes('gered'))         return 'rel_survived';
    if (label.includes('via PO') || label.includes('Relegate'))      return 'rel_relegated';
    if (label.includes('Rechtstreeks') || label.includes('Directly')) return 'direct_relegated';
    return 'unknown';
  }
  const categorized = games.map(g => ({ g, cat: categorize(g) }));

  const championships = categorized.filter(x => x.cat === 'champion').length;
  // PO1 finishes = iedereen die in PO1 belandde, kampioen inclusief
  const po1Finishes   = categorized.filter(x => x.cat === 'champion' || x.cat === 'po1').length;
  const po2Finishes   = categorized.filter(x => x.cat === 'po2').length;
  const relegations   = categorized.filter(x => x.cat === 'rel_relegated' || x.cat === 'direct_relegated').length;

  const normalGames  = games.filter(g => g.draftMode === 'normal').length;
  const blindGames   = games.filter(g => g.draftMode === 'blind').length;
  const classicGames = games.filter(g => g.opponentMode === 'classic').length;
  const seasonGames  = games.filter(g => g.opponentMode === 'season').length;

  const bestScore  = Math.max(...games.map(g => g.totalScore));
  const avgOverall = Math.round(games.reduce((s, g) => s + g.avgOverall, 0) / games.length);
  const totalGoals = games.reduce((s, g) => s + g.goalsScored, 0);

  // Tellen voor favorieten
  const formationCount: Record<string, number> = {};
  const clubCount:      Record<string, number> = {};
  const playerCount:    Record<string, number> = {};
  const seasonCount:    Record<string, number> = {};
  const allClubsUsed   = new Set<string>();
  const allSeasonsUsed = new Set<string>();

  for (const g of games) {
    formationCount[g.formation] = (formationCount[g.formation] ?? 0) + 1;
    for (const p of g.players) {
      clubCount[p.teamName]    = (clubCount[p.teamName]    ?? 0) + 1;
      playerCount[p.name]      = (playerCount[p.name]      ?? 0) + 1;
      seasonCount[p.season]    = (seasonCount[p.season]    ?? 0) + 1;
      allClubsUsed.add(p.teamName);
      allSeasonsUsed.add(p.season);
    }
  }

  const top = (rec: Record<string, number>) => {
    const sorted = Object.entries(rec).sort((a, b) => b[1] - a[1]);
    return sorted.length ? { name: sorted[0][0], count: sorted[0][1] } : empty;
  };

  return {
    gamesPlayed: games.length, championships, po1Finishes, po2Finishes, relegations,
    normalGames, blindGames, classicGames, seasonGames,
    bestScore, avgOverall, totalGoals,
    uniqueClubsTotal:   allClubsUsed.size,
    uniqueSeasonsTotal: allSeasonsUsed.size,
    fav: {
      formation: top(formationCount),
      club:      top(clubCount),
      player:    top(playerCount),
      season:    top(seasonCount),
    },
  };
}

// ─── Sub-componenten ──────────────────────────────────────────────────────────

function Section({ title, children, rightLabel }: { title: string; children: React.ReactNode; rightLabel?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3"
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs uppercase tracking-widest" style={{ color: 'var(--muted)', letterSpacing: '0.14em' }}>
          {title}
        </h2>
        {rightLabel && (
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', color: 'var(--gold)', letterSpacing: '0.06em' }}>
            {rightLabel}
          </span>
        )}
      </div>
      {children}
    </motion.section>
  );
}

function AchievementBadge({ icon, name, desc, color, earned }: {
  icon: string; name: string; desc: string; color: string; earned: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: earned ? 1.04 : 1.02 }}
      className="flex flex-col items-center gap-1 px-2 py-3 rounded-xl text-center group relative"
      style={{
        background: earned ? `${color}12` : 'var(--surface)',
        border: `1px solid ${earned ? `${color}55` : 'var(--border)'}`,
        cursor: 'help',
        boxShadow: earned ? `0 0 18px ${color}18` : 'none',
        opacity: earned ? 1 : 0.6,
      }}
      title={`${name} — ${desc}`}
    >
      <span style={{
        fontSize: '1.55rem',
        lineHeight: 1,
        filter: earned ? 'none' : 'grayscale(1) opacity(0.5)',
      }}>
        {icon}
      </span>
      <span
        className="truncate w-full"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.6rem',
          letterSpacing: '0.04em',
          color: earned ? color : 'var(--muted)',
          fontWeight: earned ? 600 : 400,
          lineHeight: 1.2,
        }}
      >
        {name}
      </span>
    </motion.div>
  );
}

function Tile({ icon, label, value, highlight }: { icon: string; label: string; value: string | number; highlight?: boolean }) {
  return (
    <div
      className="flex flex-col items-start gap-1.5 px-4 py-3.5 rounded-xl"
      style={{
        background: highlight ? 'rgba(212,148,10,0.06)' : 'var(--surface)',
        border: `1px solid ${highlight ? 'var(--gold-dim)' : 'var(--border)'}`,
      }}
    >
      <div className="flex items-center gap-2">
        <span style={{ fontSize: '1rem', lineHeight: 1 }}>{icon}</span>
        <span className="text-xs" style={{ color: 'var(--muted)', letterSpacing: '0.04em' }}>{label}</span>
      </div>
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.6rem',
        color: highlight ? 'var(--gold)' : 'var(--text)',
        letterSpacing: '0.02em',
        lineHeight: 1,
      }}>
        {value}
      </span>
    </div>
  );
}

function FavRow({ label, name, sub, icon }: { label: string; name: string; sub: string; icon: string }) {
  const isEmpty = name === '—';
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs mb-0.5" style={{ color: 'var(--muted)', letterSpacing: '0.04em' }}>{label}</p>
        <p className="truncate font-medium" style={{ color: isEmpty ? 'var(--muted)' : 'var(--text)' }}>{name}</p>
      </div>
      <span className="text-xs flex-shrink-0" style={{ color: 'var(--muted)', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
        {sub}
      </span>
    </div>
  );
}

function ResultPill({ icon, label, value, total, color }: { icon: string; label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div
      className="flex flex-col gap-2 px-3.5 py-3 rounded-xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between">
        <span style={{ fontSize: '1rem' }}>{icon}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color, letterSpacing: '0.02em' }}>{value}</span>
      </div>
      <div>
        <p className="text-xs mb-1.5" style={{ color: 'var(--muted)', letterSpacing: '0.04em', lineHeight: 1.3 }}>{label}</p>
        <div className="h-1 rounded-full" style={{ background: 'var(--border)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-1 rounded-full"
            style={{ background: color }}
          />
        </div>
        <p className="text-xs mt-1.5" style={{ color: 'var(--muted)', fontSize: '0.65rem' }}>{pct}%</p>
      </div>
    </div>
  );
}

function ModeBar({ label, value, total }: { label: string; value: number; other: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div
      className="flex flex-col gap-2 px-4 py-3 rounded-xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--muted)', letterSpacing: '0.04em' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'var(--gold)' }}>
          {value} <span style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>· {pct}%</span>
        </span>
      </div>
      <div className="h-1 rounded-full" style={{ background: 'var(--border)' }}>
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-1 rounded-full"
          style={{ background: 'var(--gold)' }}
        />
      </div>
    </div>
  );
}

function GameRow({ game, rank, language }: { game: PlayedGame; rank: number; language: 'nl' | 'en' }) {
  const date = new Date(game.playedAt);
  const dateStr = date.toLocaleDateString(language === 'nl' ? 'nl-BE' : 'en-GB', { day: '2-digit', month: 'short' });

  const resultColor = game.isChampion ? '#D4940A'
    : game.resultLabel.includes('PO1') || game.resultLabel.includes('Championship') ? '#C8A040'
    : game.resultLabel.includes('PO2') || game.resultLabel.includes('Europa') ? '#3a8fd1'
    : game.resultLabel.includes('Relegation') || game.resultLabel.includes('degradeerd') || game.resultLabel.includes('Relegate') ? 'var(--red)'
    : 'var(--text-2)';

  return (
    <div
      className="grid items-center gap-3 px-4 py-3"
      style={{
        gridTemplateColumns: 'auto 1fr auto',
        borderTop: rank > 1 ? '1px solid var(--border)' : 'none',
        background: rank % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
      }}
    >
      <span style={{
        fontFamily: 'var(--font-display)', fontSize: '0.75rem', color: 'var(--muted)',
        width: 16, textAlign: 'right',
      }}>
        {rank}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate" style={{ color: resultColor }}>{game.resultLabel}</span>
          <span style={{
            fontSize: '0.6rem', letterSpacing: '0.06em',
            padding: '1px 5px', borderRadius: 3,
            background: 'var(--surface-2)', color: 'var(--text-2)',
            fontFamily: 'var(--font-display)',
          }}>
            {game.formation}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>{dateStr}</span>
          <span style={{ color: 'var(--border-2)', fontSize: '0.7rem' }}>·</span>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>OVR {game.avgOverall}</span>
        </div>
      </div>
      <span style={{
        fontFamily: 'var(--font-display)', fontSize: '1.05rem',
        color: game.isChampion ? 'var(--gold)' : 'var(--text)',
        letterSpacing: '0.02em',
      }}>
        {game.totalScore.toLocaleString('nl-BE')}
      </span>
    </div>
  );
}
