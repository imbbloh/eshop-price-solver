// TEMPORARY: find the actual browse/listing endpoint on ec.nintendo.com for
// HK/SG (legacy platform, confirmed alive), and check whether JP's waiting-room
// gate can be bypassed with a plain fetch (likely not, but worth confirming).
// Delete after use.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function check(label, url) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: '*/*' }, redirect: 'follow' });
    const text = await res.text();
    console.log(`  [${res.status}] ${label} -> finalURL=${res.url} len=${text.length}`);
    return { status: res.status, text, finalURL: res.url };
  } catch (e) {
    console.log(`  [ERR] ${label} -> ${e.message}`);
    return null;
  }
}

async function main() {
  console.log('### robots.txt / sitemap probes ###');
  for (const base of ['https://ec.nintendo.com', 'https://store-jp.nintendo.com']) {
    await check(`${base}/robots.txt`, `${base}/robots.txt`);
    await check(`${base}/sitemap.xml`, `${base}/sitemap.xml`);
  }

  console.log('\n### ec.nintendo.com HK/SG browse-page guesses ###');
  const paths = [
    '/HK/zh/search/software', '/HK/zh/genre/software', '/HK/zh/categories/software',
    '/HK/zh/all', '/HK/zh/', '/HK/', '/HK/zh/software/all',
    '/SG/en/all', '/SG/en/', '/SG/',
  ];
  for (const p of paths) {
    const r = await check(p, `https://ec.nintendo.com${p}`);
    if (r && r.status === 200 && r.text.length > 5000) {
      const idx = [...r.text.matchAll(/[\s"'=(]([A-Z0-9]{10})-dsn\.algolia\.net/gi)].map(m => m[1]);
      const apiHints = [...r.text.matchAll(/https?:\/\/[a-z0-9.-]*(?:api|search|graphql)[a-z0-9.-]*\/[^\s"'\\]{0,80}/gi)].map(m => m[0]);
      console.log(`    -> algolia: ${[...new Set(idx)].join(', ') || 'none'}; api hints: ${[...new Set(apiHints)].slice(0, 5).join(', ') || 'none'}`);
    }
  }

  console.log('\n### JP waiting-room bypass check (try with cookies/session header, likely fails) ###');
  const jp = await check('JP direct', 'https://store-jp.nintendo.com/list/software/switch/');
  if (jp) console.log('    body preview:', jp.text.slice(0, 300).replace(/\n/g, ' '));

  console.log('\n### DONE ###');
}
main().catch(e => { console.error(e); process.exit(1); });
