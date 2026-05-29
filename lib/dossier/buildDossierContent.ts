import type { WebsiteEntryContext } from '@/lib/websiteEntryContext';

/**
 * Converts a WebsiteEntryContext into a markdown document
 * suitable for storage as a Node in the OS.
 * Pure function — no side effects.
 */
export function buildDossierContent(ctx: WebsiteEntryContext): string {
    const scoreStr = ctx.score !== undefined ? `${ctx.score}/100` : 'k. A.';
    const level = ctx.level ?? ctx.grade ?? '—';
    const domain = ctx.domain ?? '—';
    const summary = ctx.summary ?? '';

    const taskLines = ctx.tasks
        .map(t => `- [${t.priority === 'hoch' ? '!' : ' '}] **${t.title}** _(${t.priority})_`)
        .join('\n');

    return [
        `# ${ctx.companyName} — Nightwatch Dossier`,
        '',
        `**Domain:** ${domain}  `,
        `**Score:** ${scoreStr}  `,
        `**Risiko-Level:** ${level}  `,
        '',
        summary ? `> ${summary}` : '',
        '',
        '## Sofortmaßnahmen',
        '',
        taskLines || '_Keine Aufgaben definiert._',
        '',
        '---',
        '_Erstellt automatisch aus dem SAIMÔR Security Check. Gültig 20 Tage._',
    ]
        .filter(line => line !== null)
        .join('\n');
}
