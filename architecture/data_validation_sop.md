# Data Validation SOP (Standard Operating Procedure)

**Purpose:** Ensure data quality and consistency before displaying articles in the dashboard.

---

## Validation Pipeline

### Step 1: Schema Check
**Required Fields:** Every article MUST have:
- `source` (string): "bens_bites" | "ai_rundown" | "reddit"
- `title` (string): Non-empty
- `url` (string): Valid HTTP/HTTPS URL
- `published_date` (string): ISO 8601 timestamp

**Optional Fields:**
- `excerpt` (string): Defaults to `""`
- `id` (string): UUID v4, auto-generated if missing
- `scraped_at` (string): ISO 8601, defaults to current time

**Action on Failure:**
- Log error with article data
- Skip invalid article
- Continue processing remaining articles

### Step 2: URL Validation
**Rules:**
- Must start with `http://` or `https://`
- Must be a valid URL (no malformed syntax)
- Must not be empty or null

**Validation Function:**
```typescript
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
```

**Action on Invalid URL:**
- Log warning with article title and malformed URL
- Skip article

### Step 3: Date Validation
**Rules:**
- Must be valid ISO 8601 format (e.g., `2026-02-13T17:00:00Z`)
- Must be a parseable date string
- Must not be in the future (future dates are suspicious)

**Validation Function:**
```typescript
import { isValid, parseISO } from 'date-fns';

function isValidDate(dateString: string): boolean {
  const date = parseISO(dateString);
  return isValid(date) && date <= new Date();
}
```

**Action on Invalid Date:**
- Log warning
- Use `scraped_at` as fallback
- If no fallback, skip article

### Step 4: De-duplication
**Strategy:** Remove articles with duplicate URLs (keep newest)

**Implementation:**
```typescript
function deduplicateArticles(articles: Article[]): Article[] {
  const seen = new Map<string, Article>();

  for (const article of articles) {
    const existing = seen.get(article.url);

    if (!existing) {
      seen.set(article.url, article);
    } else {
      // Keep the one with newest scraped_at timestamp
      if (new Date(article.scraped_at) > new Date(existing.scraped_at)) {
        seen.set(article.url, article);
      }
    }
  }

  return Array.from(seen.values());
}
```

**Log Output:**
- Info-level: "Removed X duplicate articles"
- List duplicate URLs

### Step 5: Time Window Filter
**Rule:** Only articles from last 24 hours

**Implementation:**
```typescript
import { subHours, isAfter } from 'date-fns';

function filterLast24Hours(articles: Article[]): Article[] {
  const cutoff = subHours(new Date(), 24);

  return articles.filter(article => {
    const publishDate = new Date(article.published_date);
    return isAfter(publishDate, cutoff);
  });
}
```

**Log Output:**
- Info-level: "Filtered out X articles older than 24h"

### Step 6: UUID Assignment
**Rule:** Every article must have a unique UUID v4

**Implementation:**
```typescript
import { v4 as uuidv4 } from 'uuid';

function ensureUUID(article: Article): Article {
  if (!article.id) {
    article.id = uuidv4();
  }
  return article;
}
```

---

## Data Transformations

### Convert Dates to ISO 8601
**Source Formats:**
- Unix timestamp (Reddit): `1676300000` → Convert using `new Date(unix * 1000).toISOString()`
- RSS pubDate: `Mon, 13 Feb 2026 12:00:00 GMT` → Parse and convert
- Relative dates: "Feb 12" → Parse to absolute date

**Standard Output:** `2026-02-13T17:00:00.000Z`

### Normalize URLs
**Remove Tracking Parameters:**
```typescript
function normalizeUrl(url: string): string {
  const parsed = new URL(url);

  // Remove common tracking params
  const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'fbclid'];
  trackingParams.forEach(param => parsed.searchParams.delete(param));

  return parsed.toString();
}
```

### Truncate Excerpts
**Rule:** Max 200 characters

```typescript
function truncateExcerpt(excerpt: string, maxLength: number = 200): string {
  if (excerpt.length <= maxLength) return excerpt;
  return excerpt.substring(0, maxLength - 3) + '...';
}
```

### Add scraped_at Timestamp
**Rule:** If missing, add current timestamp

```typescript
function addScrapedAt(article: Article): Article {
  if (!article.scraped_at) {
    article.scraped_at = new Date().toISOString();
  }
  return article;
}
```

---

## Validation Output

### Success Case
**File:** `.tmp/processed_articles.json`

```json
{
  "articles": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "source": "bens_bites",
      "title": "GPT-5 Released",
      "url": "https://bensbites.com/gpt5",
      "published_date": "2026-02-13T15:00:00.000Z",
      "excerpt": "OpenAI announces GPT-5 with breakthrough capabilities...",
      "scraped_at": "2026-02-13T17:00:00.000Z"
    }
  ],
  "last_updated": "2026-02-13T17:00:00.000Z",
  "sources_checked": ["bens_bites", "ai_rundown", "reddit"],
  "total_articles": 42,
  "validation_summary": {
    "total_scraped": 50,
    "duplicates_removed": 5,
    "invalid_skipped": 3,
    "24h_filtered": 45
  }
}
```

### Error Cases
**Log Format:**
```
[ERROR] [2026-02-13T17:00:00Z] Article validation failed
  Source: bens_bites
  Title: "Amazing AI Tool"
  Reason: Invalid URL
  URL: "not-a-valid-url"
```

---

## Validation Metrics

Track and log:
- **Total articles scraped** (before validation)
- **Duplicates removed** (count)
- **Invalid articles skipped** (count with reasons)
- **Articles filtered by time** (count)
- **Final article count** (after all validation)

**Output to Console:**
```
✓ Validation Complete
  Total Scraped: 50
  - Duplicates: 5
  - Invalid: 3 (2 bad URLs, 1 malformed date)
  - Outside 24h: 0
  Final Count: 42 articles
```

---

## Testing Checklist

- [ ] Validates required fields correctly
- [ ] Skips articles with invalid URLs
- [ ] Converts all dates to ISO 8601
- [ ] Removes duplicate URLs (keeps newest)
- [ ] Filters articles older than 24h
- [ ] Assigns UUIDs to all articles
- [ ] Truncates long excerpts to 200 chars
- [ ] Normalizes URLs (removes tracking params)
- [ ] Adds scraped_at timestamp if missing
- [ ] Logs validation summary with metrics

---

## Maintenance Notes

**When to Update:**
- New validation rule needed
- Data schema changes in `gemini.md`
- New source with different data format

**Version History:**
- v1.0 (2026-02-13): Initial validation SOP
