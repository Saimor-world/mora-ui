import { parseRssItem } from '@/lib/rss/parseRssItem';

describe('parseRssItem', () => {
    it('maps core fields and prefers explicit image_url', () => {
        const item = parseRssItem({
            id: 'a1',
            source_title: 'Tech Blog',
            title: 'Neuer Artikel',
            link: 'https://example.com/post',
            published: '2026-06-24T10:00:00Z',
            summary: 'Kurzfassung',
            image_url: 'https://cdn.example.com/hero.jpg',
        });

        expect(item).toMatchObject({
            id: 'a1',
            sourceTitle: 'Tech Blog',
            title: 'Neuer Artikel',
            link: 'https://example.com/post',
            imageUrl: 'https://cdn.example.com/hero.jpg',
        });
    });

    it('falls back to image enclosure and html img src', () => {
        const fromEnclosure = parseRssItem({
            title: 'Mit Bild',
            enclosure: { url: 'https://cdn.example.com/pic.png', type: 'image/png' },
        });
        expect(fromEnclosure.imageUrl).toBe('https://cdn.example.com/pic.png');

        const fromHtml = parseRssItem({
            title: 'HTML Bild',
            summary: '<p>Text</p><img src="https://cdn.example.com/inline.jpg" alt="" />',
        });
        expect(fromHtml.imageUrl).toBe('https://cdn.example.com/inline.jpg');
    });

    it('uses core image_url and content_encoded html', () => {
        const fromCore = parseRssItem({
            title: 'XKCD',
            image_url: 'https://imgs.xkcd.com/comics/test.png',
            summary: 'Plain text only',
        });
        expect(fromCore.imageUrl).toBe('https://imgs.xkcd.com/comics/test.png');

        const fromEncoded = parseRssItem({
            title: 'Encoded',
            content_encoded: '<img src="https://cdn.example.com/encoded.jpg" />',
            summary: 'stripped text',
        });
        expect(fromEncoded.imageUrl).toBe('https://cdn.example.com/encoded.jpg');
    });

    it('reads media thumbnail objects', () => {
        const item = parseRssItem({
            title: 'Media',
            media_thumbnail: { url: 'https://cdn.example.com/thumb.webp', medium: 'image' },
        });
        expect(item.imageUrl).toBe('https://cdn.example.com/thumb.webp');
    });

    it('generates stable id when missing', () => {
        const item = parseRssItem({ title: 'Nur Titel', link: 'https://example.com/x' });
        expect(item.id).toBe('https://example.com/x');
        expect(item.sourceTitle).toBe('Feed');
    });
});
