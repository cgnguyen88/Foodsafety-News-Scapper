import fetch from 'node-fetch';

async function testFetch() {
    const res = await fetch('https://www.fsis.usda.gov/news-events/news-press-releases/rss.xml');
    console.log(res.status);

    // Test fetching an FDA article
    const fdaRes = await fetch('https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts');
    const fdaHtml = await fdaRes.text();
    const fdaMatch = fdaHtml.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i);
    console.log('FDA Image:', fdaMatch ? fdaMatch[1] : 'None');
}
testFetch();
