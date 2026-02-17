# 🛰️ Project Constitution: AI News Dashboard

**Last Updated:** 2026-02-13
**Status:** Phase 2 & 3 Complete - Dashboard Live

---

## 🎯 North Star
Build a beautiful, interactive dashboard that aggregates AI news from multiple sources (newsletters, Reddit) and displays articles from the last 24 hours with save functionality.

---

## 📊 Data Schema

### Input Schema (Raw Scraped Data)
```json
{
  "source": "string (bens_bites | ai_rundown | reddit)",
  "title": "string",
  "url": "string",
  "published_date": "ISO 8601 timestamp",
  "excerpt": "string (optional)",
  "scraped_at": "ISO 8601 timestamp"
}
```

### Output Schema (Dashboard Payload)
```json
{
  "articles": [
    {
      "id": "uuid",
      "source": "string",
      "title": "string",
      "url": "string",
      "published_date": "ISO 8601",
      "excerpt": "string",
      "is_saved": "boolean",
      "scraped_at": "ISO 8601"
    }
  ],
  "last_updated": "ISO 8601",
  "sources_checked": ["string"]
}
```

### Saved Articles Schema (Persistent)
```json
{
  "saved_articles": [
    {
      "id": "uuid",
      "article_data": "object (matches article schema)",
      "saved_at": "ISO 8601"
    }
  ]
}
```

---

## 🔗 Integrations

### Phase 1 (Current)
- **Web Scraping:** Ben's Bites, AI Rundown newsletters
- **Storage:** Local `.tmp/` for testing
- **No API keys required** for initial scraping

### Phase 2 (Future)
- **Supabase:** Database for persistent storage
- **Reddit API:** For Reddit posts (may require API key)
- **Automation:** Cron job or cloud scheduler (24-hour interval)

---

## ⚖️ Behavioral Rules

1. **Time Window:** Only fetch articles from last 24 hours
2. **De-duplication:** Do not show duplicate articles (match by URL)
3. **Graceful Degradation:** If one source fails, continue with others
4. **Save Persistence:** Saved articles must survive page refresh
5. **Design Priority:** UI must be "gorgeous, interactive, beautiful"
6. **Performance:** Dashboard should load quickly (<2s)

---

## 🏗️ Architecture Invariants

- **Source of Truth:** Live websites (newsletters)
- **Delivery Method:** Interactive web dashboard
- **Update Frequency:** Every 24 hours (automated)
- **Data Flow:** Scrape → Validate → Store (Supabase) → Display (Dashboard)
- **Current Phase:** Build scrapers first, dashboard integration later

---

## 📝 Maintenance Log

### 2026-02-13: Phase 2 & 3 Complete
- **Scrapers:** AI Rundown (8 articles), Reddit (31 articles), Ben's Bites (0 articles - needs selector fix)
- **Total Articles:** 39 articles aggregated and validated
- **Dashboard:** Fully functional at http://localhost:8080
  - Filters: All, Ben's Bites, AI Rundown, Reddit, Saved
  - Save functionality with LocalStorage
  - Responsive design (mobile/tablet/desktop)
  - Brand colors applied (#BFF549 lime green)
- **Architecture:** 3-layer SOPs created
- **Next Steps:** Fix Ben's Bites selectors, add Supabase integration

### 2026-02-13: Initialization
- Project structure created
- Data schemas defined
- Discovery phase initiated
