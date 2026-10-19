import { buildChatContext } from '@/lib/api/moraAgentClient';
import {
  currentMoraIdentityKey,
  openMoraWorkspace,
  readMoraWorkspaceIntent,
} from '@/lib/os/openMoraWorkspace';
import { useNavStore } from '@/lib/store/navStore';
import { usePaneStore } from '@/lib/store/paneStore';
import { useSessionStore } from '@/lib/store/sessionStore';

function setIdentity(userId = 'user-a', tenantId = 'tenant-a', generation = 1) {
  useSessionStore.setState((state) => ({
    ...state,
    user: {
      id: userId,
      name: 'Test User',
      role: 'member',
      tenant_id: tenantId,
    },
    sessionGeneration: generation,
  }));
}

describe('openMoraWorkspace transient intent', () => {
  beforeEach(() => {
    localStorage.clear();
    usePaneStore.setState({ panes: [], activePaneId: null, nextZIndex: 500 });
    useNavStore.setState({ activeCompanyId: 'company-a' });
    setIdentity();
  });

  it('reuses one chat pane and replaces Home context with Work context', () => {
    openMoraWorkspace({ source: 'home', label: 'Heute' });
    const homeIntent = readMoraWorkspaceIntent();
    expect(homeIntent?.source).toBe('home');

    openMoraWorkspace({
      source: 'work',
      label: 'Angebot prüfen',
      taskId: 'task-1',
      companyId: 'company-a',
    });

    const panes = usePaneStore.getState().panes.filter((pane) => pane.id === 'chat-main');
    const workIntent = readMoraWorkspaceIntent();
    expect(panes).toHaveLength(1);
    expect(workIntent?.source).toBe('work');
    expect(workIntent?.requestId).not.toBe(homeIntent?.requestId);
    expect(workIntent?.references).toEqual([
      { type: 'task', id: 'task-1', scope: 'organization' },
    ]);
  });

  it('puts a referenced task into the actual chat context and consumes it once', () => {
    openMoraWorkspace({ source: 'work', taskId: 'task-1', companyId: 'company-a' });

    const first = buildChatContext({ pane_id: 'chat-main' });
    expect(first?.workspace?.operational_references).toEqual([
      {
        type: 'task',
        id: 'task-1',
        scope: 'organization',
        company_id: undefined,
      },
    ]);
    expect(first?.workspace?.launch?.source).toBe('work');
    expect(readMoraWorkspaceIntent()).toBeNull();

    const second = buildChatContext({ pane_id: 'chat-main' });
    expect(second?.workspace?.operational_references).toBeUndefined();
    expect(second?.workspace?.launch).toBeUndefined();
  });

  it('invalidates a launch intent after principal/session or company changes', () => {
    openMoraWorkspace({ source: 'work', taskId: 'task-1', companyId: 'company-a' });
    expect(readMoraWorkspaceIntent()).not.toBeNull();

    setIdentity('user-a', 'tenant-a', 2);
    expect(currentMoraIdentityKey()).toContain(':2');
    expect(readMoraWorkspaceIntent()).toBeNull();

    setIdentity('user-a', 'tenant-a', 3);
    useNavStore.setState({ activeCompanyId: 'company-a' });
    openMoraWorkspace({ source: 'home', companyId: 'company-a' });
    useNavStore.setState({ activeCompanyId: 'company-b' });
    expect(readMoraWorkspaceIntent()).toBeNull();
  });

  it('does not persist osContext or draftQuestion with pane geometry', () => {
    openMoraWorkspace({
      source: 'work',
      taskId: 'task-1',
      draftQuestion: 'Wie gehen wir weiter?',
      companyId: 'company-a',
    });

    const pane = usePaneStore.getState().getPane('chat-main');
    expect(readMoraWorkspaceIntent()?.draftQuestion).toBe('Wie gehen wir weiter?');
    expect(JSON.stringify(pane)).not.toContain('osContext');
    expect(JSON.stringify(pane)).not.toContain('Wie gehen wir weiter?');
  });

  it('submits Home questions through transient data and accepts another question in the same pane', () => {
    const question = 'Wie geht es weiter? '.repeat(70).trim();
    openMoraWorkspace({ source: 'home', draftQuestion: question, submitQuestion: true });
    const first = usePaneStore.getState().getPane('chat-main');
    const firstId = first?.data.initialMessageId;
    expect(first?.data.initialMessage).toBe(question);
    expect(firstId).toBe(readMoraWorkspaceIntent()?.requestId);
    expect(JSON.stringify(first)).not.toContain(question);
    expect(JSON.stringify(first)).not.toContain('initialMessage');

    openMoraWorkspace({ source: 'home', draftQuestion: 'Und danach?', submitQuestion: true });
    const second = usePaneStore.getState().getPane('chat-main');
    expect(second?.data.initialMessageId).not.toBe(firstId);
    expect(second?.data.initialMessage).toBe('Und danach?');
    expect(usePaneStore.getState().panes).toHaveLength(1);

    openMoraWorkspace({ source: 'work', label: 'Arbeit' });
    expect(usePaneStore.getState().getPane('chat-main')?.data.initialMessage).toBeUndefined();
  });

  it('keeps mail context in memory, bounds submission size and rejects an old company context', () => {
    openMoraWorkspace({
      source: 'mail', submitQuestion: true, draftQuestion: 'Private Mailquelle '.repeat(2000),
      mailReply: { messageId: 'mail-1', to: 'person@example.invalid', subject: 'Private Antwort' },
    });
    const pane = usePaneStore.getState().getPane('chat-main');
    expect(pane?.data.initialMessage).toHaveLength(16000);
    expect(readMoraWorkspaceIntent()?.mailReply?.messageId).toBe('mail-1');
    expect(JSON.stringify(pane)).not.toContain('Private Mailquelle');
    expect(JSON.stringify(pane)).not.toContain('person@example.invalid');
    useNavStore.setState({ activeCompanyId: 'company-b' });
    expect(readMoraWorkspaceIntent()).toBeNull();
  });
});
