/**
 * Worauf Môra gerade schaut - und warum.
 *
 * Marius will sie "als Persona sichtbar, die im System lebt, mitdenkt und
 * vorschlaegt". Der CursorAgent dafuer ist seit Monaten fertig gebaut, stand
 * aber in MoraShell auskommentiert als "1.0 gated (future-tier)".
 *
 * Bevor er wieder laeuft, braucht er eine Regel: sie darf nur auf etwas
 * zeigen, das wirklich da ist. Eine Persona, die auf Erfundenes deutet, ist
 * schlimmer als gar keine - sie macht jede spaetere echte Warnung
 * unglaubwuerdig. Und sie schweigt, wenn nichts anliegt: Aufmerksamkeit, die
 * immer an ist, ist keine.
 */

export interface AttentionTerritory {
    id: string;
    name: string;
    documents: number;
    spaces: number;
    metricSource: 'live' | 'derived' | 'missing';
}

export interface AttentionIncident {
    id: string;
    title: string;
    /** Die Abteilung, die der Vorfall betrifft - ohne sie kein Zeigeziel. */
    targetId?: string | null;
}

export interface AttentionInput {
    territories: AttentionTerritory[];
    openIncidents: AttentionIncident[];
    mailPreview: { subject?: string }[];
    calendarPreview: { title?: string }[];
}

export type AttentionReason = 'incident' | 'missing-source';

export interface MoraAttention {
    targetId: string;
    reason: AttentionReason;
    message: string;
}

export function chooseMoraAttention(input: AttentionInput): MoraAttention | null {
    const visible = new Set(input.territories.map((territory) => territory.id));

    // Ein offener Vorfall schlaegt alles andere - das ist der Fall, in dem
    // ein Mensch angesprochen werden will.
    const incident = input.openIncidents.find(
        (item) => item.targetId && visible.has(item.targetId),
    );
    if (incident?.targetId) {
        return {
            targetId: incident.targetId,
            reason: 'incident',
            message: `Offener Vorfall: ${incident.title}`,
        };
    }

    // Sonst: eine echte Luecke im Bestand. Sortiert nach id, damit sie nicht
    // bei jedem Neuzeichnen zu einem anderen Bereich springt.
    const withoutSource = input.territories
        .filter((territory) => territory.metricSource === 'missing')
        .sort((a, b) => a.id.localeCompare(b.id))[0];

    if (withoutSource) {
        return {
            targetId: withoutSource.id,
            reason: 'missing-source',
            message: `${withoutSource.name} hat noch keine Datenquelle.`,
        };
    }

    // Nichts anliegend heisst nichts sagen.
    return null;
}
