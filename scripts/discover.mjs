// TEMPORARY: Algolia's /browse endpoint isn't subject to the 1000-hit search cap.
// Check whether our public search-only key is allowed to use it.
const appId = 'U3B6GR4UA3', apiKey = 'a29c6927638bfd8cee23993e51e721c9';
async function browse(index, body) {
  const res = await fetch(`https://${appId}-dsn.algolia.net/1/indexes/${index}/browse`, {
    method: 'POST',
    headers: { 'x-algolia-api-key': apiKey, 'x-algolia-application-id': appId, 'content-type': 'application/x-www-form-urlencoded' },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}
async function main() {
  const index = 'store_game_en_us_price_asc';
  const { status, json } = await browse(index, {
    numericFilters: ['price.regPrice>=4.989', 'price.regPrice<=4.991'],
    hitsPerPage: 1000,
    attributesToRetrieve: ['objectID'],
  });
  console.log('browse page1 status', status, 'nbHits', json.nbHits, 'hits', json.hits ? json.hits.length : 'n/a', 'cursor?', !!json.cursor, 'err', json.message || '');
  if (json.cursor) {
    const { status: s2, json: j2 } = await browse(index, { cursor: json.cursor });
    console.log('browse page2 status', s2, 'hits', j2.hits ? j2.hits.length : 'n/a', 'cursor?', !!j2.cursor, 'err', j2.message || '');
  }
}
main().catch(e => { console.error(e); process.exit(1); });
