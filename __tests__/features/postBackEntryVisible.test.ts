import fs from 'fs';
import path from 'path';

// jsdom lädt kein CSS: hier wird geprüft, dass der Rückweg zum Eintrag auf dem Desktop
// nicht von der Handy-Regel `.os-mail__back { display: none }` verdeckt wird (live am 22.11. gefunden).
const css = fs.readFileSync(path.join(__dirname, '../../components/os-kit/os-kit.css'), 'utf8');
const client = fs.readFileSync(path.join(__dirname, '../../features/post/MailClient.tsx'), 'utf8');

it('der Knopf „Zurück zum Eintrag“ trägt die eigene Klasse', () => {
    expect(client).toMatch(/className="os-mail__back os-mail__back--entry"[^\n]*aria-label="Zurück zum Eintrag"/);
});

it('die Klasse ist außerhalb der Handy-Regel sichtbar und steht nach der Grundregel', () => {
    const base = css.indexOf('.os-mail__back {');
    const entry = css.search(/\.os-mail__back--entry\s*\{[^}]*display:\s*inline-flex/);
    expect(base).toBeGreaterThan(-1);
    expect(entry).toBeGreaterThan(base);
    const before = css.replace(/\/\*[\s\S]*?\*\//g, (c) => ' '.repeat(c.length)).slice(0, entry);
    const depth = (before.match(/\{/g) ?? []).length - (before.match(/\}/g) ?? []).length;
    expect(depth).toBe(0); // nicht in einer @media-Regel
});
