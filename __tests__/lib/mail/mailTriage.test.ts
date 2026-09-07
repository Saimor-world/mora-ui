import {
    analyzeMailTriage,
    extractMailUnsubscribeUrl,
    isCleanupCandidate,
    isNewsletterMail,
    isPromotionMail,
    isProtectedTransactionalMail,
    type MailTriageMessage,
} from '@/lib/mail/mailTriage';

const NOW = Date.parse('2026-09-07T11:00:00Z');

function mail(overrides: Partial<MailTriageMessage> = {}): MailTriageMessage {
    return {
        id: 'm-1',
        message_id: 'gmail-1',
        from_addr: 'sender@example.com',
        subject: 'Hallo',
        date: '2026-09-07T08:00:00Z',
        snippet: 'Kurze Nachricht',
        read: false,
        ...overrides,
    };
}

describe('mailTriage', () => {
    it('protects security and transactional mail even from no-reply senders', () => {
        const security = mail({
            from_addr: 'noreply@github.com',
            subject: 'Security alert: new sign-in',
            date: '2026-08-20T08:00:00Z',
            read: true,
        });

        expect(isProtectedTransactionalMail(security)).toBe(true);
        expect(isNewsletterMail(security)).toBe(false);
        expect(isPromotionMail(security)).toBe(false);
        expect(isCleanupCandidate(security, NOW)).toBe(false);
    });

    it('detects newsletters without treating every no-reply sender as one', () => {
        expect(isNewsletterMail(mail({
            from_addr: 'news@example.com',
            subject: 'Weekly digest',
            snippet: 'Newsletter · unsubscribe anytime',
        }))).toBe(true);

        expect(isNewsletterMail(mail({
            from_addr: 'noreply@example.com',
            subject: 'Dein Konto wurde aktualisiert',
            snippet: 'Nur eine Systeminformation',
        }))).toBe(false);
    });

    it('detects promotions and keeps newsletters out of the promotion bucket', () => {
        const promo = mail({ subject: '20% Rabatt auf deine nächste Bestellung' });
        const newsletterPromo = mail({ subject: 'Newsletter: 20% Rabatt diese Woche' });

        expect(isPromotionMail(promo)).toBe(true);
        const analysis = analyzeMailTriage([promo, newsletterPromo], NOW);
        expect(analysis.counts.promotion).toBe(1);
        expect(analysis.counts.newsletter).toBe(1);
    });

    it('still protects concrete order confirmations after narrowing order wording', () => {
        const confirmation = mail({
            subject: 'Bestellbestätigung #4711',
            snippet: 'Deine Bestellung wurde bestätigt und wird versandt.',
            read: true,
            date: '2026-08-20T08:00:00Z',
        });

        expect(isProtectedTransactionalMail(confirmation)).toBe(true);
        expect(isPromotionMail(confirmation)).toBe(false);
        expect(isCleanupCandidate(confirmation, NOW)).toBe(false);
    });

    it('only marks old read mail or read promotions as cleanup candidates', () => {
        const oldRead = mail({ date: '2026-08-20T08:00:00Z', read: true });
        const oldUnread = mail({ id: 'm-2', message_id: 'gmail-2', date: '2026-08-20T08:00:00Z', read: false });
        const readPromo = mail({ id: 'm-3', message_id: 'gmail-3', subject: 'Sale heute', read: true });

        expect(isCleanupCandidate(oldRead, NOW)).toBe(true);
        expect(isCleanupCandidate(oldUnread, NOW)).toBe(false);
        expect(isCleanupCandidate(readPromo, NOW)).toBe(true);
    });

    it('extracts an unsubscribe URL but never acts on it', () => {
        const message = mail({
            body_text: 'Du kannst dich hier abmelden: https://example.com/newsletter/unsubscribe?token=abc',
        });
        expect(extractMailUnsubscribeUrl(message)).toBe('https://example.com/newsletter/unsubscribe?token=abc');
    });

    it('returns calm, actionable triage groups with Gmail labels for non-destructive sorting', () => {
        const analysis = analyzeMailTriage([
            mail({ id: 'n', message_id: 'n', subject: 'Newsletter September', snippet: 'unsubscribe' }),
            mail({ id: 'p', message_id: 'p', subject: 'Großer Sale', read: true }),
            mail({ id: 'o', message_id: 'o', date: '2026-08-20T08:00:00Z', read: true }),
        ], NOW);

        expect(analysis.glance).toContain('1 Newsletter');
        expect(analysis.suggestions.find((s) => s.kind === 'newsletter')?.gmailLabel).toBe('Mora/Newsletter');
        expect(analysis.suggestions.find((s) => s.kind === 'promotion')?.gmailLabel).toBe('Mora/Werbung');
        expect(analysis.suggestions.find((s) => s.kind === 'cleanup')?.messageIds).toEqual(expect.arrayContaining(['p', 'o']));
    });
});
