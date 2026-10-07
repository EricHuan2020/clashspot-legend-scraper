const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const BASE_URL = 'https://clashspot.net/en/rankings/players/legend';
const START_PAGE = Number(process.env.START_PAGE || 1);
const MAX_PAGES = Number(process.env.MAX_PAGES || 200);
const DELAY_MS = Number(process.env.DELAY_MS || 800);
const OUTPUT_PATH = process.env.OUTPUT_PATH || 'output/clashspot-legend-tags.json';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractTagsFromHtml(html) {
  const tagSet = new Set();
  const regex = /\/en\/player\/([A-Z0-9]+)\//gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    tagSet.add('#' + match[1]);
  }

  return Array.from(tagSet);
}

function extractTotalPagesFromHtml(html) {
  const match = html.match(/Page\s+\d+\s+of\s+([\d,]+)/i);
  if (!match) return null;
  return parseInt(match[1].replace(/,/g, ''), 10);
}

async function fetchPage(browser, pageNum) {
  const page = await browser.newPage();

  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Upgrade-Insecure-Requests': '1',
      'Referer': 'https://clashspot.net/'
    });

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false
      });
    });

    const url = `${BASE_URL}?p=${pageNum}`;
    console.log(`Loading ${url}...`);

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Give dynamic content a moment to render
    await page.waitForTimeout(5000);

    // Try to wait until at least one player link is visible if present
    try {
      await page.waitForFunction(
        () => document.querySelectorAll('a[href*="/en/player/"]').length > 0,
        { timeout: 15000 }
      );
    } catch (err) {
      console.warn('No player links seen yet; continuing with current DOM.');
    }

    return await page.content();
  } finally {
    await page.close();
  }
}

async function main() {
  const outputDir = path.dirname(OUTPUT_PATH);
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080'
    ]
  });

  try {
    const allTags = new Set();
    let page = START_PAGE;
    let totalPages = null;

    while (page <= MAX_PAGES) {
      console.log(`\nFetching page ${page}${totalPages ? ' / ' + totalPages : ''}...`);

      try {
        const html = await fetchPage(browser, page);
        const tags = extractTagsFromHtml(html);

        if (!tags.length) {
          console.log(`No tags found on page ${page}; stopping.`);
          break;
        }

        tags.forEach(tag => allTags.add(tag));
        console.log(`Found ${tags.length} tags on page ${page}.`);

        const parsedTotalPages = extractTotalPagesFromHtml(html);
        if (parsedTotalPages) {
          totalPages = parsedTotalPages;
          console.log(`Detected total pages: ${totalPages}`);
        }

        if (totalPages && page >= totalPages) {
          console.log(`Reached last page (${totalPages}).`);
          break;
        }

        page += 1;

        if (DELAY_MS > 0) {
          await sleep(DELAY_MS);
        }
      } catch (err) {
        console.warn(`Stopped early at page ${page}: ${err.message}`);
        break;
      }
    }

    const finalTags = Array.from(allTags);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalTags, null, 2));
    console.log(`\nSaved ${finalTags.length} unique tags to ${OUTPUT_PATH}`);
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
