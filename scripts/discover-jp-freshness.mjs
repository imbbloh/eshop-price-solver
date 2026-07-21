// Check whether the JP catalog XML feeds are actually maintained/current,
// or a stale/abandoned artifact. Look at the newest SalesDateStr in each,
// and whether either contains any 2025/2026 releases.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function analyze(name, url) {
  console.log(`\n=== ${name} ===`);
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  console.log('status:', res.status, 'content-length header:', res.headers.get('content-length'));
  const xml = await res.text();
  console.log('actual fetched length:', xml.length);

  const titleBlocks = [...xml.matchAll(/<TitleInfo>[\s\S]*?<\/TitleInfo>/g)];
  console.log('TitleInfo block count:', titleBlocks.length);

  const dates = [...xml.matchAll(/<SalesDateStr>([^<]*)<\/SalesDateStr>/g)].map(m => m[1]).filter(Boolean);
  console.log('dates found:', dates.length);
  const sorted = [...dates].sort();
  console.log('earliest date:', sorted[0]);
  console.log('latest date:', sorted[sorted.length - 1]);

  const recent = dates.filter(d => d.startsWith('2025') || d.startsWith('2026'));
  console.log('count of 2025/2026-dated entries:', recent.length);
  console.log('sample recent dates:', recent.slice(0, 10));

  // also grab a couple of recent title names for sanity
  if (recent.length > 0) {
    const recentDate = recent[0];
    const idx = xml.indexOf(recentDate);
    const blockStart = xml.lastIndexOf('<TitleInfo>', idx);
    const blockEnd = xml.indexOf('</TitleInfo>', idx) + '</TitleInfo>'.length;
    console.log('sample recent block:', xml.slice(blockStart, blockEnd));
  }
}

async function main() {
  await analyze('switch-onsale.xml', 'https://www.nintendo.co.jp/data/software/xml-system/switch-onsale.xml');
  await analyze('switch-coming.xml', 'https://www.nintendo.co.jp/data/software/xml-system/switch-coming.xml');
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
