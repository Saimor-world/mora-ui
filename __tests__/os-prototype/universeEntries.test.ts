import { openNodeStar, openSourceSettings, sourceStationId } from '@/lib/os-prototype/universeEntries';
import { usePaneStore } from '@/lib/store/paneStore';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { demoCompaniesForTenant, useDemoStore } from '@/lib/demo/demoStore';

beforeEach(() => { useDemoStore.getState().setDemoCompany(null); usePaneStore.setState({ panes: [], activePaneId: null }); });

it.each(['document', 'note', 'file', 'other'] as const)('opens a real %s node with the active company rather than silently ignoring it', (kind) => {
  expect(openNodeStar({ id: 'n1', kind, name: 'Server status' }, 'company-1')).toBe(true);
  expect(usePaneStore.getState().panes[0]).toMatchObject({ type: 'document', data: { nodeId: 'n1', companyId: 'company-1' } });
});

it('opens a URL-only link through the existing browser path and rejects script URLs', () => {
  const open = jest.spyOn(window, 'open').mockImplementation(() => null);
  expect(openNodeStar({ id: 'n1', kind: 'link', name: 'Website', raw: { url: 'https://www.saimor.world' } }, 'c')).toBe(true);
  expect(open).toHaveBeenCalledWith('https://www.saimor.world', '_blank', 'noopener,noreferrer');
  expect(openNodeStar({ id: 'n2', kind: 'link', name: 'Invalid', raw: { url: 'javascript:alert(1)' } }, 'c')).toBe(false);
  expect(open).toHaveBeenCalledTimes(1);
  open.mockRestore();
});

it('hands source information into the current settings without creating a legacy pane', () => {
  const navigate = jest.fn();
  openSourceSettings(navigate, { label: 'Post & Termine', sources: ['google_mail'] });
  expect(navigate).toHaveBeenCalledWith('settings');
  expect(useOsShellStore.getState()).toMatchObject({ settingsSection: 'sources', settingsSource: { sources: ['google_mail'] } });
  expect(usePaneStore.getState().panes).toHaveLength(0);
});

it.each(['google_mail', 'imap', 'mail'])('maps the CORE provider %s to its mail station', (id) => expect(sourceStationId(id)).toBe('mail'));

it('lists only this tenant’s demo even when a system-owner response contains identically named demos from other tenants', () => {
  const rows = ['hq', 'other-1', 'other-2'].map((tenant_id, i) => ({ id: `c${i}`, name: 'Simple Coffee Group', tenant_id, is_demo: true }));
  expect(demoCompaniesForTenant(rows, 'hq').map((c) => c.id)).toEqual(['c0']);
  expect(demoCompaniesForTenant(rows, undefined)).toEqual([]);
});
