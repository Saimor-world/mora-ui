/**
 * Vom abgeleiteten Eintrag zur konkreten Originalmail (fiktive Daten, Mira).
 * CORE liefert am Eintrag nur source = { kind: 'mail', mail_id } – und nur dem Postfach-Inhaber.
 * Gleicher Titel ist kein Beweis für dieselbe Mail: jeder Eintrag öffnet seine eigene Kennung.
 */
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { WorkTask } from '@/lib/universe/deptWork';

const update = jest.fn();
const setDone = jest.fn();
jest.mock('@/lib/api/http', () => ({ ...jest.requireActual('@/lib/api/http'), coreGet: jest.fn(), corePost: jest.fn() }));
jest.mock('@/lib/lea/useDayActions', () => ({ useDayActions: () => ({ setDone, update }) }));
jest.mock('@/lib/queries/useTeamMembers', () => ({ useTeamMembers: () => ({ data: [] }) }));
jest.mock('@/lib/os/useScopedToday', () => ({ invalidateToday: jest.fn() }));
jest.mock('@/lib/store/sessionStore', () => ({
  useSessionStore: (select: (s: unknown) => unknown) => select({ user: { id: 'mira', tenant_id: 'test' } }),
}));
jest.mock('@/lib/demo/demoStore', () => ({ useScopeCompanyId: () => 'test' }));
jest.mock('@/lib/os-prototype/legacyApps', () => ({ openLegacyApp: jest.fn() }));

import { CoreError, coreGet } from '@/lib/api/http';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { useUniverseFocus } from '@/lib/lea/universeFocus';
import { TaskSheet } from '@/features/werkstatt/ui/TaskSheet';
import { MailClient } from '@/features/post/MailClient';

const read = jest.mocked(coreGet);
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });

function entry(id: string, mailId: string | null): WorkTask {
  const raw = { id, title: 'Rechnung 2026-118 bezahlen', status: 'backlog', source: mailId ? { kind: 'mail', mail_id: mailId } : null };
  return { id, title: raw.title, status: 'backlog', done: false, due: null, overdue: false, dueToday: false, folderId: null, assignee: null, raw: raw as never };
}
function sheet(task: WorkTask) {
  return render(
    <QueryClientProvider client={client()}>
      <TaskSheet task={task} crumb="Kontor" companyId="c" planetId="dept-kontor" docs={[]} onOpenDoc={jest.fn()} back={null} />
    </QueryClientProvider>,
  );
}
function post() {
  render(<QueryClientProvider client={client()}><MailClient items={[]} live /></QueryClientProvider>);
  return within(screen.getByTestId('post-mail-pane'));
}

beforeEach(() => {
  jest.clearAllMocks();
  update.mockResolvedValue(true);
  useOsShellStore.setState({ activeFeatureId: 'universe', postOpenId: null, postReturn: null, settingsSection: null });
  useUniverseFocus.setState({ target: null });
});

describe('Eintrag › Originalmail öffnen', () => {
  it('zwei Einträge mit gleichem Titel öffnen jeweils ihre eigene Mail', () => {
    const { unmount } = sheet(entry('task_mail_a', 'gm-a1'));
    fireEvent.click(screen.getByRole('button', { name: 'Originalmail öffnen' }));
    expect(useOsShellStore.getState().postOpenId).toBe('gm-a1');
    expect(useOsShellStore.getState().activeFeatureId).toBe('post');
    unmount();
    useOsShellStore.setState({ activeFeatureId: 'universe', postOpenId: null });
    sheet(entry('task_mail_b', 'gm-b2'));
    fireEvent.click(screen.getByRole('button', { name: 'Originalmail öffnen' }));
    expect(useOsShellStore.getState().postOpenId).toBe('gm-b2');
  });

  it('älterer manueller Eintrag ohne Bezug bietet keine Originalmail an', () => {
    sheet(entry('task_manual', null));
    expect(screen.queryByRole('button', { name: 'Originalmail öffnen' })).toBeNull();
  });

  it('abgewiesene Speicherung bleibt sichtbar, der Weg zur Originalmail bleibt erhalten', async () => {
    update.mockResolvedValue(false);
    sheet(entry('task_mail_a', 'gm-a1'));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'in Arbeit' })); });
    expect(screen.getByRole('alert')).toHaveTextContent('Der Stand konnte nicht gespeichert werden.');
    expect(screen.getByRole('button', { name: 'offen' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Originalmail öffnen' })).toBeVisible();
  });

  it('Zurück führt aus der Post wieder an denselben Eintrag', async () => {
    read.mockResolvedValue({ id: 'gm-a1', subject: 'Rechnung 2026-118', body_text: 'Bitte bis 30.11. zahlen: 412,00 EUR' });
    sheet(entry('task_mail_a', 'gm-a1'));
    fireEvent.click(screen.getByRole('button', { name: 'Originalmail öffnen' }));
    const pane = post();
    expect(await pane.findByText('Bitte bis 30.11. zahlen: 412,00 EUR')).toBeVisible();
    fireEvent.click(pane.getByRole('button', { name: 'Zurück zum Eintrag' }));
    expect(useOsShellStore.getState().activeFeatureId).toBe('universe');
    expect(useUniverseFocus.getState().target).toEqual({ planetId: 'dept-kontor', taskId: 'task_mail_a', from: 'home' });
    expect(useOsShellStore.getState().postReturn).toBeNull();
  });
});

describe('Post › Originalmail nicht erreichbar', () => {
  it('abgelaufene Verbindung führt zu „Neu verbinden“ in den Quellen', async () => {
    useOsShellStore.getState().setPostOpenId('gm-a1');
    read.mockRejectedValue(new CoreError('Postfach neu verbinden', 409, { code: 'mail_reauth_required' }));
    const pane = post();
    expect(await pane.findByText('Postfach-Verbindung abgelaufen.')).toBeVisible();
    fireEvent.click(pane.getByRole('button', { name: 'Neu verbinden' }));
    expect(useOsShellStore.getState().activeFeatureId).toBe('settings');
    expect(useOsShellStore.getState().settingsSection).toBe('sources');
  });

  it('entfernte Mail wird als nicht mehr vorhanden benannt', async () => {
    useOsShellStore.getState().setPostOpenId('gm-geloescht');
    read.mockRejectedValue(new CoreError('Message not found', 404));
    expect(await post().findByText('Diese Mail ist im Postfach nicht mehr vorhanden.')).toBeVisible();
  });

  it('fehlende Rechte werden nicht als gelöscht ausgegeben', async () => {
    useOsShellStore.getState().setPostOpenId('gm-fremd');
    read.mockRejectedValue(new CoreError('Forbidden', 403));
    expect(await post().findByText('Kein Zugriff auf diese Mail.')).toBeVisible();
  });

  it('ausbleibende Antwort lässt sich erneut versuchen', async () => {
    useOsShellStore.getState().setPostOpenId('gm-a1');
    read.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'gm-a1', subject: 'Rechnung', body_text: 'Original Mira' });
    const pane = post();
    expect(await pane.findByText('Das Original konnte nicht geladen werden.')).toBeVisible();
    fireEvent.click(pane.getByRole('button', { name: 'Erneut versuchen' }));
    expect(await pane.findByText('Original Mira')).toBeVisible();
  });
});
