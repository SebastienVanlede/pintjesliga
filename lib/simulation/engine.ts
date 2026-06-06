import { PickedPlayer, Squad, SimulatedSeason, SimulatedMatch, StandingRow } from '@/lib/types';

interface SimTeam {
  name: string;
  overall: number;
  scorers: string[];
}

function xiOverall(players: PickedPlayer[]): number {
  if (players.length === 0) return 60;
  return Math.round(players.reduce((s, p) => s + p.player.overall, 0) / players.length);
}

function squadOverall(squad: Squad): number {
  const starters = [...squad.players].sort((a, b) => b.overall - a.overall).slice(0, 11);
  return Math.round(starters.reduce((s, p) => s + p.overall, 0) / starters.length);
}

function weightedGoals(ownOverall: number, oppOverall: number): number {
  // Base: 1.4 expected goals; each point of overall difference shifts +/- 0.04
  const diff = ownOverall - oppOverall;
  const expected = Math.max(0.2, 1.4 + diff * 0.04);
  // Poisson approximation via sum of uniform randoms
  return poissonSample(expected);
}

function poissonSample(lambda: number): number {
  let k = 0;
  let p = Math.random();
  const threshold = Math.exp(-lambda);
  while (p > threshold) {
    k++;
    p *= Math.random();
  }
  return k;
}

function pickScorers(team: SimTeam, goals: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < goals; i++) {
    result.push(team.scorers[Math.floor(Math.random() * team.scorers.length)]);
  }
  return result;
}

function buildStandings(teams: SimTeam[], matches: SimulatedMatch[]): StandingRow[] {
  const rows: Record<string, StandingRow> = {};
  for (const t of teams) {
    rows[t.name] = { team: t.name, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
  }
  for (const m of matches) {
    const h = rows[m.home];
    const a = rows[m.away];
    h.played++; h.goalsFor += m.homeGoals; h.goalsAgainst += m.awayGoals;
    a.played++; a.goalsFor += m.awayGoals; a.goalsAgainst += m.homeGoals;
    if (m.homeGoals > m.awayGoals) { h.won++; h.points += 3; a.lost++; }
    else if (m.homeGoals < m.awayGoals) { a.won++; a.points += 3; h.lost++; }
    else { h.drawn++; h.points++; a.drawn++; a.points++; }
  }
  return Object.values(rows).sort((a, b) =>
    b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)
  );
}

export function simulateSeason(
  userPlayers: PickedPlayer[],
  opponentSquads: Squad[]
): SimulatedSeason {
  const userTeam: SimTeam = {
    name: 'Jouw XI',
    overall: xiOverall(userPlayers),
    scorers: userPlayers
      .filter((p) => ['ST', 'RW', 'LW', 'CAM', 'CM'].includes(p.position))
      .map((p) => p.player.name),
  };
  if (userTeam.scorers.length === 0) {
    userTeam.scorers = userPlayers.map((p) => p.player.name);
  }

  const opponents: SimTeam[] = opponentSquads.map((sq) => ({
    name: sq.team,
    overall: squadOverall(sq),
    scorers: sq.players
      .filter((p) => ['ST', 'RW', 'LW', 'CAM', 'CM'].includes(p.position))
      .map((p) => p.name),
  }));

  const teams = [userTeam, ...opponents];
  const matches: SimulatedMatch[] = [];
  let round = 1;

  // Full round-robin (home + away)
  for (let i = 0; i < teams.length; i++) {
    for (let j = 0; j < teams.length; j++) {
      if (i === j) continue;
      const home = teams[i];
      const away = teams[j];
      const homeGoals = weightedGoals(home.overall, away.overall);
      const awayGoals = weightedGoals(away.overall, home.overall);
      matches.push({
        round,
        home: home.name,
        away: away.name,
        homeGoals,
        awayGoals,
        scorers: [
          ...pickScorers(home, homeGoals),
          ...pickScorers(away, awayGoals),
        ],
      });
      round++;
    }
  }

  return {
    matches,
    standings: buildStandings(teams, matches),
  };
}
