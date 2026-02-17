# Dashboard SOP (Standard Operating Procedure)

**Purpose:** UI component guidelines and behavior for consistent, beautiful, brand-aligned dashboard.

---

## Design Rules

### 1. Brand Consistency
**Source:** `Design/Brand guildline`

**Colors:**
- **Primary/Accent:** `#BFF549` (lime green)
  - Use for: Buttons, active filters, save button (filled), links on hover
- **Background:** `#000000` (black)
  - Use for: Body background, header background
- **Card Background:** `#FFFFFF` (white)
  - Use for: Article cards, modal backgrounds
- **Text Primary:** `#000000` (black)
  - Use for: Headings, body text on white cards
- **Text Secondary:** `#99A1AF` (gray-blue)
  - Use for: Timestamps, metadata, links

**Source Badges:**
- **Ben's Bites:** `#FF6B6B` (coral/red)
- **AI Rundown:** `#4ECDC4` (teal/blue)
- **Reddit:** `#FF4500` (Reddit orange)

### 2. Typography
**Font:** Inter (import from Google Fonts)

**Size Hierarchy:**
- **h1:** 48px (desktop), 32px (mobile)
- **h2 (Card Title):** 24px (desktop), 20px (mobile)
- **Body:** 16px (desktop/mobile)
- **Small (Metadata):** 14px

**Font Weights:**
- **h1:** 700 (Bold)
- **h2:** 600 (Semi-bold)
- **Body:** 400 (Regular)
- **Metadata:** 500 (Medium)

### 3. Spacing
**Base Unit:** 16px

**Gaps:**
- **Section gaps:** 32px (2x base)
- **Card padding:** 24px (1.5x base)
- **Grid gap:** 24px
- **Element spacing:** 16px (1x base)
- **Tight spacing:** 8px (0.5x base)

### 4. Cards
**Design Inspired by:** `Design/DesignInsperation.png`

**Properties:**
- **Border Radius:** 16px
- **Shadow:** `0 2px 8px rgba(0, 0, 0, 0.1)` (default)
- **Hover Shadow:** `0 8px 24px rgba(0, 0, 0, 0.15)` (lifted)
- **Transition:** `all 0.3s ease`
- **Hover Transform:** `translateY(-4px)`
- **Background:** White `#FFFFFF`
- **Max Width:** None (grid controlled)

### 5. Grid Layout
**Responsive Breakpoints:**
- **Desktop (>1024px):** 3 columns
- **Tablet (768-1024px):** 2 columns
- **Mobile (<768px):** 1 column

**CSS Grid:**
```css
.articles-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

@media (max-width: 1024px) {
  .articles-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .articles-grid {
    grid-template-columns: 1fr;
  }
}
```

---

## Interaction Rules

### 1. Save Button
**States:**
- **Unsaved:** `♡` (outline heart, gray `#99A1AF`)
- **Saved:** `♥` (filled heart, lime green `#BFF549`)
- **Hover:** Scale 1.1 transform

**Behavior:**
- Click to toggle saved state
- Update LocalStorage immediately
- Update icon instantly (no delay)
- Animate transition (0.2s ease)

**LocalStorage Key:** `glaido_saved_articles`

**Code:**
```javascript
function toggleSave(articleId) {
  const saved = getSavedArticles();
  const index = saved.findIndex(a => a.id === articleId);

  if (index > -1) {
    saved.splice(index, 1); // Remove
  } else {
    const article = findArticleById(articleId);
    saved.push({
      id: articleId,
      article_data: article,
      saved_at: new Date().toISOString()
    });
  }

  localStorage.setItem('glaido_saved_articles', JSON.stringify(saved));
  updateSaveButton(articleId);
}
```

### 2. Filters
**Default:** "All" is active on page load

**Behavior:**
- Click filter button to show only that source
- Active filter has lime green background `#BFF549`
- Inactive filters have transparent background with gray text
- "Saved" filter shows only saved articles from LocalStorage

**Code:**
```javascript
function filterArticles(source) {
  const articles = getAllArticles();

  if (source === 'all') {
    return articles;
  } else if (source === 'saved') {
    const savedIds = getSavedArticles().map(s => s.id);
    return articles.filter(a => savedIds.includes(a.id));
  } else {
    return articles.filter(a => a.source === source);
  }
}
```

### 3. Loading State
**Display:** Skeleton cards with shimmer effect

**Skeleton Card:**
- Same dimensions as real card
- Gray placeholder rectangles for title, excerpt, metadata
- Shimmer animation (gradient sweep)
- Show 6 skeleton cards while loading

**Code:**
```css
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}
```

