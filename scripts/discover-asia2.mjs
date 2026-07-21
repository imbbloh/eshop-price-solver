// TEMPORARY: figure out what actually powers the JP/HK/SG eShop storefronts.
// Delete after use.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function fetchPage(label, url) {
  console.log(`\n=== ${label}: ${url} ===`);
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html' }, redirect: 'follow' });
    console.log(`  status: ${res.status}  finalURL: ${res.url}`);
    const html = await res.text();
    console.log(`  length: ${html.length}`);
    return html;
  } catch (e) {
    console.log(`  [ERR] ${e.message}`);
    return null;
  }
}

function scanForClues(html, base) {
  if (!html) return { scripts: [] };
  const algolia = [...html.matchAll(/[\s"'=(]([A-Z0-9]{10})-dsn\.algolia\.net/gi)].map(m => m[1]);
  const idxNames = [...html.matchAll(/store_game_[a-z_]+/gi)].map(m => m[0]);
  const apiHints = [...html.matchAll(/https?:\/\/[a-z0-9.-]*(?:api|search|algolia|graphql)[a-z0-9.-]*\/[^\s"'\\]{0,80}/gi)].map(m => m[0]);
  console.log(`  appId-like matches: ${[...new Set(algolia)].join(', ') || 'none'}`);
  console.log(`  index-name matches: ${[...new Set(idxNames)].join(', ') || 'none'}`);
  console.log(`  api/search URL hints: ${[...new Set(apiHints)].slice(0, 15).join('\n    ') || 'none'}`);
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/gi)].map(m => m[1]).filter(s => s.includes('/_next/') || s.includes('static') || s.includes('.js'));
  console.log(`  script bundles: ${scripts.length}`);
  return { scripts: scripts.map(s => (s.startsWith('http') ? s : new URL(s, base).href)) };
}

async function scanBundle(url) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA } });
    if (!res.ok) return;
    const js = await res.text();
    if (/algolia|search\.nintendo|graphql|typesense|elasticsearch/i.test(js)) {
      console.log(`\n  >>> HIT in bundle ${url}`);
      const algolia = [...js.matchAll(/[\s"'=(]([A-Z0-9]{10})-dsn\.algolia\.net/gi)].map(m => m[1]);
      const idx = [...js.matchAll(/store_game_[a-z_]+/gi)].map(m => m[0]);
      const other = [...js.matchAll(/(search\.nintendo[a-z0-9.-]*|typesense[a-z0-9.-]*|elastic[a-z0-9.-]*)/gi)].map(m => m[0]);
      console.log(`      appId: ${[...new Set(algolia)].join(', ') || 'none'}`);
      console.log(`      index: ${[...new Set(idx)].join(', ') || 'none'}`);
      console.log(`      other search hints: ${[...new Set(other)].slice(0, 10).join(', ') || 'none'}`);
    }
  } catch {}
}

async function main() {
  const candidates = {
    'JP modern store (store-jp.nintendo.com)': 'https://store-jp.nintendo.com/',
    'JP games list guess': 'https://store-jp.nintendo.com/list/software/',
    'HK nintendo.com guess': 'https://www.nintendo.com/hk/store/games/',
    'HK nintendo.com zh-hk guess': 'https://www.nintendo.com/zh-hant-hk/store/games/',
    'SG nintendo.com guess': 'https://www.nintendo.com/en-sg/store/games/',
    'HK legacy ec.nintendo.com': 'https://ec.nintendo.com/HK/zh/software',
    'SG legacy ec.nintendo.com': 'https://ec.nintendo.com/SG/en/software',
    'Nintendo region selector': 'https://www.nintendo.com/region-selector/',
  };

  for (const [label, url] of Object.entries(candidates)) {
    const html = await fetchPage(label, url);
    const { scripts } = scanForClues(html || '', url);
    for (const s of scripts.slice(0, 30)) await scanBundle(s);
  }

  console.log('\n### DONE ###');
}
main().catch(e => { console.error(e); process.exit(1); });
