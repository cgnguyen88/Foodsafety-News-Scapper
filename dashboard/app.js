// Glaido AI News Dashboard - Main Application
const STORAGE_KEY = 'glaido_saved_articles';
const DATA_URL = './processed_articles.json';

let allArticles = [];
let currentFilter = 'all';
let searchQuery = '';

// Initialize app on load
document.addEventListener('DOMContentLoaded', () => {
    loadArticles();
    setupFilters();
    setupSuggestiveSearch();
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
    const imageUrl = article.image && typeof article.image === 'string' ? article.image.trim() : '';
    const mediaHtml = imageUrl
        ? `
            <div class="article-media">
                <img src="${imageUrl}" alt="${escapeHtml(article.title)}" class="article-image" loading="lazy" onerror="this.closest('.article-media')?.remove()">
                <div class="article-image-shade"></div>
            </div>
        `
        : '';

    return `
        <article class="article-card" data-id="${article.id}">
            ${mediaHtml}
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

    if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(a =>
            a.title.toLowerCase().includes(query) ||
            (a.excerpt && a.excerpt.toLowerCase().includes(query))
        );
    }

    renderArticles(filtered);
}

// ----------------------------------------------------------------------
// Suggestive Search Implementation
// ----------------------------------------------------------------------
function setupSuggestiveSearch() {
    const input = document.getElementById('search-input');
    const overlay = document.getElementById('search-overlay');
    const suggestionEl = document.getElementById('search-suggestion');
    const cursor = document.getElementById('search-cursor');
    if (!input || !overlay || !suggestionEl) return;

    const suggestions = [
        "Search your favourite food",
        "Search recalls by location",
        "Search listeria outbreaks",
        "Search agricultural updates"
    ];

    let currentSuggestionIndex = 0;
    let currentCharIndex = 0;
    let isDeleting = false;
    let typingTimer = null;
    let isActive = !input.value && document.activeElement !== input;

    // Typing effect configurations
    const TYPE_SPEED = 50;
    const DELETE_SPEED = 30;
    const PAUSE_AFTER_TYPE = 2000;
    const PAUSE_AFTER_DELETE = 500;

    function handleCursorBlink(typing) {
        if (typing) {
            cursor.style.animation = 'none';
            cursor.style.opacity = '1';
        } else {
            cursor.style.animation = 'blink 0.9s infinite linear';
        }
    }

    function typeEffect() {
        if (!isActive) return;

        const fullText = suggestions[currentSuggestionIndex];

        if (isDeleting) {
            handleCursorBlink(true);
            // Deleting phase
            suggestionEl.textContent = fullText.substring(0, currentCharIndex - 1);
            currentCharIndex--;

            if (currentCharIndex === 0) {
                isDeleting = false;
                currentSuggestionIndex = (currentSuggestionIndex + 1) % suggestions.length;
                handleCursorBlink(false);
                typingTimer = setTimeout(typeEffect, PAUSE_AFTER_DELETE);
            } else {
                typingTimer = setTimeout(typeEffect, DELETE_SPEED);
            }
        } else {
            handleCursorBlink(true);
            // Typing phase
            suggestionEl.textContent = fullText.substring(0, currentCharIndex + 1);
            currentCharIndex++;

            if (currentCharIndex === fullText.length) {
                isDeleting = true;
                handleCursorBlink(false);
                typingTimer = setTimeout(typeEffect, PAUSE_AFTER_TYPE);
            } else {
                typingTimer = setTimeout(typeEffect, TYPE_SPEED);
            }
        }
    }

    function startEffect() {
        if (typingTimer) clearTimeout(typingTimer);
        // Start fresh
        currentCharIndex = 0;
        isDeleting = false;
        suggestionEl.textContent = "";
        overlay.style.display = 'flex';
        isActive = true;
        typeEffect();
    }

    function stopEffect() {
        if (typingTimer) clearTimeout(typingTimer);
        overlay.style.display = 'none';
        isActive = false;
    }

    // Toggle overlay visibility based on state
    function evaluateOverlay() {
        if (input.value === '' && document.activeElement !== input) {
            if (!isActive) startEffect();
        } else {
            if (isActive) stopEffect();
        }
    }

    // Initial evaluatation
    evaluateOverlay();

    input.addEventListener('focus', () => {
        evaluateOverlay();
    });

    input.addEventListener('blur', () => {
        evaluateOverlay();
    });

    input.addEventListener('input', (e) => {
        evaluateOverlay();
        searchQuery = e.target.value;
        applyFilter(currentFilter);
    });
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
        'usda': 'USDA',
        'fda': 'FDA',
        'lgma': 'LGMA',
        'wga': 'WGA'
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
