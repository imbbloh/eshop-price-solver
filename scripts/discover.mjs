// TEMPORARY: find a secondary facet/attribute to sub-partition an oversized
// price cluster (3214 games at exactly $4.99 in US, capped at 1000 by Algolia).
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
  const index = 'store_game_en_us_price_asc';
  // full hit object, no attribute restriction
  const j0 = await query(index, { hitsPerPage: 1, numericFilters: ['price.regPrice>=4.989','price.regPrice<=4.991'] });
  console.log('FULL HIT:', JSON.stringify(j0.hits && j0.hits[0], null, 2));

  // ask algolia what facets are configured on the index
  const j1 = await query(index, { hitsPerPage: 0, facets: ['*'], numericFilters: ['price.regPrice>=4.989','price.regPrice<=4.991'] });
  console.log('\nALL FACETS ON THIS SUBSET:', JSON.stringify(Object.keys(j1.facets || {}), null, 2));
  for (const [k, v] of Object.entries(j1.facets || {})) {
    console.log(`  facet ${k}: ${JSON.stringify(v).slice(0,300)}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
