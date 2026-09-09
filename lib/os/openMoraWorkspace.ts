import { useNavStore } from '@/lib/store/navStore';
import { usePaneStore } from '@/lib/store/paneStore';
import { useSessionStore } from '@/lib/store/sessionStore';

export type MoraWorkspaceSource =
  | 'home'
  | 'work'
  | 'mail'
  | 'calendar'
  | 'files'
  | 'tasks'
  | 'nightwatch'
  | 'dossier'
  | 'system';

export type MoraOperationalReference = {
  type: 'task' | 'node' | 'mail' | 'event' | 'plan';
  id: string;
  /** Effective scope of the referenced record, not a permission claim. */
  scope: 'organization' | 'company' | 'user';
  companyId?: string | null;
};

export type MoraWorkspaceIntent = {
  version: 1;
  requestId: string;
  source: MoraWorkspaceSource;
  sourcePaneId?: string;
  identityKey: string;
  requestedCompanyId: string | null;
  references: MoraOperationalReference[];
  label?: string;
  draftQuestion?: string;
  createdAt: number;
};

export type MoraWorkspaceContext = {
  source?: MoraWorkspaceSource;
  sourcePaneId?: string;
  label?: string;
  draftQuestion?: string;
  taskId?: string;
  taskTitle?: string;
  nodeId?: string;
  planId?: string;
  companyId?: string | null;
  references?: MoraOperationalReference[];
};

const DESKTOP_SIZE = { width: 900, height: 720 } as const;
const RECOVERY_MIN = { width: 680, height: 520 } as const;
const MAX_LABEL_LENGTH = 180;
const MAX_DRAFT_LENGTH = 600;

function newRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `mora-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function currentMoraIdentityKey(): string {
  const session = useSessionStore.getState();
  const user = session.user;
  return `${user?.tenant_id ?? 'tenant-unknown'}:${user?.id ?? 'anonymous'}:${session.sessionGeneration}`;
}

function cleanText(value: string | undefined, maxLength: number): string | undefined {
  const cleaned = value?.trim();
  return cleaned ? cleaned.slice(0, maxLength) : undefined;
}

function buildReferences(context: MoraWorkspaceContext): MoraOperationalReference[] {
  const references = [...(context.references ?? [])];
  if (context.taskId && !references.some((ref) => ref.type === 'task' && ref.id === context.taskId)) {
    references.push({ type: 'task', id: context.taskId, scope: 'organization' });
  }
  if (context.nodeId && !references.some((ref) => ref.type === 'node' && ref.id === context.nodeId)) {
    references.push({ type: 'node', id: context.nodeId, scope: 'company', companyId: context.companyId ?? null });
  }
  if (context.planId && !references.some((ref) => ref.type === 'plan' && ref.id === context.planId)) {
    references.push({ type: 'plan', id: context.planId, scope: 'organization' });
  }
  return references
    .filter((ref) => typeof ref.id === 'string' && ref.id.trim().length > 0)
    .slice(0, 8)
    .map((ref) => ({ ...ref, id: ref.id.trim().slice(0, 160) }));
}

function buildIntent(context: MoraWorkspaceContext): MoraWorkspaceIntent {
  const navCompanyId = useNavStore.getState().activeCompanyId ?? null;
  return {
    version: 1,
    requestId: newRequestId(),
    source: context.source ?? 'system',
    sourcePaneId: cleanText(context.sourcePaneId, 160),
    identityKey: currentMoraIdentityKey(),
    requestedCompanyId: context.companyId ?? navCompanyId,
    references: buildReferences(context),
    label: cleanText(context.label ?? context.taskTitle, MAX_LABEL_LENGTH),
    draftQuestion: cleanText(context.draftQuestion, MAX_DRAFT_LENGTH),
    createdAt: Date.now(),
  };
}

function withTransientIntent(data: unknown, intent: MoraWorkspaceIntent): Record<string, unknown> {
  const source = data && typeof data === 'object' && !Array.isArray(data)
    ? data as Record<string, unknown>
    : {};
  // Drop any legacy enumerable launch context before cloning. The new property is
  // deliberately non-enumerable so pane geometry persistence cannot serialize it.
  const { osContext: _legacyContext, draftInput: _legacyDraft, ...durableData } = source;
  const nextData: Record<string, unknown> = { ...durableData };
  Object.defineProperty(nextData, 'osContext', {
    value: intent,
    writable: true,
    configurable: true,
    enumerable: false,
  });
  return nextData;
}

export function readMoraWorkspaceIntent(paneId = 'chat-main'): MoraWorkspaceIntent | null {
  const pane = usePaneStore.getState().getPane(paneId);
  const raw = pane?.data && typeof pane.data === 'object'
    ? (pane.data as Record<string, unknown>).osContext
    : undefined;
  if (!raw || typeof raw !== 'object') return null;
  const intent = raw as Partial<MoraWorkspaceIntent>;
  if (intent.version !== 1 || typeof intent.requestId !== 'string' || typeof intent.identityKey !== 'string') return null;
  if (intent.identityKey !== currentMoraIdentityKey()) return null;
  const currentCompanyId = useNavStore.getState().activeCompanyId ?? null;
  if ((intent.requestedCompanyId ?? null) !== currentCompanyId) return null;
  if (!Array.isArray(intent.references)) return null;
  return intent as MoraWorkspaceIntent;
}

export function clearMoraWorkspaceIntent(requestId?: string, paneId = 'chat-main'): void {
  const store = usePaneStore.getState();
  const pane = store.getPane(paneId);
  if (!pane?.data || typeof pane.data !== 'object') return;
  const raw = (pane.data as Record<string, unknown>).osContext as Partial<MoraWorkspaceIntent> | undefined;
  if (requestId && raw?.requestId && raw.requestId !== requestId) return;
  // Spreading intentionally drops the non-enumerable osContext property and also
  // scrubs legacy enumerable draft/context fields before persistence.
  const { osContext: _context, draftInput: _draft, ...durableData } = pane.data as Record<string, unknown>;
  store.updatePane(paneId, { data: durableData });
}

function resolveWorkspaceGeometry() {
  if (typeof window === 'undefined') {
    return { size: DESKTOP_SIZE, position: undefined };
  }

  const horizontalMargin = window.innerWidth < 768 ? 24 : 48;
  const verticalReserve = window.innerHeight < 760 ? 88 : 140;
  const maxWidth = Math.max(320, window.innerWidth - horizontalMargin);
  const maxHeight = Math.max(360, window.innerHeight - verticalReserve);
  const width = Math.min(DESKTOP_SIZE.width, maxWidth);
  const height = Math.min(DESKTOP_SIZE.height, maxHeight);
  const position = {
    x: Math.max(12, Math.floor((window.innerWidth - width) / 2)),
    y: Math.max(44, Math.floor((window.innerHeight - height) / 2) - 8),
  };

  return { size: { width, height }, position };
}

/**
 * Canonical entry into MÔRA as an OS workspace.
 * Opening is navigation only: it never submits a message or executes a tool.
 */
export function openMoraWorkspace(context: MoraWorkspaceContext = {}) {
  const store = usePaneStore.getState();
  const existing = store.getPane('chat-main');
  const { size, position } = resolveWorkspaceGeometry();
  const intent = buildIntent(context);
  const nextData = withTransientIntent(existing?.data, intent);

  if (existing) {
    const recoveryWidth = Math.min(RECOVERY_MIN.width, size.width);
    const recoveryHeight = Math.min(RECOVERY_MIN.height, size.height);
    const offscreen = typeof window !== 'undefined' && (
      existing.position.x > window.innerWidth - 80
      || existing.position.y > window.innerHeight - 120
      || existing.position.x + existing.size.width < 80
      || existing.position.y + existing.size.height < 80
    );
    if (existing.size.width < recoveryWidth || existing.size.height < recoveryHeight || offscreen) {
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
