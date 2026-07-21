import axios from 'axios';

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
  const words = searchName.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  if (!words.length) return [];
  const matches = entries.filter(e => {
    const n = e.name.toLowerCase();
    return words.every(w => n.includes(w));
  });
  if (matches.length) emit(`titledb (${region}): matched "${matches[0].name}" -> [${matches.map(m => m.nsuid).join(',')}]`);
  else emit(`titledb (${region}): no match for "${searchName}"`);
  return matches.map(m => m.nsuid);
}

async function main() {
  const emit = (m) => console.log(m);
  const memBefore = process.memoryUsage().rss / 1024 / 1024;

  // Simulate what Phase 1/2 pass in: gameName from toTitleCase() English source
  const jpIds = await findNsuidsViaTitledb('JP', 'EA Sports Fc 26', emit);
  const memAfterJp = process.memoryUsage().rss / 1024 / 1024;
  console.log(`Memory after JP load: ${memAfterJp.toFixed(0)}MB (was ${memBefore.toFixed(0)}MB)`);

  // Verify against live price API
  if (jpIds.length) {
    const res = await axios.get(`https://api.ec.nintendo.com/v1/price?country=JP&lang=ja&ids=${jpIds[0]}`, { timeout: 20000 });
    console.log('JP price check:', JSON.stringify(res.data));
  }

  const hkIds = await findNsuidsViaTitledb('HK', 'EA Sports Fc 26', emit);
  const memAfterHk = process.memoryUsage().rss / 1024 / 1024;
  console.log(`Memory after HK load: ${memAfterHk.toFixed(0)}MB`);

  if (hkIds.length) {
    const res = await axios.get(`https://api.ec.nintendo.com/v1/price?country=HK&lang=zh&ids=${hkIds[0]}`, { timeout: 20000 });
    console.log('HK price check:', JSON.stringify(res.data));
  }

  // Test caching: second call should be instant (no re-fetch)
  const t0 = Date.now();
  await findNsuidsViaTitledb('JP', 'EA Sports Fc 26', emit);
  console.log(`Cached lookup took ${Date.now() - t0}ms`);
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
