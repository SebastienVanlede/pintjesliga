import teamsJson from '@/data/teams.json';
import seasonsJson from '@/data/seasons.json';
import { Team, Squad } from './types';

export const teams: Team[] = teamsJson as Team[];
export const seasons = seasonsJson;

// All squad files — add new entries here when a squad file is created
const squadModules: Record<string, () => Promise<Squad>> = {
  // 2024-25 season (current)
  'club-brugge-2024-25':  () => import('@/data/squads/club-brugge-2024.json').then(m => m.default as Squad),
  'genk-2024-25':         () => import('@/data/squads/genk-2024.json').then(m => m.default as Squad),
  'union-2024-25':        () => import('@/data/squads/union-2024.json').then(m => m.default as Squad),
  'anderlecht-2024-25':   () => import('@/data/squads/anderlecht-2024.json').then(m => m.default as Squad),
  'antwerp-2024-25':      () => import('@/data/squads/antwerp-2024.json').then(m => m.default as Squad),
  'gent-2024-25':         () => import('@/data/squads/gent-2024.json').then(m => m.default as Squad),
  'standard-2024-25':     () => import('@/data/squads/standard-2024.json').then(m => m.default as Squad),
  'mechelen-2024-25':     () => import('@/data/squads/mechelen-2024.json').then(m => m.default as Squad),
  'westerlo-2024-25':     () => import('@/data/squads/westerlo-2024.json').then(m => m.default as Squad),
  'charleroi-2024-25':    () => import('@/data/squads/charleroi-2024.json').then(m => m.default as Squad),
  'ohl-2024-25':          () => import('@/data/squads/ohl-2024.json').then(m => m.default as Squad),
  'dender-2024-25':       () => import('@/data/squads/dender-2024.json').then(m => m.default as Squad),
  'cercle-brugge-2024-25':() => import('@/data/squads/cercle-brugge-2024.json').then(m => m.default as Squad),
  'stvv-2024-25':         () => import('@/data/squads/stvv-2024.json').then(m => m.default as Squad),
  'kortrijk-2024-25':     () => import('@/data/squads/kortrijk-2024.json').then(m => m.default as Squad),
  'beerschot-2024-25':    () => import('@/data/squads/beerschot-2024.json').then(m => m.default as Squad),
  // Historic seasons
  'club-brugge-2002-03':  () => import('@/data/squads/club-brugge-2002.json').then(m => m.default as Squad),
  'anderlecht-2003-04':   () => import('@/data/squads/anderlecht-2003.json').then(m => m.default as Squad),
  'standard-2008-09':     () => import('@/data/squads/standard-2008.json').then(m => m.default as Squad),
  'genk-2010-11':         () => import('@/data/squads/genk-2010.json').then(m => m.default as Squad),
  'gent-2014-15':         () => import('@/data/squads/gent-2014.json').then(m => m.default as Squad),
};

export function getTeamById(id: string): Team | undefined {
  return teams.find((t) => t.id === id);
}

export function getAvailableRolls(): { team: Team; season: string }[] {
  return Object.keys(squadModules).map((key) => {
    const season = key.slice(-7);
    const teamId = key.slice(0, -8);
    const team = getTeamById(teamId)!;
    return { team, season };
  }).filter(r => r.team != null);
}

export async function loadSquad(teamId: string, season: string): Promise<Squad | null> {
  const key = `${teamId}-${season}`;
  const loader = squadModules[key];
  if (!loader) return null;
  return loader();
}
