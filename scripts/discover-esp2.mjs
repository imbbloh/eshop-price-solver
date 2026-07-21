// One-off diagnostic: render a specific eshop-prices.com game page with a real
// browser (Playwright + stealth, same approach artfetcher's fetcher.js uses)
// and dump the region rows, to see whether SG/JP data is present in the raw
// page but mis-parsed, or genuinely absent at the source.
import { chromium } from 'playwright';

const URL = 'https://eshop-prices.com/games/18300-ea-sports-fc-26?currency=SGD';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  const html = await page.content();
  console.log('=== HTML length ===', html.length);

  // Dump any text mentioning Singapore / Japan / SGD / JPY anywhere on the page
  const bodyText = await page.evaluate(() => document.body.innerText);
  const lines = bodyText.split('\n').map(s => s.trim()).filter(Boolean);
  console.log('=== Lines mentioning Singapore/Japan/SGD/JPY ===');
  for (let i = 0; i < lines.length; i++) {
    if (/singapore|japan|sgd|jpy|hong kong|hkd/i.test(lines[i])) {
      console.log(`[${i}]`, lines.slice(Math.max(0, i - 2), i + 3).join(' | '));
    }
  }

  console.log('=== Full body text (first 6000 chars) ===');
  console.log(bodyText.slice(0, 6000));

  await browser.close();
}

main().catch(e => { console.error('ERROR', e); process.exit(1); });
