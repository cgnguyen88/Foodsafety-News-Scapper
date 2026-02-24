import Parser from 'rss-parser';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

interface Article {
    source: string;
    title: string;
    url: string;
    published_date: string;
    excerpt: string;
    scraped_at: string;
    image?: string;
}

const OUTPUT_PATH = path.join(__dirname, '../.tmp/scraped_data/lgma.json');
const FEED_CANDIDATES = [
    'https://lgmacalifornia.org/feed/',
    'https://lgma.ca.gov/feed/'
];
const NEWS_URL = 'https://lgma.ca.gov/news';
const MIN_ARTICLES = 10;

async function fetchImage(url: string): Promise<string | undefined> {
    try {
        const response = await fetch(url, { timeout: 3000 });
        const html = await response.text();

        const ogMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i);
        if (ogMatch?.[1]) return ogMatch[1];

        const twitterMatch = html.match(/<meta\s+(?:property|name)="twitter:image"\s+content="([^"]+)"/i);
        if (twitterMatch?.[1]) return twitterMatch[1];
    } catch {
        return undefined;
    }

    return undefined;
}

async function scrapeNewsPageFallback(): Promise<Article[]> {
    const response = await fetch(NEWS_URL, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 6000 });
    const html = await response.text();
    const matches = [...html.matchAll(/href="(https?:\/\/lgma\.ca\.gov\/news\/[^"#?]+|\/news\/[^"#?]+)"/g)];

    const links: string[] = [];
    for (const m of matches) {
        const raw = m[1];
        const link = raw.startsWith('http') ? raw : `https://lgma.ca.gov${raw}`;
        if (link === NEWS_URL || links.includes(link)) continue;
        links.push(link);
    }

    const articles: Article[] = [];
    for (const link of links.slice(0, MIN_ARTICLES)) {
        try {
            const page = await fetch(link, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 6000 });
            const pageHtml = await page.text();
            const title = pageHtml.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)?.[1]
                || pageHtml.match(/<title>([^<]+)<\/title>/i)?.[1]
                || 'LGMA Update';
            const description = pageHtml.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1] || '';
            const image = await fetchImage(link);
            articles.push({
                source: 'lgma',
                title: title.trim(),
                url: link,
                published_date: new Date().toISOString(),
                excerpt: description.substring(0, 200).trim(),
                scraped_at: new Date().toISOString(),
                image
            });
        } catch {
            // skip item
        }
    }
    return articles;
}

async function parseFirstAvailableFeed(parser: Parser): Promise<any | undefined> {
    for (const feedUrl of FEED_CANDIDATES) {
        try {
            const feed = await parser.parseURL(feedUrl);
            if (feed?.items?.length) return feed;
        } catch {
            // try next feed candidate
        }
    }
    return undefined;
}

function loadExistingArticles(): Article[] {
    try {
        if (!fs.existsSync(OUTPUT_PATH)) return [];
        const content = fs.readFileSync(OUTPUT_PATH, 'utf-8');
        const parsed = JSON.parse(content);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

async function scrapeLGMA(): Promise<Article[]> {
    console.log('🚀 Starting LGMA scraper...');

    const parser = new Parser();
    let articles: Article[] = [];

    try {
        const feed = await parseFirstAvailableFeed(parser);
        if (!feed) {
            throw new Error('No LGMA feed available');
        }

        console.log(`✓ Fetched ${feed.items.length} items from LGMA feed.`);
        for (const item of feed.items) {
            if (!item.title || !item.link) continue;

            const article: Article = {
                source: 'lgma',
                title: item.title,
                url: item.link,
                published_date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
                excerpt: (item.contentSnippet || item.content || '').substring(0, 200).trim(),
                scraped_at: new Date().toISOString(),
                image: await fetchImage(item.link)
            };

            articles.push(article);
            console.log(`  ✓ Added: "${article.title}"`);
        }
    } catch (error: any) {
        console.error('❌ Error scraping LGMA feed:', error.message || error);
        try {
            articles = await scrapeNewsPageFallback();
            console.log(`⚠️ Using LGMA news-page fallback with ${articles.length} articles.`);
        } catch {
            articles = loadExistingArticles();
            if (articles.length > 0) {
                console.log(`⚠️ Using ${articles.length} previously scraped LGMA articles.`);
            }
        }
    }

    const dir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(articles, null, 2));

    return articles;
}

export { scrapeLGMA };
