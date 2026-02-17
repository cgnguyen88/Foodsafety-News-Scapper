import fetch from 'node-fetch';
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

interface RedditPost {
    data: {
        title: string;
        url: string;
        permalink: string;
        created_utc: number;
        selftext?: string;
        score: number;
        subreddit: string;
        thumbnail?: string;
        preview?: {
            images?: Array<{
                source?: {
                    url?: string;
                };
            }>;
        };
    };
}

const SUBREDDITS = ['OpenAI', 'MachineLearning', 'ArtificialIntelligence'];
const OUTPUT_PATH = path.join(__dirname, '../.tmp/scraped_data/reddit.json');
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchSubreddit(subreddit: string): Promise<RedditPost[]> {
    const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=50`;

    console.log(`📡 Fetching r/${subreddit}...`);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT
            },
            timeout: 15000
        });

        if (!response.ok) {
            console.error(`❌ Failed to fetch r/${subreddit}: ${response.status} ${response.statusText}`);
            return [];
        }

        const data: any = await response.json();

        if (!data.data?.children) {
            console.warn(`⚠️  No posts found in r/${subreddit}`);
            return [];
        }

        console.log(`  ✓ Fetched ${data.data.children.length} posts from r/${subreddit}`);
        return data.data.children;

    } catch (error) {
        console.error(`❌ Error fetching r/${subreddit}:`, error);
        return [];
    }
}

async function scrapeReddit(): Promise<Article[]> {
    console.log('🚀 Starting Reddit scraper...');
    console.log(`Subreddits: ${SUBREDDITS.join(', ')}\n`);

    const articles: Article[] = [];
    const cutoffTime = subHours(new Date(), 24);

    for (const subreddit of SUBREDDITS) {
        const posts = await fetchSubreddit(subreddit);

        for (const post of posts as RedditPost[]) {
            try {
                const { title, url, permalink, created_utc, selftext, score, thumbnail, preview } = post.data;

                // Convert Unix timestamp to Date
                const publishDate = new Date(created_utc * 1000);

                // Filter for last 24 hours
                if (!isAfter(publishDate, cutoffTime)) {
                    continue;
                }

                // Optional: Filter by minimum score (5+ upvotes)
                if (score < 5) {
                    continue;
                }

                // Determine the best URL (use permalink for self posts, otherwise external URL)
                const articleUrl = url.includes('reddit.com')
                    ? `https://reddit.com${permalink}`
                    : url;

                // Extract image from Reddit preview or thumbnail
                let imageUrl: string | undefined = undefined;
                if (preview?.images?.[0]?.source?.url) {
                    imageUrl = preview.images[0].source.url.replace(/&amp;/g, '&');
                } else if (thumbnail && thumbnail !== 'self' && thumbnail !== 'default' && thumbnail.startsWith('http')) {
                    imageUrl = thumbnail;
                }

                // Create article object
                const article: Article = {
                    source: 'reddit',
                    title: title.trim(),
                    url: articleUrl,
                    published_date: publishDate.toISOString(),
                    excerpt: selftext
                        ? selftext.substring(0, 200).trim()
                        : `From r/${post.data.subreddit} | ${score} upvotes`,
                    image: imageUrl,
                    scraped_at: new Date().toISOString()
                };

                articles.push(article);
                console.log(`  ✓ Added: "${article.title.substring(0, 60)}..." (${score} ⬆️)`);

            } catch (error) {
                console.error('❌ Error processing Reddit post:', error);
                continue;
            }
        }

        // Rate limiting: 2s delay between subreddits
        if (SUBREDDITS.indexOf(subreddit) < SUBREDDITS.length - 1) {
            console.log('⏳ Waiting 2s before next subreddit...\n');
            await delay(2000);
        }
    }

    console.log(`\n✅ Scraping complete. Found ${articles.length} articles from last 24h`);

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
    scrapeReddit()
        .then(articles => {
            console.log(`\n📊 Final count: ${articles.length} articles`);
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Fatal error:', error);
            process.exit(1);
        });
}

export { scrapeReddit };
