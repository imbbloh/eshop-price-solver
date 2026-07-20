// Nintendo eShop price scraper — run by GitHub Actions to refresh data/<region>.json
// Node 18+ (global fetch). Writes one JSON file per ready region.
import { mkdir, writeFile } from 'node:fs/promises';

const CAP = 980, EPS = 0.0001;

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
  // us: { ... }  // add when the US store API is wired up
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

async function harvest(r, facet, tag, db) {
  let lo = 0;
  while (lo <= r.maxPrice) {
    let hi = Math.min(lo + 2, r.maxPrice + EPS);
    let c = await count(r, lo, hi, facet);
    while (c >= CAP && hi - lo > 0.005) { hi = lo + (hi - lo) / 2; c = await count(r, lo, hi, facet); }
    const j = await query(r, {
      numericFilters: rangeNF(r, lo, hi), filters: facetOf(r, facet),
      hitsPerPage: 1000, page: 0, attributesToRetrieve: ['title', 'url', 'price', 'objectID'],
    });
    for (const h of j.hits) {
      const reg = r.getPrice(h);
      if (h.objectID == null || reg == null || reg <= 0 || reg > r.maxPrice) continue;
      const cur = db[h.objectID] || { title: h.title, price: reg, url: r.origin + (h.url || ''), filters: [] };
      if (!cur.filters.includes(tag)) cur.filters.push(tag);
      db[h.objectID] = cur;
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
