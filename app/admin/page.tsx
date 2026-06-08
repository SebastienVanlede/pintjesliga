'use client';
// Verborgen admin dashboard — geen nav-link, alleen bereikbaar via /admin URL.
// Toont read-only statistieken over de squad-dataset en de Supabase leaderboards.
import { useEffect, useMemo, useState } from 'react';
import {
  teams, seasons, getAvailableRolls, loadSquad,
  SQUAD_COUNT, SEASON_COUNT, SEASON_RANGE,
} from '@/lib/data';
import { Squad, Player } from '@/lib/types';

interface PlayerEntry extends Player {
  teamName: string;
  teamId: string;
  season: string;
}

interface PlayerAgg {
  player_name: string;
  count: number;
  best_score: number;
  total_score: number;
  champions: number;
  blind_count: number;
  best_avg_overall_underdog: number | null;
}

interface PickedAgg {
  key: string; name: string; teamName: string; season: string; picks: number;
}

interface AdminStats {
  totals: {
    scoresEntries: number; dailyEntries: number;
    uniquePlayers: number; uniqueDailyPlayers: number;
    highestStreak: number; avgScore: number; avgAvgOverall: number;
    championCount: number;
    classicCount: number; blindCount: number; unknownDraftMode: number;
  };
  topActive: PlayerAgg[];
  topByBest: PlayerAgg[];
  topChampions: PlayerAgg[];
  topBlind: PlayerAgg[];
  underdogChampions: { player_name: string; score: number; avg_overall: number; formation: string }[];
  goalStats: { player_name: string; goals: number; score: number; formation: string }[];
  formationStats: [string, number][];
  resultStats: [string, number][];
  topPickedExact: PickedAgg[];
  topPickedNames: [string, number][];
  dailyParticipation: [string, number][];
  topDailyChampions: [string, number][];
}

