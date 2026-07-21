// Full end-to-end verification: titledb JP.ja.json (community-maintained,
// 32k+ entries, includes 2025/2026 releases) -> NSUID -> live price API.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function main() {
  // NSUID for "EA SPORTS FC 26" (JP), found via titledb lookup done locally.
  const nsuid = '70010000091349';
  const url = `https://api.ec.nintendo.com/v1/price?country=JP&lang=ja&ids=${nsuid}`;
  console.log('URL:', url);
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  console.log('status:', res.status);
  console.log('body:', await res.text());
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
