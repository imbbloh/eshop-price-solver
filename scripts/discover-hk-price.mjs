// Verify the api.ec.nintendo.com price endpoint works for HK (and probe SG
// with the same shape), per user-suggested URL pattern.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function probe(name, url) {
  console.log(`\n=== ${name} ===`);
  console.log('URL:', url);
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA } });
    console.log('status:', res.status, res.statusText);
    console.log('content-type:', res.headers.get('content-type'));
    const text = await res.text();
    console.log('body:', text.slice(0, 1000));
  } catch (e) {
    console.log('ERROR:', e.message);
  }
}

async function main() {
  await probe('HK (user-suggested id)', 'https://api.ec.nintendo.com/v1/price?country=HK&lang=ja&ids=70010000009367');
  await probe('HK (lang=zh variant)', 'https://api.ec.nintendo.com/v1/price?country=HK&lang=zh&ids=70010000009367');
  await probe('SG (same id, control)', 'https://api.ec.nintendo.com/v1/price?country=SG&lang=en&ids=70010000009367');
  await probe('SG (en variant, well-known old id)', 'https://api.ec.nintendo.com/v1/price?country=SG&lang=en&ids=70010000000026');
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
