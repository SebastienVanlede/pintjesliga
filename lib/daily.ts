import { Formation, FORMATIONS } from './types';
import { getAvailableRolls } from './data';

// ─── Brussel-tijd dagkey ──────────────────────────────────────────────────────

/** Geeft een datumstring "YYYY-MM-DD" terug op basis van Brussel-tijd. */
export function getTodayDateKey(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Brussels',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fmt.format(new Date());
}

/** Geeft de dagkey van gisteren in Brussel-tijd. */
export function getYesterdayDateKey(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Brussels',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return fmt.format(yesterday);
}

// ─── Seeded random (mulberry32) ───────────────────────────────────────────────

function hashCode(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], rand: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ─── Challenge generator ──────────────────────────────────────────────────────

export interface DailyOpponent {
  teamId: string;
  teamName: string;
  season: string;
  primaryColor: string;
}

export interface DailyChallenge {
  dateKey: string;
  formation: Formation;
  opponents: DailyOpponent[];                          // 16 unieke clubs
  /**
   * Vaste rolls voor de draft, geïndexeerd als pickIndex * 4 + attemptIndex.
   * 11 picks × 4 pogingen (1 basis + 3 herrolls) = 44 items.
   * Iedereen die op dezelfde dag speelt krijgt hetzelfde team voor dezelfde pick + herroll-aantal,
   * ongeacht of een andere speler op een eerdere pick herrold heeft.
   */
  rollDeck: { teamId: string; season: string }[];
}

export const DAILY_PICKS         = 11;
export const DAILY_MAX_ATTEMPTS  = 4; // 1 basis + 3 herrolls
export const DAILY_DECK_SIZE     = DAILY_PICKS * DAILY_MAX_ATTEMPTS;

/** Genereer een deterministische daily challenge voor de gegeven dagkey. */
export function generateDailyChallenge(dateKey: string): DailyChallenge {
  const seed = hashCode(`pintjesliga-${dateKey}`);
  const rand = mulberry32(seed);

  // 1. Formatie
  const formation = FORMATIONS[Math.floor(rand() * FORMATIONS.length)];

  // 2. Tegenstanders: 16 unieke clubs (Klassiek-stijl)
  const allRolls = getAvailableRolls();
  const shuffledForOpponents = seededShuffle(allRolls, rand);
  const usedClubs = new Set<string>();
  const opponents: DailyOpponent[] = [];
  for (const roll of shuffledForOpponents) {
    if (opponents.length >= 16) break;
    if (!usedClubs.has(roll.team.id)) {
      usedClubs.add(roll.team.id);
      opponents.push({
        teamId: roll.team.id,
        teamName: roll.team.name,
        season: roll.season,
        primaryColor: roll.team.primaryColor,
      });
    }
  }

  // 3. Roll deck — 44 vaste rolls, pick-gebonden (zie interface comment)
  const shuffledDeck = seededShuffle(allRolls, rand);
  // Als allRolls < 44, vul met seeded herhalingen (zou niet mogen gebeuren — 129 squads beschikbaar)
  const trimmed = shuffledDeck.slice(0, DAILY_DECK_SIZE);
  while (trimmed.length < DAILY_DECK_SIZE) trimmed.push(shuffledDeck[trimmed.length % shuffledDeck.length]);
  const rollDeck = trimmed.map(r => ({ teamId: r.team.id, season: r.season }));

  return { dateKey, formation, opponents, rollDeck };
}
