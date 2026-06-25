import type { usePaneStore } from '@/lib/store/paneStore';

type OpenPaneFn = ReturnType<typeof usePaneStore.getState>['openPane'];

export function openLagefeldPane(
  openPane: OpenPaneFn,
  data?: Record<string, unknown>,
) {
  openPane({
    id: 'lagefeld-main',
    type: 'lagefeld',
    title: 'Lagefeld',
    size: { width: 1040, height: 720 },
    data: data ?? { source: 'lagefeld' },
  });
}
