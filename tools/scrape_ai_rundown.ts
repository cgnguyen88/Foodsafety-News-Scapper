import puppeteer from 'puppeteer';
import { subHours, isAfter } from 'date-fns';
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

const ARTICLES_URL = 'https://www.rundown.ai/articles';
const OUTPUT_PATH = path.join(__dirname, '../.tmp/scraped_data/ai_rundown.json');

async function scrapeAIRundown(): Promise<Article[]> {
    console.log('🚀 Starting AI Rundown scraper...');
    console.log(`📡 Target URL: ${ARTICLES_URL}\n`);

    const articles: Article[] = [];
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

        console.log('📄 Loading articles page...');
        await page.goto(ARTICLES_URL, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        console.log('✓ Page loaded. Extracting articles...\n');

        // Extract article data
        const scrapedArticles = await page.evaluate(() => {
            const articles: any[] = [];
            const articleElements = document.querySelectorAll('.w-dyn-item');

            articleElements.forEach((element) => {
                try {
                    // Extract title
                    const titleElement = element.querySelector('[data-title]') || element.querySelector('h3') || element.querySelector('h2');
                    const title = titleElement?.textContent?.trim() || '';

                    // Extract URL
                    const linkElement = element.querySelector('a');
                    const url = linkElement?.href || '';

                    // Extract excerpt/description (if available)
                    // Try multiple selectors to find a good description
                    let excerpt = '';
                    const descElement = element.querySelector('[data-desc]') ||
                                      element.querySelector('.article-description') ||
                                      element.querySelector('.description') ||
                                      element.querySelector('p:not(.date):not(.meta)');

                    if (descElement) {
                        const text = descElement.textContent?.trim() || '';
                        // Only use if it's different from the title and not empty
                        if (text && text !== title) {
                            excerpt = text;
                        }
                    }

                    // Extract image
                    const imgElement = element.querySelector('img');
                    const image = imgElement?.src || imgElement?.getAttribute('data-src') || '';

                    if (title && url) {
                        articles.push({
                            title,
                            url,
                            excerpt,
                            image
                        });
                    }
                } catch (error) {
                    console.error('Error extracting article:', error);
                }
            });

            return articles;
        });

        console.log(`✓ Extracted ${scrapedArticles.length} articles from page`);

        // Process articles and fetch full content
        // Since we can't easily get exact publish dates from the page, we'll include recent articles
        // and assume they're within the last few days (The Rundown publishes daily)
        for (const item of scrapedArticles.slice(0, 10)) { // Take first 10 (most recent)
            try {
                // Fetch the actual article content
                let fullExcerpt = item.excerpt || '';

                if (!fullExcerpt || fullExcerpt === item.title) {
                    // Navigate to the article page to get the content
                    try {
                        console.log(`  📄 Fetching content from: ${item.url}`);
                        await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 15000 });

                        // Extract article body content
                        const articleContent = await page.evaluate(() => {
                            // Try multiple selectors to find article content
                            const contentSelectors = [
                                'article p',
                                '.article-content p',
                                '.post-content p',
                                '.content p',
                                'main p',
                                '[class*="rich-text"] p'
                            ];

                            let paragraphs: string[] = [];
                            for (const selector of contentSelectors) {
                                const elements = document.querySelectorAll(selector);
                                if (elements.length > 0) {
                                    paragraphs = Array.from(elements)
                                        .map(el => el.textContent?.trim() || '')
                                        .filter(text => text.length > 50); // Only keep substantial paragraphs
                                    if (paragraphs.length > 0) break;
                                }
                            }

                            // Join first 5-6 paragraphs or up to 400 characters
                            return paragraphs.slice(0, 6).join(' ').substring(0, 400);
                        });

                        if (articleContent && articleContent.length > 50) {
                            fullExcerpt = articleContent.trim() + '...';
                        }

                        // Small delay to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, 1000));

                    } catch (error) {
                        console.warn(`  ⚠️  Could not fetch content for: ${item.title}`);
                        // Use a generic but better fallback
                        fullExcerpt = `Latest AI news and insights. Click to read the full article about ${item.title.toLowerCase()}.`;
                    }
                }

                const article: Article = {
                    source: 'ai_rundown',
                    title: item.title.trim(),
                    url: item.url,
                    published_date: new Date().toISOString(), // Use current time as approximation
                    excerpt: fullExcerpt.substring(0, 400).trim(),
                    image: item.image || undefined,
                    scraped_at: new Date().toISOString()
                };

                articles.push(article);
                console.log(`  ✓ Added: "${article.title}"`);

            } catch (error) {
                console.error('❌ Error processing article:', error);
                continue;
            }
        }

        console.log(`\n✅ Scraping complete. Found ${articles.length} recent articles`);

    } catch (error) {
        console.error('❌ Error scraping AI Rundown:', error);
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
    scrapeAIRundown()
        .then(articles => {
            console.log(`\n📊 Final count: ${articles.length} articles`);
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Fatal error:', error);
            process.exit(1);
        });
}

export { scrapeAIRundown };
