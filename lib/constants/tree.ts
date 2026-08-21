/**
 * Der Sammel-Eintrag fuer Bereiche ohne Abteilung.
 *
 * CORE liefert sie additiv als `unassigned_spaces` (siehe
 * core/api_schemas/tree.py) statt sie stillschweigend zu verwerfen - am
 * 21.08.2026 waren das bei der echten Saimoer-HQ-Firma 2 von 8 Spaces mit
 * 2 Ordnern und 7 echten Dokumenten. mapTreeResponseToNodes buendelt sie zu
 * einem synthetischen, department-foermigen Baumeintrag mit dieser festen
 * id, damit Universe sie wie jede andere Abteilung als Bereich zeichnen kann
 * - "auch nur ueber Oberordner", wie gefordert.
 */
export const UNASSIGNED_DEPARTMENT_ID = '__unassigned__';
export const UNASSIGNED_DEPARTMENT_NAME = 'Nicht zugeordnet';
