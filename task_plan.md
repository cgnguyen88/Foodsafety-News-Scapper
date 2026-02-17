# 📋 Task Plan: AI News Dashboard

**Status:** Planning
**Current Phase:** Protocol 0 - Initialization

---

## 🎯 Project Phases

### ✅ Phase 0: Initialization (CURRENT)
- [x] Create project memory files
- [ ] Complete Discovery Questions
- [ ] Research scraping strategies
- [ ] Define final Blueprint
- [ ] Get user approval

### 📌 Phase 1: Blueprint (B)
- [ ] Research Ben's Bites website structure
- [ ] Research AI Rundown website structure
- [ ] Research Reddit API/scraping options
- [ ] Define scraping strategy for each source
- [ ] Document edge cases and rate limits

### 🔗 Phase 2: Link (L)
- [ ] Build test scraper for Ben's Bites
- [ ] Build test scraper for AI Rundown
- [ ] Verify data extraction works correctly
- [ ] Test 24-hour time filtering
- [ ] Handle connection errors gracefully

### ⚙️ Phase 3: Architect (A)
**Layer 1: Architecture (SOPs)**
- [ ] Create `architecture/scraping_sop.md`
- [ ] Create `architecture/data_validation_sop.md`
- [ ] Create `architecture/dashboard_sop.md`

**Layer 3: Tools (Python Scripts)**
- [ ] `tools/scrape_bens_bites.py`
- [ ] `tools/scrape_ai_rundown.py`
- [ ] `tools/scrape_reddit.py` (future)
- [ ] `tools/validate_articles.py`
- [ ] `tools/deduplicate.py`

### ✨ Phase 4: Stylize (S)
- [ ] Build beautiful dashboard UI (HTML/CSS/JS)
- [ ] Implement save/unsave functionality
- [ ] Add loading states and animations
- [ ] Design source badges/labels
- [ ] Mobile responsive design

### 🛰️ Phase 5: Trigger (T)
- [ ] Set up Supabase database
- [ ] Deploy dashboard to hosting
- [ ] Configure 24-hour automation
- [ ] Test end-to-end flow
- [ ] Final documentation

---

## 🚧 Current Sprint: Phase 0 Checklist

- [x] Initialize `gemini.md`
- [x] Initialize `task_plan.md`
- [ ] Initialize `findings.md`
- [ ] Initialize `progress.md`
- [ ] Answer Discovery Questions
- [ ] Research newsletter websites
- [ ] Get Blueprint approval

---

## ⚠️ Blockers & Questions

**Awaiting User Input:**
1. Do you have specific URLs for Ben's Bites and AI Rundown? (website vs newsletter archive)
2. For Reddit: Which subreddits should we monitor?
3. Design preferences: Dark mode, light mode, or both?
4. Supabase: Do you have an account/project already, or should we create one?

---

## 🎯 Success Criteria

**Phase 0 Complete When:**
- All 5 Discovery Questions answered
- Data schema approved in `gemini.md`
- Research completed on scraping targets
- Blueprint approved by user
