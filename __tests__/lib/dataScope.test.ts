import { getQueryClient } from '@/lib/queryClient';
import { getDataScopeKey } from '@/lib/store/dataScope';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useDemoStore } from '@/lib/demo/demoStore';
import { usePaneStore } from '@/lib/store/paneStore';
import { useActivityStore } from '@/lib/store/activityStore';
import { useMoraConversation } from '@/features/mora/data/conversationStore';
import { useNavStore } from '@/lib/store/navStore';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';

beforeEach(() => {
  useDemoStore.getState().setDemoCompany(null);
  useSessionStore.getState().setUser({ id: 'owner', tenant_id: 'hq', role: 'owner', active_company_id: 'hq-company' } as any);
});

it('does not reuse HQ query data in a demo or when returning to HQ', () => {
  const hq = getQueryClient();
  hq.setQueryData(['os', 'sources'], { connections: ['private-hq-mail'] });
  useDemoStore.getState().setDemoCompany('demo-company');
  const demo = getQueryClient();
  expect(demo).not.toBe(hq);
  expect(demo.getQueryData(['os', 'sources'])).toBeUndefined();
  useDemoStore.getState().setDemoCompany(null);
  expect(getQueryClient()).not.toBe(hq);
  expect(getQueryClient().getQueryData(['os', 'sources'])).toBeUndefined();
});

it('creates a fresh boundary for A→B→A and a new principal', () => {
  useDemoStore.getState().setDemoCompany('a'); const a = getDataScopeKey();
  useDemoStore.getState().setDemoCompany('b');
  useDemoStore.getState().setDemoCompany('a'); expect(getDataScopeKey()).not.toBe(a);
  const current = getQueryClient();
  useSessionStore.getState().setUser({ id: 'other', tenant_id: 'other', role: 'member' } as any);
  expect(getQueryClient()).not.toBe(current);
});

it('closes old windows and recent-item payloads synchronously when the company changes', () => {
  usePaneStore.getState().openPane({ id: 'private-doc', type: 'document', title: 'Private document', size: { width: 640, height: 480 }, data: { content: 'HQ content' } });
  expect(usePaneStore.getState().panes).toHaveLength(1);
  expect(localStorage.getItem('saimor_os_panes_v1')).toBeNull();
  useDemoStore.getState().setDemoCompany('demo');
  expect(usePaneStore.getState().panes).toHaveLength(0);
  expect(useActivityStore.getState().recentItems).toHaveLength(0);
});

it('does not carry Grok mail handoffs or MÔRA drafts into a demo', () => {
  useOsShellStore.setState({ moraDraft: 'Private HQ mail draft', postOpenId: 'hq-mail', universeFocus: 'hq-dept' });
  useDemoStore.getState().setDemoCompany('demo');
  expect(useOsShellStore.getState()).toMatchObject({ moraDraft: null, postOpenId: null, universeFocus: null });
});

it('ignores an old answer even after returning to the original company', () => {
  const original = getDataScopeKey();
  useMoraConversation.getState().add({ role: 'user', text: 'Private question' }, original);
  useDemoStore.getState().setDemoCompany('demo');
  useDemoStore.getState().setDemoCompany(null);
  useMoraConversation.getState().add({ role: 'mora', text: 'Late private answer' }, original);
  expect(useMoraConversation.getState().turns.some((t) => t.text === 'Late private answer')).toBe(false);
});

it('also epochs real company A→B→A and clears old navigation hierarchy', () => {
  const user = useSessionStore.getState().user!;
  const first = getDataScopeKey();
  useSessionStore.getState().setUser({ ...user, active_company_id: 'other-real-company' });
  useSessionStore.getState().setUser({ ...user });
  expect(getDataScopeKey()).not.toBe(first);
  useNavStore.setState({ activeFolderId: 'old-hq-folder', activeSpaceId: 'old-hq-space' });
  useDemoStore.getState().setDemoCompany('demo');
  expect(useNavStore.getState().activeFolderId).toBeNull();
  expect(useNavStore.getState().activeSpaceId).toBeNull();
});
