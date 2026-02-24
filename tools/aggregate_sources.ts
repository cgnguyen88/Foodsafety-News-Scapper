import * as fs from 'fs';
import * as path from 'path';
import { validateArticles, deduplicateArticles, filterLast24Hours } from './validate_articles';

interface Article {
    id?: string;
    source: string;
    title: string;
    url: string;
    published_date: string;
    excerpt: string;
    scraped_at?: string;
    image?: string;
}

interface ProcessedPayload {
    articles: Article[];
    last_updated: string;
    sources_checked: string[];
    total_articles: number;
    validation_summary: {
        total_scraped: number;
        duplicates_removed: number;
        invalid_skipped: number;
        time_filtered: number;
    };
}

const SCRAPED_DATA_DIR = path.join(__dirname, '../.tmp/scraped_data');
const OUTPUT_PATH = path.join(__dirname, '../.tmp/processed_articles.json');

async function loadSourceData(source: string): Promise<Article[]> {
    const filePath = path.join(SCRAPED_DATA_DIR, `${source}.json`);

    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const articles = JSON.parse(content);
            console.log(`✓ Loaded ${articles.length} articles from ${source}`);
            return articles;
        } else {
            console.warn(`⚠️  Source file not found: ${source}.json`);
            return [];
        }
    } catch (error) {
        console.error(`❌ Error loading ${source}:`, error);
        return [];
    }
}

async function aggregateSources(): Promise<ProcessedPayload> {
    console.log('🔄 Starting article aggregation and validation...\n');

    const sources = ['usda', 'fda', 'lgma', 'wga'];
    const allArticles: Article[] = [];

    // Load all sources
    for (const source of sources) {
        const articles = await loadSourceData(source);
        allArticles.push(...articles);
    }

    const totalScraped = allArticles.length;
    console.log(`\n📊 Total articles scraped: ${totalScraped}`);

    // Step 1: Validate articles
    console.log('\n🔍 Validating articles...');
    const { valid, invalid, reasons } = validateArticles(allArticles);
    console.log(`✓ Valid: ${valid.length}`);
    console.log(`✗ Invalid: ${invalid}`);

    if (invalid > 0) {
        console.log('  Reasons:');
        Object.entries(reasons).forEach(([reason, count]) => {
            console.log(`    - ${reason}: ${count}`);
        });
    }

    // Step 2: Deduplicate
    console.log('\n🔄 Deduplicating...');
    const beforeDedup = valid.length;
    const deduplicated = deduplicateArticles(valid);
    const duplicatesRemoved = beforeDedup - deduplicated.length;

    // Step 3: Filter by 24-hour window
    console.log('\n🕒 Filtering to last 24 hours...');
    const beforeFilter = deduplicated.length;
    const filtered = filterLast24Hours(deduplicated);
    const filteredCount = beforeFilter - filtered.length;

    // Step 4: Sort using custom priority requested by product:
    // 1) FDA articles with images
    // 2) LGMA articles with images
    // 3) Articles without images
    // 4) Remaining articles
    const sortPriority = (article: Article): number => {
        const hasImage = Boolean(article.image);
        if (article.source === 'fda' && hasImage) return 0;
        if (article.source === 'lgma' && hasImage) return 1;
        if (!hasImage) return 2;
        return 3;
    };

    const sorted = filtered.sort((a, b) => {
        const priorityDiff = sortPriority(a) - sortPriority(b);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.published_date).getTime() - new Date(a.published_date).getTime();
    });

    // Create payload
    const payload: ProcessedPayload = {
        articles: sorted,
        last_updated: new Date().toISOString(),
        sources_checked: sources,
        total_articles: sorted.length,
        validation_summary: {
            total_scraped: totalScraped,
            duplicates_removed: duplicatesRemoved,
            invalid_skipped: invalid,
            time_filtered: filteredCount
        }
    };

    // Save processed data
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2));
    console.log(`\n💾 Saved processed articles to: ${OUTPUT_PATH}`);

    // Also copy to dashboard folder for web access
    const dashboardPath = path.join(__dirname, '../dashboard/processed_articles.json');
    fs.writeFileSync(dashboardPath, JSON.stringify(payload, null, 2));
    console.log(`📋 Copied to dashboard: ${dashboardPath}`);

    // Print summary
    console.log('\n✅ Aggregation Complete');
    console.log('─────────────────────────');
    console.log(`Total Scraped:     ${totalScraped}`);
    console.log(`- Duplicates:      ${duplicatesRemoved}`);
    console.log(`- Invalid:         ${invalid}`);
    console.log(`- Outside 24h:     ${filteredCount}`);
    console.log(`─────────────────────────`);
    console.log(`Final Count:       ${payload.total_articles} articles\n`);

    return payload;
}

// Run if executed directly
if (require.main === module) {
    aggregateSources()
        .then(payload => {
            console.log(`📊 Final article count: ${payload.total_articles}`);
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Fatal error:', error);
            process.exit(1);
        });
}

export { aggregateSources };
