import type { PaneOpenRequest } from '@/lib/store/paneStore';

type OpenPaneFn = (pane: PaneOpenRequest) => void;

export type MoraCenterSection = 'overview' | 'memory' | 'stats';

export function openMoraCenter(
    openPane: OpenPaneFn,
    section: MoraCenterSection = 'overview',
    size: { width: number; height: number } = { width: 720, height: 640 },
) {
    openPane({
        id: 'mora-hub',
        type: 'mora-hub',
        title: 'Mora Center',
        size,
        data: { activeSection: section },
    });
}
