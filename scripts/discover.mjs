// TEMPORARY: check density at common decimal price points to validate the
// adaptive price-windowing algorithm won't silently truncate results (Algolia
// caps any single query at 1000 hits; windowing halves down to 0.005 resolution).
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
  const usdPoints = [0.99,1.99,2.99,3.99,4.99,5.99,6.99,7.99,9.99,12.99,14.99,19.99,24.99,29.99,39.99,49.99,59.99];
  const mxnPoints = [9.99,19.99,29.99,39.99,49.99,69.99,99.99,129.99,149.99,199.99,249.99,299.99,349.99,399.99,499.99,599.99,699.99,799.99,899.99,999.99];
  for (const [region, index] of Object.entries(indexes)) {
    const points = region === 'mx' ? mxnPoints : usdPoints;
    console.log(`\n=== ${region} density at common price points ===`);
    let worst = 0, worstP = null;
    for (const p of points) {
      const c = await query(index, { hitsPerPage: 0, numericFilters: [`price.regPrice>=${p-0.001}`, `price.regPrice<=${p+0.001}`] });
      if (c.nbHits > 50) console.log(`  ${p}: ${c.nbHits}`);
      if (c.nbHits > worst) { worst = c.nbHits; worstP = p; }
    }
    console.log(`  WORST: ${worstP} -> ${worst} hits`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
