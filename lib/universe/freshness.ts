/**
 * Wie frisch etwas ist - als Helligkeit, nicht als Zahl.
 *
 * Marius: "die Monde sind nicht schoen, die Zahlen sind auch Quatsch."
 * Ein Zahl-Abzeichen am Mond ist Benachrichtigungs-Sprache ("3 Ungelesene").
 * Auf einem echten Mond steht keine Zahl; man sieht ihm an, wie gross er ist
 * und wie hell er leuchtet.
 *
 * Also: Groesse sagt wieviel drin liegt, Helligkeit sagt wie lange es her
 * ist. Beides ohne ein einziges Etikett auf einem kreisenden Objekt, das man
 * ohnehin nicht lesen koennte.
 */

/** Nach so vielen Tagen ist ein Ordner auf halber Helligkeit. */
const HALF_LIFE_DAYS = 21;

/** Untergrenze: ein alter Ordner ist nicht verschwunden, nur kalt. */
const COLDEST = 0.18;

export function freshnessOf(updatedAt: string | null | undefined): number {
    if (!updatedAt) return COLDEST;

    const touched = Date.parse(updatedAt);
    if (Number.isNaN(touched)) return COLDEST;

    const days = Math.max(0, (Date.now() - touched) / 86400000);
    // Halbwertszeit statt linearer Abnahme: die ersten Tage sind der
    // interessante Bereich, danach ist "alt" schnell nur noch "alt".
    const decayed = Math.pow(0.5, days / HALF_LIFE_DAYS);

    return COLDEST + (1 - COLDEST) * decayed;
}
