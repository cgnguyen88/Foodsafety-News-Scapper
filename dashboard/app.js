// Glaido AI News Dashboard - Main Application
const STORAGE_KEY = 'glaido_saved_articles';
const DATA_URL = './processed_articles.json';

let allArticles = [];
let currentFilter = 'all';

// Initialize app on load
document.addEventListener('DOMContentLoaded', () => {
    loadArticles();
    setupFilters();
    setupScrollEffect();
    setupRefreshButton();
});

// Setup refresh button
function setupRefreshButton() {
    const btn = document.getElementById('refresh-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        btn.classList.add('spinning');
        btn.disabled = true;
        await loadArticles();
        btn.classList.remove('spinning');
        btn.disabled = false;
    });
}

// Load articles from JSON file
async function loadArticles() {
    const loadingEl = document.getElementById('loading');
    const gridEl = document.getElementById('articles-grid');
    const emptyEl = document.getElementById('empty-state');

    try {
        const response = await fetch(DATA_URL + '?t=' + Date.now());

        if (!response.ok) {
            throw new Error(`Failed to load articles: ${response.status}`);
        }

        const data = await response.json();
        allArticles = data.articles || [];

        // Update timestamp
        const timestampEl = document.getElementById('timestamp');
        if (data.last_updated) {
            timestampEl.textContent = formatTimestamp(data.last_updated);
        }

        // Hide loading, show grid
        loadingEl.style.display = 'none';

        if (allArticles.length === 0) {
            emptyEl.style.display = 'block';
            gridEl.style.display = 'none';
        } else {
            emptyEl.style.display = 'none';
            gridEl.style.display = 'grid';
            renderArticles(allArticles);
        }

    } catch (error) {
        console.error('Error loading articles:', error);
        loadingEl.style.display = 'none';
        emptyEl.style.display = 'block';
        emptyEl.querySelector('p').textContent = 'Failed to load articles. Please try again later.';
    }
}

// Render articles to grid
function renderArticles(articles) {
    const gridEl = document.getElementById('articles-grid');
    const emptyEl = document.getElementById('empty-state');

    if (articles.length === 0) {
        gridEl.style.display = 'none';
        emptyEl.style.display = 'block';
        return;
    }

    gridEl.style.display = 'grid';
    emptyEl.style.display = 'none';

    gridEl.innerHTML = articles.map(article => createArticleCard(article)).join('');

    // Attach event listeners to save buttons
    document.querySelectorAll('.save-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const articleId = btn.dataset.id;
            toggleSave(articleId);
        });
    });
}

// Create article card HTML
function createArticleCard(article) {
    const isSaved = isArticleSaved(article.id);
    const sourceClass = article.source.replace('_', '-');
    const sourceName = formatSourceName(article.source);
    const imageUrl = article.image || getPlaceholderImage(article.source);

    return `
        <article class="article-card" data-id="${article.id}">
            <img src="${imageUrl}" alt="${escapeHtml(article.title)}" class="article-image" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 200%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22400%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22Inter%22 font-size=%2218%22 fill=%22%2399A1AF%22%3ENo Image%3C/text%3E%3C/svg%3E'">
            <div class="article-content">
                <div class="article-header">
                    <span class="source-badge ${sourceClass}">${sourceName}</span>
                    <button
                        class="save-btn ${isSaved ? 'saved' : ''}"
                        data-id="${article.id}"
                        aria-label="${isSaved ? 'Unsave article' : 'Save article'}"
                    >
                        ${isSaved ? '♥' : '♡'}
                    </button>
                </div>
                <h2 class="article-title">${escapeHtml(article.title)}</h2>
                <p class="article-excerpt">${escapeHtml(article.excerpt || '')}</p>
                <div class="article-footer">
                    <time datetime="${article.published_date}">
                        ${formatTimestamp(article.published_date)}
                    </time>
                    <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="read-more">
                        Read more →
                    </a>
                </div>
            </div>
        </article>
    `;
}

