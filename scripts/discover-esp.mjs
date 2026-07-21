// TEMPORARY: investigate eshop-prices.com as a potential bulk data source
// (does it have a browsable/searchable listing, a JSON API, region prices
// including JP/HK/SG, and NSUIDs?). Delete after use.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function fetchText(label, url, headers = {}) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, ...headers }, redirect: 'follow' });
    const text = await res.text();
    console.log(`\n=== ${label} ===\n  ${url}\n  status=${res.status} finalURL=${res.url} len=${text.length}`);
    return { status: res.status, text, res };
  } catch (e) {
    console.log(`\n=== ${label} ===\n  [ERR] ${e.message}`);
    return null;
  }
}

function findNextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

async function main() {
  console.log('### robots.txt ###');
  const robots = await fetchText('robots.txt', 'https://eshop-prices.com/robots.txt');
  if (robots) console.log(robots.text.slice(0, 1000));

  console.log('\n### games listing page (?q=) ###');
  const listing = await fetchText('games listing', 'https://eshop-prices.com/games?q=');
  if (listing && listing.status === 200) {
    const nd = findNextData(listing.text);
    if (nd) {
      console.log('  __NEXT_DATA__ found. buildId:', nd.buildId);
      console.log('  pageProps keys:', Object.keys(nd.props?.pageProps || {}));
      console.log('  sample (first 2000 chars):', JSON.stringify(nd.props?.pageProps).slice(0, 2000));
    } else {
      console.log('  no __NEXT_DATA__ found; scanning for API/json hints');
      const apiHints = [...listing.text.matchAll(/https?:\/\/[a-z0-9.-]*(?:api|algolia|search)[a-z0-9.-]*\/[^\s"'\\]{0,100}/gi)].map(m => m[0]);
      console.log('  api hints:', [...new Set(apiHints)].slice(0, 15));
      const scripts = [...listing.text.matchAll(/<script[^>]+src="([^"]+)"/gi)].map(m => m[1]);
      console.log('  script bundles:', scripts.length, scripts.slice(0, 10));
    }
  }

  console.log('\n### games listing page with a real query (?q=zelda) ###');
  const searched = await fetchText('search zelda', 'https://eshop-prices.com/games?q=zelda');
  if (searched && searched.status === 200) {
    const nd = findNextData(searched.text);
    if (nd) {
      const pp = nd.props?.pageProps || {};
      console.log('  pageProps keys:', Object.keys(pp));
      console.log('  sample:', JSON.stringify(pp).slice(0, 3000));
    }
  }

  console.log('\n### Try Next.js JSON data endpoint directly ###');
  const nd0 = listing && findNextData(listing.text);
  if (nd0 && nd0.buildId) {
    const dataUrl = `https://eshop-prices.com/_next/data/${nd0.buildId}/games.json?q=zelda`;
    await fetchText('next data endpoint', dataUrl);
  }

  console.log('\n### A specific known game page (from earlier: nsuid 70010000064684 / Kitten Island) ###');
  const gamePage = await fetchText('game search page', 'https://eshop-prices.com/games?q=kitten+island');
  if (gamePage && gamePage.status === 200) {
    const nd = findNextData(gamePage.text);
    if (nd) console.log('  pageProps sample:', JSON.stringify(nd.props?.pageProps).slice(0, 3000));
  }

  console.log('\n### DONE ###');
}
main().catch(e => { console.error(e); process.exit(1); });
