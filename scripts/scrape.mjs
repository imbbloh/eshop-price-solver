// Nintendo eShop price scraper — run by GitHub Actions to refresh data/<region>.json
// Node 18+ (global fetch). Writes one JSON file per ready region.
import { mkdir, writeFile } from 'node:fs/promises';

const CAP = 980, EPS = 0.0001;
// Fallback facet used to split a price window when too many titles share the
// same (or near-identical) price for a single Algolia query to return (see
// harvestCollision below) — US/CA in particular have far denser catalogs than
// BR and routinely blow past this at common price points like $4.99.
const SPLIT_ATTR = 'softwareDeveloper';

const REGIONS = {
  br: {
    maxPrice: 30,
    origin: 'https://www.nintendo.com',
    algolia: { appId: 'U3B6GR4UA3', apiKey: 'a29c6927638bfd8cee23993e51e721c9', index: 'store_game_pt_br_price_asc' },
    priceKey: 'price.regPrice',
    facetKey: 'topLevelFilters',
    getPrice: h => (h.price ? h.price.regPrice : null),
    filters: [
      { tag: 'base', facet: null },
      { tag: 'conteudo_extra', facet: 'Conteúdo extra' },
      { tag: 'jogo_com_conteudo', facet: 'Jogo com conteúdo extra' },
      { tag: 'pacote_melhoria', facet: 'Pacote de melhoria' },
      { tag: 'promocoes', facet: 'Promoções' },
      { tag: 'versao_demo', facet: 'Versão demo disponível' },
    ],
  },
  us: {
    maxPrice: 10,
    origin: 'https://www.nintendo.com',
    algolia: { appId: 'U3B6GR4UA3', apiKey: 'a29c6927638bfd8cee23993e51e721c9', index: 'store_game_en_us_price_asc' },
    priceKey: 'price.regPrice',
    facetKey: 'topLevelFilters',
    getPrice: h => (h.price ? h.price.regPrice : null),
    filters: [
      { tag: 'base', facet: null },
      { tag: 'dlc', facet: 'DLC' },
      { tag: 'games_with_dlc', facet: 'Games with DLC' },
      { tag: 'upgrade_pack', facet: 'Upgrade pack' },
      { tag: 'deals', facet: 'Deals' },
      { tag: 'demo_available', facet: 'Demo available' },
      { tag: 'game_voucher', facet: 'Game Voucher eligible' },
    ],
  },
  ca: {
    maxPrice: 10,
    origin: 'https://www.nintendo.com',
    algolia: { appId: 'U3B6GR4UA3', apiKey: 'a29c6927638bfd8cee23993e51e721c9', index: 'store_game_en_ca_price_asc' },
    priceKey: 'price.regPrice',
    facetKey: 'topLevelFilters',
    getPrice: h => (h.price ? h.price.regPrice : null),
    filters: [
      { tag: 'base', facet: null },
      { tag: 'dlc', facet: 'DLC' },
      { tag: 'games_with_dlc', facet: 'Games with DLC' },
      { tag: 'upgrade_pack', facet: 'Upgrade pack' },
      { tag: 'deals', facet: 'Deals' },
      { tag: 'demo_available', facet: 'Demo available' },
      { tag: 'game_voucher', facet: 'Game Voucher eligible' },
    ],
  },
  mx: {
    maxPrice: 250,
    origin: 'https://www.nintendo.com',
    algolia: { appId: 'U3B6GR4UA3', apiKey: 'a29c6927638bfd8cee23993e51e721c9', index: 'store_game_es_mx_price_asc' },
    priceKey: 'price.regPrice',
    facetKey: 'topLevelFilters',
    getPrice: h => (h.price ? h.price.regPrice : null),
    filters: [
      { tag: 'base', facet: null },
      { tag: 'dlc', facet: 'Contenido descargable' },
      { tag: 'games_with_dlc', facet: 'Juegos con contenido descargable' },
      { tag: 'upgrade_pack', facet: 'Pase de mejora' },
      { tag: 'deals', facet: 'Ofertas' },
      { tag: 'demo_available', facet: 'Demo disponible' },
      { tag: 'game_voucher', facet: 'Título elegible para cupones para juegos' },
    ],
  },
};

