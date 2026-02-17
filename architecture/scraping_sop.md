# Scraping SOP (Standard Operating Procedure)

**Purpose:** Standardize scraping behavior across all sources to ensure reliability, consistency, and respectful data collection.

---

## Core Rules

### 1. Time Filtering
- **Window:** Only articles from last 24 hours (current UTC - 24h)
- **Calculation:** Use `date-fns` library for consistent date handling
- **Implementation:** Filter AFTER scraping to ensure accuracy

### 2. Error Handling
- **Principle:** Fail gracefully, don't break the entire pipeline
- **Action:** If one source fails, log error and continue with other sources
- **Logging:** Include timestamp, source name, error message, and stack trace

### 3. Rate Limiting

**Per-Source Delays:**
- **Ben's Bites (Puppeteer):** 2s delay between page navigations
- **AI Rundown (RSS):** 1s delay (lightweight, respectful)
- **Reddit (JSON API):** 2s delay between subreddit requests

**Implementation:**
```typescript
await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay
```

### 4. Retry Logic
- **Max Retries:** 3 attempts per source
- **Backoff Strategy:** Exponential (2s, 4s, 8s)
- **When to Retry:**
  - Network errors (ECONNRESET, ETIMEDOUT)
  - HTTP 429 (Too Many Requests)
  - HTTP 503 (Service Unavailable)
- **When NOT to Retry:**
  - HTTP 404 (Not Found)
  - HTTP 403 (Forbidden)
  - Malformed HTML/JSON (data issue, not network)

### 5. Timeouts
- **Page Load:** 30s max per page
- **Network Request:** 15s max per HTTP request
- **Total Scraper:** 2 minutes max per source

### 6. User Agent
**Required:** Use realistic user agent to avoid bot detection

```typescript
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
```

### 7. Output Format
- **Location:** `.tmp/scraped_data/{source}.json`
- **Format:** JSON array of article objects
- **Schema:** Must match data schema in `gemini.md`

---

## Edge Cases & Handling

### No New Articles
- **Action:** Return empty array `[]`
- **Do NOT:** Throw error or fail the script
- **Log:** Info-level message "No articles found from last 24h"

### Malformed Dates
- **Action:** Skip article and log warning
- **Log:** Include article title/URL and the malformed date value
- **Continue:** Process remaining articles

### Missing Fields
**Use Defaults:**
- `excerpt`: `""` (empty string)
- `published_date`: Use `scraped_at` timestamp as fallback
- `source`: REQUIRED (fail if missing)
- `title`: REQUIRED (fail if missing)
- `url`: REQUIRED (fail if missing)

### Duplicate URLs
- **Detection:** During validation phase (not during scraping)
- **Action:** Keep the article with the newest `scraped_at` timestamp
- **Log:** Info-level message with duplicate URL

### Paywalled Content
- **Ben's Bites Specific:** Check for paywall indicators
- **Action:** Include article but mark with `is_paywalled: true` flag
- **Alternative:** Filter out entirely if user preference is set

### Dynamic Content (JavaScript Required)
- **Ben's Bites:** Use Puppeteer with `waitUntil: 'networkidle2'`
- **Wait Strategy:** Wait for network to be idle for 2s
- **Timeout:** If content doesn't load in 30s, fail gracefully

---

## Source-Specific Guidelines

### Ben's Bites (Substack)
**URL:** `https://www.bensbites.com/archive`

**Scraping Strategy:**
1. Launch headless Puppeteer browser
2. Navigate to archive page
3. Wait for network idle (articles rendered)
4. Extract article cards using selectors
5. Filter by date (last 24h)
6. Save to `.tmp/scraped_data/bens_bites.json`

**Selectors:**
- Article cards: `.post-preview` or similar container
- Title: `h3` or `[data-title]`
- URL: `a.post-preview-title` href
- Date: `.post-date` or time element
- Excerpt: `.post-preview-description`

**Date Parsing:**
- Substack uses relative dates ("Feb 12" or "Yesterday")
- Parse relative dates to absolute ISO 8601
- Validate against 24h window

### AI Rundown (RSS Feed)
**URL:** Find RSS feed URL from https://www.rundown.ai

**Scraping Strategy:**
1. Fetch RSS feed using `rss-parser`
2. Parse XML to JSON
3. Extract items
4. Filter by `<pubDate>` (last 24h)
5. Save to `.tmp/scraped_data/ai_rundown.json`

**Fields Mapping:**
- `<title>` → `title`
- `<link>` → `url`
- `<pubDate>` → `published_date`
- `<description>` → `excerpt`

**Fallback:**
If RSS not available, scrape `https://www.rundown.ai/articles`:
- Use Puppeteer
- Target: `.w-dyn-item` article cards
- Pagination: `?400ac562_page=N`

### Reddit (JSON API)
**URLs:**
- `https://www.reddit.com/r/OpenAI.json`
- `https://www.reddit.com/r/MachineLearning.json`
- `https://www.reddit.com/r/ArtificialIntelligence.json`

**Scraping Strategy:**
1. Fetch JSON using `node-fetch`
2. Parse `data.children` array
3. Filter by `created_utc` (last 24h)
4. Filter by score (optional: min 10 upvotes)
5. Save to `.tmp/scraped_data/reddit.json`

**Fields Mapping:**
- `data.title` → `title`
- `data.url` or `data.permalink` → `url`
- `data.created_utc` → `published_date` (convert Unix to ISO 8601)
- `data.selftext` (first 200 chars) → `excerpt`
- `data.score` → Store for ranking

**Rate Limiting:**
- 2s delay between subreddit requests
- Use User-Agent header (required by Reddit)

---

## Testing Checklist

Before deploying any scraper:

- [ ] Handles network errors gracefully
- [ ] Respects rate limits (2s delay)
- [ ] Filters articles to last 24h correctly
- [ ] Saves valid JSON to `.tmp/scraped_data/`
- [ ] Logs errors with sufficient detail
- [ ] Includes all required fields (source, title, url, published_date)
- [ ] Uses realistic User-Agent
- [ ] Timeouts set correctly (30s page load)
- [ ] Retry logic works (max 3 attempts)
- [ ] Returns empty array if no articles found (doesn't crash)

---

## Maintenance Notes

**When to Update This SOP:**
- New source added
- Rate limit changed by source website
- Selector changes detected (HTML structure update)
- New edge case discovered

**Version History:**
- v1.0 (2026-02-13): Initial SOP created
