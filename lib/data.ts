import teamsJson from '@/data/teams.json';
import seasonsJson from '@/data/seasons.json';
import { Team, Squad } from './types';

export const teams: Team[] = teamsJson as Team[];
export const seasons = seasonsJson;
export const CURRENT_SEASON = '2024-25';

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
  // 2022-23 season
  'club-brugge-2022-23':   () => import('@/data/squads/club-brugge-2022.json').then(m => m.default as Squad),
  'genk-2022-23':          () => import('@/data/squads/genk-2022.json').then(m => m.default as Squad),
  'union-2022-23':         () => import('@/data/squads/union-2022.json').then(m => m.default as Squad),
  'anderlecht-2022-23':    () => import('@/data/squads/anderlecht-2022.json').then(m => m.default as Squad),
  'antwerp-2022-23':       () => import('@/data/squads/antwerp-2022.json').then(m => m.default as Squad),
  'gent-2022-23':          () => import('@/data/squads/gent-2022.json').then(m => m.default as Squad),
  'standard-2022-23':      () => import('@/data/squads/standard-2022.json').then(m => m.default as Squad),
  'mechelen-2022-23':      () => import('@/data/squads/mechelen-2022.json').then(m => m.default as Squad),
  'westerlo-2022-23':      () => import('@/data/squads/westerlo-2022.json').then(m => m.default as Squad),
  'charleroi-2022-23':     () => import('@/data/squads/charleroi-2022.json').then(m => m.default as Squad),
  'ohl-2022-23':           () => import('@/data/squads/ohl-2022.json').then(m => m.default as Squad),
  'cercle-brugge-2022-23': () => import('@/data/squads/cercle-brugge-2022.json').then(m => m.default as Squad),
  'stvv-2022-23':          () => import('@/data/squads/stvv-2022.json').then(m => m.default as Squad),
  'kortrijk-2022-23':      () => import('@/data/squads/kortrijk-2022.json').then(m => m.default as Squad),
  'eupen-2022-23':         () => import('@/data/squads/eupen-2022.json').then(m => m.default as Squad),
  'zulte-waregem-2022-23': () => import('@/data/squads/zulte-waregem-2022.json').then(m => m.default as Squad),
  // 2021-22 season
  'club-brugge-2021-22':   () => import('@/data/squads/club-brugge-2021.json').then(m => m.default as Squad),
  'union-2021-22':         () => import('@/data/squads/union-2021.json').then(m => m.default as Squad),
  'anderlecht-2021-22':    () => import('@/data/squads/anderlecht-2021.json').then(m => m.default as Squad),
  'antwerp-2021-22':       () => import('@/data/squads/antwerp-2021.json').then(m => m.default as Squad),
  'gent-2021-22':          () => import('@/data/squads/gent-2021.json').then(m => m.default as Squad),
  'genk-2021-22':          () => import('@/data/squads/genk-2021.json').then(m => m.default as Squad),
  'standard-2021-22':      () => import('@/data/squads/standard-2021.json').then(m => m.default as Squad),
  'mechelen-2021-22':      () => import('@/data/squads/mechelen-2021.json').then(m => m.default as Squad),
  'charleroi-2021-22':     () => import('@/data/squads/charleroi-2021.json').then(m => m.default as Squad),
  'ohl-2021-22':           () => import('@/data/squads/ohl-2021.json').then(m => m.default as Squad),
  'cercle-brugge-2021-22': () => import('@/data/squads/cercle-brugge-2021.json').then(m => m.default as Squad),
  'stvv-2021-22':          () => import('@/data/squads/stvv-2021.json').then(m => m.default as Squad),
  'kortrijk-2021-22':      () => import('@/data/squads/kortrijk-2021.json').then(m => m.default as Squad),
  'eupen-2021-22':         () => import('@/data/squads/eupen-2021.json').then(m => m.default as Squad),
  'zulte-waregem-2021-22': () => import('@/data/squads/zulte-waregem-2021.json').then(m => m.default as Squad),
  'oostende-2021-22':      () => import('@/data/squads/oostende-2021.json').then(m => m.default as Squad),
  'seraing-2021-22':       () => import('@/data/squads/seraing-2021.json').then(m => m.default as Squad),
  // 2020-21 season
  'club-brugge-2020-21':    () => import('@/data/squads/club-brugge-2020.json').then(m => m.default as Squad),
  'antwerp-2020-21':        () => import('@/data/squads/antwerp-2020.json').then(m => m.default as Squad),
  'anderlecht-2020-21':     () => import('@/data/squads/anderlecht-2020.json').then(m => m.default as Squad),
  'genk-2020-21':           () => import('@/data/squads/genk-2020.json').then(m => m.default as Squad),
  'gent-2020-21':           () => import('@/data/squads/gent-2020.json').then(m => m.default as Squad),
  'standard-2020-21':       () => import('@/data/squads/standard-2020.json').then(m => m.default as Squad),
  'mechelen-2020-21':       () => import('@/data/squads/mechelen-2020.json').then(m => m.default as Squad),
  'beerschot-2020-21':      () => import('@/data/squads/beerschot-2020.json').then(m => m.default as Squad),
  'ohl-2020-21':            () => import('@/data/squads/ohl-2020.json').then(m => m.default as Squad),
  'charleroi-2020-21':      () => import('@/data/squads/charleroi-2020.json').then(m => m.default as Squad),
  'zulte-waregem-2020-21':  () => import('@/data/squads/zulte-waregem-2020.json').then(m => m.default as Squad),
  'cercle-brugge-2020-21':  () => import('@/data/squads/cercle-brugge-2020.json').then(m => m.default as Squad),
  'stvv-2020-21':           () => import('@/data/squads/stvv-2020.json').then(m => m.default as Squad),
  'kortrijk-2020-21':       () => import('@/data/squads/kortrijk-2020.json').then(m => m.default as Squad),
  'eupen-2020-21':          () => import('@/data/squads/eupen-2020.json').then(m => m.default as Squad),
  'oostende-2020-21':       () => import('@/data/squads/oostende-2020.json').then(m => m.default as Squad),
  'waasland-beveren-2020-21':() => import('@/data/squads/waasland-beveren-2020.json').then(m => m.default as Squad),
  'mouscron-2020-21':       () => import('@/data/squads/mouscron-2020.json').then(m => m.default as Squad),
  // 2023-24 season
  'club-brugge-2023-24':   () => import('@/data/squads/club-brugge-2023.json').then(m => m.default as Squad),
  'genk-2023-24':          () => import('@/data/squads/genk-2023.json').then(m => m.default as Squad),
  'union-2023-24':         () => import('@/data/squads/union-2023.json').then(m => m.default as Squad),
  'anderlecht-2023-24':    () => import('@/data/squads/anderlecht-2023b.json').then(m => m.default as Squad),
  'antwerp-2023-24':       () => import('@/data/squads/antwerp-2023.json').then(m => m.default as Squad),
  'gent-2023-24':          () => import('@/data/squads/gent-2023.json').then(m => m.default as Squad),
  'standard-2023-24':      () => import('@/data/squads/standard-2023.json').then(m => m.default as Squad),
  'mechelen-2023-24':      () => import('@/data/squads/mechelen-2023.json').then(m => m.default as Squad),
  'westerlo-2023-24':      () => import('@/data/squads/westerlo-2023.json').then(m => m.default as Squad),
  'charleroi-2023-24':     () => import('@/data/squads/charleroi-2023.json').then(m => m.default as Squad),
  'ohl-2023-24':           () => import('@/data/squads/ohl-2023.json').then(m => m.default as Squad),
  'cercle-brugge-2023-24': () => import('@/data/squads/cercle-brugge-2023.json').then(m => m.default as Squad),
  'stvv-2023-24':          () => import('@/data/squads/stvv-2023.json').then(m => m.default as Squad),
  'kortrijk-2023-24':      () => import('@/data/squads/kortrijk-2023.json').then(m => m.default as Squad),
  'eupen-2023-24':         () => import('@/data/squads/eupen-2023.json').then(m => m.default as Squad),
  'rwdm-2023-24':          () => import('@/data/squads/rwdm-2023.json').then(m => m.default as Squad),
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
