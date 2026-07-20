// TEMPORARY diagnostic script — run once via GitHub Actions (which has real internet
// access, unlike the dev sandbox) to discover the Algolia config for the US/CA/MX
// Nintendo eShop stores. Delete after use.

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function tryQuery(appId, apiKey, index) {
  const url = `https://${appId}-dsn.algolia.net/1/indexes/${index}/query`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'x-algolia-api-key': apiKey,
        'x-algolia-application-id': appId,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: JSON.stringify({ hitsPerPage: 2, attributesToRetrieve: ['title', 'url', 'price', 'objectID', 'topLevelFilters'] }),
    });
    const text = await res.text();
    let short = text;
    try { const j = JSON.parse(text); short = JSON.stringify({ nbHits: j.nbHits, hit0: j.hits && j.hits[0] }); } catch {}
    console.log(`  [${res.status}] appId=${appId} key=${apiKey.slice(0,6)}… index=${index} -> ${short.slice(0,400)}`);
  } catch (e) {
    console.log(`  [ERR] appId=${appId} key=${apiKey.slice(0,6)}… index=${index} -> ${e.message}`);
  }
}

async function tryFetchPage(label, url) {
  console.log(`\n=== Fetching page: ${label} (${url}) ===`);
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html' } });
    console.log(`  status: ${res.status}`);
    const html = await res.text();
    console.log(`  length: ${html.length}`);
    const algoliaMentions = [...html.matchAll(/[\s"'=(]([A-Z0-9]{10})-dsn\.algolia\.net/gi)].map(m => m[1]);
    console.log(`  appId-like matches in HTML: ${[...new Set(algoliaMentions)].join(', ') || 'none'}`);
    const hexKeys = [...html.matchAll(/[\s"'=:]([a-f0-9]{32})[\s"',)]/gi)].map(m => m[1]);
    console.log(`  32-hex-char matches in HTML (candidate keys): ${[...new Set(hexKeys)].slice(0,10).join(', ') || 'none'}`);
    const idxNames = [...html.matchAll(/store_game_[a-z_]+/gi)].map(m => m[0]);
    console.log(`  index-name-like matches: ${[...new Set(idxNames)].join(', ') || 'none'}`);
    // find script src bundle URLs
    const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/gi)].map(m => m[1]).filter(s => s.includes('/_next/') || s.includes('static'));
    console.log(`  script bundles found: ${scripts.length}`);
    return { html, scripts };
  } catch (e) {
    console.log(`  [ERR] ${e.message}`);
    return null;
  }
}

async function scanBundle(base, src) {
  const url = src.startsWith('http') ? src : new URL(src, base).href;
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA } });
    if (!res.ok) return;
    const js = await res.text();
    if (/algolia/i.test(js)) {
      console.log(`\n  >>> ALGOLIA MENTION in bundle ${url}`);
      const appIdM = [...js.matchAll(/[\s"'=(]([A-Z0-9]{10})-dsn\.algolia\.net/gi)].map(m => m[1]);
      const appId2 = [...js.matchAll(/applicationID["']?\s*[:=]\s*["']([A-Z0-9]{6,12})["']/gi)].map(m => m[1]);
      const keys = [...js.matchAll(/[\s"'=:]([a-f0-9]{32})[\s"',)]/gi)].map(m => m[1]);
      const idx = [...js.matchAll(/store_game_[a-z_]+/gi)].map(m => m[0]);
      console.log(`      appId matches: ${[...new Set([...appIdM, ...appId2])].join(', ') || 'none'}`);
      console.log(`      key matches: ${[...new Set(keys)].slice(0,10).join(', ') || 'none'}`);
      console.log(`      index matches: ${[...new Set(idx)].join(', ') || 'none'}`);
    }
  } catch (e) {
    // ignore
  }
}

async function main() {
  console.log('### Step 1: known BR appId/key against candidate US/CA/MX index names ###');
  const knownAppId = 'U3B6GR4UA3';
  const candidateKeys = ['a29c6927638bfd8cee23993e51e721c9', 'c4da8be7fd29f0f5bfa42920b0a99dc7', '9a20c93440cf63cf1a7008d75f7438bf'];
  const candidateIndexes = [
    'store_game_en_us_price_asc', 'store_game_en_us', 'store_game_us_price_asc',
    'store_game_en_ca_price_asc', 'store_game_en_ca',
    'store_game_es_mx_price_asc', 'store_game_es_mx',
  ];
  for (const key of candidateKeys) {
    for (const idx of candidateIndexes) {
      await tryQuery(knownAppId, key, idx);
    }
  }

  console.log('\n### Step 2: fetch store pages and scan for embedded algolia config ###');
  const pages = {
    us: 'https://www.nintendo.com/us/store/games/',
    ca: 'https://www.nintendo.com/en-ca/store/games/',
    mx: 'https://www.nintendo.com/es-mx/store/games/',
  };
  for (const [label, url] of Object.entries(pages)) {
    const r = await tryFetchPage(label, url);
    if (r && r.scripts.length) {
      for (const s of r.scripts.slice(0, 40)) {
        await scanBundle(url, s);
      }
    }
  }

  console.log('\n### DONE ###');
}

main().catch(e => { console.error(e); process.exit(1); });
