'use client';

import React from 'react';
import { ExternalLink, Rss } from 'lucide-react';
import type { RssFeedItem } from '@/lib/rss/parseRssItem';
import { formatFeedDateLabel, formatLastUpdatedLabel } from '@/lib/rss/feedDates';
import { FeedImageLightbox } from '@/components/feeds/FeedImageLightbox';

const FeedImage: React.FC<{
    imageUrl?: string;
    title: string;
    compact?: boolean;
    hero?: boolean;
    onExpand?: () => void;
}> = ({ imageUrl, title, compact, hero, onExpand }) => {
    const [failed, setFailed] = React.useState(false);
    const showImage = Boolean(imageUrl) && !failed;

    const sizeClass = hero
        ? 'h-44 w-full sm:h-56'
        : compact
            ? 'h-14 w-14'
            : 'h-40 w-full sm:h-48 sm:w-56';

    if (showImage) {
        const image = (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={imageUrl}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                onError={() => setFailed(true)}
            />
        );

        return (
            <div
                className={`relative shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-black/30 ${sizeClass}`}
            >
                {onExpand ? (
                    <button
                        type="button"
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onExpand();
                        }}
                        className="block h-full w-full cursor-zoom-in"
                        aria-label={`${title} vergrößern`}
                    >
                        {image}
                    </button>
                ) : image}
            </div>
        );
    }

    return (
        <div
            className={`flex shrink-0 items-center justify-center rounded-xl border border-emerald-300/12 bg-emerald-500/[0.06] ${sizeClass}`}
        >
            <Rss size={compact ? 16 : hero ? 28 : 22} className="text-emerald-200/45" />
        </div>
    );
};

export const FeedHeroPreview: React.FC<{
    item: RssFeedItem;
    onOpen?: () => void;
}> = ({ item, onOpen }) => {
    const [lightboxOpen, setLightboxOpen] = React.useState(false);
    const when = formatLastUpdatedLabel(item.published);
    const summary = item.summary?.replace(/<[^>]+>/g, '').trim();

    const heroBody = (
        <div className="group flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] text-left transition-colors hover:border-emerald-300/22 hover:bg-emerald-300/[0.04]">
            <FeedImage
                imageUrl={item.imageUrl}
                title={item.title}
                hero
                onExpand={item.imageUrl ? () => setLightboxOpen(true) : undefined}
            />
            <div className="flex min-h-0 flex-1 flex-col gap-1 p-3">
                <div className="truncate text-[10px] uppercase tracking-[0.16em] text-emerald-200/45">
                    {item.sourceTitle}
                </div>
                <div className="line-clamp-2 text-[14px] font-medium leading-snug text-white/88">
                    {item.title}
                </div>
                {summary && (
                    <p className="line-clamp-2 text-[12px] leading-relaxed text-white/42">
                        {summary}
                    </p>
                )}
                {when && <div className="mt-auto text-[10px] text-white/38">{when}</div>}
            </div>
        </div>
    );

    return (
        <>
            {item.link ? (
                <a href={item.link} target="_blank" rel="noreferrer" onClick={onOpen} className="block min-h-0 flex-1">
                    {heroBody}
                </a>
            ) : (
                <button type="button" onClick={onOpen} className="block min-h-0 w-full flex-1 text-left">
                    {heroBody}
                </button>
            )}
            {lightboxOpen && item.imageUrl && (
                <FeedImageLightbox
                    imageUrl={item.imageUrl}
                    title={item.title}
                    onClose={() => setLightboxOpen(false)}
                />
            )}
        </>
    );
};

export const FeedItemCard: React.FC<{
    item: RssFeedItem;
    compact?: boolean;
    onOpen?: () => void;
}> = ({ item, compact, onOpen }) => {
    const [lightboxOpen, setLightboxOpen] = React.useState(false);
    const when = formatFeedDateLabel(item.published);
    const body = (
        <div
            className={`group flex overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] text-left transition-colors hover:border-emerald-300/22 hover:bg-emerald-300/[0.04] ${
                compact ? 'flex-row items-stretch gap-2.5 p-2' : 'flex-col gap-0 sm:flex-row sm:items-stretch'
            }`}
        >
            <div className={compact ? '' : 'p-2.5 sm:pr-0'}>
                <FeedImage
                    imageUrl={item.imageUrl}
                    title={item.title}
                    compact={compact}
                    onExpand={!compact && item.imageUrl ? () => setLightboxOpen(true) : undefined}
                />
            </div>
            <div className={`min-w-0 flex-1 ${compact ? 'py-0.5 pr-1' : 'p-3 sm:pl-2'}`}>
                <div className="truncate text-[10px] uppercase tracking-[0.16em] text-emerald-200/45">
                    {item.sourceTitle}
                </div>
                <div className={`mt-1 font-medium text-white/82 ${compact ? 'line-clamp-2 text-[12px] leading-snug' : 'line-clamp-2 text-[15px]'}`}>
                    {item.title}
                </div>
                {!compact && item.summary && (
                    <p className="mt-1.5 line-clamp-3 text-[12px] leading-relaxed text-white/42">
                        {item.summary.replace(/<[^>]+>/g, '').trim()}
                    </p>
                )}
                <div className="mt-1.5 flex items-center gap-2 text-[10px] text-white/35">
                    {when && <span>{when}</span>}
                    {item.link && (
                        <span className="inline-flex items-center gap-1 text-cyan-200/55 opacity-0 transition-opacity group-hover:opacity-100">
                            Öffnen <ExternalLink size={10} />
                        </span>
                    )}
                </div>
            </div>
        </div>
    );

    const wrapped = item.link ? (
        <a href={item.link} target="_blank" rel="noreferrer" onClick={onOpen} className="block">
            {body}
        </a>
    ) : (
        <button type="button" onClick={onOpen} className="block w-full">
            {body}
        </button>
    );

    return (
        <>
            {wrapped}
            {lightboxOpen && item.imageUrl && (
                <FeedImageLightbox
                    imageUrl={item.imageUrl}
                    title={item.title}
                    onClose={() => setLightboxOpen(false)}
                />
            )}
        </>
    );
};

export const FeedThumbnailStrip: React.FC<{
    items: RssFeedItem[];
    limit?: number;
    onClickItem?: (item: RssFeedItem) => void;
    onClickMore?: () => void;
}> = ({ items, limit = 3, onClickItem, onClickMore }) => {
    const visible = items.slice(0, limit);
    if (visible.length === 0) return null;

    return (
        <div className="flex gap-1.5">
            {visible.map((item) => (
                <button
                    key={item.id}
                    type="button"
                    onClick={() => onClickItem?.(item)}
                    className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-black/25 transition-colors hover:border-emerald-300/28"
                    title={item.title}
                >
                    {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-emerald-500/[0.08]">
                            <Rss size={14} className="text-emerald-200/50" />
                        </div>
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-1 pb-1 pt-4">
                        <span className="line-clamp-2 text-[7px] leading-tight text-white/75">{item.title}</span>
                    </div>
                </button>
            ))}
            {items.length > limit && onClickMore && (
                <button
                    type="button"
                    onClick={onClickMore}
                    className="flex h-14 w-10 shrink-0 flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] text-[8px] uppercase tracking-[0.12em] text-white/38 transition-colors hover:border-cyan-300/25 hover:text-cyan-100/70"
                >
                    +{items.length - limit}
                </button>
            )}
        </div>
    );
};
