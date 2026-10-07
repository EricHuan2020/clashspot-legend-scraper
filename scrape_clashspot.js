const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://clashspot.net/en/rankings/players/legend';
const START_PAGE = Number(process.env.START_PAGE || 1);
const MAX_PAGES = Number(process.env.MAX_PAGES || 200);
const DELAY_MS = Number(process.env.DELAY_MS || 800);
const OUTPUT_PATH = process.env.OUTPUT_PATH || 'output/clashspot-legend-tags.json';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractTags(html) {
  const tagSet = new Set();
  const matchAll = html.matchAll(/\/en\/player\/([A-Z0-9]+)\//gi);

  for (const match of matchAll) {
    tagSet.add('#' + match[1]);
  }

  return Array.from(tagSet);
}

async function fetchPage(pageNum) {
  const url = `${BASE_URL}?p=${pageNum}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ClashspotLegendScraper/1.0)',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} on page ${pageNum}`);
  }

  return res.text();
}

async function main() {
  const outputDir = path.dirname(OUTPUT_PATH);
  fs.mkdirSync(outputDir, { recursive: true });

  const allTags = new Set();
  let page = START_PAGE;
  let totalPages = null;

  while (page <= MAX_PAGES) {
    console.log(`Fetching page ${page}${totalPages ? ' / ' + totalPages : ''}...`);

    try {
      const html = await fetchPage(page);
      const tags = extractTags(html);

      if (tags.length === 0) {
        console.log(`No tags found on page ${page}; stopping.`);
        break;
      }

      for (const tag of tags) allTags.add(tag);

      const totalMatch = html.match(/Page\s+\d+\s+of\s+([\d,]+)/i);
      if (totalMatch) {
        totalPages = parseInt(totalMatch[1].replace(/,/g, ''), 10);
      }

      if (totalPages && page >= totalPages) {
        console.log(`Reached the end of the leaderboard (${totalPages} pages).`);
        break;
      }

      page += 1;
      await sleep(DELAY_MS);
    } catch (err) {
      console.warn(`Stopped early at page ${page}: ${err.message}`);
      break;
    }
  }

  const finalTags = Array.from(allTags);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalTags, null, 2));
  console.log(`Saved ${finalTags.length} tags to ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
