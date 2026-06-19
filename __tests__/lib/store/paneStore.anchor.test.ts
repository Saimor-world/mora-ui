import { usePaneStore } from '@/lib/store/paneStore';
import { GLASS_SHEET_SIZE } from '@/lib/os/glassSheet';

// Anchored sheets (Task A): Mail hugs the left edge, Team hugs the right edge,
// everything else stays centered. User can still drag afterwards (position is a
// plain mutable field), so we only assert the *default* open position here.
describe('paneStore default sheet anchors', () => {
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;

    const setViewport = (width: number, height: number) => {
        Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: height, configurable: true });
    };

    beforeEach(() => {
        usePaneStore.getState().reset();
        setViewport(1920, 1080);
    });

    afterAll(() => {
        setViewport(originalWidth, originalHeight);
    });

    const openAndGet = (id: string, type: any) => {
        usePaneStore.getState().openPane({ id, type, title: id, size: GLASS_SHEET_SIZE });
        const pane = usePaneStore.getState().getPane(id);
        if (!pane) throw new Error(`pane ${id} not opened`);
        return pane.position;
    };

    it('anchors Mail to the left, Team to the right, Finder centered', () => {
        const mail = openAndGet('mail-main', 'mail');
        const team = openAndGet('team-main', 'team');
        const finder = openAndGet('finder-main', 'finder');

        // Left sheet sits left of center; right sheet sits right of center.
        expect(mail.x).toBeLessThan(finder.x);
        expect(team.x).toBeGreaterThan(finder.x);

        // And the anchored sheets actually hug their edges.
        expect(mail.x).toBeLessThan(200);
        expect(team.x + GLASS_SHEET_SIZE.width).toBeGreaterThan(1920 - 200);
    });

    it('keeps every sheet fully on-screen', () => {
        const mail = openAndGet('mail-main', 'mail');
        const team = openAndGet('team-main', 'team');

        for (const pos of [mail, team]) {
            expect(pos.x).toBeGreaterThanOrEqual(20);
            expect(pos.x + GLASS_SHEET_SIZE.width).toBeLessThanOrEqual(1920 - 20 + 1);
            expect(pos.y).toBeGreaterThanOrEqual(40);
        }
    });

    it('respects an explicit position over the anchor default', () => {
        usePaneStore.getState().openPane({
            id: 'mail-fixed',
            type: 'mail',
            title: 'Mail',
            size: GLASS_SHEET_SIZE,
            position: { x: 777, y: 333 },
        });
        expect(usePaneStore.getState().getPane('mail-fixed')?.position).toEqual({ x: 777, y: 333 });
    });
});
