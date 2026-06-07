export type Position = 'GK' | 'RB' | 'CB' | 'LB' | 'CDM' | 'CM' | 'CAM' | 'RM' | 'LM' | 'RW' | 'LW' | 'ST';

export type Formation = '4-3-3' | '4-4-2' | '4-2-3-1' | '3-5-2' | '5-3-2' | '4-1-4-1' | '3-4-3' | '4-3-2-1' | '4-2-4';

export const FORMATIONS: Formation[] = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '5-3-2', '4-1-4-1', '3-4-3', '4-3-2-1', '4-2-4'];

// Positions listed GK → defense → midfield → attack
export const FORMATION_POSITIONS: Record<Formation, Position[]> = {
  '4-3-3':   ['GK', 'RB', 'CB', 'CB', 'LB', 'CM', 'CM', 'CM', 'RW', 'ST', 'LW'],
  '4-4-2':   ['GK', 'RB', 'CB', 'CB', 'LB', 'RM', 'CM', 'CM', 'LM', 'ST', 'ST'],
  '4-2-3-1': ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CDM', 'RW', 'CAM', 'LW', 'ST'],
  '3-5-2':   ['GK', 'CB', 'CB', 'CB', 'RM', 'CM', 'CDM', 'CM', 'LM', 'ST', 'ST'],
  '5-3-2':   ['GK', 'RB', 'CB', 'CB', 'CB', 'LB', 'CM', 'CM', 'CM', 'ST', 'ST'],
  '4-1-4-1': ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'RM', 'CM', 'CM', 'LM', 'ST'],
  '3-4-3':   ['GK', 'CB', 'CB', 'CB', 'RM', 'CM', 'CM', 'LM', 'RW', 'ST', 'LW'],
  '4-3-2-1': ['GK', 'RB', 'CB', 'CB', 'LB', 'CM', 'CM', 'CM', 'CAM', 'CAM', 'ST'],
  '4-2-4':   ['GK', 'RB', 'CB', 'CB', 'LB', 'CM', 'CM', 'RW', 'ST', 'ST', 'LW'],
};

// [x, y] in a 60x80 SVG viewBox, GK at bottom, attack at top
export const FORMATION_DOTS: Record<Formation, [number, number][]> = {
  '4-3-3': [
    [30, 73],
    [50, 56], [38, 53], [22, 53], [10, 56],
    [46, 34], [30, 31], [14, 34],
    [50, 12], [30, 8], [10, 12],
  ],
  '4-4-2': [
    [30, 73],
    [50, 56], [38, 53], [22, 53], [10, 56],
    [50, 36], [38, 33], [22, 33], [10, 36],
    [38, 10], [22, 10],
  ],
  '4-2-3-1': [
    [30, 73],
    [50, 56], [38, 53], [22, 53], [10, 56],
    [38, 43], [22, 43],
    [50, 24], [30, 21], [10, 24],
    [30, 8],
  ],
  '3-5-2': [
    [30, 73],
    [46, 56], [30, 53], [14, 56],
    [54, 36], [42, 33], [30, 37], [18, 33], [6, 36],
    [38, 10], [22, 10],
  ],
  '5-3-2': [
    [30, 73],
    [56, 57], [44, 54], [30, 51], [16, 54], [4, 57],
    [44, 33], [30, 30], [16, 33],
    [38, 10], [22, 10],
  ],
  '4-1-4-1': [
    [30, 73],
    [50, 56], [38, 53], [22, 53], [10, 56],
    [30, 43],
    [50, 28], [38, 26], [22, 26], [10, 28],
    [30, 8],
  ],
  '3-4-3': [
    [30, 73],
    [46, 56], [30, 53], [14, 56],
    [50, 36], [38, 33], [22, 33], [10, 36],
    [50, 12], [30, 8], [10, 12],
  ],
  '4-3-2-1': [
    [30, 73],
    [50, 56], [38, 53], [22, 53], [10, 56],
    [46, 38], [30, 36], [14, 38],
    [38, 22], [22, 22],
    [30, 8],
  ],
  '4-2-4': [
    [30, 73],
    [50, 56], [38, 53], [22, 53], [10, 56],
    [38, 38], [22, 38],
    [54, 12], [40, 8], [20, 8], [6, 12],
  ],
};

export interface Player {
  id: string;
  name: string;
  position: Position;
  alternativePositions?: Position[];
  nationality: string;
  age: number;
  appearances: number;
  goals: number;
  assists: number;
  marketValue: number;
  internationalCaps: number;
  awards: string[];
  overall: number;
}

export interface Squad {
  team: string;
  teamId: string;
  season: string;
  year: number;
  players: Player[];
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  city: string;
  primaryColor: string;
  secondaryColor: string;
  seasons: string[];
}

export function playerPositions(p: Player): Position[] {
  return [p.position, ...(p.alternativePositions ?? [])];
}

export interface PickedPlayer {
  positionIndex: number;
  position: Position;
  player: Player;
  teamName: string;
  teamPrimaryColor: string;
  season: string;
}

export interface SimulatedMatch {
  round: number;
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
  scorers: string[];
  assisters?: string[]; // optional for backward compat with stored games
}

export interface StandingRow {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  carryoverPoints?: number; // points brought into a playoff phase
}

export interface SimulatedPhase {
  name: string;
  matches: SimulatedMatch[];
  standings: StandingRow[];
}

export interface SimulatedSeason {
  regularSeason: SimulatedPhase;
  po1: SimulatedPhase;          // Championship (top 6)
  po2: SimulatedPhase;          // Europe (7-12)
  poRelegation: SimulatedPhase; // Relegation (13-16)
  champion: string;
  europeanSpots: string[];      // top 4 from PO1
  relegated: string[];          // bottom 2 from relegation PO
  directlyRelegate: string;     // 17th place — straight down, no playoff
}
