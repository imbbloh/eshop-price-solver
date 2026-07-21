// Verify the bulk JP catalog XML feeds (referenced by nintendo-switch-eshop's
// getGamesJapan) are real, and check whether they carry NSUID / title_id.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function probe(name, url) {
  console.log(`\n=== ${name} ===`);
  console.log('URL:', url);
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA } });
    console.log('status:', res.status, res.statusText);
    console.log('content-type:', res.headers.get('content-type'));
    console.log('content-length:', res.headers.get('content-length'));
    const text = await res.text();
    console.log('total length:', text.length);
    console.log('first 3000 chars:');
    console.log(text.slice(0, 3000));
  } catch (e) {
    console.log('ERROR:', e.message);
  }
}

async function main() {
  await probe('switch-onsale.xml', 'https://www.nintendo.co.jp/data/software/xml-system/switch-onsale.xml');
  await probe('switch-coming.xml', 'https://www.nintendo.co.jp/data/software/xml-system/switch-coming.xml');
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
