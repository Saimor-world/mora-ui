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
    if (!enclosure || typeof enclosure !== 'object') return undefined;
    const record = enclosure as Record<string, unknown>;
    const url = typeof record.url === 'string' ? record.url : undefined;
    const type = typeof record.type === 'string' ? record.type.toLowerCase() : '';
    if (!url) return undefined;
    if (type.startsWith('image/')) return url;
    if (/\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(url)) return url;
    return undefined;
}

function extractImageFromHtml(html?: unknown): string | undefined {
    if (typeof html !== 'string' || !html.includes('<img')) return undefined;
    const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    return match?.[1];
}

/** Normalize a Core RSS item payload into a UI-friendly shape with optional thumbnail. */
export function parseRssItem(item: Record<string, unknown>): RssFeedItem {
    const summary = typeof item.summary === 'string'
        ? item.summary
        : typeof item.snippet === 'string'
            ? item.snippet
            : '';

    const imageUrl =
        (typeof item.image_url === 'string' && item.image_url) ||
        (typeof item.imageUrl === 'string' && item.imageUrl) ||
        (typeof item.thumbnail === 'string' && item.thumbnail) ||
        (typeof item.media_thumbnail === 'string' && item.media_thumbnail) ||
        enclosureImageUrl(item.enclosure) ||
        extractImageFromHtml(summary) ||
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
