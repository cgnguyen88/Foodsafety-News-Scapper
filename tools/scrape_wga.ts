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

const OUTPUT_PATH = path.join(__dirname, '../.tmp/scraped_data/wga.json');
const FEED_CANDIDATES = [
    'https://www.wga.com/feed/',
    'https://wgaconnect.wga.com/feed/'
];

function extractContentImage(item: any): string | undefined {
    const html = String(item?.['content:encoded'] || item?.content || '');
    if (!html) return undefined;
    const imgMatch = html.match(/<img[^>]+src="([^"]+)"/i);
    if (imgMatch?.[1]) return imgMatch[1];
    const rawUrlMatch = html.match(/https?:\/\/[^\s"'<>]+(?:jpg|jpeg|png|webp)/i);
    return rawUrlMatch?.[0];
}

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

async function scrapeWGA(): Promise<Article[]> {
    console.log('🚀 Starting WGA scraper...');

    const parser = new Parser({
        customFields: {
            item: ['content:encoded']
        }
    });
    let articles: Article[] = [];

    try {
        const feed = await parseFirstAvailableFeed(parser);
        if (!feed) {
            throw new Error('No WGA feed available');
        }

        console.log(`✓ Fetched ${feed.items.length} items from WGA feed.`);
        for (const item of feed.items) {
            if (!item.title || !item.link) continue;

            const article: Article = {
                source: 'wga',
                title: item.title,
                url: item.link,
                published_date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
                excerpt: (item.contentSnippet || item.content || '').substring(0, 200).trim(),
                scraped_at: new Date().toISOString(),
                image: extractContentImage(item as any) || await fetchImage(item.link)
            };

            articles.push(article);
            console.log(`  ✓ Added: "${article.title}"`);
        }
    } catch (error: any) {
        console.error('❌ Error scraping WGA feed:', error.message || error);
        articles = loadExistingArticles();
        if (articles.length > 0) {
            console.log(`⚠️ Using ${articles.length} previously scraped WGA articles.`);
        }
    }

    const dir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(articles, null, 2));

    return articles;
}

export { scrapeWGA };
