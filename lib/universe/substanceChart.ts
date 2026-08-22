import { territorySubstance } from './relations';

/**
 * Der Vergleich, was wirklich wo liegt.
 *
 * Bewusst KEINE Zeitreihe: CORE speichert keine Bestandsverlaeufe, eine Kurve
 * "Wachstum ueber Zeit" waere frei erfunden. Ein Vergleich der Gegenwart ist
 * dagegen vollstaendig belegt - und beantwortet die Frage, die man vor dem
 * Feld tatsaechlich hat: wo steckt die Arbeit?
 *
 * Dieselbe territorySubstance-Funktion, die auch die Planetengroesse bestimmt.
 * Zwei Formeln fuer dieselbe Sache waeren die Kopie-Falle, die das
 * Mycelium-Netz schon einmal neben die Planeten haengen liess.
 */

export interface SubstanceInput {
    id: string;
    name: string;
    color?: string | null;
    documents: number;
    spaces: number;
    folders: number;
}

export interface SubstanceBar {
    id: string;
    name: string;
    color: string;
    documents: number;
    spaces: number;
    folders: number;
    /** 0..1, bezogen auf die inhaltsreichste Abteilung. */
    ratio: number;
}

export function buildSubstanceBars(territories: SubstanceInput[]): SubstanceBar[] {
    if (territories.length === 0) return [];

    const withSubstance = territories.map((territory) => ({
        territory,
        substance: territorySubstance(territory),
    }));

    const max = Math.max(...withSubstance.map((entry) => entry.substance));

    return withSubstance
        .sort((a, b) => b.substance - a.substance || a.territory.name.localeCompare(b.territory.name))
        .map(({ territory, substance }) => ({
            id: territory.id,
            name: territory.name,
            color: territory.color || '#67e8f9',
            documents: territory.documents,
            spaces: territory.spaces,
            folders: territory.folders,
            // Liegt ueberall nichts, ist auch nichts zu zeichnen - vier leere
            // Abteilungen duerfen nicht wie vier volle aussehen.
            ratio: max > 0 ? substance / max : 0,
        }));
}
