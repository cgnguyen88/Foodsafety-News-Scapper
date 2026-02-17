import puppeteer from 'puppeteer';
import { processContent } from './openai';

async function scrape(url: string) {
    console.log(`Starting scrape for: ${url}`);
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Basic extraction - get page title and text content
        const title = await page.title();
        const content = await page.evaluate(() => document.body.innerText);

        console.log(`Title: ${title}`);
        console.log(`Content length: ${content.length} characters`);

        // Process with OpenAI
        console.log("Processing content with OpenAI...");
        const summary = await processContent(content);
        console.log("\n--- Summary ---\n");
        console.log(summary);

    } catch (error) {
        console.error("Error scraping page:", error);
    } finally {
        await browser.close();
    }
}

// Example usage
const targetUrl = process.argv[2] || 'https://example.com';
scrape(targetUrl);