const endpoint = r => `https://${r.algolia.appId}-dsn.algolia.net/1/indexes/${r.algolia.index}/query`;

async function query(r, body) {
  const res = await fetch(endpoint(r), {
    method: 'POST',
    headers: {
      'x-algolia-api-key': r.algolia.apiKey,
      'x-algolia-application-id': r.algolia.appId,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Algolia HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

const rangeNF = (r, lo, hi) => [`${r.priceKey}>=${lo}`, `${r.priceKey}<${hi}`];
const facetOf = (r, f) => (f ? `${r.facetKey}:"${f}"` : undefined);
const count = async (r, lo, hi, f) =>
  (await query(r, { numericFilters: rangeNF(r, lo, hi), filters: facetOf(r, f), hitsPerPage: 0 })).nbHits;

async function fetchWindow(r, filters, lo, hi, db, tag) {
  const j = await query(r, {
    numericFilters: rangeNF(r, lo, hi), filters,
    hitsPerPage: 1000, page: 0, attributesToRetrieve: ['title', 'url', 'price', 'objectID'],
  });
  for (const h of j.hits) {
    const reg = r.getPrice(h);
    if (h.objectID == null || reg == null || reg <= 0 || reg > r.maxPrice) continue;
    const cur = db[h.objectID] || { title: h.title, price: reg, url: r.origin + (h.url || ''), filters: [] };
    if (!cur.filters.includes(tag)) cur.filters.push(tag);
    db[h.objectID] = cur;
  }
  return j.hits.length;
}

// Called when a price window can't be narrowed any further (hi-lo already at
// the halving floor) yet still matches >= CAP titles — i.e. more titles share
// that price than a single Algolia query can return (hard cap: 1000/query).
// Split by developer instead: it's fine-grained enough that no single
// developer's catalog comes anywhere near the cap.
async function harvestCollision(r, facet, tag, db, lo, hi, total) {
  const base = facetOf(r, facet);
  const fj = await query(r, {
    numericFilters: rangeNF(r, lo, hi), filters: base,
    hitsPerPage: 0, facets: [SPLIT_ATTR], maxValuesPerFacet: 1000,
  });
  const values = Object.keys((fj.facets && fj.facets[SPLIT_ATTR]) || {});
  let got = 0;
  for (const v of values) {
    const esc = v.replace(/"/g, '\\"');
    const filters = base ? `${base} AND ${SPLIT_ATTR}:"${esc}"` : `${SPLIT_ATTR}:"${esc}"`;
    got += await fetchWindow(r, filters, lo, hi, db, tag);
  }
  if (got < total) {
    console.warn(`  ! [${lo.toFixed(3)},${hi.toFixed(3)}) ${tag}: recovered ${got}/${total} (some titles may lack a ${SPLIT_ATTR} value)`);
  }
}

async function harvest(r, facet, tag, db) {
  let lo = 0;
  while (lo <= r.maxPrice) {
    let hi = Math.min(lo + 2, r.maxPrice + EPS);
    let c = await count(r, lo, hi, facet);
    while (c >= CAP && hi - lo > 0.005) { hi = lo + (hi - lo) / 2; c = await count(r, lo, hi, facet); }
    if (c >= CAP) {
      await harvestCollision(r, facet, tag, db, lo, hi, c);
    } else {
      await fetchWindow(r, facetOf(r, facet), lo, hi, db, tag);
    }
    lo = hi;
  }
}

async function scrapeRegion(region) {
  const r = REGIONS[region];
  const db = {};
  for (const f of r.filters) {
    await harvest(r, f.facet, f.tag, db);
    console.log(`  ${region}/${f.tag}: ${Object.keys(db).length} unique so far`);
  }
  const games = Object.values(db).sort((a, b) => a.price - b.price);
  return { savedAt: new Date().toISOString(), region, maxPrice: r.maxPrice, count: games.length, games };
}

async function main() {
  await mkdir('data', { recursive: true });
  for (const region of Object.keys(REGIONS)) {
    console.log(`Scraping ${region}…`);
    const payload = await scrapeRegion(region);
    await writeFile(`data/${region}.json`, JSON.stringify(payload));
    console.log(`✓ data/${region}.json — ${payload.count} games`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
