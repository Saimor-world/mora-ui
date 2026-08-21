import React from 'react';
import { render, screen } from '@testing-library/react';
import { OrganizationField, type OrganizationTerritory } from '@/components/universe/OrganizationField';
import type { UniverseSignal } from '@/lib/universe/types';

const territory = (id: string, name: string, x: number, y: number): OrganizationTerritory => ({
    id,
    name,
    description: null,
    color: '#67e8f9',
    x,
    y,
    spaces: 2,
    folders: 1,
    documents: 3,
    metricSource: 'live',
    access: 'open',
});

const territories = [
    territory('product', 'Product', 62, 30),
    territory('growth', 'Growth', 50, 74),
];

const signal = (
    over: Partial<UniverseSignal> & Pick<UniverseSignal, 'id' | 'targetId' | 'kind' | 'evidence'>,
): UniverseSignal => ({
    title: 'Ein Signal',
    subtitle: 'Quelle',
    ...over,
});

const renderField = (lens: 'organization' | 'relations', signals: UniverseSignal[]) =>
    render(
        <OrganizationField
            lens={lens}
            organizationName="Saimôr HQ"
            territories={territories}
            signals={signals}
            selectedId={null}
            onSelect={() => undefined}
            onOpen={() => undefined}
            onAskMora={() => undefined}
        />,
    );

/**
 * Marius' Befund war: "es gibt keinen unterschied". Er hatte recht - die Linse
 * "Zusammenhaenge" tauschte nur Ueberschrift und Untertitel aus und zeigte
 * sonst exakt dasselbe Bild wie "Organisation". Diese Datei haelt fest, dass
 * sich die beiden Ansichten in dem unterscheiden, was sie behaupten.
 */
describe('OrganizationField: die beiden Linsen', () => {
    it('zeichnet in der Organisationslinse keine Beziehungen', () => {
        const { container } = renderField('organization', [
            signal({ id: 's1', targetId: 'product', kind: 'nightwatch', evidence: 'assigned' }),
        ]);

        expect(container.querySelectorAll('path[vector-effect]')).toHaveLength(0);
    });

    it('zeichnet in der Beziehungslinse fuer jedes Signal einen Strang', () => {
        const { container } = renderField('relations', [
            signal({ id: 's1', targetId: 'product', kind: 'nightwatch', evidence: 'assigned' }),
            signal({ id: 's2', targetId: 'growth', kind: 'mail', evidence: 'inferred' }),
        ]);

        expect(container.querySelectorAll('path[vector-effect]')).toHaveLength(2);
    });

    // Die Ueberschrift sagt "Was nachweislich zusammenhaengt". Ein Namenstreffer
    // im Mailbetreff ist kein Nachweis. Solange beide Sorten gleich aussehen,
    // ist diese Zusage nicht gedeckt.
    it('unterscheidet einen Beleg sichtbar von einer Vermutung', () => {
        const { container } = renderField('relations', [
            signal({ id: 's1', targetId: 'product', kind: 'nightwatch', evidence: 'assigned' }),
            signal({ id: 's2', targetId: 'growth', kind: 'mail', evidence: 'inferred' }),
        ]);

        const paths = Array.from(container.querySelectorAll('path[vector-effect]'));
        const dashed = paths.filter((path) => path.getAttribute('stroke-dasharray'));

        expect(dashed).toHaveLength(1);
        expect(screen.getByText(/1 belegt/)).toBeInTheDocument();
        expect(screen.getByText(/1 nur vermutet/)).toBeInTheDocument();
    });

    // Frueher stand hier: "sagt es ausdruecklich, wenn nichts nachweisbar
    // zusammenhaengt". Das war richtig, solange "Zusammenhaenge" eine eigene
    // Linse war - eine Ansicht, die man absichtlich oeffnet, muss erklaeren,
    // warum sie leer ist.
    //
    // Seit beide Linsen zu einem Feld verschmolzen sind (Marius: "wieso sind
    // das 2 sachen?"), gibt es nichts mehr zu erklaeren: es sind einfach
    // keine Verbindungen da. Eine dauerhafte Zeile "hier ist nichts" unter
    // den Planeten waere nur noch Laerm. Geprueft wird jetzt das Gegenteil.
    it('schweigt, wenn es keine Verbindungen zu zeigen gibt', () => {
        const { container } = renderField('relations', []);

        expect(screen.queryByText(/nachweisbar zusammen/)).not.toBeInTheDocument();
        expect(container.querySelectorAll('path[vector-effect]')).toHaveLength(0);
    });
});
