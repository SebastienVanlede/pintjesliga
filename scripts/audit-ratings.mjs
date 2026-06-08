// Audit OVR ratings voor consistentie over de hele squad-database.
//
// Drie checks:
//   1. Cross-seizoen jumps  — dezelfde speler met grote OVR-sprongen over jaren
//   2. OVR↔marktwaarde      — outliers per positie (lage OVR + hoge MV of omgekeerd)
//   3. Per-positie top      — beste/slechtste OVR per positie (scaling check)
//
// Output is descriptive, niet prescriptive. Gebruiker beslist welke fixes.

import fs from 'node:fs/promises';
import path from 'node:path';

const SQUAD_DIR = 'data/squads';

const files = (await fs.readdir(SQUAD_DIR)).filter(f => f.endsWith('.json'));
const allPlayers = [];

for (const f of files) {
  const data = JSON.parse(await fs.readFile(path.join(SQUAD_DIR, f), 'utf-8'));
  for (const p of data.players) {
    allPlayers.push({
      ...p,
      season: data.season,
      year: data.year,
      teamId: data.teamId,
      team: data.team,
      file: f,
    });
  }
}

console.log(`📊 Database: ${files.length} squad-files · ${allPlayers.length} player-entries\n`);

// ── 1. Cross-seizoen OVR-jumps ────────────────────────────────────────────────
console.log('━━━ 1. Cross-seizoen OVR-jumps (zelfde naam, sprong ≥6 in 1 jaar) ━━━');
const byName = new Map();
for (const p of allPlayers) {
  if (!byName.has(p.name)) byName.set(p.name, []);
  byName.get(p.name).push(p);
}

const jumps = [];
for (const [name, entries] of byName) {
  if (entries.length < 2) continue;
  entries.sort((a, b) => a.year - b.year);
  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1];
    const curr = entries[i];
    const yearDiff = curr.year - prev.year;
    if (yearDiff < 1 || yearDiff > 3) continue; // skip multi-year gaps (transfers)
    const ovrDiff = curr.overall - prev.overall;
    if (Math.abs(ovrDiff) >= 6) {
      jumps.push({
        name, yearDiff, ovrDiff,
        from: `${prev.overall} (${prev.team} ${prev.season})`,
        to:   `${curr.overall} (${curr.team} ${curr.season})`,
      });
    }
  }
}
jumps.sort((a, b) => Math.abs(b.ovrDiff) - Math.abs(a.ovrDiff));
console.log(`Found ${jumps.length} jumps. Top 30:`);
for (const j of jumps.slice(0, 30)) {
  const sign = j.ovrDiff > 0 ? '+' : '';
  console.log(`  ${j.name.padEnd(28)} ${sign}${j.ovrDiff} OVR over ${j.yearDiff}j  |  ${j.from} → ${j.to}`);
}

// ── 2. OVR ↔ marktwaarde anomalieën per positie ──────────────────────────────
console.log('\n━━━ 2. OVR-vs-marktwaarde outliers per positie ━━━');
// Voor elke positie: bereken mediaan OVR en mediaan MV per quartile-bucket.
// Flag entries die >2× afwijken van expected OVR voor hun MV-bucket.

const byPos = new Map();
for (const p of allPlayers) {
  if (!byPos.has(p.position)) byPos.set(p.position, []);
  byPos.get(p.position).push(p);
}

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

const outliers = [];
for (const [pos, players] of byPos) {
  if (players.length < 10) continue;
  // Bucket by market value (10 quantiles)
  const sorted = [...players].sort((a, b) => a.marketValue - b.marketValue);
  const buckets = Array.from({ length: 10 }, (_, i) => {
    const start = Math.floor((i / 10) * sorted.length);
    const end = Math.floor(((i + 1) / 10) * sorted.length);
    return sorted.slice(start, end);
  });
  for (let i = 0; i < buckets.length; i++) {
    const b = buckets[i];
    if (b.length < 3) continue;
    const medOvr = median(b.map(p => p.overall));
    for (const p of b) {
      const diff = p.overall - medOvr;
      if (Math.abs(diff) >= 6) {
        outliers.push({
          player: p.name, pos, season: p.season, team: p.team,
          ovr: p.overall, mv: p.marketValue, medOvr, diff, bucket: i,
        });
      }
    }
  }
}
outliers.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
console.log(`Found ${outliers.length} outliers (verschil ≥6 vs mediaan in MV-bucket). Top 30:`);
for (const o of outliers.slice(0, 30)) {
  const sign = o.diff > 0 ? '+' : '';
  const mvS = o.mv >= 1e6 ? `€${(o.mv/1e6).toFixed(1)}M` : `€${(o.mv/1e3).toFixed(0)}K`;
  console.log(`  ${o.pos.padEnd(4)} ${o.player.padEnd(28)} OVR ${o.ovr} (${sign}${o.diff} vs mediaan ${o.medOvr}) · ${mvS} · ${o.team} ${o.season}`);
}

// ── 3. Per-positie top/bottom ─────────────────────────────────────────────────
console.log('\n━━━ 3. Top/bottom 3 OVR per positie ━━━');
for (const [pos, players] of [...byPos.entries()].sort()) {
  if (players.length < 5) continue;
  const sorted = [...players].sort((a, b) => b.overall - a.overall);
  const stats = {
    count: players.length,
    min: sorted[sorted.length - 1].overall,
    max: sorted[0].overall,
    avg: (players.reduce((s, p) => s + p.overall, 0) / players.length).toFixed(1),
    med: median(players.map(p => p.overall)),
  };
  console.log(`\n[${pos}] ${stats.count} entries · min ${stats.min} · avg ${stats.avg} · med ${stats.med} · max ${stats.max}`);
  console.log('  Top 3:');
  for (const p of sorted.slice(0, 3)) {
    console.log(`    OVR ${p.overall} · ${p.name} (${p.team} ${p.season}) · €${(p.marketValue/1e6).toFixed(1)}M`);
  }
  console.log('  Bottom 3:');
  for (const p of sorted.slice(-3).reverse()) {
    console.log(`    OVR ${p.overall} · ${p.name} (${p.team} ${p.season}) · €${(p.marketValue/1e6).toFixed(2)}M`);
  }
}
