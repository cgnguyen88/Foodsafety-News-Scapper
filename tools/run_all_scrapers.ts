import { scrapeBensBites } from './scrape_bens_bites';
import { scrapeAIRundown } from './scrape_ai_rundown';
import { scrapeReddit } from './scrape_reddit';
import { aggregateSources } from './aggregate_sources';

async function runAllScrapers() {
    console.log('🚀 Starting all scrapers...\n');
    console.log('════════════════════════════════════════\n');

    const results = {
        bens_bites: 0,
        ai_rundown: 0,
        reddit: 0
    };

    // Run AI Rundown (fastest, RSS)
    try {
        console.log('1️⃣  AI RUNDOWN');
        console.log('════════════════════════════════════════');
        const aiRundownArticles = await scrapeAIRundown();
        results.ai_rundown = aiRundownArticles.length;
        console.log('\n');
    } catch (error) {
        console.error('❌ AI Rundown scraper failed:', error);
        console.log('\n');
    }

    // Run Reddit (medium speed, JSON API)
    try {
        console.log('2️⃣  REDDIT');
        console.log('════════════════════════════════════════');
        const redditArticles = await scrapeReddit();
        results.reddit = redditArticles.length;
        console.log('\n');
    } catch (error) {
        console.error('❌ Reddit scraper failed:', error);
        console.log('\n');
    }

    // Run Ben's Bites (slowest, Puppeteer)
    try {
        console.log('3️⃣  BEN\'S BITES');
        console.log('════════════════════════════════════════');
        const bensBitesArticles = await scrapeBensBites();
        results.bens_bites = bensBitesArticles.length;
        console.log('\n');
    } catch (error) {
        console.error('❌ Ben\'s Bites scraper failed:', error);
        console.log('\n');
    }

    // Aggregate all sources
    console.log('4️⃣  AGGREGATION & VALIDATION');
    console.log('════════════════════════════════════════');
    const payload = await aggregateSources();

    console.log('\n🎉 All scrapers complete!\n');
    console.log('📊 Results Summary:');
    console.log('─────────────────────────');
    console.log(`Ben's Bites:  ${results.bens_bites} articles`);
    console.log(`AI Rundown:   ${results.ai_rundown} articles`);
    console.log(`Reddit:       ${results.reddit} articles`);
    console.log(`─────────────────────────`);
    console.log(`Total Raw:    ${results.bens_bites + results.ai_rundown + results.reddit}`);
    console.log(`Final (after validation): ${payload.total_articles}`);
    console.log('\n✅ Ready for dashboard!\n');
}

// Run
runAllScrapers()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    });
