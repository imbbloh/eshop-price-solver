import axios from 'axios';

const LC_WORDS = new Set(['a','an','the','and','but','or','nor','for','so','yet','at','by','in','of','on','to','up','as','if','vs','via']);
const TITLEDB_BASE = 'https://raw.githubusercontent.com/blawar/titledb/master';
const TITLEDB_REGIONS = { JP: 'JP.ja.json', HK: 'HK.zh.json' };
const titledbCache = new Map();
const TITLEDB_TTL = 24 * 60 * 60 * 1000;
let titledbLoadChain = Promise.resolve();

async function loadTitledb(region, emit) {
  const cached = titledbCache.get(region);
  if (cached && Date.now() - cached.time < TITLEDB_TTL) return cached.entries;
  const file = TITLEDB_REGIONS[region];
  if (!file) return [];
  const task = titledbLoadChain.then(async () => {
    const cached2 = titledbCache.get(region);
    if (cached2 && Date.now() - cached2.time < TITLEDB_TTL) return cached2.entries;
    try {
      emit(`titledb (${region}): fetching ${file}...`);
      const t0 = Date.now();
      const res = await axios.get(`${TITLEDB_BASE}/${file}`, { timeout: 60000 });
      const raw = res.data;
      const entries = [];
      for (const nsuid in raw) {
        const name = raw[nsuid]?.name;
        if (name) entries.push({ nsuid, name });
      }
      titledbCache.set(region, { entries, time: Date.now() });
      emit(`titledb (${region}): ${entries.length} titles cached in ${Date.now()-t0}ms, RSS now ${(process.memoryUsage().rss/1024/1024).toFixed(0)}MB`);
      return entries;
    } catch (e) {
      emit(`titledb (${region}): ${e.message.slice(0, 60)}`);
      return [];
    }
  });
  titledbLoadChain = task.catch(() => {});
  return task;
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

async function main() {
  console.log(`RSS before: ${(process.memoryUsage().rss/1024/1024).toFixed(0)}MB`);
  // Simulate production: findHK() and findJP() both call this concurrently via Promise.all
  const [jpIds, hkIds] = await Promise.all([
    findNsuidsViaTitledb('JP', 'EA Sports Fc 26', console.log),
    findNsuidsViaTitledb('HK', 'EA Sports Fc 26', console.log),
  ]);
  console.log(`Concurrent call result: JP=${jpIds}, HK=${hkIds}`);
  console.log(`Peak RSS after concurrent load: ${(process.memoryUsage().rss/1024/1024).toFixed(0)}MB`);

  if (global.gc) { global.gc(); console.log(`RSS after manual GC: ${(process.memoryUsage().rss/1024/1024).toFixed(0)}MB`); }

  const t0 = Date.now();
  await Promise.all([
    findNsuidsViaTitledb('JP', 'EA Sports Fc 26', () => {}),
    findNsuidsViaTitledb('HK', 'EA Sports Fc 26', () => {}),
  ]);
  console.log(`Second (cached) concurrent call took ${Date.now() - t0}ms`);
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
