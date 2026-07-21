import axios from 'axios';

const LC_WORDS = new Set(['a','an','the','and','but','or','nor','for','so','yet','at','by','in','of','on','to','up','as','if','vs','via']);
const TITLEDB_BASE = 'https://raw.githubusercontent.com/blawar/titledb/master';
const TITLEDB_REGIONS = { JP: 'JP.ja.json', HK: 'HK.zh.json' };
const titledbCache = new Map();
const TITLEDB_TTL = 24 * 60 * 60 * 1000;

async function loadTitledb(region, emit) {
  const cached = titledbCache.get(region);
  if (cached && Date.now() - cached.time < TITLEDB_TTL) return cached.entries;
  const file = TITLEDB_REGIONS[region];
  if (!file) return [];
  try {
    emit(`titledb (${region}): fetching ${file}...`);
    const res = await axios.get(`${TITLEDB_BASE}/${file}`, { timeout: 60000 });
    const raw = res.data;
    const entries = [];
    for (const nsuid in raw) {
      const name = raw[nsuid]?.name;
      if (name) entries.push({ nsuid, name });
    }
    titledbCache.set(region, { entries, time: Date.now() });
    emit(`titledb (${region}): ${entries.length} titles cached`);
    return entries;
  } catch (e) {
    emit(`titledb (${region}): ${e.message.slice(0, 60)}`);
    return [];
  }
}

async function findNsuidsViaTitledb(region, searchName, emit) {
  const entries = await loadTitledb(region, emit);
  if (!entries.length || !searchName) return [];
  const words = searchName.toLowerCase().split(/\W+/).filter(w => w && !LC_WORDS.has(w));
  if (!words.length) return [];
  const candidates = entries.filter(e => {
    const n = e.name.toLowerCase();
    return words.every(w => n.includes(w));
  });
  if (!candidates.length) { emit(`titledb (${region}): no match for "${searchName}"`); return []; }
  candidates.sort((a, b) => a.name.length - b.name.length);
  const best = candidates[0];
  emit(`titledb (${region}): matched "${best.name}" -> ${best.nsuid} (${candidates.length} candidate(s))`);
  return [best.nsuid];
}

async function testCase(name, searchTerm) {
  console.log(`\n=== TEST: ${name} (search="${searchTerm}") ===`);
  const jpIds = await findNsuidsViaTitledb('JP', searchTerm, console.log);
  if (jpIds.length) {
    const res = await axios.get(`https://api.ec.nintendo.com/v1/price?country=JP&lang=ja&ids=${jpIds[0]}`, { timeout: 20000 });
    console.log('JP price check:', JSON.stringify(res.data));
  }
  const hkIds = await findNsuidsViaTitledb('HK', searchTerm, console.log);
  if (hkIds.length) {
    const res = await axios.get(`https://api.ec.nintendo.com/v1/price?country=HK&lang=zh&ids=${hkIds[0]}`, { timeout: 20000 });
    console.log('HK price check:', JSON.stringify(res.data));
  }
}

async function main() {
  const memBefore = process.memoryUsage().rss / 1024 / 1024;
  await testCase('EA Sports FC 26', 'EA Sports Fc 26');
  console.log(`Memory after JP+HK load: ${(process.memoryUsage().rss/1024/1024).toFixed(0)}MB (was ${memBefore.toFixed(0)}MB)`);

  // Additional sanity test: a game with a genuinely short/common title, to
  // check for false positives on unrelated titles too.
  await testCase('Zelda BOTW (translated JP title, expect weak/no match)', 'The Legend Of Zelda Breath Of The Wild');

  const t0 = Date.now();
  await findNsuidsViaTitledb('JP', 'EA Sports Fc 26', () => {});
  console.log(`\nCached lookup took ${Date.now() - t0}ms`);
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
