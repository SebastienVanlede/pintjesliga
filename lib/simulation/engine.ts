import {
  PickedPlayer,
  Squad,
  SimulatedSeason,
  SimulatedPhase,
  SimulatedMatch,
  StandingRow,
} from '@/lib/types';

// ─── Team model ──────────────────────────────────────────────────────────────

interface SimTeam {
  name: string;
  overall: number;
  scorers: string[];
}

function xiOverall(players: PickedPlayer[]): number {
  if (!players.length) return 60;
  return Math.round(players.reduce((s, p) => s + p.player.overall, 0) / players.length);
}

function squadOverall(squad: Squad): number {
  const top11 = [...squad.players].sort((a, b) => b.overall - a.overall).slice(0, 11);
  return Math.round(top11.reduce((s, p) => s + p.overall, 0) / top11.length);
}

function scorerPool(team: SimTeam): string[] {
  return team.scorers.length ? team.scorers : [team.name];
}

function pickScorers(team: SimTeam, goals: number): string[] {
  const pool = scorerPool(team);
  return Array.from({ length: goals }, () => pool[Math.floor(Math.random() * pool.length)]);
}

// ─── Match simulation ─────────────────────────────────────────────────────────

function poissonSample(lambda: number): number {
  let k = 0;
  let p = Math.random();
  const threshold = Math.exp(-Math.max(0.1, lambda));
  while (p > threshold) { k++; p *= Math.random(); }
  return k;
}

const HOME_ADVANTAGE = 0.25; // extra verwachte goals voor thuisploeg
const QUALITY_FACTOR = 0.07; // impact van overall-verschil per punt

function weightedGoals(own: number, opp: number, isHome: boolean): number {
  const base = isHome ? 1.4 + HOME_ADVANTAGE : 1.4;
  const expected = Math.max(0.2, base + (own - opp) * QUALITY_FACTOR);
  return poissonSample(expected);
}

function simMatch(home: SimTeam, away: SimTeam, round: number): SimulatedMatch {
  const homeGoals = weightedGoals(home.overall, away.overall, true);
  const awayGoals = weightedGoals(away.overall, home.overall, false);
  return {
    round,
    home: home.name,
    away: away.name,
    homeGoals,
    awayGoals,
    scorers: [...pickScorers(home, homeGoals), ...pickScorers(away, awayGoals)],
  };
}

// ─── Standings builder ────────────────────────────────────────────────────────

function buildStandings(
  teamNames: string[],
  matches: SimulatedMatch[],
  carryover: Record<string, number> = {}
): StandingRow[] {
  const rows: Record<string, StandingRow> = {};
  for (const name of teamNames) {
    rows[name] = {
      team: name,
      played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0,
      points: carryover[name] ?? 0,
      carryoverPoints: carryover[name],
    };
  }
  for (const m of matches) {
    const h = rows[m.home];
    const a = rows[m.away];
    if (!h || !a) continue;
    h.played++; h.goalsFor += m.homeGoals; h.goalsAgainst += m.awayGoals;
    a.played++; a.goalsFor += m.awayGoals; a.goalsAgainst += m.homeGoals;
    if (m.homeGoals > m.awayGoals)      { h.won++; h.points += 3; a.lost++; }
    else if (m.homeGoals < m.awayGoals) { a.won++; a.points += 3; h.lost++; }
    else                                { h.drawn++; h.points++; a.drawn++; a.points++; }
  }
  return Object.values(rows).sort(
    (a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)
  );
}

// ─── Round-robin generator ────────────────────────────────────────────────────

function roundRobin(
  teams: SimTeam[],
  startRound: number,
  homeAndAway: boolean
): SimulatedMatch[] {
  const matches: SimulatedMatch[] = [];
  let r = startRound;
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matches.push(simMatch(teams[i], teams[j], r++));
      if (homeAndAway) matches.push(simMatch(teams[j], teams[i], r++));
    }
  }
  return matches;
}

// ─── Public helpers for manual mode ──────────────────────────────────────────

export interface SimTeamPublic {
  name: string;
  overall: number;
  scorers: string[];
}

export function buildSimTeams(userPlayers: PickedPlayer[], opponentSquads: Squad[], teamName = 'Mijn Droomelftal'): SimTeamPublic[] {
  const userTeam: SimTeamPublic = {
    name: teamName,
    overall: xiOverall(userPlayers),
    scorers: userPlayers
      .filter(p => ['ST', 'RW', 'LW', 'CAM', 'CM'].includes(p.position))
      .map(p => p.player.name),
  };
  if (!userTeam.scorers.length) userTeam.scorers = userPlayers.map(p => p.player.name);

  const opponents: SimTeamPublic[] = opponentSquads.map(sq => ({
    name: sq.team,
    overall: squadOverall(sq),
    scorers: sq.players
      .filter(p => ['ST', 'RW', 'LW', 'CAM', 'CM'].includes(p.position))
      .map(p => p.name),
  }));

  return [userTeam, ...opponents];
}

// Circle method — returns one half of fixtures (home only).
// Adds a ghost 'BYE' team when count is odd so every round has equal matches.
function circleRounds(teamNames: string[]): [string, string][][] {
  const teams = teamNames.length % 2 === 0 ? [...teamNames] : [...teamNames, '__BYE__'];
  const m = teams.length;
  const fixed = teams[0];
  const rotating = teams.slice(1);
  const rounds: [string, string][][] = [];

  for (let r = 0; r < m - 1; r++) {
    const current = [fixed, ...rotating];
    const pairs: [string, string][] = [];
    for (let i = 0; i < m / 2; i++) {
      const home = current[i];
      const away = current[m - 1 - i];
      if (home !== '__BYE__' && away !== '__BYE__') pairs.push([home, away]);
    }
    rounds.push(pairs);
    rotating.unshift(rotating.pop()!);
  }
  return rounds;
}

