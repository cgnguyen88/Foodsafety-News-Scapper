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

const FEED_URL = 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/recalls/rss.xml';
const OUTPUT_PATH = path.join(__dirname, '../.tmp/scraped_data/fda.json');

function normalizeUrl(url?: string): string | undefined {
    if (!url) return undefined;
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('/')) return `https://www.fda.gov${url}`;
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
        const response = await fetch(url, { timeout: 3000 });
        const html = await response.text();

        // Prefer real recall/product images embedded in the article body.
        const recallImageMatches = [...html.matchAll(/<img[^>]+src="([^"]+)"/ig)];
        for (const match of recallImageMatches) {
            const src = normalizeUrl(match[1]);
            if (!src) continue;
            const lower = src.toLowerCase();
            if (lower.includes('/files/styles/recall_image') || lower.includes('/files/') && (lower.includes('.jpg') || lower.includes('.jpeg') || lower.includes('.png') || lower.includes('.webp'))) {
                return src;
            }
        }

        const ogMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i);
        if (ogMatch?.[1] && !ogMatch[1].toLowerCase().includes('fda-social-graphic')) return normalizeUrl(ogMatch[1]);

        const twitterMatch = html.match(/<meta\s+(?:property|name)="twitter:image"\s+content="([^"]+)"/i);
        if (twitterMatch?.[1] && !twitterMatch[1].toLowerCase().includes('fda-social-graphic')) return normalizeUrl(twitterMatch[1]);
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

async function scrapeFDA(): Promise<Article[]> {
    console.log('🚀 Starting FDA scraper...');
    console.log(`📡 Target URL: ${FEED_URL}\n`);

    const parser = new Parser({
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
                source: 'fda',
                title: item.title,
                url: item.link,
                published_date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
                excerpt: (item.contentSnippet || item.content || '').substring(0, 200).trim(),
                scraped_at: new Date().toISOString(),
                image
            });
        }
    } catch (error: any) {
        console.error('❌ Error scraping FDA RSS feed:', error.message || error);
        articles = loadExistingArticles();
        if (articles.length > 0) {
            console.log(`⚠️ Using ${articles.length} previously scraped FDA articles.`);
        }
    }

    const dir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(articles, null, 2));

    return articles;
}

export { scrapeFDA };
