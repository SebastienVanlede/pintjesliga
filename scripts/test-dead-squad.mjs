// Test de dead-squad detectie logic uit app/draft/page.tsx
// Voert pure-functie tests op echte squad data om de fix te valideren.
import fs from 'node:fs/promises';

// ── Duplicate van logic uit app/draft/page.tsx ────────────────────────────────

function playerPositions(p) {
  return [p.position, ...(p.alternativePositions || [])];
}

/** Replica van de useEffect-check: kan minstens 1 speler een open positie vullen? */
function hasValidPickInSquad(squad, pickedPlayers, formationPositions) {
  const pickedIds = new Set(pickedPlayers.map(p => p.player.id));
  const pickedNames = new Set(pickedPlayers.map(p => p.player.name.toLowerCase()));
  const filledPerPos = {};
  for (const p of pickedPlayers) filledPerPos[p.position] = (filledPerPos[p.position] ?? 0) + 1;
  const totalPerPos = {};
  for (const pos of formationPositions) totalPerPos[pos] = (totalPerPos[pos] ?? 0) + 1;

  return squad.players.some(player => {
    if (pickedIds.has(player.id) || pickedNames.has(player.name.toLowerCase())) return false;
    return playerPositions(player).some(pos => (filledPerPos[pos] ?? 0) < (totalPerPos[pos] ?? 0));
  });
}

// ── Test runner ───────────────────────────────────────────────────────────────

let passed = 0, failed = 0;
function check(name, actual, expected) {
  const ok = actual === expected;
  console.log(`${ok ? '✓' : '✗'} ${name} — got ${actual}, expected ${expected}`);
  if (ok) passed++; else failed++;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

const formation433 = ['GK', 'RB', 'CB', 'CB', 'LB', 'CM', 'CM', 'CM', 'RW', 'ST', 'LW'];
const formation442 = ['GK', 'RB', 'CB', 'CB', 'LB', 'RM', 'CM', 'CM', 'LM', 'ST', 'ST'];

const squadFull = JSON.parse(await fs.readFile('data/squads/anderlecht-2015.json', 'utf-8'));
console.log(`\nLoaded squad: ${squadFull.team} (${squadFull.players.length} spelers)\n`);

// Helper: maak picked-stubs voor alle positions behalve de "open" positie(s)
function buildPicked(formation, openPos) {
  const open = Array.isArray(openPos) ? openPos : [openPos];
  let openIdx = -1;
  return formation
    .map((pos, i) => ({ pos, i }))
    .filter(({ pos }) => {
      // skip de eerste occurrence van elke open positie
      const matchIdx = open.indexOf(pos);
      if (matchIdx >= 0 && openIdx < matchIdx) {
        openIdx = matchIdx;
        return false;
      }
      return true;
    })
    .map(({ pos, i }) => ({ player: { id: `stub-${i}`, name: `Stub ${i}` }, position: pos }));
}

// ── Scenario 1: laatste pick, GK open, squad bevat GK ─────────────────────────
{
  const picked = buildPicked(formation433, 'GK');
  const result = hasValidPickInSquad(squadFull, picked, formation433);
  check('S1: GK open, squad heeft GK', result, true);
}

// ── Scenario 2: laatste pick, GK open, squad zonder GK (dead) ─────────────────
{
  const noGk = { ...squadFull, players: squadFull.players.filter(p => p.position !== 'GK') };
  const picked = buildPicked(formation433, 'GK');
  const result = hasValidPickInSquad(noGk, picked, formation433);
  check('S2: GK open, squad zonder GK', result, false);
}

// ── Scenario 3: kleine squad waarvan álle spelers al elders gekozen ───────────
{
  // Neem alleen 3 spelers uit Anderlecht — alledrie zijn al "gepickt" elders.
  const tinySquad = { ...squadFull, players: squadFull.players.slice(0, 3) };
  const picked = tinySquad.players.map(p => ({
    player: { id: p.id, name: p.name },
    position: 'CB',
  }));
  const result = hasValidPickInSquad(tinySquad, picked, formation433);
  check('S3: alle squad-spelers al elders gekozen', result, false);
}

// ── Scenario 4: midden in draft, veel posities open, vrijwel altijd valide ────
{
  const picked = []; // niets gekozen
  const result = hasValidPickInSquad(squadFull, picked, formation433);
  check('S4: niets gekozen, squad valide', result, true);
}

// ── Scenario 5: 1 positie open (RW), squad heeft RW als alternative ───────────
{
  // Houd alleen Acheampong over (LW met alt ST/RW als hij die heeft)
  // Acheampong-15 heeft position LW, alt [RW, ST] — past op RW
  const acheampong = squadFull.players.find(p => p.id === 'acheampong-15');
  if (!acheampong) {
    console.log('  (skip S5: acheampong-15 niet gevonden)');
  } else {
    const justWingers = { ...squadFull, players: [acheampong] };
    const picked = buildPicked(formation433, 'RW');
    const result = hasValidPickInSquad(justWingers, picked, formation433);
    check('S5: alleen LW-speler met RW-alt past op RW-positie', result, true);
  }
}

// ── Scenario 6: gerolde squad heeft ALLEEN GKs, en geen GK meer open ──────────
{
  const onlyGks = { ...squadFull, players: squadFull.players.filter(p => p.position === 'GK') };
  // Picked: alles behalve LW (LW is open)
  const picked = buildPicked(formation433, 'LW');
  const result = hasValidPickInSquad(onlyGks, picked, formation433);
  check('S6: enkel GKs in squad, LW open → dead', result, false);
}

// ── Scenario 7: realistic dead — kleine squad, 1 ST open, squad zonder ST ─────
{
  const noStrikers = {
    ...squadFull,
    players: squadFull.players.filter(p => !playerPositions(p).includes('ST'))
  };
  // Pick alles behalve ST in 4-4-2 (heeft 2 ST posities)
  const picked = formation442
    .map((pos, i) => ({ pos, i }))
    .filter(({ pos }) => pos !== 'ST')
    .map(({ pos, i }) => ({ player: { id: `stub-${i}`, name: `Stub ${i}` }, position: pos }));
  const result = hasValidPickInSquad(noStrikers, picked, formation442);
  check('S7: 2 ST posities open, squad zonder ST → dead', result, false);
}

// ── Resultaat ─────────────────────────────────────────────────────────────────

console.log(`\nResultaat: ${passed} geslaagd, ${failed} gefaald`);
process.exit(failed === 0 ? 0 : 1);
