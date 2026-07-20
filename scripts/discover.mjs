// TEMPORARY: the US index has 3214 games clustered at exactly $4.99 (far above the
// 980-item CAP the windowing algorithm assumes). Since a price window can't split
// identically-priced items further, check whether Algolia will let us paginate past
// 1000 results within one window (page/hitsPerPage), or whether we hit its default
// paginationLimitedTo=1000 wall.
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
  const index = 'store_game_en_us_price_asc';
  const nf = ['price.regPrice>=4.989', 'price.regPrice<=4.991'];
  for (const page of [0, 1, 2, 3, 4]) {
    const { status, json } = await query(index, { numericFilters: nf, hitsPerPage: 1000, page, attributesToRetrieve: ['objectID'] });
    console.log(`page=${page} status=${status} nbHits=${json.nbHits} nbPages=${json.nbPages} hitsReturned=${json.hits ? json.hits.length : 'n/a'} err=${json.message || ''}`);
  }
  // also try smaller hitsPerPage with deeper pages to see if offset cap differs
  for (const page of [0, 5, 9, 10]) {
    const { status, json } = await query(index, { numericFilters: nf, hitsPerPage: 100, page, attributesToRetrieve: ['objectID'] });
    console.log(`hpp=100 page=${page} status=${status} nbHits=${json.nbHits} hitsReturned=${json.hits ? json.hits.length : 'n/a'} err=${json.message || ''}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
