// TEMPORARY: enumerate topLevelFilters facet values (+counts) for the new regions,
// and probe the actual max price and windowing density so we can pick sane region caps.
const appId = 'U3B6GR4UA3', apiKey = 'a29c6927638bfd8cee23993e51e721c9';
async function query(index, body) {
  const res = await fetch(`https://${appId}-dsn.algolia.net/1/indexes/${index}/query`, {
    method: 'POST',
    headers: { 'x-algolia-api-key': apiKey, 'x-algolia-application-id': appId, 'content-type': 'application/x-www-form-urlencoded' },
    body: JSON.stringify(body),
  });
  return res.json();
}
async function main() {
  const indexes = {
    us: 'store_game_en_us_price_asc',
    ca: 'store_game_en_ca_price_asc',
    mx: 'store_game_es_mx_price_asc',
  };
  for (const [region, index] of Object.entries(indexes)) {
    console.log(`\n=== ${region} (${index}) ===`);
    const j = await query(index, { hitsPerPage: 0, facets: ['topLevelFilters'], numericFilters: ['price.regPrice>0'] });
    console.log('nbHits (price>0):', j.nbHits);
    console.log('facets:', JSON.stringify(j.facets, null, 2));
    // price distribution sample: count under various caps
    for (const cap of [10, 20, 30, 40, 60, 80]) {
      const c = await query(index, { hitsPerPage: 0, numericFilters: [`price.regPrice>0`, `price.regPrice<=${cap}`] });
      console.log(`  games with 0 < price <= ${cap}: ${c.nbHits}`);
    }
    // densest price point check within a plausible cap (windowing safety, cap=60)
    const dense = await query(index, { hitsPerPage: 0, numericFilters: ['price.regPrice>=0','price.regPrice<2'] });
    console.log('  count in [0,2):', dense.nbHits);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
