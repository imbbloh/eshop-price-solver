# eshop-price-solver

A single-page tool that finds combinations of Nintendo eShop games whose **original prices**
(sale prices ignored) sum **exactly** to a target amount — e.g. spending down a leftover
eShop gift card balance. Live at:

**https://imbbloh.github.io/eshop-price-solver/**

Supports four regions: Brazil, United States, Canada, and Mexico.

## Repo layout

```
index.html                     # the whole app (single page, dark Nintendo-style UI)
scripts/scrape.mjs             # Node scraper run by GitHub Actions
.github/workflows/refresh.yml  # cron (daily) + manual trigger; regenerates data/ and commits it
data/{br,us,ca,mx}.json        # auto-generated per-region datasets
```

## How it works

1. `refresh.yml` runs `scripts/scrape.mjs` on a schedule. It queries each region's Nintendo
   eShop search index (Algolia) and writes `data/<region>.json`, committing only if the data
   changed.
2. `index.html` loads `data/<region>.json` on page load — every visitor gets the same
   pre-scraped dataset, no per-device fetching required. A "Update Games" button in the page
   lets you manually re-scrape from the browser as a fallback (same logic, run client-side).
3. The solver does an exact-subset-sum search (iterative deepening, prefix-sum pruning) over
   the loaded games for whatever target amount and category filter you enter.

## Region config

All four regions share one Algolia application (`U3B6GR4UA3`) and search key; only the index
name and category-facet strings differ per locale. Each region has its own price cap (max
game price the scraper will consider), chosen to keep the dataset small and the search fast:

| Region | Price cap | Algolia index |
|---|---|---|
| Brazil | R$30 | `store_game_pt_br_price_asc` |
| United States | $10 | `store_game_en_us_price_asc` |
| Canada | $10 CAD | `store_game_en_ca_price_asc` |
| Mexico | 250 MXN | `store_game_es_mx_price_asc` |

**Per-price cap:** the scraper keeps at most **10 titles per unique price point**, enforced
globally across all category passes for a region (not per-category). Larger regions like the
US have thousands of titles clustered at common price points (e.g. $4.99); recovering all of
them isn't useful for the solver and made scrapes much slower, so oversaturated prices are
sampled instead of exhaustively fetched. One side effect: since the untagged "base" pass runs
first and usually fills a price's 10 slots before category-specific passes (`dlc`, `deals`,
`game_voucher`, etc.) run, those categories may show few or no results at busy prices.

## Adding a new region

1. Find the region's Algolia index name and category-facet strings (open the store's game
   listing page, capture the XHR to `*.algolia.net`).
2. Add a region block to `REGIONS` in both `scripts/scrape.mjs` and `index.html` (they're kept
   in sync manually — same config shape, same scraping logic in both places).
3. Add a tab button + SVG flag in `index.html`.
4. Run the "Refresh eShop data" workflow manually (Actions tab) to generate the new
   `data/<region>.json`, then verify the live site.
