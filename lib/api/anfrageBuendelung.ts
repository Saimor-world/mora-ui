/**
 * Gleiche Leseanfrage, gleicher Moment — eine Leitung.
 *
 * Beim Start des OS gingen 43 Anfragen an CORE, aber nur 25 verschiedene.
 * Zwei Komponenten fragen dasselbe, wenige Millisekunden auseinander, weil
 * sie nichts voneinander wissen:
 *
 *     users/me/content        2408 ms, 2412 ms
 *     integrations/overview   2395 ms, 2420 ms
 *     mycelium/overview       2768 ms, 2880 ms
 *
 * Jede kostet rund 400 ms und einen Platz in der Warteschlange des
 * Browsers, der nur sechs gleichzeitige Verbindungen zu einem Host
 * zulässt. Die späteren Anfragen warteten dadurch bis zu 16 Sekunden —
 * nicht weil der Server langsam ist, sondern weil dreißig andere vor
 * ihnen standen.
 *
 * Bewusst **kein Zwischenspeicher**: Gebündelt wird nur, was zur selben
 * Zeit unterwegs ist. Sobald die Antwort da ist, ist der Platz frei und
 * die nächste Frage holt frische Daten. Ein Zwischenspeicher würde aus
 * einer Beschleunigung eine stille Veraltung machen — und in einem
 * System, das anzeigt, was gerade gilt, ist das teurer als die 400 ms.
 */

/** Was gerade unterwegs ist. Schlüssel ist die Anfrage selbst. */
const laufend = new Map<string, Promise<unknown>>();

/**
 * Führt `holen` aus — oder hängt sich an einen bereits laufenden Aufruf
 * mit demselben Schlüssel.
 *
 * Der Platz wird in jedem Fall wieder freigegeben, auch bei einem
 * Fehlschlag. Bliebe eine gescheiterte Zusage stehen, bekäme jeder
 * spätere Aufrufer denselben Fehler — dauerhaft, ohne dass je wieder
 * jemand nachfragt.
 */
export function buendele<T>(schluessel: string, holen: () => Promise<T>): Promise<T> {
    const vorhanden = laufend.get(schluessel);
    if (vorhanden) return vorhanden as Promise<T>;

    const zusage = holen().finally(() => {
        laufend.delete(schluessel);
    });

    laufend.set(schluessel, zusage);
    return zusage;
}

/** Wie viele Anfragen gerade unterwegs sind. Für Diagnose und Tests. */
export function laufendeAnfragen(): number {
    return laufend.size;
}

/** Nur für Tests: Zustand zwischen zwei Fällen zurücksetzen. */
export function _leereBuendelung(): void {
    laufend.clear();
}
