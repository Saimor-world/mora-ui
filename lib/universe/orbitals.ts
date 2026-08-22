import { stableUniverseHash } from './layout';
import { freshnessOf } from './freshness';
import { markMoonsInMotion } from './inMotion';

/**
 * Die Metapher, woertlich genommen: Planeten sind Abteilungen, Monde sind
 * Bereiche, Sterne sind Dokumente.
 *
 * Marius' eigene Worte: "planeten ... monde als ordner ... sterne als daten".
 * Bis hierher war das Universum eine Kulisse - vier Kugeln vor einem
 * Sternenhimmel, der nichts bedeutete. Jetzt gehoert jedes Objekt im Bild zu
 * etwas, das wirklich existiert:
 *
 *   Mond  = ein echter Bereich aus dem Baum, mit echtem Namen und id
 *   Stern = ein echtes Dokument (Anzahl aus den Statistiken)
 *
 * Keine Ebene erfindet Objekte. Ein leerer Bereich hat keine Monde, ein
 * Bereich ohne Dokumente hat keine Sterne - das Bild ist dann leer, weil die
 * Sache leer ist.
 */

export interface OrbitalSpace {
    id: string;
    name: string;
    /** Echte Dokumentzahl des Ordners, falls bekannt. */
    documents?: number;
    /** Wann zuletzt angefasst - wird zur Helligkeit. */
    updatedAt?: string | null;
}

export interface OrbitalInput {
    /** id der Abteilung - bestimmt das Sternbild, damit es sich nicht bei
     *  jedem Neuzeichnen neu wuerfelt. */
    id: string;
    /** Durchmesser des Planeten in px. */
    diameter: number;
    spaces: OrbitalSpace[];
    documentCount: number;
}

export interface Moon {
    id: string;
    name: string;
    /** Wieviel wirklich drin liegt - 0 heisst leer, nicht unbekannt. */
    documents: number;
    /** 0..1 - wie frisch, als Helligkeit statt als Zahl am Objekt. */
    freshness: number;
    /** Der zuletzt angefasste Mond dieses Planeten - traegt Ring und Namen
     *  ohne Hover, damit man auf einen Blick sieht, was laeuft. */
    inMotion: boolean;
    updatedAt?: string | null;
    /** Bogenmass, 0 = rechts vom Planeten. */
    angle: number;
    /** Abstand vom Planetenmittelpunkt in px. */
    distance: number;
    size: number;
    /** Umlaufdauer in Sekunden - je weiter aussen, desto langsamer, wie echt. */
    duration: number;
}

export interface Star {
    /** Versatz vom Planetenmittelpunkt in px. */
    x: number;
    y: number;
    size: number;
    /** Verzoegerung des Funkelns in Sekunden. */
    delay: number;
}

export interface Orbitals {
    moons: Moon[];
    stars: Star[];
}

/**
 * Saimoer HQ hat real 706 Dokumente in einer Firma. 706 einzeln animierte
 * Punkte pro Planet waeren weder lesbar noch fluessig - und die echte Zahl
 * steht ohnehin als Text unter dem Planeten. Hier wird also die Darstellung
 * gedeckelt, nicht die Wahrheit.
 *
 * Von 48 auf 26 gesenkt, nachdem Marius Ruckeln meldete: bei vier Planeten
 * waren das 192 dauerhaft animierte Elemente allein fuer die Sterne - und
 * das zusaetzlich zu 180 Hintergrundsternen, mehreren Vollbild-Canvas und
 * den Mondbahnen. Ab etwa zwei Dutzend Punkten liest man ohnehin "viele",
 * nicht mehr die Anzahl.
 */
export const MAX_VISIBLE_STARS = 26;

// Enger als anfangs: ein Mond bei 0.82 Radien ausserhalb machte das
// Sonnensystem fast doppelt so breit wie den Planeten - vier davon
// ueberlappten sich im Feld.
const MOON_ORBIT_FACTOR = 0.55;
const STAR_INNER_FACTOR = 0.62;
const STAR_OUTER_FACTOR = 1.45;

/** Deterministischer Wert in [0,1) aus id und Index. */
function noise(seed: string, index: number, salt: number): number {
    const hash = stableUniverseHash(seed + ':' + index + ':' + salt);
    return (hash % 100000) / 100000;
}

export function buildOrbitals({ id, diameter, spaces, documentCount }: OrbitalInput): Orbitals {
    const radius = diameter / 2;

    // Startwinkel aus der id: zwei Abteilungen nebeneinander bekommen nicht
    // dieselbe Mondstellung, und dieselbe Abteilung behaelt ihre ueber
    // Neuladen hinweg.
    const angleOffset = (stableUniverseHash(id) % 628) / 100;

    const rohMonde = spaces.map((space, index) => {
        const step = (Math.PI * 2) / Math.max(1, spaces.length);
        return {
            id: space.id,
            name: space.name,
            documents: Math.max(0, space.documents ?? 0),
            freshness: freshnessOf(space.updatedAt),
            updatedAt: space.updatedAt ?? null,
            angle: angleOffset + index * step,
            distance: radius + radius * MOON_ORBIT_FACTOR,
            // Groesse nach echtem Inhalt, nicht nach Zufall. Ein leerer
            // Ordner ist klein, ein voller gross - dieselbe Regel wie beim
            // Planeten, nur eine Ebene tiefer.
            size: 8 + Math.min(9, Math.round(Math.sqrt(Math.max(0, space.documents ?? 0)) * 3.2)),
            // Weiter aussen heisst langsamer - dieselbe Anschauung wie bei
            // echten Umlaufbahnen, und es verhindert Gleichschritt.
            duration: 48 + Math.round(noise(space.id, index, 7) * 40),
        };
    });

    // Genau einer je Planet: die Antwort auf "was bewegt sich gerade hier?"
    const moons: Moon[] = markMoonsInMotion(rohMonde);

    const starCount = Math.min(MAX_VISIBLE_STARS, Math.max(0, documentCount));
    const stars: Star[] = Array.from({ length: starCount }, (_, index) => {
        const angle = noise(id, index, 1) * Math.PI * 2;
        // Wurzel statt linear, damit sich die Sterne nicht in der Mitte
        // draengen: gleiche Flaeche, gleiche Dichte.
        const spread = Math.sqrt(noise(id, index, 2));
        const distance = radius * STAR_INNER_FACTOR + radius * STAR_OUTER_FACTOR * spread + radius;
        return {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance * 0.68,
            size: 1.1 + noise(id, index, 4) * 1.6,
            delay: noise(id, index, 5) * 6,
        };
    });

    return { moons, stars };
}
