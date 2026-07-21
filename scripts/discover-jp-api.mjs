// One-off diagnostic: test whether Nintendo's legacy price/search APIs for
// Japan still work post-migration to store-jp.nintendo.com, as an alternative
// to scraping the bot-gated storefront. Plain fetch, no browser needed if
// these are genuine JSON/REST endpoints.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function probe(name, url, opts = {}) {
  console.log(`\n=== ${name} ===`);
  console.log('URL:', url);
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json,text/html,*/*', ...opts.headers }, redirect: 'manual' });
    console.log('status:', res.status, res.statusText);
    console.log('location:', res.headers.get('location'));
    console.log('content-type:', res.headers.get('content-type'));
    const text = await res.text();
    console.log('body (first 1500 chars):', text.slice(0, 1500));
  } catch (e) {
    console.log('ERROR:', e.message);
  }
}

async function main() {
  // 1. Legacy price API — needs a real NSUID. Try a well-known long-lived
  // title's NSUID pattern from nintendeals docs (Zelda BOTW-ish range) plus
  // a couple of guesses; if the endpoint itself 404s/dies that's answer enough.
  await probe('price API (JP, sample id)', 'https://api.ec.nintendo.com/v1/price?country=JP&lang=ja&ids=70010000000026');
  await probe('price API (US, sample id, control)', 'https://api.ec.nintendo.com/v1/price?country=US&lang=en&ids=70010000000026');

  // 2. Legacy search API
  await probe('legacy search API (new releases)', 'https://ec.nintendo.com/api/JP/ja/search/new');

  // 3. Direct store-jp title page (bypassing homepage/browse entry point)
  await probe('store-jp direct title page', 'https://store-jp.nintendo.com/list/software/70010000000026.html');

  // 4. store-jp root, for comparison (expect waiting-room redirect, confirmed earlier)
  await probe('store-jp root (control, expect waiting room)', 'https://store-jp.nintendo.com/');
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
