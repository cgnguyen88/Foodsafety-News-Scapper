import puppeteer from 'puppeteer';
import { subHours, isAfter, parse } from 'date-fns';
import * as fs from 'fs';
import * as path from 'path';

interface Article {
    source: string;
    title: string;
    url: string;
    published_date: string;
    excerpt: string;
    scraped_at: string;
}

const ARCHIVE_URL = 'https://www.bensbites.com/archive';
const OUTPUT_PATH = path.join(__dirname, '../.tmp/scraped_data/bens_bites.json');

async function parseBensDate(dateText: string): Promise<Date> {
    // Ben's Bites uses formats like "Feb 13" or "Yesterday"
    const now = new Date();
    const currentYear = now.getFullYear();

    // Handle "Yesterday", "Today", etc.
    if (dateText.toLowerCase().includes('yesterday')) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday;
    }

    if (dateText.toLowerCase().includes('today')) {
        return now;
    }

    // Parse "Feb 13" format
    try {
        // Try parsing as "MMM d" format
        const parsed = parse(dateText, 'MMM d', new Date());

        // If parsed month is in the future (e.g., Dec when it's Jan), use last year
        if (parsed.getMonth() > now.getMonth()) {
            parsed.setFullYear(currentYear - 1);
        } else {
            parsed.setFullYear(currentYear);
        }

        return parsed;
    } catch (error) {
        console.warn(`⚠️  Could not parse date: "${dateText}". Using current time.`);
        return now;
    }
}

async function scrapeBensBites(): Promise<Article[]> {
    console.log('🚀 Starting Ben\'s Bites scraper...');
    console.log(`📡 Target URL: ${ARCHIVE_URL}\n`);

    const articles: Article[] = [];
    const cutoffTime = subHours(new Date(), 24);

    let browser;

    try {
        console.log('🌐 Launching headless browser...');
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        // Set user agent
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Navigate to archive
        console.log('📄 Loading archive page...');
        await page.goto(ARCHIVE_URL, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        console.log('✓ Page loaded. Extracting articles...\n');

        // Extract article data
        const scrapedArticles = await page.evaluate(() => {
            const articles: any[] = [];

            // Find all post preview elements
            const postPreviews = document.querySelectorAll('.post-preview');

            postPreviews.forEach((post) => {
                try {
                    // Extract title
                    const titleElement = post.querySelector('.post-preview-title');
                    const title = titleElement?.textContent?.trim() || '';

                    // Extract URL
                    const linkElement = post.querySelector('a.post-preview-title');
                    const url = (linkElement as HTMLAnchorElement)?.href || '';

                    // Extract date
                    const dateElement = post.querySelector('.post-date');
                    const dateText = dateElement?.textContent?.trim() || '';

                    // Extract excerpt/description
                    const descElement = post.querySelector('.post-preview-description');
                    const excerpt = descElement?.textContent?.trim() || '';

                    if (title && url) {
                        articles.push({ title, url, dateText, excerpt });
                    }
                } catch (error) {
                    console.error('Error extracting article:', error);
                }
            });

            return articles;
        });

        console.log(`✓ Extracted ${scrapedArticles.length} total articles from page`);

        // Process and filter articles
        for (const item of scrapedArticles) {
            try {
                // Parse date
                const publishDate = await parseBensDate(item.dateText);

                // Filter for last 24 hours
                if (!isAfter(publishDate, cutoffTime)) {
                    continue;
                }

                // Create article object
                const article: Article = {
                    source: 'bens_bites',
                    title: item.title.trim(),
                    url: item.url,
                    published_date: publishDate.toISOString(),
                    excerpt: item.excerpt.substring(0, 200).trim(),
                    scraped_at: new Date().toISOString()
                };

                articles.push(article);
                console.log(`  ✓ Added: "${article.title}"`);

            } catch (error) {
                console.error('❌ Error processing article:', error);
                continue;
            }
        }

        console.log(`\n✅ Scraping complete. Found ${articles.length} articles from last 24h`);

    } catch (error) {
        console.error('❌ Error scraping Ben\'s Bites:', error);
        return [];
    } finally {
        if (browser) {
            await browser.close();
            console.log('🔒 Browser closed');
        }
    }

    // Save to file
    const dir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(articles, null, 2));
    console.log(`💾 Saved to: ${OUTPUT_PATH}`);

    return articles;
}

// Run if executed directly
if (require.main === module) {
    scrapeBensBites()
        .then(articles => {
            console.log(`\n📊 Final count: ${articles.length} articles`);
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Fatal error:', error);
            process.exit(1);
        });
}

export { scrapeBensBites };