### 4. Empty State
**When:** No articles match current filter

**Display:**
```html
<div class="empty-state">
  <p>No articles found. Check back later!</p>
</div>
```

**Style:**
- Centered text
- Gray color `#99A1AF`
- 48px top margin

### 5. Timestamps
**Display:** Relative time for recent articles

**Examples:**
- "2 hours ago"
- "Just now"
- "Yesterday"
- "Feb 12, 2026" (if older than 2 days)

**Code:**
```javascript
import { formatDistanceToNow, format } from 'date-fns';

function formatTimestamp(dateString) {
  const date = new Date(dateString);
  const hoursDiff = (Date.now() - date.getTime()) / (1000 * 60 * 60);

  if (hoursDiff < 48) {
    return formatDistanceToNow(date, { addSuffix: true });
  } else {
    return format(date, 'MMM d, yyyy');
  }
}
```

---

## Component Structure

### Header
```html
<header class="dashboard-header">
  <img src="assets/glaido-main-white.svg" alt="Glaido Logo" class="logo">
  <h1>AI News Dashboard</h1>
  <p class="last-updated">Last updated: <span id="timestamp"></span></p>
</header>
```

**Style:**
- Black background `#000000`
- White text
- Logo width: 120px
- Centered layout
- 32px padding

### Filter Nav
```html
<nav class="filters">
  <button class="filter-btn active" data-source="all">All</button>
  <button class="filter-btn" data-source="bens_bites">Ben's Bites</button>
  <button class="filter-btn" data-source="ai_rundown">AI Rundown</button>
  <button class="filter-btn" data-source="reddit">Reddit</button>
  <button class="filter-btn" data-source="saved">Saved</button>
</nav>
```

**Style:**
- Horizontal layout (flex)
- Gap: 16px
- Active: Lime green background, black text
- Inactive: Transparent background, gray text
- Hover: Light gray background

### Article Card
```html
<article class="article-card" data-id="uuid">
  <div class="article-header">
    <span class="source-badge bens-bites">Ben's Bites</span>
    <button class="save-btn" aria-label="Save article" data-saved="false">♡</button>
  </div>
  <h2 class="article-title">Article Title Here</h2>
  <p class="article-excerpt">Brief description of the article content...</p>
  <div class="article-footer">
    <time datetime="2026-02-13T15:00:00Z">2 hours ago</time>
    <a href="https://..." target="_blank" class="read-more">Read more →</a>
  </div>
</article>
```

**Badge Classes:**
- `.bens-bites` → `background: #FF6B6B`
- `.ai-rundown` → `background: #4ECDC4`
- `.reddit` → `background: #FF4500`

---

## Accessibility

### ARIA Labels
- Save button: `aria-label="Save article"` or `"Unsave article"`
- Filter buttons: `aria-label="Filter by {source}"`
- Active filter: `aria-current="true"`

### Keyboard Navigation
- **Tab:** Navigate through filters, save buttons, links
- **Enter/Space:** Activate buttons
- **Focus states:** Visible outline (lime green, 2px)

### Semantic HTML
- Use `<article>` for cards
- Use `<time>` for timestamps with `datetime` attribute
- Use `<nav>` for filters
- Use `<header>` for page header

---

## Performance

### Lazy Load Images
**If article thumbnails added:**
```html
<img src="..." loading="lazy" alt="...">
```

### Debounce Filter Clicks
**Prevent rapid clicks:**
```javascript
let filterTimeout;
function onFilterClick(source) {
  clearTimeout(filterTimeout);
  filterTimeout = setTimeout(() => {
    applyFilter(source);
  }, 100);
}
```

### Virtual Scrolling
**If article count > 50:**
- Implement virtual scrolling library
- Render only visible cards + buffer
- Improves performance on large datasets

---

## Testing Checklist

- [ ] Brand colors match Design/Brand guildline
- [ ] Inter font loads correctly
- [ ] Card shadows and hover effects work
- [ ] Grid responsive (3 → 2 → 1 columns)
- [ ] Save button toggles correctly
- [ ] LocalStorage persists across refresh
- [ ] Filters work (All, sources, Saved)
- [ ] Loading skeletons display while fetching
- [ ] Empty state shows when no articles
- [ ] Timestamps display relative time correctly
- [ ] ARIA labels present on interactive elements
- [ ] Keyboard navigation works
- [ ] Mobile responsive (< 768px)

---

## Maintenance Notes

**When to Update:**
- Brand guidelines change
- New source added (new badge color)
- UI/UX feedback from user
- Performance issues detected

**Version History:**
- v1.0 (2026-02-13): Initial dashboard SOP
