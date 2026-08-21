import { territorySubstance, type TerritorySubstanceInput } from './relations';

/**
 * Die eine Geste, um die sich alles andere ordnet: du laesst etwas ins Feld
 * fallen, und es findet seinen Bereich, ohne dass du ihn nennst.
 *
 * Ein Universum ordnet nicht, indem etwas einsortiert wird - Masse zieht an,
 * und Position ist das Ergebnis. Diese Datei ist die ehrliche Version davon:
 * kein Zufall, keine Show. Zwei Kraefte, beide nachvollziehbar.
 */

export interface FallSource {
    /** Was im Absender/Betreff steht - der staerkste Hinweis. */
    label: string;
    /** Zusaetzlicher Text, falls vorhanden (Vorschau, Notizinhalt). */
    text: string;
    kind: 'mail' | 'calendar' | 'rss' | 'note' | 'file';
}

export interface FallCandidate extends TerritorySubstanceInput {
    id: string;
    name: string;
    x: number;
    y: number;
}

export interface FallResult {
    targetId: string;
    /** Der Zug jedes Kandidaten, zur Nachvollziehbarkeit und fuers Zeichnen. */
    pulls: Record<string, number>;
}

// Ab dieser Wortlaenge zaehlt ein Wort als Hinweis. Kuerzere Wuerter wie
// "und", "für", "das" treffen fast jeden Bereichsnamen zufaellig.
const MIN_WORD_LENGTH = 4;

// Ein einziger Namenstreffer muss jede realistische Massedifferenz schlagen
// koennen - sonst ist die Anziehung nur eine Umschreibung von "der groesste
// Planet gewinnt", und das waere Sog, keine Einordnung.
const RELEVANCE_WEIGHT = 9;
const MASS_WEIGHT = 1 / 6;

function words(text: string): string[] {
    return text
        .toLocaleLowerCase('de-DE')
        .split(/[^a-zäöüß0-9]+/i)
        .filter((word) => word.length >= MIN_WORD_LENGTH);
}

function relevance(source: FallSource, candidate: FallCandidate): number {
    const haystack = candidate.name.toLocaleLowerCase('de-DE');
    const hints = words(source.label + ' ' + source.text);
    return hints.filter((hint) => haystack.includes(hint) || hint.includes(haystack)).length;
}

function pull(source: FallSource, candidate: FallCandidate): number {
    const mass = Math.sqrt(territorySubstance(candidate) + 1);
    return relevance(source, candidate) * RELEVANCE_WEIGHT + mass * MASS_WEIGHT;
}

/** Das MIME beim HTML5-Drag, ueber das ein Fall seine Quelle mitbringt. */
export const FALL_PAYLOAD_MIME = 'application/x-saimor-fall';

export function encodeFallPayload(source: FallSource): string {
    return JSON.stringify(source);
}

/**
 * Nie ungeprueft vertrauen: dataTransfer kann von jeder Ablage im Browser
 * stammen, nicht nur von unseren eigenen Zeilen. Ein falsch geformtes Objekt
 * darf nichts fallen lassen, statt mit undefined-Feldern weiterzurechnen.
 */
export function decodeFallPayload(raw: string): FallSource | null {
    try {
        const parsed = JSON.parse(raw);
        if (
            parsed && typeof parsed === 'object'
            && typeof parsed.label === 'string'
            && typeof parsed.kind === 'string'
            && ['mail', 'calendar', 'rss', 'note', 'file'].includes(parsed.kind)
        ) {
            return {
                label: parsed.label,
                text: typeof parsed.text === 'string' ? parsed.text : '',
                kind: parsed.kind,
            };
        }
    } catch {
        // Kein JSON, oder kein unserer Ablagen - dann faellt nichts.
    }
    return null;
}

export function computeFallTarget(source: FallSource, candidates: FallCandidate[]): FallResult | null {
    if (candidates.length === 0) return null;

    const pulls: Record<string, number> = {};
    candidates.forEach((candidate) => {
        pulls[candidate.id] = pull(source, candidate);
    });

    const winner = [...candidates].sort((a, b) => {
        const diff = pulls[b.id] - pulls[a.id];
        // Gleichstand entscheidet die id, nicht die Reihenfolge der Liste -
        // sonst haengt das Ergebnis davon ab, in welcher Reihenfolge CORE die
        // Bereiche zufaellig zurueckgibt.
        return diff !== 0 ? diff : a.id.localeCompare(b.id);
    })[0];

    return { targetId: winner.id, pulls };
}
