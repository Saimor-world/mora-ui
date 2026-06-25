export interface RssFeedItem {
    id: string;
    sourceTitle: string;
    title: string;
    link?: string;
    published?: string;
    summary?: string;
    imageUrl?: string;
}

function enclosureImageUrl(enclosure: unknown): string | undefined {
    if (!enclosure) return undefined;
    if (Array.isArray(enclosure)) {
        for (const entry of enclosure) {
            const url = enclosureImageUrl(entry);
            if (url) return url;
        }
        return undefined;
    }
    if (typeof enclosure !== 'object') return undefined;
    const record = enclosure as Record<string, unknown>;
    const url = typeof record.url === 'string' ? record.url : undefined;
    const type = typeof record.type === 'string' ? record.type.toLowerCase() : '';
    if (!url) return undefined;
    if (type.startsWith('image/')) return url;
    if (/\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(url)) return url;
    return undefined;
}

function mediaFieldImageUrl(value: unknown): string | undefined {
    if (!value) return undefined;
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value !== 'object') return undefined;
    const record = value as Record<string, unknown>;
    const url = typeof record.url === 'string' ? record.url : undefined;
    if (!url) return undefined;
    const medium = typeof record.medium === 'string' ? record.medium.toLowerCase() : '';
    const type = typeof record.type === 'string' ? record.type.toLowerCase() : '';
    if (medium === 'image' || type.startsWith('image/')) return url;
    if (/\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(url)) return url;
    return undefined;
}

function extractImageFromHtml(html?: unknown): string | undefined {
    if (typeof html !== 'string' || !html.includes('<img')) return undefined;
    const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    return match?.[1];
}

function firstString(...values: unknown[]): string | undefined {
    for (const value of values) {
        if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return undefined;
}

/** Normalize a Core RSS item payload into a UI-friendly shape with optional thumbnail. */
export function parseRssItem(item: Record<string, unknown>): RssFeedItem {
    const summary = typeof item.summary === 'string'
        ? item.summary
        : typeof item.snippet === 'string'
            ? item.snippet
            : '';

    const rawHtml = firstString(
        item.content_encoded,
        item.contentEncoded,
        item['content:encoded'],
        item.description_raw,
        item.descriptionRaw,
    );

    const imageUrl =
        firstString(item.image_url, item.imageUrl, item.thumbnail) ||
        mediaFieldImageUrl(item.media_thumbnail) ||
        mediaFieldImageUrl(item.mediaThumbnail) ||
        mediaFieldImageUrl(item.media_content) ||
        mediaFieldImageUrl(item.mediaContent) ||
        enclosureImageUrl(item.enclosure) ||
        extractImageFromHtml(rawHtml) ||
        extractImageFromHtml(item.summary) ||
        extractImageFromHtml(item.snippet) ||
        extractImageFromHtml(item.description) ||
        undefined;

    return {
        id: String(item.id || item.link || item.title || crypto.randomUUID()),
        sourceTitle: String(item.source_title || item.sourceTitle || 'Feed'),
        title: String(item.title || 'Feed-Eintrag'),
        link: typeof item.link === 'string' ? item.link : undefined,
        published: typeof item.published === 'string'
            ? item.published
            : typeof item.pubDate === 'string'
                ? item.pubDate
                : undefined,
        summary,
        imageUrl,
    };
}
