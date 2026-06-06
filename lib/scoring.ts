import { PickedPlayer, SimulatedSeason } from './types';

export interface ScoreBreakdown {
  total: number;
  resultScore: number;
  underdogBonus: number;
  diversityBonus: number;
  avgOverall: number;
  uniqueTeams: number;
  resultLabel: string;
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
  teamName: string
): ScoreBreakdown {
  if (!pickedPlayers.length) return { total: 0, resultScore: 0, underdogBonus: 0, diversityBonus: 0, avgOverall: 0, uniqueTeams: 0, resultLabel: '' };

  // Result score — uses actual team name from simulation
  const isChampion = sim.champion === teamName;
  const po1Rank = sim.po1.standings.findIndex(r => r.team === teamName);
  const inPO2 = sim.po2.standings.some(r => r.team === teamName);
  const inRele = sim.poRelegation.standings.some(r => r.team === teamName);
  const directRele = sim.directlyRelegate === teamName;

  let resultScore = 0;
  if (isChampion)         resultScore = 1000;
  else if (po1Rank === 1) resultScore = 750;
  else if (po1Rank === 2) resultScore = 600;
  else if (po1Rank === 3) resultScore = 500;
  else if (po1Rank >= 0)  resultScore = 400;
  else if (inPO2)         resultScore = 300;
  else if (inRele) {
    const releRank = sim.poRelegation.standings.findIndex(r => r.team === 'Jouw XI');
    resultScore = releRank < 2 ? 150 : 50;
  } else if (directRele)  resultScore = 0;

  // Underdog bonus: lager gem. overall = moeilijker gebouwd team = meer punten
  const avgOverall = Math.round(pickedPlayers.reduce((s, p) => s + p.player.overall, 0) / pickedPlayers.length);
  const underdogBonus = Math.max(0, (75 - avgOverall) * 20);

  // Diversity bonus: meer unieke team+seizoen combinaties = meer punten
  const uniqueTeams = new Set(pickedPlayers.map(p => `${p.teamName}|${p.season}`)).size;
  const diversityBonus = uniqueTeams * 15;

  const total = resultScore + underdogBonus + diversityBonus;

  return {
    total,
    resultScore,
    underdogBonus,
    diversityBonus,
    avgOverall,
    uniqueTeams,
    resultLabel: getResultLabel(sim, teamName),
  };
}
