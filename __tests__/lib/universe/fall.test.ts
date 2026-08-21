import {
    computeFallTarget,
    decodeFallPayload,
    encodeFallPayload,
    type FallCandidate,
    type FallSource,
} from '@/lib/universe/fall';

const candidate = (id: string, name: string, over: Partial<FallCandidate> = {}): FallCandidate => ({
    id,
    name,
    x: 50,
    y: 50,
    spaces: 0,
    folders: 0,
    documents: 0,
    ...over,
});

const source = (over: Partial<FallSource> & Pick<FallSource, 'label'>): FallSource => ({
    text: '',
    kind: 'mail',
    ...over,
});

/**
 * Die Demo, um die es geht: du laesst ein Ding ins Feld fallen, und es findet
 * seinen Bereich, ohne dass du ihn nennst. Das darf keine Show sein - der
 * Fall muss auf echten Gruenden landen, sonst ist es nur eine huebsche
 * Animation ueber einer Muenze.
 */
describe('computeFallTarget', () => {
    it('gibt nichts zurueck, wenn es nichts gibt, das faengt', () => {
        expect(computeFallTarget(source({ label: 'Q3 Zahlen' }), [])).toBeNull();
    });

    // Der Kern des Konzepts: ein Namenstreffer schlaegt Masse. Ein Growth-Mail
    // faellt auf Growth, auch wenn Product zehnmal so gross ist - sonst waere
    // die Anziehung nur eine Umschreibung von "der groesste Planet gewinnt",
    // und das waere keine Einordnung, sondern ein Sog.
    it('ein Namenstreffer zieht staerker als reine Masse', () => {
        const growth = candidate('growth', 'Growth', { spaces: 1, folders: 0, documents: 2 });
        const product = candidate('product', 'Product', { spaces: 6, folders: 12, documents: 90 });

        const result = computeFallTarget(
            source({ label: 'Growth-Zahlen fürs Board', text: 'Wachstum Q3' }),
            [growth, product],
        );

        expect(result?.targetId).toBe('growth');
    });

    it('ohne jeden Treffer entscheidet die Substanz', () => {
        const thin = candidate('thin', 'Intelligence', { spaces: 0, folders: 0, documents: 1 });
        const heavy = candidate('heavy', 'R&D', { spaces: 4, folders: 8, documents: 60 });

        const result = computeFallTarget(source({ label: 'Rechnung Büromaterial' }), [thin, heavy]);

        expect(result?.targetId).toBe('heavy');
    });

    it('ist deterministisch fuer denselben Fall', () => {
        const candidates = [candidate('a', 'Alpha'), candidate('b', 'Beta')];
        const input = source({ label: 'Alpha-Vertrag unterschrieben' });

        expect(computeFallTarget(input, candidates)).toEqual(computeFallTarget(input, candidates));
    });

    it('bricht Gleichstand ueber die id, nicht ueber Einfuegereihenfolge', () => {
        const a = candidate('b-team', 'Team');
        const b = candidate('a-team', 'Team');

        expect(computeFallTarget(source({ label: 'Notiz' }), [a, b])?.targetId).toBe('a-team');
        expect(computeFallTarget(source({ label: 'Notiz' }), [b, a])?.targetId).toBe('a-team');
    });

    it('liefert den Zug jedes Kandidaten, nicht nur den Gewinner', () => {
        const candidates = [candidate('a', 'Alpha'), candidate('b', 'Beta')];
        const result = computeFallTarget(source({ label: 'Notiz' }), candidates);

        expect(Object.keys(result?.pulls ?? {}).sort()).toEqual(['a', 'b']);
    });
});

describe('Fall-Nutzlast', () => {
    it('geht durch encode/decode unveraendert hindurch', () => {
        const original = source({ label: 'Growth-Zahlen', text: 'Q3', kind: 'mail' });
        expect(decodeFallPayload(encodeFallPayload(original))).toEqual(original);
    });

    // dataTransfer kann von jeder Ablage im Fenster stammen, nicht nur von
    // unseren eigenen Horizont-Zeilen. Ein Fremdkoerper darf nichts fallen
    // lassen, statt mit fehlenden Feldern weiterzurechnen.
    it('verwirft, was nicht unsere eigene Nutzlast ist', () => {
        expect(decodeFallPayload('kein json')).toBeNull();
        expect(decodeFallPayload('{}')).toBeNull();
        expect(decodeFallPayload(JSON.stringify({ label: 'x', kind: 'unbekannt' }))).toBeNull();
        expect(decodeFallPayload(JSON.stringify({ kind: 'mail' }))).toBeNull();
    });

    it('fehlender Text wird zum leeren String, nicht zum Absturz', () => {
        expect(decodeFallPayload(JSON.stringify({ label: 'x', kind: 'note' }))).toEqual({
            label: 'x', text: '', kind: 'note',
        });
    });
});
