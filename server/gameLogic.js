// Lógica del juego "raspadita 3x4".
// Devuelve el contenido de las 12 casillas y si es premio o no.
//
// Reglas:
//  - Ganas si aparecen 3 símbolos iguales (no muerte). El comodín cuenta como cualquier símbolo.
//  - Perdés si aparecen 2 (o más) "muerte" (chacal).
//  - Si no se cumple ninguna, jugada sin premio.

const GRID_SIZE = 12;

function pickWeighted(items) {
  const total = items.reduce((s, it) => s + it.weight, 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= it.weight;
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

function buildPool(catalog) {
  const pool = catalog.symbols.map(s => ({ id: s.id, weight: s.weight }));
  pool.push({ id: catalog.wildcardId, weight: catalog.wildcardWeight });
  pool.push({ id: catalog.deathId,    weight: catalog.deathWeight });
  return pool;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function evaluate(tiles, catalog) {
  const counts = {};
  for (const t of tiles) counts[t] = (counts[t] || 0) + 1;

  const deaths = counts[catalog.deathId] || 0;
  if (deaths >= 2) {
    return { outcome: 'lose', prize: 0, winningSymbol: null };
  }

  const wilds = counts[catalog.wildcardId] || 0;
  // Buscar el mejor símbolo con count + wilds >= 3
  let best = null;
  for (const sym of catalog.symbols) {
    const c = counts[sym.id] || 0;
    if (c + wilds >= 3) {
      if (!best || sym.prize > best.prize) best = sym;
    }
  }
  if (best) {
    return {
      outcome: 'win',
      prize: best.prize * (catalog.baseBet || 1),
      winningSymbol: best.id
    };
  }
  return { outcome: 'none', prize: 0, winningSymbol: null };
}

// Genera una jugada "forzada" a un resultado deseado (win/lose/none).
function generateForced(forced, catalog) {
  const pool = buildPool(catalog);

  if (forced === 'win') {
    const winner = pickWeighted(catalog.symbols);
    const tiles = [winner.id, winner.id, winner.id];
    // Rellenar con símbolos que NO sumen otra terna ni 2 muertes.
    while (tiles.length < GRID_SIZE) {
      const cand = pickWeighted(pool).id;
      const next = tiles.concat([cand]);
      const counts = {};
      for (const t of next) counts[t] = (counts[t] || 0) + 1;
      if ((counts[catalog.deathId] || 0) >= 2) continue;
      // evitar que el comodín haga que aparezca un símbolo MEJOR
      const evalRes = evaluate(next, catalog);
      if (evalRes.outcome === 'win' && evalRes.winningSymbol !== winner.id) continue;
      tiles.push(cand);
    }
    return shuffle(tiles);
  }

  if (forced === 'lose') {
    const tiles = [catalog.deathId, catalog.deathId];
    while (tiles.length < GRID_SIZE) {
      const cand = pickWeighted(pool).id;
      if (cand === catalog.deathId) continue; // máximo 2 muertes para que se vea limpio
      tiles.push(cand);
    }
    return shuffle(tiles);
  }

  // sin premio: generar hasta que evaluate dé 'none'
  for (let i = 0; i < 50; i++) {
    const tiles = [];
    for (let j = 0; j < GRID_SIZE; j++) tiles.push(pickWeighted(pool).id);
    if (evaluate(tiles, catalog).outcome === 'none') return tiles;
  }
  // fallback: forzar sin premio mezclando símbolos únicos
  return shuffle(catalog.symbols.slice(0, GRID_SIZE).map(s => s.id));
}

export function generatePlay(catalog) {
  const r = Math.random();
  let forced;
  if (r < catalog.winChance) forced = 'win';
  else if (r < catalog.winChance + catalog.loseChance) forced = 'lose';
  else forced = 'none';

  const tiles = generateForced(forced, catalog);
  const result = evaluate(tiles, catalog);
  return { tiles, ...result };
}
