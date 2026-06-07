import { PickedPlayer, SimulatedSeason } from './types';

export const BLIND_MULTIPLIER = 1.15;

export interface ScoreBreakdown {
  total: number;
  resultScore: number;
  underdogBonus: number;
  diversityBonus: number;
  seasonsBonus: number;
  goalsBonus: number;
  blindBonus: number;
  avgOverall: number;
  uniqueTeams: number;
  uniqueSeasons: number;
  goalsScored: number;
  resultLabel: string;
  isBlind: boolean;
}

export function getResultLabel(sim: SimulatedSeason, teamName: string): string {
  const isChampion = sim.champion === teamName;
  if (isChampion) return 'Kampioen 🏆';

  const po1Rank = sim.po1.standings.findIndex(r => r.team === teamName);
  if (po1Rank === 1) return '2e in PO1';
  if (po1Rank === 2) return '3e in PO1';
  if (po1Rank === 3) return '4e in PO1 (Europa)';
  if (po1Rank >= 0) return `${po1Rank + 1}e in PO1`;

  const inPO2 = sim.po2.standings.some(r => r.team === teamName);
  if (inPO2) {
    const po2Rank = sim.po2.standings.findIndex(r => r.team === teamName);
    return po2Rank === 0 ? 'PO2 winnaar (Europa)' : 'PO2 (Europa)';
  }

  const inRele = sim.poRelegation.standings.some(r => r.team === teamName);
  if (inRele) {
    const releRank = sim.poRelegation.standings.findIndex(r => r.team === teamName);
    return releRank < 2 ? 'Relegate PO (gered)' : 'Gedegradeerd via PO';
  }

  if (sim.directlyRelegate === teamName) return 'Rechtstreeks gedegradeerd';
  return 'Onbekend';
}

export function calculateScore(
  pickedPlayers: PickedPlayer[],
  sim: SimulatedSeason,
  teamName: string,
  blind = false
): ScoreBreakdown {
  const empty: ScoreBreakdown = {
    total: 0, resultScore: 0, underdogBonus: 0, diversityBonus: 0,
    seasonsBonus: 0, goalsBonus: 0, blindBonus: 0,
    avgOverall: 0, uniqueTeams: 0, uniqueSeasons: 0, goalsScored: 0,
    resultLabel: '', isBlind: blind,
  };
  if (!pickedPlayers.length) return empty;

  // ── Result score ──────────────────────────────────────────────────────────
  const isChampion = sim.champion === teamName;
  const po1Rank    = sim.po1.standings.findIndex(r => r.team === teamName);
  const inPO2      = sim.po2.standings.some(r => r.team === teamName);
  const inRele     = sim.poRelegation.standings.some(r => r.team === teamName);
  const directRele = sim.directlyRelegate === teamName;

  let resultScore = 0;
  if (isChampion)         resultScore = 1000;
  else if (po1Rank === 1) resultScore = 750;
  else if (po1Rank === 2) resultScore = 600;
  else if (po1Rank === 3) resultScore = 500;
  else if (po1Rank >= 0)  resultScore = 400;
  else if (inPO2)         resultScore = 300;
  else if (inRele) {
    const releRank = sim.poRelegation.standings.findIndex(r => r.team === teamName);
    resultScore = releRank < 2 ? 150 : 50;
  } else if (directRele)  resultScore = 0;

  // ── Underdog bonus — precise average (no rounding before multiply) ────────
  const avgOverall   = pickedPlayers.reduce((s, p) => s + p.player.overall, 0) / pickedPlayers.length;
  const underdogBonus = Math.max(0, Math.round((75 - avgOverall) * 20));

  // ── Diversity bonus — unique clubs ────────────────────────────────────────
  const uniqueTeams   = new Set(pickedPlayers.map(p => p.teamName)).size;
  const diversityBonus = uniqueTeams * 15;

  // ── Seasons bonus — unique seasons in XI (new) ────────────────────────────
  const uniqueSeasons = new Set(pickedPlayers.map(p => p.season)).size;
  const seasonsBonus  = uniqueSeasons * 10;

  // ── Goals bonus — goals scored by your players across the full season (new)
  const playerNames = new Set(pickedPlayers.map(p => p.player.name));
  const allMatches  = [
    ...sim.regularSeason.matches,
    ...sim.po1.matches,
    ...sim.po2.matches,
    ...sim.poRelegation.matches,
  ];
  const goalsScored = allMatches.reduce(
    (sum, m) => sum + m.scorers.filter(s => playerNames.has(s)).length, 0
  );
  const goalsBonus = goalsScored * 5;

  // ── Total ─────────────────────────────────────────────────────────────────
  const baseTotal = resultScore + underdogBonus + diversityBonus + seasonsBonus + goalsBonus;
  const blindBonus = blind ? Math.round(baseTotal * (BLIND_MULTIPLIER - 1)) : 0;
  const total      = baseTotal + blindBonus;

  return {
    total,
    resultScore,
    underdogBonus,
    diversityBonus,
    seasonsBonus,
    goalsBonus,
    blindBonus,
    avgOverall: Math.round(avgOverall * 10) / 10,
    uniqueTeams,
    uniqueSeasons,
    goalsScored,
    resultLabel: getResultLabel(sim, teamName),
    isBlind: blind,
  };
}
