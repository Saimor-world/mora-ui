const fetchDepartments = jest.fn().mockResolvedValue([]);
const fetchTree = jest.fn().mockResolvedValue([]);

jest.mock('@/lib/api/coreClient', () => ({
  fetchDepartments: (...args: any[]) => fetchDepartments(...args),
  fetchCompanies: jest.fn().mockResolvedValue([]),
  fetchSpaces: jest.fn().mockResolvedValue([]),
  fetchFolders: jest.fn().mockResolvedValue([]),
  fetchNodes: jest.fn().mockResolvedValue([]),
  fetchNodesByCompany: jest.fn().mockResolvedValue([]),
  fetchNodeDetails: jest.fn().mockResolvedValue(null),
  fetchTree: (...args: any[]) => fetchTree(...args),
  createSpace: jest.fn(),
  createFolder: jest.fn(),
  createNode: jest.fn(),
  updateNode: jest.fn(),
  deleteNode: jest.fn(),
  createDepartment: jest.fn(),
  updateDepartment: jest.fn(),
  deleteDepartment: jest.fn(),
  updateSpace: jest.fn(),
  deleteSpace: jest.fn(),
  updateFolder: jest.fn(),
  deleteFolder: jest.fn(),
  CoreError: class CoreError extends Error {
    status: number;
    constructor(message: string, status = 500) {
      super(message);
      this.status = status;
    }
  },
}));

jest.mock('@/lib/auth/useAccount', () => ({
  useAccountStore: {
    getState: () => ({ currentAccount: { tenantId: 'tenant-demo' } }),
  },
}));

jest.mock('@/lib/store/paneStore', () => ({
  usePaneStore: {
    getState: () => ({ panes: [] }),
  },
}));

jest.mock('@/lib/toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('@/lib/intelligence/mindLoop', () => ({
  mindLoop: {
    dispatch: jest.fn(),
    getCurrentState: jest.fn(() => 'idle'),
    subscribe: jest.fn(),
  },
}));

import { useMoraStore } from '@/lib/store/moraState';

describe('moraState company context switching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    useMoraStore.getState().resetStore();
    useMoraStore.setState({
      user: {
        id: 'user-demo',
        name: 'Demo',
        role: 'owner',
        tenant_id: 'tenant-demo',
        active_company_id: 'co-demo',
        active_company_name: 'Simple Coffee Group',
      },
      companies: [
        { id: 'co-demo', name: 'Simple Coffee Group', tenant_id: 'tenant-demo', is_demo: true } as any,
        { id: 'co-hq', name: 'Saimor HQ', tenant_id: 'tenant-saimor-hq', is_demo: false } as any,
      ],
      activeCompanyId: 'co-demo',
      activeDepartmentId: 'dep-1',
      activeSpaceId: 'space-1',
      activeFolderId: 'folder-1',
      activeNode: { id: 'node-1', title: 'Old Node' } as any,
    });
  });

  it('switches demo account company context explicitly and reloads scoped data', async () => {
    useMoraStore.getState().setActiveCompany('co-hq');

    expect(useMoraStore.getState().activeCompanyId).toBe('co-hq');
    expect(useMoraStore.getState().activeDepartmentId).toBeNull();
    expect(useMoraStore.getState().activeSpaceId).toBeNull();
    expect(useMoraStore.getState().activeFolderId).toBeNull();
    expect(useMoraStore.getState().activeNode).toBeNull();
    expect(useMoraStore.getState().user?.active_company_id).toBe('co-hq');
    expect(useMoraStore.getState().user?.active_company_name).toBe('Saimor HQ');
    expect(localStorage.getItem('last_company_id')).toBe('co-hq');
    expect(localStorage.getItem('last_workspace')).toBe('Saimor HQ');

    await Promise.resolve();

    expect(fetchDepartments).toHaveBeenCalledWith('co-hq');
    expect(fetchTree).toHaveBeenCalledWith('tenant-saimor-hq', 'co-hq');
  });

  it('does not silently switch company when demo account changes view mode', () => {
    useMoraStore.getState().setActiveCompany('co-hq');

    useMoraStore.getState().setViewMode('demo');
    expect(useMoraStore.getState().activeCompanyId).toBe('co-hq');

    useMoraStore.getState().setViewMode('workspace');
    expect(useMoraStore.getState().activeCompanyId).toBe('co-hq');
  });
});
