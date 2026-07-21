// TEMPORARY: verify nsuid field on existing regions + probe candidate Algolia
// indexes for SG/HK/JP. Delete after use.
const appId = 'U3B6GR4UA3', apiKey = 'a29c6927638bfd8cee23993e51e721c9';
async function query(index, body) {
  const res = await fetch(`https://${appId}-dsn.algolia.net/1/indexes/${index}/query`, {
    method: 'POST',
    headers: { 'x-algolia-api-key': apiKey, 'x-algolia-application-id': appId, 'content-type': 'application/x-www-form-urlencoded' },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

async function main() {
  console.log('### Step 1: confirm nsuid field on known-good indexes (US, BR) ###');
  for (const [label, index] of [['us', 'store_game_en_us_price_asc'], ['br', 'store_game_pt_br_price_asc']]) {
    const { status, json } = await query(index, { hitsPerPage: 1, numericFilters: ['price.regPrice>0'] });
    const hit = json.hits && json.hits[0];
    console.log(`  ${label}: status=${status} nsuid=${hit && hit.nsuid} title=${hit && hit.title} objectID=${hit && hit.objectID}`);
  }

  console.log('\n### Step 2: probe candidate SG/HK/JP index names ###');
  const candidates = {
    sg: ['store_game_en_sg_price_asc', 'store_game_sg_price_asc', 'store_game_en_sg', 'store_game_zh_sg_price_asc'],
    hk: ['store_game_en_hk_price_asc', 'store_game_zh_hk_price_asc', 'store_game_hk_price_asc', 'store_game_zh_tw_hk_price_asc'],
    jp: ['store_game_ja_jp_price_asc', 'store_game_jp_price_asc', 'store_game_ja_price_asc', 'store_game_en_jp_price_asc'],
  };
  const working = {};
  for (const [region, indexes] of Object.entries(candidates)) {
    console.log(`\n  -- ${region} --`);
    for (const index of indexes) {
      const { status, json } = await query(index, { hitsPerPage: 1 });
      const ok = status === 200 && json.nbHits > 0;
      console.log(`    [${status}] ${index} -> nbHits=${json.nbHits} err=${json.message || ''}`);
      if (ok && !working[region]) working[region] = index;
    }
  }

  console.log('\n### Step 3: full hit dump + facets for any working Asia index ###');
  for (const [region, index] of Object.entries(working)) {
    console.log(`\n  -- ${region} (${index}) full hit --`);
    const { json } = await query(index, { hitsPerPage: 1, numericFilters: ['price.regPrice>0'] });
    console.log(JSON.stringify(json.hits && json.hits[0], null, 2));
    const f = await query(index, { hitsPerPage: 0, facets: ['topLevelFilters'], numericFilters: ['price.regPrice>0'] });
    console.log('  facets:', JSON.stringify(f.json.facets));
    console.log('  total nbHits (price>0):', f.json.nbHits);
  }

  console.log('\n### DONE ###');
}
main().catch(e => { console.error(e); process.exit(1); });