// Get placeholder image based on source
function getPlaceholderImage(source) {
    const placeholders = {
        'ai_rundown': 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 200%22%3E%3Cdefs%3E%3ClinearGradient id=%22grad1%22 x1=%220%25%22 y1=%220%25%22 x2=%22100%25%22 y2=%22100%25%22%3E%3Cstop offset=%220%25%22 style=%22stop-color:%234ECDC4;stop-opacity:1%22 /%3E%3Cstop offset=%22100%25%22 style=%22stop-color:%233AAFA8;stop-opacity:1%22 /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill=%22url(%23grad1)%22 width=%22400%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22Inter%22 font-size=%2224%22 font-weight=%22700%22 fill=%22white%22%3EAI RUNDOWN%3C/text%3E%3C/svg%3E',
        'reddit': 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 200%22%3E%3Cdefs%3E%3ClinearGradient id=%22grad2%22 x1=%220%25%22 y1=%220%25%22 x2=%22100%25%22 y2=%22100%25%22%3E%3Cstop offset=%220%25%22 style=%22stop-color:%23FF4500;stop-opacity:1%22 /%3E%3Cstop offset=%22100%25%22 style=%22stop-color:%23CC3700;stop-opacity:1%22 /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill=%22url(%23grad2)%22 width=%22400%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22Inter%22 font-size=%2224%22 font-weight=%22700%22 fill=%22white%22%3EREDDIT%3C/text%3E%3C/svg%3E'
    };
    return placeholders[source] || placeholders['ai_rundown'];
}

// Setup filter buttons
function setupFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const source = btn.dataset.source;

            // Update active state
            filterBtns.forEach(b => {
                b.classList.remove('active');
                b.removeAttribute('aria-current');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-current', 'true');

            // Apply filter
            currentFilter = source;
            applyFilter(source);
        });
    });
}

// Setup scroll effect for frosted glass header
function setupScrollEffect() {
    const header = document.querySelector('.dashboard-header');

    if (!header) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

// Apply filter
function applyFilter(source) {
    let filtered;

    if (source === 'all') {
        filtered = allArticles;
    } else if (source === 'saved') {
        const savedIds = getSavedArticles().map(s => s.id);
        filtered = allArticles.filter(a => savedIds.includes(a.id));
    } else {
        filtered = allArticles.filter(a => a.source === source);
    }

    renderArticles(filtered);
}

// Save/Unsave article
function toggleSave(articleId) {
    const saved = getSavedArticles();
    const index = saved.findIndex(a => a.id === articleId);
    const btn = document.querySelector(`.save-btn[data-id="${articleId}"]`);

    if (index > -1) {
        // Unsave
        saved.splice(index, 1);
        btn.classList.remove('saved');
        btn.textContent = '♡';
        btn.setAttribute('aria-label', 'Save article');
    } else {
        // Save
        const article = allArticles.find(a => a.id === articleId);
        if (article) {
            saved.push({
                id: articleId,
                article_data: article,
                saved_at: new Date().toISOString()
            });
            btn.classList.add('saved');
            btn.textContent = '♥';
            btn.setAttribute('aria-label', 'Unsave article');
        }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

    // If currently viewing saved filter, re-render
    if (currentFilter === 'saved') {
        applyFilter('saved');
    }
}

// Get saved articles from LocalStorage
function getSavedArticles() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error('Error reading saved articles:', error);
        return [];
    }
}

// Check if article is saved
function isArticleSaved(articleId) {
    const saved = getSavedArticles();
    return saved.some(a => a.id === articleId);
}

// Format source name for display
function formatSourceName(source) {
    const names = {
        'bens_bites': "Ben's Bites",
        'ai_rundown': 'AI Rundown',
        'reddit': 'Reddit'
    };
    return names[source] || source;
}

// Format timestamp
function formatTimestamp(dateString) {
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours < 1) {
            const diffMins = Math.floor(diffMs / (1000 * 60));
            return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
        } else if (diffHours < 24) {
            const hours = Math.floor(diffHours);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (diffHours < 48) {
            return 'Yesterday';
        } else {
            // Format as "Feb 13, 2026"
            const options = { year: 'numeric', month: 'short', day: 'numeric' };
            return date.toLocaleDateString('en-US', options);
        }
    } catch (error) {
        console.error('Error formatting timestamp:', error);
        return dateString;
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
