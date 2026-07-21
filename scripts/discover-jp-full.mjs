// Final verification: count titles in the JP catalog XML, and confirm the
// price API accepts a batch (comma-separated) ids query.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function main() {
  const res = await fetch('https://www.nintendo.co.jp/data/software/xml-system/switch-onsale.xml', { headers: { 'user-agent': UA } });
  const xml = await res.text();
  const nsuids = [...xml.matchAll(/<Nsuid>(\d+)<\/Nsuid>/g)].map(m => m[1]);
  console.log('onsale.xml total size:', xml.length, 'bytes');
  console.log('onsale.xml title count:', nsuids.length);
  console.log('sample nsuids:', nsuids.slice(0, 5));

  const comingRes = await fetch('https://www.nintendo.co.jp/data/software/xml-system/switch-coming.xml', { headers: { 'user-agent': UA } });
  const comingXml = await comingRes.text();
  const comingNsuids = [...comingXml.matchAll(/<Nsuid>(\d+)<\/Nsuid>/g)].map(m => m[1]);
  console.log('coming.xml title count:', comingNsuids.length);

  // batch price query
  const batchIds = nsuids.slice(0, 5).join(',');
  console.log('\n=== batch price query ===');
  console.log('ids:', batchIds);
  const priceRes = await fetch(`https://api.ec.nintendo.com/v1/price?country=JP&lang=ja&ids=${batchIds}`, { headers: { 'user-agent': UA } });
  console.log('status:', priceRes.status);
  const priceJson = await priceRes.json();
  console.log(JSON.stringify(priceJson, null, 2));
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
