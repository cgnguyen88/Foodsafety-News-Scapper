import { scrapeUSDA } from './scrape_usda';
import { scrapeFDA } from './scrape_fda';
import { scrapeLGMA } from './scrape_lgma';
import { scrapeWGA } from './scrape_wga';
import { aggregateSources } from './aggregate_sources';

async function runAllScrapers() {
    console.log('🚀 Starting all food safety scrapers...\n');
    console.log('════════════════════════════════════════\n');

    const results = {
        usda: 0,
        fda: 0,
        lgma: 0,
        wga: 0
    };

    // Run USDA
    try {
        console.log('1️⃣  USDA');
        console.log('════════════════════════════════════════');
        const usdaArticles = await scrapeUSDA();
        results.usda = usdaArticles.length;
        console.log('\n');
    } catch (error) {
        console.error('❌ USDA scraper failed:', error);
        console.log('\n');
    }

    // Run FDA
    try {
        console.log('2️⃣  FDA');
        console.log('════════════════════════════════════════');
        const fdaArticles = await scrapeFDA();
        results.fda = fdaArticles.length;
        console.log('\n');
    } catch (error) {
        console.error('❌ FDA scraper failed:', error);
        console.log('\n');
    }

    // Run LGMA
    try {
        console.log('3️⃣  LGMA');
        console.log('════════════════════════════════════════');
        const lgmaArticles = await scrapeLGMA();
        results.lgma = lgmaArticles.length;
        console.log('\n');
    } catch (error) {
        console.error('❌ LGMA scraper failed:', error);
        console.log('\n');
    }

    // Run WGA
    try {
        console.log('4️⃣  WESTERN GROWERS ASSOCIATION');
        console.log('════════════════════════════════════════');
        const wgaArticles = await scrapeWGA();
        results.wga = wgaArticles.length;
        console.log('\n');
    } catch (error) {
        console.error('❌ WGA scraper failed:', error);
        console.log('\n');
    }

    // Aggregate all sources
    console.log('5️⃣  AGGREGATION & VALIDATION');
    console.log('════════════════════════════════════════');
    const payload = await aggregateSources();

    console.log('\n🎉 All scrapers complete!\n');
    console.log('📊 Results Summary:');
    console.log('─────────────────────────');
    console.log(`USDA: ${results.usda} articles`);
    console.log(`FDA:  ${results.fda} articles`);
    console.log(`LGMA: ${results.lgma} articles`);
    console.log(`WGA:  ${results.wga} articles`);
    console.log(`─────────────────────────`);
    console.log(`Total Raw:    ${results.usda + results.fda + results.lgma + results.wga}`);
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
