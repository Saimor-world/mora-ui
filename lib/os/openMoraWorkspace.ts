import { usePaneStore } from '@/lib/store/paneStore';

export type MoraWorkspaceContext = {
  source?: 'home' | 'work' | 'mail' | 'calendar' | 'files' | 'tasks' | 'nightwatch' | 'system';
  label?: string;
  taskId?: string;
  taskTitle?: string;
  companyId?: string | null;
};

const DESKTOP_SIZE = { width: 900, height: 720 } as const;
const RECOVERY_MIN = { width: 680, height: 520 } as const;

function resolveWorkspaceGeometry() {
  if (typeof window === 'undefined') {
    return { size: DESKTOP_SIZE, position: undefined };
  }

  const horizontalMargin = window.innerWidth < 768 ? 24 : 48;
  const verticalReserve = window.innerHeight < 760 ? 88 : 140;
  const width = Math.max(560, Math.min(DESKTOP_SIZE.width, window.innerWidth - horizontalMargin));
  const height = Math.max(420, Math.min(DESKTOP_SIZE.height, window.innerHeight - verticalReserve));
  const position = {
    x: Math.max(12, Math.floor((window.innerWidth - width) / 2)),
    y: Math.max(44, Math.floor((window.innerHeight - height) / 2) - 8),
  };

  return { size: { width, height }, position };
}

/**
 * Canonical entry into MÔRA as an OS workspace.
 *
 * The old product accumulated several independent `chat-main` open calls. If a
 * very small pane had been persisted, every later call merely focused that old
 * geometry. This helper keeps one pane identity, preserves a healthy user-sized
 * window, and repairs only clearly undersized persisted geometry.
 */
export function openMoraWorkspace(context: MoraWorkspaceContext = {}) {
  const store = usePaneStore.getState();
  const existing = store.getPane('chat-main');
  const { size, position } = resolveWorkspaceGeometry();
  const nextData = {
    ...(existing?.data && typeof existing.data === 'object' ? existing.data : {}),
    osContext: context,
  };

  if (existing) {
    const recoveryWidth = Math.min(RECOVERY_MIN.width, size.width);
    const recoveryHeight = Math.min(RECOVERY_MIN.height, size.height);
    if (existing.size.width < recoveryWidth || existing.size.height < recoveryHeight) {
      store.updatePaneSize('chat-main', size.width, size.height);
      if (position) store.updatePanePosition('chat-main', position.x, position.y);
    }
  }

  store.openPane({
    id: 'chat-main',
    type: 'chat',
    title: 'MÔRA',
    size,
    position,
    data: nextData,
  });
}
