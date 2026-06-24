import type { PaneOpenRequest } from '@/lib/store/paneStore';
import { GLASS_SHEET_SIZE } from '@/lib/os/glassSheet';

/** Standard glass-sheet request for the integrated RSS reader pane. */
export function feedsPaneRequest(overrides?: Partial<PaneOpenRequest>): PaneOpenRequest {
    return {
        id: 'feeds-main',
        type: 'feeds',
        title: 'Dein Feed',
        size: GLASS_SHEET_SIZE,
        ...overrides,
    };
}
