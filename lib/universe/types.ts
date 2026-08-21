/**
 * Wie belastbar die Zuordnung eines Signals zu einem Bereich ist.
 *
 * 'assigned' - der Vorfall traegt selbst eine department_id.
 * 'inferred' - der Bereichsname kam im Text vor. Ein Treffer, kein Beleg.
 *
 * Die Ueberschrift der Linse sagt "Was nachweislich zusammenhaengt". Solange
 * beides gleich aussieht, ist diese Zusage nicht gedeckt.
 */
export type SignalEvidence = 'assigned' | 'inferred';

export interface UniverseSignal {
    id: string;
    title: string;
    subtitle: string;
    targetId: string;
    kind: 'rss' | 'mail' | 'calendar' | 'nightwatch';
    evidence: SignalEvidence;
    href?: string;
    severity?: string;
}