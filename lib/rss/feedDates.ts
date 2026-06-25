import type { RssFeedItem } from '@/lib/rss/parseRssItem';

function parseFeedTimestamp(iso?: string | null): number | null {
    if (!iso) return null;
    const ts = new Date(iso).getTime();
    return Number.isNaN(ts) ? null : ts;
}

/** Newest first — safe even when the API returns mixed date formats. */
export function sortFeedItemsByDateDesc<T extends Pick<RssFeedItem, 'published'>>(items: T[]): T[] {
    return [...items].sort((left, right) => {
        const rightTs = parseFeedTimestamp(right.published) ?? 0;
        const leftTs = parseFeedTimestamp(left.published) ?? 0;
        return rightTs - leftTs;
    });
}

export function formatRelativeDe(iso?: string | null): string | null {
    const ts = parseFeedTimestamp(iso);
    if (ts === null) return null;

    const diffMin = Math.round((Date.now() - ts) / 60_000);
    if (diffMin < 1) return 'gerade eben';
    if (diffMin < 60) return `vor ${diffMin} Min.`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `vor ${diffH} Std.`;
    const diffD = Math.round(diffH / 24);
    if (diffD < 7) return `vor ${diffD} T.`;
    if (diffD < 30) return `vor ${Math.round(diffD / 7)} Wo.`;

    return new Intl.DateTimeFormat('de-DE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(ts));
}

export function formatFeedDateLabel(iso?: string | null): string | null {
    const relative = formatRelativeDe(iso);
    if (!relative) return null;
    return relative;
}

export function formatLastUpdatedLabel(iso?: string | null): string | null {
    const label = formatFeedDateLabel(iso);
    return label ? `Zuletzt aktualisiert · ${label}` : null;
}

/** Short hint that feed cadence depends on the publisher, not SAIMOR polling. */
export function feedCadenceHint(sourceTitle?: string): string {
    const source = (sourceTitle || '').toLowerCase();
    if (source.includes('xkcd')) {
        return 'XKCD erscheint typischerweise Mo/Mi/Fr — nicht täglich.';
    }
    return 'Aktualisierung richtet sich nach der Quelle, nicht stündlich.';
}
