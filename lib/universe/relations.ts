import { buildSoftUniverseRoute } from './layout';
import type { UniverseSignal } from './types';

/**
 * Woher ein Signal in das Feld hineinlaeuft.
 *
 * Die Werte liegen absichtlich ausserhalb von 0..100: das Feld selbst ist der
 * Bereich zwischen den beiden Widget-Spalten, die Quellen stehen daneben.
 * Mail, Kalender und Feed sitzen im Horizont links unten, Nightwatch in der
 * Wache rechts unten - ein Strang muss auf der Seite beginnen, auf der seine
 * Quelle wirklich steht, sonst behauptet die Linie eine falsche Herkunft.
 *
 * Bewusst grob gehalten: die Kante, nicht die Pixelposition der Karte. So
 * bleibt die Zeichnung richtig, wenn die Widgets verschoben werden.
 */
export const FIELD_EDGE_ORIGINS: Record<UniverseSignal['kind'], { x: number; y: number }> = {
    calendar: { x: -8, y: 62 },
    mail: { x: -8, y: 72 },
    rss: { x: -8, y: 82 },
    nightwatch: { x: 108, y: 78 },
};

export interface RelationStrand {
    id: string;
    signalId: string;
    targetId: string;
    kind: UniverseSignal['kind'];
    title: string;
    subtitle: string;
    evidence: UniverseSignal['evidence'];
    /** Belegte Zuordnung zeichnet durch, vermutete gestrichelt. */
    dashed: boolean;
    d: string;
    labelX: number;
    labelY: number;
    endX: number;
    endY: number;
}

interface StrandTarget {
    id: string;
    x: number;
    y: number;
}

export function buildRelationStrands(
    signals: UniverseSignal[],
    territories: StrandTarget[],
): RelationStrand[] {
    const byId = new Map(territories.map((territory) => [territory.id, territory]));

    return signals.flatMap((signal) => {
        const target = byId.get(signal.targetId);
        if (!target) return [];

        const origin = FIELD_EDGE_ORIGINS[signal.kind];
        if (!origin) return [];

        const route = buildSoftUniverseRoute(
            origin,
            { x: target.x, y: target.y },
            signal.kind + ':' + signal.id,
            2,
            0.16,
            3,
            14,
        );

        return [{
            id: 'strand:' + signal.kind + ':' + signal.id,
            signalId: signal.id,
            targetId: signal.targetId,
            kind: signal.kind,
            title: signal.title,
            subtitle: signal.subtitle,
            evidence: signal.evidence,
            dashed: signal.evidence === 'inferred',
            d: route.d,
            labelX: route.labelX,
            labelY: route.labelY,
            endX: target.x,
            endY: target.y,
        }];
    });
}

export const TERRITORY_MIN_DIAMETER = 112;
export const TERRITORY_MAX_DIAMETER = 228;

/** Ab wieviel Substanz ein Bereich die volle Groesse erreicht. */
const TERRITORY_FULL_SUBSTANCE = 90;

/**
 * Der Untertitel verspricht "Groesse zeigt Substanz". Vorher lag die gesamte
 * Skala in 52px und wurde zusaetzlich durch log2 gestaucht - die vier echten
 * Bereiche des HQ landeten neun Pixel auseinander, also fuer das Auge gar
 * nicht. Die Wurzel waechst am unteren Ende schnell, wo die echten Zahlen
 * liegen, und flacht erst spaeter ab.
 */
export function territoryDiameter({
    spaces,
    folders,
    documents,
}: {
    spaces: number;
    folders: number;
    documents: number;
}): number {
    const substance = spaces * 6 + folders * 3 + documents;
    const ratio = Math.min(1, Math.sqrt(Math.max(0, substance) / TERRITORY_FULL_SUBSTANCE));
    return Math.round(
        TERRITORY_MIN_DIAMETER + ratio * (TERRITORY_MAX_DIAMETER - TERRITORY_MIN_DIAMETER),
    );
}
