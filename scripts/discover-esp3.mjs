// One-off diagnostic: render with playwright-extra + stealth (matching
// artfetcher's fetcher.js approach) to get past Cloudflare, then inspect
// the actual DOM structure of the SG/JP rows for this game.
import { chromium } from 'playwright-extra';
import Stealth from 'puppeteer-extra-plugin-stealth';

chromium.use(Stealth());

const URL = 'https://eshop-prices.com/games/18300-ea-sports-fc-26?currency=SGD';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(4000);

  const html = await page.content();
  console.log('=== HTML length ===', html.length);
  console.log('=== Title ===', await page.title());

  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('=== Full body text ===');
  console.log(bodyText);

  // Try to find raw HTML around Singapore/Japan mentions for structural inspection
  console.log('=== Raw HTML snippets near Singapore/Japan ===');
  for (const kw of ['Singapore', 'Japan']) {
    const idx = html.indexOf(kw);
    if (idx >= 0) {
      console.log(`--- ${kw} @ ${idx} ---`);
      console.log(html.slice(Math.max(0, idx - 400), idx + 400));
    } else {
      console.log(`--- ${kw}: not found in raw HTML ---`);
    }
  }

  await browser.close();
}

main().catch(e => { console.error('ERROR', e); process.exit(1); });
