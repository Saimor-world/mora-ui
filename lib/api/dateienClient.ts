import { coreGet, corePost } from './http';

/**
 * Der Dateiindex — das Verzeichnis über alles, was da ist.
 *
 * Nicht der Ort macht eine Datei aus, sondern ihr Inhalt. Dieselbe Datei
 * auf dem Laptop, im Drive und im Backup ist **ein** Eintrag mit drei
 * Orten — nicht drei Treffer. Erst dadurch wird sichtbar, was doppelt
 * liegt.
 *
 * Was hier ankommt, sind Namen, Größen und Orte. Keine Inhalte: Der
 * Index ist ein Verzeichnis, kein zweiter Speicher.
 *
 * Gegenstelle: core/api/v3/dateien.py
 */

export interface DateiOrt {
    quelle: 'geraet' | 'cloud' | 'arbeitsbereich';
    quelle_id: string;
    pfad: string;
    /** Wann dieser Ort zuletzt bestätigt wurde. Fehlt er, ist es eine Vermutung. */
    gesehen_am: string | null;
}

export interface DateiEintrag {
    name: string;
    groesse: number;
    /** Mit Verfahren: `sha256:…` oder `md5:…`. Null heißt: unbewiesen. */
    inhalt_hash: string | null;
    weitere_hashes: string[];
    orte: DateiOrt[];
}

export interface DateiLage {
    /** Ob überhaupt schon ein Durchgang gelaufen ist. */
    erfasst: boolean;
    eintraege: number;
    orte: number;
    dubletten: number;
    verschwendet_bytes: number;
    /** Dateien, deren Identität nicht bewiesen ist — etwa Google Docs. */
    ohne_inhaltsbeweis: number;
}

export interface DurchgangErgebnis {
    gelesen: Array<{ speicher: string; dateien: number }>;
    gescheitert: Array<{ speicher: string; grund: string }>;
    eintraege: number;
    dubletten: number;
    verschwendet_bytes: number;
}

export async function fetchDateiLage(): Promise<DateiLage | null> {
    return coreGet('/v3/dateien/lage', { isOptional: true });
}

export async function fetchDubletten(limit = 50): Promise<{
    eintraege: DateiEintrag[];
    anzahl: number;
    verschwendet_bytes: number;
} | null> {
    return coreGet(`/v3/dateien/dubletten?limit=${limit}`, { isOptional: true });
}

export async function sucheImIndex(begriff: string, limit = 200): Promise<{
    eintraege: DateiEintrag[];
    anzahl: number;
} | null> {
    return coreGet(`/v3/dateien?q=${encodeURIComponent(begriff)}&limit=${limit}`, { isOptional: true });
}

/**
 * Alle verbundenen Cloud-Speicher durchgehen.
 *
 * Lädt keine Datei herunter — der Anbieter liefert Namen, Größen und
 * Prüfsummen. Dauert trotzdem, weil mehrere Dienste befragt werden.
 */
export async function starteCloudDurchgang(): Promise<DurchgangErgebnis | null> {
    return corePost('/v3/dateien/durchgang/cloud', {});
}

/**
 * Bytes in eine lesbare Größe.
 *
 * Auf 1024 gerechnet, weil Dateisysteme so zählen — und weil eine Zahl,
 * die vom Betriebssystem abweicht, sofort Misstrauen erzeugt.
 */
export function lesbareGroesse(bytes: number): string {
    if (!bytes) return '0 B';
    const einheiten = ['B', 'KB', 'MB', 'GB', 'TB'];
    let wert = bytes;
    let i = 0;
    while (wert >= 1024 && i < einheiten.length - 1) {
        wert /= 1024;
        i++;
    }
    return `${wert.toFixed(wert < 10 && i > 0 ? 1 : 0)} ${einheiten[i]}`;
}