/** Home + away round-robin schedule (regular season). */
export function generateFullSchedule(teamNames: string[]): [string, string][][] {
  const home = circleRounds(teamNames);
  const away = home.map(round => round.map(([h, a]) => [a, h] as [string, string]));
  return [...home, ...away];
}

/** Single round-robin schedule (playoffs — each pair plays once). */
export function generatePlayoffSchedule(teamNames: string[]): [string, string][][] {
  return circleRounds(teamNames);
}

/** Simulate all matches in one round. */
export function simulateRound(
  pairs: [string, string][],
  teams: SimTeamPublic[],
  startMatchNumber: number
): SimulatedMatch[] {
  return pairs.flatMap((pair, i) => {
    const home = teams.find(t => t.name === pair[0]);
    const away = teams.find(t => t.name === pair[1]);
    if (!home || !away) return []; // skip pairs with unknown teams
    return [simMatch(home as SimTeam, away as SimTeam, startMatchNumber + i)];
  });
}

/** Build standings from a list of matches + optional starting points. */
export function computeStandings(
  teamNames: string[],
  matches: SimulatedMatch[],
  carryover: Record<string, number> = {}
): StandingRow[] {
  return buildStandings(teamNames, matches, carryover);
}

// ─── Full season simulation ───────────────────────────────────────────────────

export function simulateSeason(
  userPlayers: PickedPlayer[],
  opponentSquads: Squad[],
  teamName = 'Mijn Droomelftal'
): SimulatedSeason {
  // Ensure 16 teams total (even) → authentic Belgian 30-matchday format, no byes
  // Drop the last squad when needed (16 squads + JX = 17 → odd, so drop one)
  const squads = (opponentSquads.length + 1) % 2 !== 0
    ? opponentSquads.slice(0, -1)
    : opponentSquads;

  // Build team pool
  const userTeam: SimTeam = {
    name: teamName,
    overall: xiOverall(userPlayers),
    scorers: userPlayers
      .filter(p => ['ST', 'RW', 'LW', 'CAM', 'CM'].includes(p.position))
      .map(p => p.player.name),
  };
  if (!userTeam.scorers.length) userTeam.scorers = userPlayers.map(p => p.player.name);

  const opponents: SimTeam[] = squads.map(sq => ({
    name: sq.team,
    overall: squadOverall(sq),
    scorers: sq.players
      .filter(p => ['ST', 'RW', 'LW', 'CAM', 'CM'].includes(p.position))
      .map(p => p.name),
  }));

  const allTeams = [userTeam, ...opponents]; // always 16 teams (even)

  // ── Phase 1: Regular season (home + away, 30 matchdays) ───────────────────
  const regMatches = roundRobin(allTeams, 1, true);
  const regStandings = buildStandings(allTeams.map(t => t.name), regMatches);

  // ── Split into playoff groups ──────────────────────────────────────────────
  // 16 teams: top 6 → PO1, 7-12 → PO2, 13-16 → Relegation PO, no direct relegation
  const po1Names = regStandings.slice(0, 6).map(r => r.team);
  const po2Names = regStandings.slice(6, 12).map(r => r.team);
  const releNames = regStandings.slice(12).map(r => r.team); // 4 teams

  const po1Carry  = Object.fromEntries(regStandings.slice(0, 6).map(r  => [r.team, Math.ceil(r.points / 2)]));
  const po2Carry  = Object.fromEntries(regStandings.slice(6, 12).map(r => [r.team, Math.ceil(r.points / 2)]));
  const releCarry = Object.fromEntries(regStandings.slice(12).map(r    => [r.team, r.points]));

  const po1Teams  = po1Names.map(n => allTeams.find(t => t.name === n)).filter((t): t is SimTeam => t != null);
  const po2Teams  = po2Names.map(n => allTeams.find(t => t.name === n)).filter((t): t is SimTeam => t != null);
  const releTeams = releNames.map(n => allTeams.find(t => t.name === n)).filter((t): t is SimTeam => t != null);

  const regEnd = regMatches.length;

  // ── Phase 2: Play-off 1 — Championship (top 6, half points rounded up) ────
  const po1Matches   = roundRobin(po1Teams, regEnd + 1, true);
  const po1Standings = buildStandings(po1Names, po1Matches, po1Carry);

  // ── Phase 3: Play-off 2 — Europe (7-12, half points rounded up) ───────────
  const po2Matches   = roundRobin(po2Teams, regEnd + po1Matches.length + 1, false);
  const po2Standings = buildStandings(po2Names, po2Matches, po2Carry);

  // ── Phase 4: Relegation Play-off (13-16, full regular season points) ───────
  const relMatches   = roundRobin(releTeams, regEnd + po1Matches.length + po2Matches.length + 1, false);
  const relStandings = buildStandings(releNames, relMatches, releCarry);

  // ── Outcomes ───────────────────────────────────────────────────────────────
  const champion      = po1Standings[0].team;
  const europeanSpots = po1Standings.slice(0, 4).map(r => r.team);
  const relegated     = relStandings.slice(2).map(r => r.team); // bottom 2 of relegation PO

  return {
    regularSeason:  { name: 'Regulier Seizoen',     matches: regMatches,  standings: regStandings },
    po1:            { name: 'Championship Play-off', matches: po1Matches,  standings: po1Standings },
    po2:            { name: 'Europa Play-off',       matches: po2Matches,  standings: po2Standings },
    poRelegation:   { name: 'Relegation Play-off',  matches: relMatches,  standings: relStandings },
    champion,
    europeanSpots,
    relegated,
    directlyRelegate: '', // no direct relegation with 16 teams
  };
}
