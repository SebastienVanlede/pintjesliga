import {
  PickedPlayer,
  Squad,
  SimulatedSeason,
  SimulatedMatch,
  StandingRow,
} from '@/lib/types';

// ─── Team model ───────────────────────────────────────────────────────────────

export interface SimPlayer {
  name: string;
  position: string;
}

interface SimTeam {
  name: string;
  overall: number;
  players: SimPlayer[];
  attackMod?: number;  // % meer doelpunten gescoord (positief = meer)
  defenseMod?: number; // % minder doelpunten toegelaten (positief = minder)
}

// Formatiemodifiers — enkel van toepassing op het gebruikersteam
const FORMATION_MODIFIERS: Record<string, { attack: number; defense: number }> = {
  '4-2-4':   { attack:  0.15, defense: -0.15 },
  '3-4-3':   { attack:  0.12, defense: -0.10 },
  '4-3-3':   { attack:  0.08, defense: -0.05 },
  '4-3-2-1': { attack:  0.06, defense: -0.03 },
  '4-4-2':   { attack:  0.04, defense:  0.02 },
  '4-2-3-1': { attack:  0.00, defense:  0.00 },
  '3-5-2':   { attack:  0.03, defense:  0.05 },
  '4-1-4-1': { attack: -0.05, defense:  0.10 },
  '5-3-2':   { attack: -0.08, defense:  0.15 },
};

// ─── Position weights ─────────────────────────────────────────────────────────

// Scoring frequency per position — balanced zodat een topspits ~20-28 goals/seizoen haalt
const GOAL_WEIGHT: Record<string, number> = {
  ST: 14, RW: 7, LW: 7, CAM: 6, CM: 4,
  RM: 3,  LM: 3, CDM: 2, RB: 1, LB: 1, CB: 0.5, GK: 0.1,
};

// Assist frequency per position
const ASSIST_WEIGHT: Record<string, number> = {
  CAM: 14, RW: 9, LW: 9, CM: 8, ST: 6,
  RM: 6,   LM: 6, CDM: 4, RB: 3, LB: 3, CB: 1, GK: 0,
};

function weightedPick(players: SimPlayer[], weights: Record<string, number>): string {
  const totalW = players.reduce((s, p) => s + (weights[p.position] ?? 1), 0);
  if (totalW === 0) return players[Math.floor(Math.random() * players.length)].name;
  let rand = Math.random() * totalW;
  for (const p of players) {
    rand -= weights[p.position] ?? 1;
    if (rand <= 0) return p.name;
  }
  return players[players.length - 1].name;
}

// Per-match diminishing returns: na elke goal halveert de speler-gewicht binnen
// dezelfde wedstrijd. Voorkomt dat één topspits in een 5-0 wedstrijd 4 keer scoort
// en dat één speler over het seizoen onrealistische totalen (30+) haalt.
function pickGoalScorers(team: SimTeam, goals: number): string[] {
  if (!team.players.length) return [];
  const result: string[] = [];
  const matchTally: Record<string, number> = {};
  for (let i = 0; i < goals; i++) {
    const pool = team.players.map(p => ({
      player: p,
      weight: (GOAL_WEIGHT[p.position] ?? 1) * Math.pow(0.5, matchTally[p.name] ?? 0),
    }));
    const totalW = pool.reduce((s, x) => s + x.weight, 0);
    if (totalW === 0) {
      const scorer = team.players[Math.floor(Math.random() * team.players.length)].name;
      result.push(scorer);
      matchTally[scorer] = (matchTally[scorer] ?? 0) + 1;
      continue;
    }
    let rand = Math.random() * totalW;
    let scorer = team.players[team.players.length - 1].name;
    for (const { player, weight } of pool) {
      rand -= weight;
      if (rand <= 0) { scorer = player.name; break; }
    }
    result.push(scorer);
    matchTally[scorer] = (matchTally[scorer] ?? 0) + 1;
  }
  return result;
}

// ~75% of goals have a registered assist
function pickAssisters(team: SimTeam, scorers: string[]): string[] {
  return scorers
    .map(scorer => {
      if (Math.random() > 0.75) return null;
      const candidates = team.players.filter(p => p.name !== scorer);
      if (!candidates.length) return null;
      return weightedPick(candidates, ASSIST_WEIGHT);
    })
    .filter((a): a is string => a !== null);
}

// ─── Match simulation ─────────────────────────────────────────────────────────

function poissonSample(lambda: number): number {
  let k = 0;
  let p = Math.random();
  const threshold = Math.exp(-Math.max(0.1, lambda));
  while (p > threshold) { k++; p *= Math.random(); }
  return k;
}

const HOME_ADVANTAGE = 0.25;
const QUALITY_FACTOR = 0.07;

