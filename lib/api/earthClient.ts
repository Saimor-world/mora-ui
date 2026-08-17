import { coreGet, corePut, CoreError } from './http';

/**
 * Die Ortsansicht einer Gemeinde — der bezahlte Teil von Earth.
 *
 * Earth hat zwei Datenräume. Die öffentliche Karte auf earth.saimor.world
 * bleibt kostenlos und zeigt, was freigegeben wurde. Was eine Fläche
 * gekostet hat, wer sie pflegt und welche Veranstaltung dort stattfindet,
 * gehört der Gemeinde und erreicht die Karte nie.
 *
 * Deshalb liegt dieser Client hier im OS und nicht in EARTH: Das OS ist die
 * angemeldete Arbeitsfläche, die Karte ist die öffentliche. Zwei Räume,
 * zwei Oberflächen, ein CORE.
 *
 * Gegenstelle: core/api/v3/earth_internal.py
 */

export interface FlaecheZusammenfassung {
    place_id: string;
    titel: string;
    region_key: string | null;
    /** Ob überhaupt schon eine Verwaltungsakte existiert. */
    akte_angelegt: boolean;
    summe_cent: number;
    offene_pflege: number;
    veranstaltungen: number;
    aktualisiert_am: string | null;
}

export interface FlaechenListe {
    flaechen: FlaecheZusammenfassung[];
    anzahl: number;
    summe_cent: number;
    offene_pflege: number;
}

export interface Kostenposten {
    zweck: string;
    betrag_cent: number;
    jahr: number;
    art: 'anlage' | 'pflege' | 'material' | 'planung' | 'sonstiges';
    beleg?: string | null;
    gedeckt_durch?: string | null;
}

export interface Pflegetermin {
    was: string;
    faellig_am: string;
    erledigt_am: string | null;
    durch?: string | null;
    aufwand_stunden?: number | null;
}

export interface Veranstaltung {
    titel: string;
    am: string;
    /** Die Gemeinde entscheidet je Eintrag; der Standard ist Nein. */
    oeffentlich: boolean;
    beschreibung?: string | null;
    veranstalter?: string | null;
}

export interface Akte {
    place_id: string;
    kosten: Kostenposten[];
    pflege: Pflegetermin[];
    veranstaltungen: Veranstaltung[];
    zustaendig: Array<{ rolle: string; name: string; kontakt?: string | null }>;
    notiz: string | null;
    aktualisiert_am: string;
    /** Zähler gegen stilles Überschreiben. Beim Speichern zurückgeschickt. */
    fassung?: number;
}

export interface AkteAntwort {
    angelegt: boolean;
    place_id?: string;
    akte?: Akte;
    summe_cent?: number;
    summe_nach_jahr?: Record<string, number>;
    offene_pflege?: Pflegetermin[];
}

export async function fetchFlaechen(): Promise<FlaechenListe | null> {
    return coreGet('/v3/earth/verwaltung/places');
}

export async function fetchAkte(placeId: string): Promise<AkteAntwort | null> {
    return coreGet(`/v3/earth/verwaltung/places/${encodeURIComponent(placeId)}`);
}

export interface SpeicherErgebnis {
    ok: boolean;
    /** Jemand anders hat zwischenzeitlich gespeichert (409). */
    konflikt?: boolean;
    antwort?: AkteAntwort;
}

/**
 * Die Akte zurückschreiben.
 *
 * `PUT` ersetzt die **ganze** Akte — es gibt kein Teil-Update. Der Aufrufer
 * schickt deshalb immer den vollständigen Stand, den er geladen und
 * verändert hat.
 *
 * `erwarteteFassung` ist der Zähler, den er beim Laden gesehen hat. Passt er
 * nicht mehr, antwortet CORE mit 409 statt zu überschreiben. Ohne das
 * verliert der, der als Zweiter speichert, die Arbeit des Ersten — lautlos,
 * und gemerkt wird es Wochen später.
 */
export async function speichereAkte(
    placeId: string,
    akte: Partial<Akte>,
    erwarteteFassung?: number,
): Promise<SpeicherErgebnis> {
    try {
        const antwort = await corePut(`/v3/earth/verwaltung/places/${encodeURIComponent(placeId)}`, {
            kosten: akte.kosten ?? [],
            pflege: akte.pflege ?? [],
            veranstaltungen: akte.veranstaltungen ?? [],
            zustaendig: akte.zustaendig ?? [],
            notiz: akte.notiz ?? null,
            erwartete_fassung: erwarteteFassung ?? null,
        });
        return { ok: true, antwort };
    } catch (fehler) {
        if (fehler instanceof CoreError && fehler.status === 409) {
            return { ok: false, konflikt: true };
        }
        return { ok: false, konflikt: false };
    }
}

/**
 * Ein Betrag aus der Eingabe in ganzzahlige Cent.
 *
 * Über den Umweg Zeichenkette statt `Math.round(parseFloat(x) * 100)`:
 * `parseFloat('120.55') * 100` ergibt 12054.999999999998, und `Math.round`
 * rettet zwar diesen Fall, aber nicht jeden. Wer die Nachkommastellen als
 * Text abschneidet, hat gar keinen Gleitkomma-Schritt im Weg.
 *
 * Gibt `null` bei allem, was kein Betrag ist — eine stille Null wäre hier
 * die falsche Auskunft.
 */
export function centAusEingabe(eingabe: string): number | null {
    const geputzt = eingabe.trim().replace(/\s/g, '').replace(',', '.');
    if (!/^\d+(\.\d{0,2})?$/.test(geputzt)) return null;
    const [ganz, teil = ''] = geputzt.split('.');
    return Number(ganz) * 100 + Number(teil.padEnd(2, '0'));
}

/**
 * Cent als Euro, deutsch.
 *
 * Beträge liegen in CORE als Ganzzahl in Cent — Gleitkomma erzeugt bei Geld
 * stille Rundungsfehler, und ein Bericht, der auf den Cent nicht stimmt, ist
 * in einer Verwaltung wertlos. Umgerechnet wird deshalb erst hier, kurz vor
 * der Anzeige.
 */
export function euro(cent: number): string {
    return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
    }).format(cent / 100);
}
