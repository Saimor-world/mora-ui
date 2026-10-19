import { usePaneStore } from '@/lib/store/paneStore';
import { GLASS_SHEET_SIZE } from '@/lib/os/glassSheet';

// Marius' current requirement: app windows start at the viewport centre.
// Explicit positions remain authoritative for dragging and saved layouts.
describe('paneStore centred default windows', () => {
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

    it('centres Mail, Team and Finder regardless of old sidebar reservations', () => {
        const mail = openAndGet('mail-main', 'mail');
        const team = openAndGet('team-main', 'team');
        const finder = openAndGet('finder-main', 'finder');

        const centre = { x: (1920 - GLASS_SHEET_SIZE.width) / 2, y: (1080 - GLASS_SHEET_SIZE.height) / 2 };
        expect(mail).toEqual(centre);
        expect(team).toEqual(centre);
        expect(finder).toEqual(centre);
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

    it.each([[1440, 960, 260, 160], [1024, 768, 52, 80], [390, 844, 8, 74]])('centres the rendered bounds at %s × %s', (width, height, x, y) => {
        setViewport(width, height);
        const pos = openAndGet('calendar-main', 'calendar');
        expect(pos).toEqual({ x, y });
    });
});