function weightedGoals(
  own: number, opp: number, isHome: boolean,
  ownAttackMod = 0, oppDefenseMod = 0
): number {
  const base     = isHome ? 1.4 + HOME_ADVANTAGE : 1.4;
  const raw      = base + (own - opp) * QUALITY_FACTOR;
  const expected = Math.max(0.2, raw * (1 + ownAttackMod) * (1 - oppDefenseMod));
  return poissonSample(expected);
}

function simMatch(home: SimTeam, away: SimTeam, round: number): SimulatedMatch {
  const homeGoals = weightedGoals(home.overall, away.overall, true,  home.attackMod ?? 0, away.defenseMod ?? 0);
  const awayGoals = weightedGoals(away.overall, home.overall, false, away.attackMod ?? 0, home.defenseMod ?? 0);

  const homeScorers   = pickGoalScorers(home, homeGoals);
  const awayScorers   = pickGoalScorers(away, awayGoals);
  const homeAssisters = pickAssisters(home, homeScorers);
  const awayAssisters = pickAssisters(away, awayScorers);

  return {
    round,
    home: home.name,
    away: away.name,
    homeGoals,
    awayGoals,
    scorers:   [...homeScorers,   ...awayScorers],
    assisters: [...homeAssisters, ...awayAssisters],
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

function circleRounds(teamNames: string[]): [string, string][][] {
  const teams    = teamNames.length % 2 === 0 ? [...teamNames] : [...teamNames, '__BYE__'];
  const m        = teams.length;
  const fixed    = teams[0];
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

function roundRobin(teams: SimTeam[], startRound: number, homeAndAway: boolean): SimulatedMatch[] {
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
  players: SimPlayer[];
  attackMod?: number;
  defenseMod?: number;
}

export function buildSimTeams(
  userPlayers: PickedPlayer[],
  opponentSquads: Squad[],
  teamName = 'Mijn Droomelftal',
  formation?: string
): SimTeamPublic[] {
  const mods = formation ? (FORMATION_MODIFIERS[formation] ?? { attack: 0, defense: 0 }) : { attack: 0, defense: 0 };
  const userTeam: SimTeamPublic = {
    name: teamName,
    overall: userPlayers.length
      ? Math.round(userPlayers.reduce((s, p) => s + p.player.overall, 0) / userPlayers.length)
      : 60,
    players:    userPlayers.map(p => ({ name: p.player.name, position: p.position })),
    attackMod:  mods.attack,
    defenseMod: mods.defense,
  };

  const opponents: SimTeamPublic[] = opponentSquads.map(sq => {
    const top11 = [...sq.players].sort((a, b) => b.overall - a.overall).slice(0, 11);
    return {
      name: sq.team,
      overall: Math.round(top11.reduce((s, p) => s + p.overall, 0) / top11.length),
      players: sq.players.map(p => ({ name: p.name, position: p.position })),
    };
  });

  return [userTeam, ...opponents];
}

/** Home + away round-robin schedule (regular season). */
export function generateFullSchedule(teamNames: string[]): [string, string][][] {
  const home = circleRounds(teamNames);
  const away = home.map(round => round.map(([h, a]) => [a, h] as [string, string]));
  return [...home, ...away];
}

/** Single round-robin schedule (playoffs). */
export function generatePlayoffSchedule(teamNames: string[]): [string, string][][] {
  return circleRounds(teamNames);
}

/** Simulate all matches in one round (manual mode). */
export function simulateRound(
  pairs: [string, string][],
  teams: SimTeamPublic[],
  startMatchNumber: number
): SimulatedMatch[] {
  return pairs.flatMap((pair, i) => {
    const home = teams.find(t => t.name === pair[0]);
    const away = teams.find(t => t.name === pair[1]);
    if (!home || !away) return [];
    return [simMatch(home as SimTeam, away as SimTeam, startMatchNumber + i)];
  });
}

/** Build standings from matches + optional starting points. */
export function computeStandings(
  teamNames: string[],
  matches: SimulatedMatch[],
  carryover: Record<string, number> = {}
): StandingRow[] {
  return buildStandings(teamNames, matches, carryover);
}

// ─── Full auto simulation ─────────────────────────────────────────────────────

export function simulateSeason(
  userPlayers: PickedPlayer[],
  opponentSquads: Squad[],
  teamName = 'Mijn Droomelftal',
  formation?: string
): SimulatedSeason {
  const squads = (opponentSquads.length + 1) % 2 !== 0
    ? opponentSquads.slice(0, -1)
    : opponentSquads;

  const mods = formation ? (FORMATION_MODIFIERS[formation] ?? { attack: 0, defense: 0 }) : { attack: 0, defense: 0 };
  const userTeam: SimTeam = {
    name: teamName,
    overall: userPlayers.length
      ? Math.round(userPlayers.reduce((s, p) => s + p.player.overall, 0) / userPlayers.length)
      : 60,
    players:    userPlayers.map(p => ({ name: p.player.name, position: p.position })),
    attackMod:  mods.attack,
    defenseMod: mods.defense,
  };

  const opponents: SimTeam[] = squads.map(sq => {
    const top11 = [...sq.players].sort((a, b) => b.overall - a.overall).slice(0, 11);
    return {
      name: sq.team,
      overall: Math.round(top11.reduce((s, p) => s + p.overall, 0) / top11.length),
      players: sq.players.map(p => ({ name: p.name, position: p.position })),
    };
  });

  const allTeams = [userTeam, ...opponents];

  const regMatches   = roundRobin(allTeams, 1, true);
  const regStandings = buildStandings(allTeams.map(t => t.name), regMatches);

  const po1Names = regStandings.slice(0, 6).map(r => r.team);
  const po2Names = regStandings.slice(6, 12).map(r => r.team);
  const releNames = regStandings.slice(12).map(r => r.team);

  const po1Carry  = Object.fromEntries(regStandings.slice(0, 6).map(r  => [r.team, Math.ceil(r.points / 2)]));
  const po2Carry  = Object.fromEntries(regStandings.slice(6, 12).map(r => [r.team, Math.ceil(r.points / 2)]));
  const releCarry = Object.fromEntries(regStandings.slice(12).map(r    => [r.team, r.points]));

  const po1Teams  = po1Names.map(n  => allTeams.find(t => t.name === n)).filter((t): t is SimTeam => t != null);
  const po2Teams  = po2Names.map(n  => allTeams.find(t => t.name === n)).filter((t): t is SimTeam => t != null);
  const releTeams = releNames.map(n => allTeams.find(t => t.name === n)).filter((t): t is SimTeam => t != null);

  const regEnd = regMatches.length;

  const po1Matches   = roundRobin(po1Teams, regEnd + 1, true);
  const po1Standings = buildStandings(po1Names, po1Matches, po1Carry);

  const po2Matches   = roundRobin(po2Teams, regEnd + po1Matches.length + 1, true);
  const po2Standings = buildStandings(po2Names, po2Matches, po2Carry);

  const relMatches   = roundRobin(releTeams, regEnd + po1Matches.length + po2Matches.length + 1, true);
  const relStandings = buildStandings(releNames, relMatches, releCarry);

  return {
    regularSeason: { name: 'Regulier Seizoen',     matches: regMatches,  standings: regStandings },
    po1:           { name: 'Championship Play-off', matches: po1Matches,  standings: po1Standings },
    po2:           { name: 'Europa Play-off',       matches: po2Matches,  standings: po2Standings },
    poRelegation:  { name: 'Relegation Play-off',   matches: relMatches,  standings: relStandings },
    champion:      po1Standings[0].team,
    europeanSpots: po1Standings.slice(0, 4).map(r => r.team),
    relegated:     relStandings.slice(2).map(r => r.team),
    directlyRelegate: '',
  };
}

// ─── Pre-season kansen ────────────────────────────────────────────────────────

export interface SeasonOdds {
  champion:    number; // % kans op kampioen
  po1:         number; // % kans op PO1 (niet-kampioen, 2e–6e)
  po2:         number; // % kans op PO2 Europa (7e–12e)
  relSurvived: number; // % kans op relegate PO maar gered (13e–14e)
  relegated:   number; // % kans op degradatie (15e–16e)
}

export function calculateOdds(
  userPlayers: PickedPlayer[],
  opponentSquads: Squad[],
  teamName: string,
  formation?: string,
  iterations = 1000
): SeasonOdds {
  let champion = 0, po1 = 0, po2 = 0, relSurvived = 0, relegated = 0;

  for (let i = 0; i < iterations; i++) {
    const result = simulateSeason(userPlayers, opponentSquads, teamName, formation);
    if (result.champion === teamName) {
      champion++;
    } else if (result.po1.standings.some(r => r.team === teamName)) {
      po1++;
    } else if (result.po2.standings.some(r => r.team === teamName)) {
      po2++;
    } else if (result.poRelegation.standings.some(r => r.team === teamName)) {
      if (result.relegated.includes(teamName)) relegated++;
      else relSurvived++;
    }
  }

  const pct = (n: number) => Math.round(n / iterations * 100);
  return {
    champion:    pct(champion),
    po1:         pct(po1),
    po2:         pct(po2),
    relSurvived: pct(relSurvived),
    relegated:   pct(relegated),
  };
}