const fmtMV = (v: number) => v >= 1_000_000 ? `€${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `€${(v / 1_000).toFixed(0)}K` : `€${v}`;

export default function AdminPage() {
  const [squads, setSquads] = useState<Squad[] | null>(null);
  const [admin, setAdmin] = useState<AdminStats | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  useEffect(() => {
    const rolls = getAvailableRolls();
    Promise.all(rolls.map(r => loadSquad(r.team.id, r.season)))
      .then(loaded => setSquads(loaded.filter(Boolean) as Squad[]));
  }, []);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(async r => {
        if (!r.ok) {
          const msg = await r.text().catch(() => 'Onbekende fout');
          throw new Error(`API ${r.status}: ${msg.slice(0, 100)}`);
        }
        return r.json() as Promise<AdminStats>;
      })
      .then(setAdmin)
      .catch(err => setAdminError(err.message || 'Kon admin-stats niet laden'));
  }, []);

  const stats = useMemo(() => {
    if (!squads) return null;
    const allPlayers: PlayerEntry[] = squads.flatMap(s =>
      s.players.map(p => ({ ...p, teamName: s.team, teamId: s.teamId, season: s.season })),
    );

    // Per-seizoen
    const perSeason = seasons.map(s => {
      const seasonSquads = squads.filter(sq => sq.season === s.id);
      if (seasonSquads.length === 0) return null;
      const players = seasonSquads.flatMap(sq => sq.players);
      const totalGoals = players.reduce((sum, p) => sum + p.goals, 0);
      const topScorer = [...players].sort((a, b) => b.goals - a.goals)[0];
      return {
        season: s.id,
        year: s.year,
        champion: s.champion,
        teams: seasonSquads.length,
        players: players.length,
        avgOvr: (players.reduce((sum, p) => sum + p.overall, 0) / players.length).toFixed(1),
        totalGoals,
        topScorerName: topScorer ? topScorer.name : '—',
        topScorerGoals: topScorer ? topScorer.goals : 0,
      };
    }).filter(Boolean) as SeasonRow[];

    // Top by overall
    const topOvr = [...allPlayers].sort((a, b) => b.overall - a.overall).slice(0, 15);

    // Top by market value
    const topMV = [...allPlayers].sort((a, b) => b.marketValue - a.marketValue).slice(0, 15);

    // Top scorers (goals)
    const topScorers = [...allPlayers].sort((a, b) => b.goals - a.goals).slice(0, 15);

    // Nationaliteits-breakdown
    const natCount: Record<string, number> = {};
    for (const p of allPlayers) natCount[p.nationality] = (natCount[p.nationality] ?? 0) + 1;
    const topNats = Object.entries(natCount).sort((a, b) => b[1] - a[1]);

    // Posities
    const posCount: Record<string, number> = {};
    for (const p of allPlayers) posCount[p.position] = (posCount[p.position] ?? 0) + 1;
    const positions = Object.entries(posCount).sort((a, b) => b[1] - a[1]);

    // Award winners (unieke spelers)
    const awardMap = new Map<string, string[]>();
    for (const p of allPlayers) {
      if (p.awards && p.awards.length > 0 && !awardMap.has(p.name)) {
        awardMap.set(p.name, p.awards);
      }
    }
    const awardWinners = Array.from(awardMap.entries()).sort();

    // Spelers met meeste seizoenen
    const nameSeasons: Record<string, Set<string>> = {};
    for (const p of allPlayers) {
      (nameSeasons[p.name] ??= new Set()).add(p.season);
    }
    const mostSeasons = Object.entries(nameSeasons)
      .map(([name, set]) => ({ name, count: set.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    return {
      totalPlayers: allPlayers.length,
      uniqueNames: new Set(allPlayers.map(p => p.name)).size,
      avgOvr: (allPlayers.reduce((s, p) => s + p.overall, 0) / allPlayers.length).toFixed(1),
      avgMV: allPlayers.reduce((s, p) => s + p.marketValue, 0) / allPlayers.length,
      perSeason: perSeason as SeasonRow[],
      topOvr,
      topMV,
      topScorers,
      topNats,
      positions,
      awardWinners,
      mostSeasons,
    };
  }, [squads]);

  const teamCoverage = useMemo(() => {
    if (!squads) return null;
    const teamSeasonMap: Record<string, Set<string>> = {};
    for (const sq of squads) {
      (teamSeasonMap[sq.teamId] ??= new Set()).add(sq.season);
    }
    return teams.map(t => {
      const declared = new Set(t.seasons);
      const have = teamSeasonMap[t.id] ?? new Set();
      const missing = [...declared].filter(s => !have.has(s)).sort();
      return {
        id: t.id, name: t.name,
        declared: declared.size,
        haveSquadFor: have.size,
        missing,
      };
    }).filter(t => t.declared > 0).sort((a, b) => b.haveSquadFor - a.haveSquadFor);
  }, [squads]);

  return (
    <div className="min-h-screen px-6 py-10 lg:px-16 lg:py-14" style={{ color: 'var(--text)' }}>
      <header className="mb-10">
        <span className="label-xs">Pintjesliga · interne stats</span>
        <h1 className="mt-2" style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          letterSpacing: '0.04em', lineHeight: 0.95, color: 'var(--gold)',
        }}>ADMIN DASHBOARD</h1>
        <p className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>
          Verborgen URL — geen nav-link. Read-only overzicht van de squad-database en leaderboards.
        </p>
      </header>

      {/* ── Overview ─────────────────────────────────────────────────────── */}
      <Section title="Overzicht">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Seizoenen" value={SEASON_COUNT} />
          <Stat label="Squad-bestanden" value={SQUAD_COUNT} />
          <Stat label="Periode" value={SEASON_RANGE} />
          <Stat label="Teams in DB" value={teams.length} />
          {stats && (
            <>
              <Stat label="Totaal spelerentries" value={stats.totalPlayers} />
              <Stat label="Unieke spelernamen" value={stats.uniqueNames} />
              <Stat label="Gem. OVR" value={stats.avgOvr} />
              <Stat label="Gem. marktwaarde" value={fmtMV(stats.avgMV)} />
            </>
          )}
        </div>
      </Section>

      {/* ── User stats (Supabase) ────────────────────────────────────────── */}
      <Section title="Coach-statistieken (Supabase)">
        {adminError && (
          <p className="text-sm mb-3" style={{ color: 'var(--red, #C41E3A)' }}>
            ⚠ {adminError}
          </p>
        )}
        {!admin && !adminError && <Loading />}
        {admin && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
              <Stat label="All-time entries" value={admin.totals.scoresEntries} />
              <Stat label="Daily entries" value={admin.totals.dailyEntries} />
              <Stat label="Unieke coaches" value={admin.totals.uniquePlayers} />
              <Stat label="Daily-coaches" value={admin.totals.uniqueDailyPlayers} />
              <Stat label="Champion-pots" value={admin.totals.championCount} />
              <Stat label="Hoogste streak" value={admin.totals.highestStreak} />
              <Stat label="Gem. score" value={admin.totals.avgScore.toLocaleString('nl-BE')} />
              <Stat label="Gem. avg-OVR" value={admin.totals.avgAvgOverall} />
              <Stat label="Classic plays" value={admin.totals.classicCount} />
              <Stat label="Blind plays" value={admin.totals.blindCount} />
              <Stat label="Unknown mode" value={admin.totals.unknownDraftMode} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <CoachList title="Top 15 actiefste coaches" rows={admin.topActive} valueFn={p => `${p.count} games`} />
              <CoachList title="Top 15 hoogste score" rows={admin.topByBest} valueFn={p => p.best_score.toLocaleString('nl-BE')} />
              <CoachList title="Vaakst kampioen" rows={admin.topChampions} valueFn={p => `${p.champions}×`} />
              <CoachList title="Blind mode coaches" rows={admin.topBlind} valueFn={p => `${p.blind_count}×`} />
            </div>

            {admin.underdogChampions.length > 0 && (
              <div className="mb-4">
                <span className="label-xs">Underdog champions (laagste gem. OVR met titel)</span>
                <ul className="mt-2 text-sm flex flex-col gap-1">
                  {admin.underdogChampions.map((u, i) => (
                    <li key={i} className="flex justify-between gap-3" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                      <span>{i + 1}. {u.player_name} <span style={{ color: 'var(--muted)' }}>· {u.formation} · avg {u.avg_overall}</span></span>
                      <span style={{ color: 'var(--gold)' }}>{u.score.toLocaleString('nl-BE')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {admin.goalStats.length > 0 && (
              <div className="mb-4">
                <span className="label-xs">Goal-heavy strategieën (meeste goals dat seizoen)</span>
                <ul className="mt-2 text-sm flex flex-col gap-1">
                  {admin.goalStats.map((g, i) => (
                    <li key={i} className="flex justify-between gap-3" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                      <span>{i + 1}. {g.player_name} <span style={{ color: 'var(--muted)' }}>· {g.formation}</span></span>
                      <span style={{ color: 'var(--gold)' }}>{g.goals}G · {g.score.toLocaleString('nl-BE')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <span className="label-xs">Formaties (% van alle games)</span>
                <ul className="mt-2 text-sm flex flex-col gap-1">
                  {admin.formationStats.map(([f, c]) => (
                    <li key={f} className="flex justify-between gap-3" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                      <span style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>{f}</span>
                      <span style={{ color: 'var(--gold)' }}>{c} · {((c / admin.totals.scoresEntries) * 100).toFixed(0)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="label-xs">Resultaten</span>
                <ul className="mt-2 text-sm flex flex-col gap-1">
                  {admin.resultStats.map(([r, c]) => (
                    <li key={r} className="flex justify-between gap-3" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                      <span>{r}</span>
                      <span style={{ color: 'var(--gold)' }}>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {admin.topPickedNames.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div>
                  <span className="label-xs">Meest gepickte spelers (alle teams/seizoenen samen)</span>
                  <ul className="mt-2 text-sm flex flex-col gap-1">
                    {admin.topPickedNames.map(([name, count], i) => (
                      <li key={name} className="flex justify-between gap-3" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                        <span>{i + 1}. {name}</span>
                        <span style={{ color: 'var(--gold)' }}>{count}×</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="label-xs">Meest gepickte exacte cards (speler + team + seizoen)</span>
                  <ul className="mt-2 text-sm flex flex-col gap-1">
                    {admin.topPickedExact.map((p, i) => (
                      <li key={p.key} className="flex justify-between gap-3" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                        <span className="truncate">{i + 1}. {p.name} <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>· {p.teamName} {p.season}</span></span>
                        <span style={{ color: 'var(--gold)' }}>{p.picks}×</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="label-xs">Daily — top kampioenen (cumulatief)</span>
                <ul className="mt-2 text-sm flex flex-col gap-1">
                  {admin.topDailyChampions.map(([name, count], i) => (
                    <li key={name} className="flex justify-between gap-3" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                      <span>{i + 1}. {name}</span>
                      <span style={{ color: 'var(--gold)' }}>{count}×</span>
                    </li>
                  ))}
                  {admin.topDailyChampions.length === 0 && <li style={{ color: 'var(--muted)' }}>Nog niemand kampioen op daily</li>}
                </ul>
              </div>
              <div>
                <span className="label-xs">Daily — deelname per dag (laatste 30 dagen)</span>
                <ul className="mt-2 text-sm flex flex-col gap-1">
                  {admin.dailyParticipation.map(([date, count]) => (
                    <li key={date} className="flex justify-between gap-3" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                      <span>{date}</span>
                      <span style={{ color: 'var(--gold)' }}>{count}</span>
                    </li>
                  ))}
                  {admin.dailyParticipation.length === 0 && <li style={{ color: 'var(--muted)' }}>Geen daily entries</li>}
                </ul>
              </div>
            </div>
          </>
        )}
      </Section>

      {!stats ? <Loading /> : (
        <>
          {/* ── Per seizoen ──────────────────────────────────────────────── */}
          <Section title="Per seizoen">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: 'var(--muted)', fontSize: '0.75rem', letterSpacing: '0.06em' }}>
                    <Th>SEIZOEN</Th><Th>KAMPIOEN</Th><Th align="right">TEAMS</Th>
                    <Th align="right">SPELERS</Th><Th align="right">GEM. OVR</Th>
                    <Th align="right">GOALS</Th><Th>TOP SCORER</Th>
                  </tr>
                </thead>
                <tbody>
                  {stats.perSeason.map(s => (
                    <tr key={s.season} style={{ borderTop: '1px solid var(--border)' }}>
                      <Td>{s.season}</Td>
                      <Td>{s.champion}</Td>
                      <Td align="right">{s.teams}</Td>
                      <Td align="right">{s.players}</Td>
                      <Td align="right">{s.avgOvr}</Td>
                      <Td align="right">{s.totalGoals}</Td>
                      <Td>{s.topScorerName} <span style={{ color: 'var(--muted)' }}>({s.topScorerGoals})</span></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* ── Top spelers ──────────────────────────────────────────────── */}
          <Section title="Top spelers">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <PlayerList title="Top 15 OVR" players={stats.topOvr} format={p => `OVR ${p.overall}`} />
              <PlayerList title="Top 15 marktwaarde" players={stats.topMV} format={p => fmtMV(p.marketValue)} />
              <PlayerList title="Top 15 goals (1 seizoen)" players={stats.topScorers} format={p => `${p.goals}G ${p.assists}A`} />
            </div>
          </Section>

          {/* ── Spelers met meeste seizoenen ─────────────────────────────── */}
          <Section title="Spelers met meeste seizoenen">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {stats.mostSeasons.map(({ name, count }, i) => (
                <div key={name} className="flex justify-between gap-3" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                  <span>{i + 1}. {name}</span>
                  <span style={{ color: 'var(--gold)' }}>{count} seizoen{count > 1 ? 'en' : ''}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Award winners ────────────────────────────────────────────── */}
          <Section title={`Award winners (${stats.awardWinners.length})`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {stats.awardWinners.map(([name, awards]) => (
                <div key={name} className="flex flex-col gap-1" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                  <span>{name}</span>
                  <span className="text-xs" style={{ color: 'var(--gold-dim)' }}>{awards.join(' · ')}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Nationaliteiten ──────────────────────────────────────────── */}
          <Section title={`Nationaliteiten (${stats.topNats.length})`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-sm">
              {stats.topNats.map(([nat, count]) => (
                <div key={nat} className="flex justify-between gap-2 px-3 py-2 rounded"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <span>{nat}</span>
                  <span style={{ color: 'var(--gold)' }}>{count}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Posities ─────────────────────────────────────────────────── */}
          <Section title="Posities">
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2 text-sm">
              {stats.positions.map(([pos, count]) => (
                <div key={pos} className="flex justify-between gap-2 px-3 py-2 rounded"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <span style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>{pos}</span>
                  <span style={{ color: 'var(--gold)' }}>{count}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Team coverage ────────────────────────────────────────────── */}
          {teamCoverage && (
            <Section title="Team coverage (squad-bestanden vs. declared seasons)">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: 'var(--muted)', fontSize: '0.75rem', letterSpacing: '0.06em' }}>
                      <Th>TEAM</Th><Th align="right">DECLARED</Th><Th align="right">HAVE</Th><Th>MISSING</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamCoverage.map(t => (
                      <tr key={t.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <Td>{t.name}</Td>
                        <Td align="right">{t.declared}</Td>
                        <Td align="right" color={t.haveSquadFor === t.declared ? 'var(--gold)' : t.haveSquadFor === 0 ? 'var(--red)' : 'var(--text-2)'}>{t.haveSquadFor}</Td>
                        <Td>
                          {t.missing.length === 0 ? <span style={{ color: 'var(--gold-dim)' }}>—</span> : (
                            <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{t.missing.slice(0, 8).join(', ')}{t.missing.length > 8 ? ` +${t.missing.length - 8}` : ''}</span>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

interface SeasonRow {
  season: string;
  year: number;
  champion: string;
  teams: number;
  players: number;
  avgOvr: string;
  totalGoals: number;
  topScorerName: string;
  topScorerGoals: number;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-4 mb-4">
        <span className="label-xs">{title}</span>
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg px-4 py-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <span className="label-xs block mb-1">{label}</span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text)', letterSpacing: '0.04em' }}>{value}</span>
    </div>
  );
}

function CoachList({ title, rows, valueFn }: { title: string; rows: PlayerAgg[]; valueFn: (p: PlayerAgg) => string }) {
  return (
    <div>
      <span className="label-xs">{title}</span>
      <ul className="mt-2 text-sm flex flex-col gap-1">
        {rows.map((p, i) => (
          <li key={p.player_name + i} className="flex justify-between gap-3" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
            <span><span style={{ color: 'var(--muted)' }}>{i + 1}.</span> {p.player_name}</span>
            <span style={{ color: 'var(--gold)', whiteSpace: 'nowrap' }}>{valueFn(p)}</span>
          </li>
        ))}
        {rows.length === 0 && <li style={{ color: 'var(--muted)' }}>Geen data</li>}
      </ul>
    </div>
  );
}

function PlayerList({ title, players, format }: { title: string; players: PlayerEntry[]; format: (p: PlayerEntry) => string }) {
  return (
    <div>
      <span className="label-xs">{title}</span>
      <ul className="mt-2 text-sm flex flex-col gap-1">
        {players.map((p, i) => (
          <li key={`${p.id}-${p.season}-${i}`} className="flex justify-between gap-3" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
            <span className="truncate">
              <span style={{ color: 'var(--muted)' }}>{i + 1}.</span> {p.name}
              <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}> · {p.teamName} {p.season}</span>
            </span>
            <span style={{ color: 'var(--gold)', whiteSpace: 'nowrap' }}>{format(p)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <th style={{ textAlign: align, padding: '6px 10px', fontWeight: 'normal' }}>{children}</th>;
}

function Td({ children, align = 'left', color }: { children: React.ReactNode; align?: 'left' | 'right'; color?: string }) {
  return <td style={{ textAlign: align, padding: '6px 10px', color: color ?? 'var(--text)' }}>{children}</td>;
}

function Loading() {
  return <p className="text-sm" style={{ color: 'var(--muted)' }}>Bezig met laden van squad-data…</p>;
}
