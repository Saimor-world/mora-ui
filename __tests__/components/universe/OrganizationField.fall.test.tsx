import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { OrganizationField, type OrganizationTerritory } from '@/components/universe/OrganizationField';
import { encodeFallPayload, FALL_PAYLOAD_MIME } from '@/lib/universe/fall';

const territory = (id: string, name: string, x: number, y: number): OrganizationTerritory => ({
    id, name, description: null, color: '#67e8f9', x, y,
    spaces: 2, folders: 1, documents: 3, metricSource: 'live', access: 'open',
});

const territories = [
    territory('product', 'Product', 62, 30),
    territory('growth', 'Growth', 50, 74),
];

function renderField(onFile: jest.Mock) {
    return render(
        <OrganizationField
            lens="relations"
            organizationName="Saimôr HQ"
            territories={territories}
            signals={[]}
            selectedId={null}
            onSelect={() => undefined}
            onOpen={() => undefined}
            onAskMora={() => undefined}
            onFile={onFile}
            onOpenMoon={() => undefined}
        />,
    );
}

/** Eine Ablage ins Feld ausloesen, ohne echtes Drag&Drop im Browser. */
function dropInto(container: HTMLElement, label: string) {
    const field = container.querySelector('[data-testid="product"]')?.parentElement
        ?? container.querySelector('div.absolute.bottom-24') as HTMLElement;

    fireEvent.drop(field as HTMLElement, {
        dataTransfer: {
            types: [FALL_PAYLOAD_MIME],
            getData: (type: string) =>
                type === FALL_PAYLOAD_MIME
                    ? encodeFallPayload({ label, text: '', kind: 'mail' })
                    : '',
        },
        clientX: 400,
        clientY: 300,
    });
}

/**
 * Der Fall darf keine Ablage vortaeuschen.
 *
 * Bis es POST /v3/departments/{id}/intake gab, sagte die Oberflaeche
 * ausdruecklich "probeweise, noch nicht abgelegt" - ehrlich folgenlos statt
 * vorgetaeuscht. Jetzt wird wirklich abgelegt, und genau deshalb muss der
 * Fehlerfall sichtbar sein: eine Animation, die immer "abgelegt" sagt, waere
 * dieselbe Luege in neuer Form.
 */
describe('OrganizationField: der Fall legt wirklich ab', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });
    afterEach(() => {
        // In act() eingefasst: die Aufraeum-Zeitgeber rufen setLanded auf, und
        // eine Zustandsaenderung ausserhalb von act ist genau die Sorte
        // Warnung, die man spaeter fuer Rauschen haelt und uebersieht.
        act(() => { jest.runOnlyPendingTimers(); });
        jest.useRealTimers();
    });

    it('meldet Erfolg erst, wenn CORE bestaetigt hat', async () => {
        const onFile = jest.fn().mockResolvedValue(true);
        const { container } = renderField(onFile);

        dropInto(container, 'Vertrag unterschrieben');
        act(() => { jest.advanceTimersByTime(2500); });

        await waitFor(() => expect(onFile).toHaveBeenCalledTimes(1));
        expect(onFile.mock.calls[0][1]).toBe('Vertrag unterschrieben');
        expect(onFile.mock.calls[0][2]).toBe('mail');
    });

    // Der eigentliche Grund fuer diese Datei.
    it('zeigt keinen Erfolg, wenn die Ablage scheitert', async () => {
        const onFile = jest.fn().mockResolvedValue(false);
        const { container } = renderField(onFile);

        dropInto(container, 'Kaputte Ablage');
        act(() => { jest.advanceTimersByTime(2500); });

        await waitFor(() => expect(onFile).toHaveBeenCalled());
        await waitFor(() => {
            expect(screen.getByText(/Nichts wurde gespeichert/)).toBeInTheDocument();
        });
        expect(screen.queryByText(/liegt jetzt im Eingang/)).not.toBeInTheDocument();
    });
});
