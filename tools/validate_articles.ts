import { isValid, parseISO, subDays, isAfter } from 'date-fns';
import { randomUUID } from 'crypto';

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

interface ValidationResult {
    valid: Article[];
    invalid: number;
    reasons: { [key: string]: number };
}

function isValidUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

function isValidDate(dateString: string): boolean {
    try {
        const date = parseISO(dateString);
        const now = new Date();
        return isValid(date) && date <= now;
    } catch {
        return false;
    }
}

function normalizeUrl(url: string): string {
    try {
        const parsed = new URL(url);

        // Remove common tracking parameters
        const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref', 'fbclid', 'gclid'];
        trackingParams.forEach(param => parsed.searchParams.delete(param));

        return parsed.toString();
    } catch {
        return url;
    }
}

function truncateExcerpt(excerpt: string, maxLength: number = 200): string {
    if (!excerpt) return '';
    if (excerpt.length <= maxLength) return excerpt;
    return excerpt.substring(0, maxLength - 3) + '...';
}

export function validateArticles(articles: Article[]): ValidationResult {
    const valid: Article[] = [];
    const reasons: { [key: string]: number } = {};

    for (const article of articles) {
        // Check required fields
        if (!article.source || !article.title || !article.url) {
            reasons['missing_required_fields'] = (reasons['missing_required_fields'] || 0) + 1;
            continue;
        }

        // Validate URL
        if (!isValidUrl(article.url)) {
            reasons['invalid_url'] = (reasons['invalid_url'] || 0) + 1;
            console.warn(`⚠️  Invalid URL: ${article.url}`);
            continue;
        }

        // Validate date
        if (!isValidDate(article.published_date)) {
            reasons['invalid_date'] = (reasons['invalid_date'] || 0) + 1;
            console.warn(`⚠️  Invalid date for article: "${article.title}"`);
            continue;
        }

        // Transform article
        const validatedArticle: Article = {
            id: article.id || randomUUID(),
            source: article.source,
            title: article.title.trim(),
            url: normalizeUrl(article.url),
            published_date: article.published_date,
            excerpt: truncateExcerpt(article.excerpt || ''),
            scraped_at: article.scraped_at || new Date().toISOString(),
            image: article.image
        };

        valid.push(validatedArticle);
    }

    return {
        valid,
        invalid: Object.values(reasons).reduce((sum, count) => sum + count, 0),
        reasons
    };
}

export function deduplicateArticles(articles: Article[]): Article[] {
    const seen = new Map<string, Article>();
    let duplicateCount = 0;

    for (const article of articles) {
        const normalizedUrl = normalizeUrl(article.url);
        const existing = seen.get(normalizedUrl);

        if (!existing) {
            seen.set(normalizedUrl, article);
        } else {
            duplicateCount++;
            // Keep the one with the newest scraped_at timestamp
            const existingTime = new Date(existing.scraped_at || 0).getTime();
            const newTime = new Date(article.scraped_at || 0).getTime();

            if (newTime > existingTime) {
                seen.set(normalizedUrl, article);
            }
        }
    }

    if (duplicateCount > 0) {
        console.log(`🔄 Removed ${duplicateCount} duplicate articles`);
    }

    return Array.from(seen.values());
}

export function filterLast24Hours(articles: Article[]): Article[] {
    const cutoff = subDays(new Date(), 30);
    const before = articles.length;

    const filtered = articles.filter(article => {
        const publishDate = parseISO(article.published_date);
        return isAfter(publishDate, cutoff);
    });

    const removed = before - filtered.length;
    if (removed > 0) {
        console.log(`🕒 Filtered out ${removed} articles older than 30 days`);
    }

    return filtered;
}
