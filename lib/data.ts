import teamsJson from '@/data/teams.json';
import seasonsJson from '@/data/seasons.json';
import { Team, Squad } from './types';

export const teams: Team[] = teamsJson as Team[];
export const seasons = seasonsJson;

// All squad files — add new entries here when a squad file is created
const squadModules: Record<string, () => Promise<Squad>> = {
  'club-brugge-2002-03': () => import('@/data/squads/club-brugge-2002.json').then(m => m.default as Squad),
  'anderlecht-2003-04':  () => import('@/data/squads/anderlecht-2003.json').then(m => m.default as Squad),
  'standard-2008-09':   () => import('@/data/squads/standard-2008.json').then(m => m.default as Squad),
  'genk-2010-11':        () => import('@/data/squads/genk-2010.json').then(m => m.default as Squad),
  'gent-2014-15':        () => import('@/data/squads/gent-2014.json').then(m => m.default as Squad),
};

// Returns all (teamId, season) pairs that have squad data available
export function getAvailableSquadKeys(): { teamId: string; season: string }[] {
  return Object.keys(squadModules).map((key) => {
    const lastDash = key.lastIndexOf('-', key.lastIndexOf('-') - 1);
    const teamId = key.slice(0, lastDash);
    const season = key.slice(lastDash + 1);
    return { teamId, season };
  });
}

export function getTeamById(id: string): Team | undefined {
  return teams.find((t) => t.id === id);
}

// Derives available (team, season) rolls as flat objects
export function getAvailableRolls(): { team: Team; season: string }[] {
  return Object.keys(squadModules).map((key) => {
    // key format: "club-brugge-2002-03" — season is last 7 chars "YYYY-YY"
    const season = key.slice(-7);
    const teamId = key.slice(0, -8); // strip "-YYYY-YY"
    const team = getTeamById(teamId)!;
    return { team, season };
  });
}

export async function loadSquad(teamId: string, season: string): Promise<Squad | null> {
  const key = `${teamId}-${season}`;
  const loader = squadModules[key];
  if (!loader) return null;
  return loader();
}
