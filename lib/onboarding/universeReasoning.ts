/**
 * Interne Denk-Spur für MÔRAs Einrichtung (keine Vorlagen): macht aus dem
 * Ergebnis von CORE `proposeUniverse` lesbare Zeilen „Bereich → Kategorie, weil …“.
 * Nur für das HQ/intern gedacht (usesInternalVocabulary), nicht für Kunden.
 */
export interface ProposedPlanet {
  name: string;
  category: string;
  evidence?: string[];
  reasoning?: { source?: 'mora' | 'rule' | 'fallback'; reason?: string };
}

const SOURCE: Record<string, string> = { mora: 'aus dem Gespräch', rule: 'aus dem Namen', fallback: 'ohne Signal' };

export function universeReasoningLines(planets: ProposedPlanet[]): string[] {
  return planets.map((p) => {
    const src = SOURCE[p.reasoning?.source ?? ''] ?? 'unbekannt';
    const why = p.reasoning?.reason ? ` – ${p.reasoning.reason}` : '';
    const ev = p.evidence?.length ? ` · Belege: ${p.evidence.slice(0, 3).join('; ')}` : '';
    return `${p.name} → ${p.category} (${src})${why}${ev}`;
  });
}
