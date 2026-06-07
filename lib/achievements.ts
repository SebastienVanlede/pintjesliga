import type { PlayedGame } from './store';

export type AchievementId =
  | 'first_brew' | 'champion' | 'treble' | 'legend'
  | 'underdog' | 'david'
  | 'galactico' | 'time_traveler' | 'complete_history' | 'purist' | 'diverse'
  | 'mind_coach' | 'memory_master' | 'classic_king'
  | 'goal_machine' | 'goal_legend' | 'pintje_perfect'
  | 'frequent_flyer' | 'dedicated';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface AchievementDef {
  id: AchievementId;
  icon: string;
  rarity: Rarity;
}

export const RARITY_COLOR: Record<Rarity, string> = {
  common:    '#A8E6CF',   // mint
  rare:      '#3a8fd1',   // blue
  epic:      '#D4940A',   // gold
  legendary: '#C41E3A',   // red
};

// Volgorde bepaalt weergave-volgorde
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_brew',       icon: '🍺', rarity: 'common'    },
  { id: 'champion',         icon: '🏆', rarity: 'rare'      },
  { id: 'underdog',         icon: '🐺', rarity: 'rare'      },
  { id: 'david',            icon: '🪨', rarity: 'epic'      },
  { id: 'galactico',        icon: '⚡', rarity: 'rare'      },
  { id: 'mind_coach',       icon: '🎭', rarity: 'epic'      },
  { id: 'classic_king',     icon: '🎲', rarity: 'rare'      },
  { id: 'pintje_perfect',   icon: '🌟', rarity: 'epic'      },
  { id: 'goal_machine',     icon: '⚽', rarity: 'rare'      },
  { id: 'time_traveler',    icon: '🕰️', rarity: 'common'   },
  { id: 'complete_history', icon: '📚', rarity: 'rare'      },
  { id: 'purist',           icon: '💎', rarity: 'common'    },
  { id: 'diverse',          icon: '🌍', rarity: 'common'    },
  { id: 'memory_master',    icon: '🧠', rarity: 'rare'      },
  { id: 'frequent_flyer',   icon: '🎮', rarity: 'common'    },
  { id: 'goal_legend',      icon: '🎯', rarity: 'epic'      },
  { id: 'treble',           icon: '🎖️', rarity: 'epic'     },
  { id: 'dedicated',        icon: '🏛️', rarity: 'rare'     },
  { id: 'legend',           icon: '👑', rarity: 'legendary' },
];

/** Per-game achievements: ontgrendelbaar op basis van één enkele game. */
export function getGameAchievements(g: PlayedGame): AchievementId[] {
  const earned: AchievementId[] = [];
  if (g.avgOverall >= 75) earned.push('galactico');
  if (g.uniqueSeasons >= 6) earned.push('time_traveler');
  if (g.uniqueSeasons >= 9) earned.push('complete_history');
  if (g.uniqueSeasons === 1) earned.push('purist');
  if (g.uniqueTeams >= 10) earned.push('diverse');
  if (g.goalsScored >= 50) earned.push('goal_machine');
  if (g.totalScore >= 1500) earned.push('pintje_perfect');
  if (g.isChampion) {
    earned.push('champion');
    if (g.avgOverall < 70) earned.push('underdog');
    if (g.avgOverall < 65) earned.push('david');
    if (g.draftMode === 'blind') earned.push('mind_coach');
    if (g.opponentMode === 'classic') earned.push('classic_king');
  }
  return earned;
}

/** Alle behaalde achievements (per-game + cumulatief) over de hele history. */
export function getAllEarnedAchievements(history: PlayedGame[]): Set<AchievementId> {
  const earned = new Set<AchievementId>();
  if (history.length === 0) return earned;

  // Per-game
  for (const g of history) {
    for (const id of getGameAchievements(g)) earned.add(id);
  }

  // Cumulatief
  const totalGames    = history.length;
  const championships = history.filter(g => g.isChampion).length;
  const blindGames    = history.filter(g => g.draftMode === 'blind').length;
  const totalGoals    = history.reduce((s, g) => s + g.goalsScored, 0);

  if (totalGames >= 1)    earned.add('first_brew');
  if (totalGames >= 10)   earned.add('frequent_flyer');
  if (totalGames >= 25)   earned.add('dedicated');
  if (championships >= 3) earned.add('treble');
  if (championships >= 10) earned.add('legend');
  if (blindGames >= 5)    earned.add('memory_master');
  if (totalGoals >= 100)  earned.add('goal_legend');

  return earned;
}
