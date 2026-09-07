export interface MailTriageMessage {
    id: string;
    message_id?: string;
    from_addr: string;
    subject: string;
    date: string;
    snippet: string;
    body_text?: string;
    read?: boolean;
}

export type MailTriageSuggestionKind = 'newsletter' | 'promotion' | 'cleanup' | 'unsubscribe';

export interface MailTriageSuggestion {
    id: MailTriageSuggestionKind;
    kind: MailTriageSuggestionKind;
    title: string;
    description: string;
    messageIds: string[];
    gmailLabel?: string;
    unsubscribeUrl?: string;
}

export interface MailTriageAnalysis {
    counts: {
        newsletter: number;
        promotion: number;
        cleanup: number;
        unsubscribe: number;
    };
    suggestions: MailTriageSuggestion[];
    glance: string | null;
}

const NEWSLETTER_STRONG_RE = /newsletter|mailing.?list|weekly digest|daily digest|rundschreiben|abmelden|unsubscribe|opt.?out/i;
const NEWSLETTER_WEAK_SENDER_RE = /noreply|no-reply|donotreply|do-not-reply/i;
const NEWSLETTER_WEAK_SUBJECT_RE = /digest|weekly update|monthly update|neuigkeiten|updates from/i;
const PROMOTION_RE = /rabatt|angebot|\bsale\b|%\s*off|aktion|promo|marketing|gutschein|deal/i;

// Security, account and transaction mail is deliberately protected from automatic
// cleanup suggestions. A no-reply sender alone is never enough to call something
// a newsletter or advertisement. Order wording must be specific: plain mentions
// like "Rabatt auf deine nächste Bestellung" are marketing, not proof of a
// completed transaction.
const TRANSACTIONAL_SENDER_RE = /@(?:github\.com|gitlab\.com|notifications\.|security\.|accounts\.google|apple\.com|microsoft\.com|stripe\.com|paypal\.com)/i;
const TRANSACTIONAL_SUBJECT_RE = /public key|ssh key|api key|security alert|sicherheit|passwort|password|verification|verify|sign.?in|login|2fa|two.?factor|authenticate|suspicious|unauthorized|token|receipt|invoice|rechnung|order confirm|order (?:number|received|shipped|#\s*\w+)|bestell(?:bestätigung|nummer)|bestellung(?:\s*#\s*\w+|\s+(?:eingegangen|bestätigt|versandt|wurde))|payment|zahlung|transaction|was added|neuer anmeld|zugriff|access granted/i;
const UNSUBSCRIBE_URL_RE = /https?:\/\/[^\s"'<>)\]]+(?:unsubscribe|optout|opt-out|abmelden)[^\s"'<>)\]]*/i;

function messageKey(message: MailTriageMessage): string {
    return message.message_id || message.id;
}

function haystack(message: MailTriageMessage): string {
    return `${message.from_addr} ${message.subject} ${message.snippet} ${message.body_text ?? ''}`.toLowerCase();
}

export function isProtectedTransactionalMail(message: MailTriageMessage): boolean {
    const text = haystack(message);
    if (TRANSACTIONAL_SUBJECT_RE.test(text)) return true;
    if (/\[github\]|\[gitlab\]/i.test(message.subject)) return true;
    if (TRANSACTIONAL_SENDER_RE.test(message.from_addr)) {
        return !NEWSLETTER_STRONG_RE.test(text);
    }
    return false;
}

export function isNewsletterMail(message: MailTriageMessage): boolean {
    if (isProtectedTransactionalMail(message)) return false;
    const text = haystack(message);
    if (NEWSLETTER_STRONG_RE.test(text)) return true;
    return NEWSLETTER_WEAK_SENDER_RE.test(message.from_addr) && NEWSLETTER_WEAK_SUBJECT_RE.test(message.subject);
}

export function isPromotionMail(message: MailTriageMessage): boolean {
    if (isProtectedTransactionalMail(message)) return false;
    const text = haystack(message);
    return PROMOTION_RE.test(text) || PROMOTION_RE.test(message.subject);
}

export function extractMailUnsubscribeUrl(message: MailTriageMessage): string | undefined {
    const text = `${message.snippet} ${message.body_text ?? ''}`;
    return text.match(UNSUBSCRIBE_URL_RE)?.[0];
}

export function isCleanupCandidate(message: MailTriageMessage, nowMs: number = Date.now()): boolean {
    if (isProtectedTransactionalMail(message)) return false;

    const dateMs = Date.parse(message.date);
    const isOldReadMail = Boolean(message.read) && Number.isFinite(dateMs) && nowMs - dateMs > 7 * 24 * 60 * 60 * 1000;
    const isReadPromotion = Boolean(message.read) && isPromotionMail(message);
    return isOldReadMail || isReadPromotion;
}

export function analyzeMailTriage(messages: MailTriageMessage[], nowMs: number = Date.now()): MailTriageAnalysis {
    const newsletters = messages.filter(isNewsletterMail);
    const promotions = messages.filter((message) => isPromotionMail(message) && !isNewsletterMail(message));
    const cleanup = messages.filter((message) => isCleanupCandidate(message, nowMs));
    const unsubscribeMatches = messages
        .map((message) => ({ message, url: extractMailUnsubscribeUrl(message) }))
        .filter((entry): entry is { message: MailTriageMessage; url: string } => Boolean(entry.url));

    const suggestions: MailTriageSuggestion[] = [];

    if (newsletters.length > 0) {
        suggestions.push({
            id: 'newsletter',
            kind: 'newsletter',
            title: `${newsletters.length} Newsletter`,
            description: 'Rundschreiben gemeinsam prüfen oder als Newsletter markieren.',
            messageIds: newsletters.map(messageKey),
            gmailLabel: 'Mora/Newsletter',
        });
    }

    if (promotions.length > 0) {
        suggestions.push({
            id: 'promotion',
            kind: 'promotion',
            title: `${promotions.length} Werbung`,
            description: 'Angebote und Marketing gesammelt prüfen oder markieren.',
            messageIds: promotions.map(messageKey),
            gmailLabel: 'Mora/Werbung',
        });
    }

    if (cleanup.length > 0) {
        suggestions.push({
            id: 'cleanup',
            kind: 'cleanup',
            title: `${cleanup.length} Aufräum-Kandidaten`,
            description: 'Ältere gelesene oder gelesene Werbe-Mails auswählen. Gelöscht wird erst nach deiner Bestätigung.',
            messageIds: cleanup.map(messageKey),
        });
    }

    if (unsubscribeMatches.length > 0) {
        suggestions.push({
            id: 'unsubscribe',
            kind: 'unsubscribe',
            title: 'Abmelden möglich',
            description: 'Ein Abmelde-Link wurde erkannt. Er wird nur geöffnet, nie automatisch bestätigt.',
            messageIds: unsubscribeMatches.map(({ message }) => messageKey(message)),
            unsubscribeUrl: unsubscribeMatches[0].url,
        });
    }

    const glanceParts: string[] = [];
    if (newsletters.length > 0) glanceParts.push(`${newsletters.length} Newsletter`);
    if (cleanup.length > 0) glanceParts.push(`${cleanup.length} zum Prüfen`);
    else if (promotions.length > 0) glanceParts.push(`${promotions.length} Werbung`);

    return {
        counts: {
            newsletter: newsletters.length,
            promotion: promotions.length,
            cleanup: cleanup.length,
            unsubscribe: unsubscribeMatches.length,
        },
        suggestions,
        glance: glanceParts.length > 0 ? glanceParts.join(' · ') : null,
    };
}
