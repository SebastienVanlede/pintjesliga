// Vergelijkt OUDE (zonder decay) vs NIEUWE (met per-match decay) goal-distributie.
// Simuleert 100 seizoenen × 30 matches × Poisson(1.5) goals, en toont
// gemiddelde / max top-scorer per seizoen.

const GOAL_WEIGHT = {
  ST: 14, RW: 7, LW: 7, CAM: 6, CM: 4,
  RM: 3,  LM: 3, CDM: 2, RB: 1, LB: 1, CB: 0.5, GK: 0.1,
};

// Realistische 4-3-3 squad van 17 spelers
const squad = [
  { name: 'GK1', position: 'GK' }, { name: 'GK2', position: 'GK' },
  { name: 'CB1', position: 'CB' }, { name: 'CB2', position: 'CB' }, { name: 'CB3', position: 'CB' },
  { name: 'LB1', position: 'LB' }, { name: 'RB1', position: 'RB' },
  { name: 'CDM1', position: 'CDM' }, { name: 'CM1', position: 'CM' }, { name: 'CM2', position: 'CM' },
  { name: 'CAM1', position: 'CAM' },
  { name: 'LW1', position: 'LW' }, { name: 'LW2', position: 'LW' },
  { name: 'RW1', position: 'RW' }, { name: 'RW2', position: 'RW' },
  { name: 'ST1', position: 'ST' }, { name: 'ST2', position: 'ST' },
];

function poisson(lambda) {
  let k = 0, p = Math.random();
  const t = Math.exp(-lambda);
  while (p > t) { k++; p *= Math.random(); }
  return k;
}

// OUDE: onafhankelijke picks per goal
function pickOld(players, goals) {
  const result = [];
  for (let i = 0; i < goals; i++) {
    const totalW = players.reduce((s, p) => s + (GOAL_WEIGHT[p.position] ?? 1), 0);
    let r = Math.random() * totalW;
    for (const p of players) {
      r -= GOAL_WEIGHT[p.position] ?? 1;
      if (r <= 0) { result.push(p.name); break; }
    }
  }
  return result;
}

// NIEUWE: per-match decay 0.5^n
function pickNew(players, goals) {
  const result = [];
  const tally = {};
  for (let i = 0; i < goals; i++) {
    const pool = players.map(p => ({
      player: p,
      weight: (GOAL_WEIGHT[p.position] ?? 1) * Math.pow(0.5, tally[p.name] ?? 0),
    }));
    const totalW = pool.reduce((s, x) => s + x.weight, 0);
    let r = Math.random() * totalW;
    for (const { player, weight } of pool) {
      r -= weight;
      if (r <= 0) {
        result.push(player.name);
        tally[player.name] = (tally[player.name] ?? 0) + 1;
        break;
      }
    }
  }
  return result;
}

function simulateSeason(pickFn) {
  const tally = {};
  for (let match = 0; match < 30; match++) {
    const goals = poisson(1.5);
    const scorers = pickFn(squad, goals);
    for (const s of scorers) tally[s] = (tally[s] ?? 0) + 1;
  }
  return tally;
}

function topScorer(tally) {
  let max = 0, name = '';
  for (const [n, c] of Object.entries(tally)) {
    if (c > max) { max = c; name = n; }
  }
  return { name, goals: max };
}

function hattrickRate(pickFn) {
  // Aantal wedstrijden waar 1 speler ≥3 goals scoort
  let games = 0, hatGames = 0;
  for (let s = 0; s < 1000; s++) {
    for (let m = 0; m < 30; m++) {
      const goals = poisson(1.5);
      const scorers = pickFn(squad, goals);
      const counts = {};
      for (const sc of scorers) counts[sc] = (counts[sc] ?? 0) + 1;
      games++;
      if (Math.max(0, ...Object.values(counts)) >= 3) hatGames++;
    }
  }
  return { games, hatGames, rate: (hatGames / games * 100).toFixed(2) + '%' };
}

function run(label, pickFn) {
  const tops = [];
  for (let i = 0; i < 200; i++) tops.push(topScorer(simulateSeason(pickFn)));
  const goals = tops.map(t => t.goals).sort((a, b) => a - b);
  const avg = goals.reduce((s, g) => s + g, 0) / goals.length;
  const p50 = goals[Math.floor(goals.length / 2)];
  const p90 = goals[Math.floor(goals.length * 0.9)];
  const max = goals[goals.length - 1];
  const min = goals[0];
  console.log(`\n${label}:`);
  console.log(`  Top scorer over 200 seizoenen: min ${min} · p50 ${p50} · avg ${avg.toFixed(1)} · p90 ${p90} · max ${max}`);
  const ht = hattrickRate(pickFn);
  console.log(`  Hat-trick rate: ${ht.hatGames}/${ht.games} matches (${ht.rate})`);
}

run('OUD (geen decay)', pickOld);
run('NIEUW (per-match decay 0.5^n)', pickNew);
