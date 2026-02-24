import Parser from 'rss-parser';
import * as fs from 'fs';
import * as path from 'path';

interface Article {
    source: string;
    title: string;
    url: string;
    published_date: string;
    excerpt: string;
    scraped_at: string;
    image?: string;
}

const FEED_URL = 'https://www.fsis.usda.gov/news-events/news-press-releases/rss.xml';
const NEWS_URL = 'https://www.fsis.usda.gov/news-events/news-press-releases';
const OUTPUT_PATH = path.join(__dirname, '../.tmp/scraped_data/usda.json');
const MIN_ARTICLES = 10;

function normalizeUrl(url?: string): string | undefined {
    if (!url) return undefined;
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('/')) return `https://www.fsis.usda.gov${url}`;
    return url;
}

function extractFeedImage(item: any): string | undefined {
    const enclosure = normalizeUrl(item?.enclosure?.url);
    if (enclosure) return enclosure;

    const mediaContent = item?.['media:content'];
    if (Array.isArray(mediaContent) && mediaContent[0]?.$?.url) return normalizeUrl(mediaContent[0].$.url);
    if (mediaContent?.$?.url) return normalizeUrl(mediaContent.$.url);

    const mediaThumb = item?.['media:thumbnail'];
    if (Array.isArray(mediaThumb) && mediaThumb[0]?.$?.url) return normalizeUrl(mediaThumb[0].$.url);
    if (mediaThumb?.$?.url) return normalizeUrl(mediaThumb.$.url);

    return undefined;
}

async function fetchImage(url: string): Promise<string | undefined> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: controller.signal
        });
        clearTimeout(timeout);
        const html = await response.text();

        const ogMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i);
        if (ogMatch?.[1]) return normalizeUrl(ogMatch[1]);

        const twitterMatch = html.match(/<meta\s+(?:property|name)="twitter:image"\s+content="([^"]+)"/i);
        if (twitterMatch?.[1]) return normalizeUrl(twitterMatch[1]);
    } catch {
        return undefined;
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

async function scrapeNewsPageFallback(): Promise<Article[]> {
    const response = await fetch(NEWS_URL, {
        headers: {
            'User-Agent': 'Mozilla/5.0'
        }
    });
    const html = await response.text();

    const linkMatches = [...html.matchAll(/href="([^"]*\/news-events\/news-press-releases\/[^"#?]+)"/g)];
    const uniqueLinks: string[] = [];
    for (const match of linkMatches) {
        const abs = normalizeUrl(match[1]);
        if (!abs || uniqueLinks.includes(abs)) continue;
        uniqueLinks.push(abs);
    }

    const selected = uniqueLinks.slice(0, MIN_ARTICLES);
    const articles: Article[] = [];
    for (const link of selected) {
        try {
            const pageRes = await fetch(link, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const pageHtml = await pageRes.text();
            const title = pageHtml.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)?.[1]
                || pageHtml.match(/<title>([^<]+)<\/title>/i)?.[1]
                || 'USDA Update';
            const description = pageHtml.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1] || '';
            const image = await fetchImage(link);

            articles.push({
                source: 'usda',
                title: title.trim(),
                url: link,
                published_date: new Date().toISOString(),
                excerpt: description.substring(0, 200).trim(),
                scraped_at: new Date().toISOString(),
                image
            });
        } catch {
            // skip failed item
        }
    }

    return articles;
}

async function scrapeUSDA(): Promise<Article[]> {
    console.log('🚀 Starting USDA scraper...');
    console.log(`📡 Target URL: ${FEED_URL}\n`);

    const parser = new Parser({
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/rss+xml, application/xml, text/xml'
        },
        customFields: {
            item: ['media:content', 'media:thumbnail', 'enclosure']
        }
    });

    let articles: Article[] = [];

    try {
        const feed = await parser.parseURL(FEED_URL);
        console.log(`✓ Fetched ${feed.items.length} items from feed.`);

        for (const item of feed.items) {
            if (!item.title || !item.link) continue;

            const feedImage = extractFeedImage(item as any);
            const image = feedImage || await fetchImage(item.link);

            articles.push({
                source: 'usda',
                title: item.title,
                url: item.link,
                published_date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
                excerpt: (item.contentSnippet || item.content || '').substring(0, 200).trim(),
                scraped_at: new Date().toISOString(),
                image
            });
        }
    } catch (error: any) {
        console.error('❌ Error scraping USDA RSS feed:', error.message || error);
        try {
            articles = await scrapeNewsPageFallback();
            console.log(`⚠️ Using USDA news-page fallback with ${articles.length} articles.`);
        } catch {
            articles = loadExistingArticles();
            if (articles.length > 0) {
                console.log(`⚠️ Using ${articles.length} previously scraped USDA articles.`);
            }
        }
    }

    const dir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(articles, null, 2));

    return articles;
}

export { scrapeUSDA };
