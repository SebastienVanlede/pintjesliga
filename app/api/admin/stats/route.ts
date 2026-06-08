import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import type { LeaderboardEntry, DailyLeaderboardEntry, PickedPlayerSummary } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PlayerAgg {
  player_name: string;
  count: number;
  best_score: number;
  total_score: number;
  champions: number;
  blind_count: number;
  best_avg_overall_underdog: number | null; // laagste avg_overall bij is_champion=true
}

interface PickedAgg {
  key: string;       // "name · teamName · season"
  name: string;
  teamName: string;
  season: string;
  picks: number;
}

/**
 * Aggregeert admin-stats uit `scores` en `daily_scores`.
 * Doet alle berekeningen server-side om client/transfer-load te minimaliseren.
 * Limiet van 5000 rijen per tabel — meer dan genoeg voor MVP scale.
 */
export async function GET() {
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });

  const [scoresRes, dailyRes] = await Promise.all([
    supabase.from('scores').select('*').limit(5000),
    supabase.from('daily_scores').select('*').limit(5000),
  ]);

  if (scoresRes.error) return NextResponse.json({ error: scoresRes.error.message }, { status: 500 });
  if (dailyRes.error)  return NextResponse.json({ error: dailyRes.error.message  }, { status: 500 });

  const scores = (scoresRes.data ?? []) as LeaderboardEntry[];
  const daily  = (dailyRes.data  ?? []) as DailyLeaderboardEntry[];

  // ── Aggregeer per coach ───────────────────────────────────────────────────
  const playerMap = new Map<string, PlayerAgg>();
  for (const s of scores) {
    const k = s.player_name;
    const agg = playerMap.get(k) ?? {
      player_name: k, count: 0, best_score: 0, total_score: 0,
      champions: 0, blind_count: 0, best_avg_overall_underdog: null,
    };
    agg.count++;
    agg.total_score += s.score;
    if (s.score > agg.best_score) agg.best_score = s.score;
    if (s.is_champion) {
      agg.champions++;
      if (agg.best_avg_overall_underdog === null || s.avg_overall < agg.best_avg_overall_underdog) {
        agg.best_avg_overall_underdog = s.avg_overall;
      }
    }
    if (s.draft_mode === 'blind') agg.blind_count++;
    playerMap.set(k, agg);
  }
  const players = Array.from(playerMap.values());

  // ── Formatie-distributie ──────────────────────────────────────────────────
  const formationCount: Record<string, number> = {};
  for (const s of scores) formationCount[s.formation] = (formationCount[s.formation] ?? 0) + 1;
  const formationStats = Object.entries(formationCount).sort((a, b) => b[1] - a[1]);

  // ── Result-label distributie ──────────────────────────────────────────────
  const resultCount: Record<string, number> = {};
  for (const s of scores) {
    const label = s.is_champion ? '🏆 Champion' : s.result_label || 'Onbekend';
    resultCount[label] = (resultCount[label] ?? 0) + 1;
  }
  const resultStats = Object.entries(resultCount).sort((a, b) => b[1] - a[1]);

  // ── Draft-mode breakdown ──────────────────────────────────────────────────
  let classicCount = 0, blindCount = 0, unknownDraftMode = 0;
  for (const s of scores) {
    if (s.draft_mode === 'classic') classicCount++;
    else if (s.draft_mode === 'blind') blindCount++;
    else unknownDraftMode++;
  }

  // ── Underdog champions (lage avg_overall + is_champion) ───────────────────
  const underdogChampions = scores
    .filter(s => s.is_champion && s.avg_overall != null)
    .sort((a, b) => (a.avg_overall ?? 99) - (b.avg_overall ?? 99))
    .slice(0, 10)
    .map(s => ({ player_name: s.player_name, score: s.score, avg_overall: s.avg_overall, formation: s.formation }));

  // ── Meest gepickte spelers (cross-leaderboard) ────────────────────────────
  const pickedMap = new Map<string, PickedAgg>();
  for (const s of scores) {
    const picks = s.picked_players as PickedPlayerSummary[] | null | undefined;
    if (!Array.isArray(picks)) continue;
    for (const p of picks) {
      const key = `${p.name}|${p.teamName}|${p.season}`;
      const agg = pickedMap.get(key) ?? { key, name: p.name, teamName: p.teamName, season: p.season, picks: 0 };
      agg.picks++;
      pickedMap.set(key, agg);
    }
  }
  const topPickedExact = Array.from(pickedMap.values()).sort((a, b) => b.picks - a.picks).slice(0, 25);

  // Meest gepickte spelernamen (across teams/seasons)
  const pickedByName: Record<string, number> = {};
  for (const agg of pickedMap.values()) {
    pickedByName[agg.name] = (pickedByName[agg.name] ?? 0) + agg.picks;
  }
  const topPickedNames = Object.entries(pickedByName).sort((a, b) => b[1] - a[1]).slice(0, 25);

  // ── Daily: highest streak + recente activiteit ────────────────────────────
  const highestStreak = daily.reduce((max, d) => d.streak > max ? d.streak : max, 0);
  const dailyByDate: Record<string, number> = {};
  for (const d of daily) dailyByDate[d.daily_date] = (dailyByDate[d.daily_date] ?? 0) + 1;
  const dailyParticipation = Object.entries(dailyByDate).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 30);

  const dailyChampions: Record<string, number> = {};
  for (const d of daily) {
    if (d.is_champion) dailyChampions[d.player_name] = (dailyChampions[d.player_name] ?? 0) + 1;
  }
  const topDailyChampions = Object.entries(dailyChampions).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // ── Goal-heavy strategies ─────────────────────────────────────────────────
  const goalStats = scores
    .filter(s => s.goals_scored != null)
    .sort((a, b) => (b.goals_scored ?? 0) - (a.goals_scored ?? 0))
    .slice(0, 10)
    .map(s => ({ player_name: s.player_name, goals: s.goals_scored, score: s.score, formation: s.formation }));

  return NextResponse.json({
    totals: {
      scoresEntries:    scores.length,
      dailyEntries:     daily.length,
      uniquePlayers:    players.length,
      uniqueDailyPlayers: new Set(daily.map(d => d.player_name)).size,
      highestStreak,
      avgScore:         scores.length ? Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length) : 0,
      avgAvgOverall:    scores.length ? +(scores.reduce((s, x) => s + (x.avg_overall ?? 0), 0) / scores.length).toFixed(1) : 0,
      championCount:    scores.filter(s => s.is_champion).length,
      classicCount, blindCount, unknownDraftMode,
    },
    topActive:    [...players].sort((a, b) => b.count - a.count).slice(0, 15),
    topByBest:    [...players].sort((a, b) => b.best_score - a.best_score).slice(0, 15),
    topChampions: [...players].filter(p => p.champions > 0).sort((a, b) => b.champions - a.champions).slice(0, 15),
    topBlind:     [...players].filter(p => p.blind_count > 0).sort((a, b) => b.blind_count - a.blind_count).slice(0, 15),
    underdogChampions,
    goalStats,
    formationStats,
    resultStats,
    topPickedExact,
    topPickedNames,
    dailyParticipation,
    topDailyChampions,
  });
}
