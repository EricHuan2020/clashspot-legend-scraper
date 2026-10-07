# Clashspot Legend Tag Scraper

GitHub Action that scrapes the Clashspot legend league ranking pages and saves player tags to JSON using a headless browser to avoid bot detection.

## How it works

- Runs on a daily schedule (3 AM UTC) and can be triggered manually via `workflow_dispatch`.
- Uses **Puppeteer** to run a headless Chrome browser that loads each ranking page naturally.
- Includes anti-detection measures:
  - Realistic User-Agent headers
  - Disabled webdriver detection
  - Waits for network idle to ensure content loads
  - Random delays between page requests
- Extracts player tags from URLs matching `/en/player/XXXX/`
- Saves results to `output/clashspot-legend-tags.json`

## Files

- `scrape_clashspot.js` — Puppeteer-based scraper
- `package.json` — Node dependencies (Puppeteer)
- `.github/workflows/clashspot-scraper.yml` — GitHub Action workflow
- `README.md` — This file

## Run locally

```bash
npm install
npm run scrape
```

Environment variables:

- `START_PAGE` — Starting page number (default: 1)
- `MAX_PAGES` — Maximum pages to scrape (default: 200)
- `DELAY_MS` — Delay between requests in milliseconds (default: 800)
- `OUTPUT_PATH` — Output JSON file path (default: `output/clashspot-legend-tags.json`)

```bash
START_PAGE=1 MAX_PAGES=50 DELAY_MS=1000 npm run scrape
```

## Why Puppeteer instead of fetch?

Clashspot.net returns HTTP 403 when requests come from non-browser clients or automated tools. Puppeteer launches a real Chrome browser instance that behaves like a human user, avoiding bot detection while still automating the scraping process.

## Output format

```json
[
  "#ABC123",
  "#XYZ789",
  ...
]
```

## Notes

- The scraper respects rate limits with configurable delays.
- On GitHub Actions, the workflow pushes updated results back to the repository daily.
- You can manually trigger the workflow from the Actions tab.
