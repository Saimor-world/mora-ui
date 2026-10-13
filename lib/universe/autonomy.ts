/**
 * Universe V2 – Autonomie-Regeln (Konzept: /workspace/mora/universe-autonomie.md).
 *
 * 1. Höchstens 7 Planeten. Was darüber hinausgeht, wird Mond des Sammelplaneten
 *    "Weitere" – das Feld bleibt lesbar, nichts verschwindet.
 * 2. Mitgliedschaft ist strukturell und ruhig (Substanz), damit Orte nicht springen.
 * 3. Größe und Helligkeit folgen der Aufmerksamkeit (echte Signale), nicht der
 *    Dokumentzahl. Ohne Signale sind alle Planeten gleich ruhig.
 */

export const MAX_PLANETS = 7;
export const OVERFLOW_ID = '__weitere';

export type CapInput = { id: string; name: string };

export function capPlanets<T extends CapInput>(departments: T[], substance: Record<string, number>, max = MAX_PLANETS): { planets: T[]; overflow: T[] } {
    if (departments.length <= max) return { planets: departments, overflow: [] };
    const ranked = [...departments].sort((a, b) => (substance[b.id] || 0) - (substance[a.id] || 0) || a.name.localeCompare(b.name, 'de'));
    const keep = new Set(ranked.slice(0, max - 1).map((d) => d.id));
    return {
        planets: departments.filter((d) => keep.has(d.id)),
        overflow: departments.filter((d) => !keep.has(d.id)),
    };
}

export type AttentionSignal = { targetId: string | null; kind: string };

const WEIGHT: Record<string, number> = { nightwatch: 3, calendar: 2, mail: 1.5, rss: 0.75 };

/** Aufmerksamkeit je Planet, 0..1 – relativ zum lautesten. Leere Lage = alle 0. */
export function attentionScores(ids: string[], signals: AttentionSignal[], extra: Record<string, number> = {}): Record<string, number> {
    const raw: Record<string, number> = {};
    ids.forEach((id) => { raw[id] = extra[id] || 0; });
    signals.forEach((s) => { if (s.targetId && s.targetId in raw) raw[s.targetId] += WEIGHT[s.kind] ?? 1; });
    const max = Math.max(0, ...Object.values(raw));
    const out: Record<string, number> = {};
    ids.forEach((id) => { out[id] = max > 0 ? raw[id] / max : 0; });
    return out;
}

export type AttentionLevel = 'vorn' | 'mitte' | 'ruhig';

export function attentionLevel(score: number, anySignal: boolean): AttentionLevel {
    if (!anySignal) return 'mitte';
    if (score >= 0.85) return 'vorn';
    if (score >= 0.35) return 'mitte';
    return 'ruhig';
}

/** Durchmesser aus Aufmerksamkeit: 92 ruhig … 136 vorn (vor Feldskalierung). */
export function attentionDiameter(score: number, anySignal: boolean): number {
    if (!anySignal) return 116;
    return Math.round(92 + score * 44);
}
