/**
 * Was sich gerade bewegt - sichtbar, ohne dass man darueberfahren muss.
 *
 * Marius' Szenario: "Ich habe eine neue Kampagne, die in einer Woche raus
 * muss. Ich will doch nicht ueber jeden Mond fahren muessen, um zu sehen, wo
 * die wichtige Kampagne ist. Als Geschaeftsfuehrer will ich alle vier
 * Abteilungen verstehen: was bewegt sich gerade in Intelligence?"
 *
 * Mit echten Daten beantwortbar: was zuletzt angefasst wurde, ist das, was
 * in Bewegung ist. Kein Modell raet hier etwas - updated_at ist eine
 * Tatsache.
 *
 * Genau EIN Mond je Planet wird hervorgehoben. "Alles ist wichtig" hiesse,
 * dass nichts es ist; und ein Blick auf das Feld soll vier Antworten geben,
 * nicht vierzig.
 */

export interface MotionMoon {
    id: string;
    name: string;
    updatedAt?: string | null;
}

export interface MarkedMoon extends MotionMoon {
    inMotion: boolean;
}

/** Aelter als das gilt nicht mehr als "in Bewegung". */
const MOTION_WINDOW_DAYS = 30;

export function markMoonsInMotion<T extends MotionMoon>(moons: T[]): (T & { inMotion: boolean })[] {
    const cutoff = Date.now() - MOTION_WINDOW_DAYS * 86400000;

    let leader: { id: string; touched: number } | null = null;
    moons.forEach((moon) => {
        if (!moon.updatedAt) return;
        const touched = Date.parse(moon.updatedAt);
        // Ohne gueltiges Datum keine Bewegung - fehlendes Wissen darf nicht
        // wie Aktualitaet aussehen.
        if (Number.isNaN(touched) || touched < cutoff) return;
        if (
            !leader
            || touched > leader.touched
            // Gleichstand ueber die id, nicht ueber die Listenreihenfolge:
            // sonst wandert die Hervorhebung, wenn CORE anders sortiert.
            || (touched === leader.touched && moon.id.localeCompare(leader.id) < 0)
        ) {
            leader = { id: moon.id, touched };
        }
    });

    return moons.map((moon) => ({ ...moon, inMotion: leader !== null && moon.id === leader.id }));
}
