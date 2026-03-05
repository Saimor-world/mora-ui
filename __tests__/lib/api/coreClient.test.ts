/**
 * coreClient.test.ts
 *
 * Focused regression suite for the v3 API migration.
 * Validates:
 *   1. Central v3 envelope unwrap in coreRequest() — callers receive payload, not envelope.
 *   2. All 9 migrated memory endpoints route to /v3/ (6 reads + 3 writes).
 *   3. System stats + department stats endpoints route to /v3/.
 *   4. Auth + already-migrated list paths behave correctly.
 *   5. Error/optional paths return null/[] without throwing.
 *
 * Test environment: jest-environment-jsdom (configured in jest.config.js).
 * Auth: a synthetic non-expired JWT is placed in document.cookie before each test.
 */

import {
    fetchSystemStats,
    fetchDepartmentStats,
    fetchSingleDepartmentStats,
    searchMemory,
    getMemoryPending,
    getMemoryMetrics,
    learnInsight,
    approveMemoryItem,
    rejectMemoryItem,
    fetchDepartments,
    fetchSpaces,
    authLogin,
    fetchFolderContext,
    fetchAdminUsers,
    patchAdminUser,
    patchUserCompanyBinding,
} from '@/lib/api/coreClient';

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a syntactically-valid JWT whose exp claim is in the future.
 * coreClient uses atob(token.split('.')[1]) to check expiry.
 */
function makeFutureJwt(): string {
    const exp = Math.floor(Date.now() / 1000) + 3600; // valid for 1 h
    const payload = btoa(JSON.stringify({ exp }));
    return `header.${payload}.signature`;
}

/** Install a cookie string so readCookie('mora_auth_token') resolves. */
function setCookieJwt() {
    Object.defineProperty(document, 'cookie', {
        get: jest.fn().mockReturnValue(`mora_auth_token=${makeFutureJwt()}`),
        configurable: true,
    });
}

/** Mock fetch to return a successful v3-enveloped response. */
function mockFetchV3<T>(data: T) {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
            data,
            meta: { api_version: 'v3', timestamp: new Date().toISOString() },
        }),
    } as unknown as Response);
}

/** Mock fetch to return a successful raw (v1-style) response. */
function mockFetchRaw(body: unknown) {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => body,
    } as unknown as Response);
}

/** Mock fetch to return an HTTP error. */
function mockFetchError(status: number) {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status,
        statusText: 'Error',
        json: async () => ({ detail: `Error ${status}` }),
    } as unknown as Response);
}

/** Return the URL string that was passed to the last fetch() call. */
function lastFetchUrl(): string {
    const calls = (global.fetch as jest.Mock).mock.calls;
    return calls[calls.length - 1]?.[0] as string ?? '';
}

/** Return the init object that was passed to the last fetch() call. */
function lastFetchInit(): RequestInit {
    const calls = (global.fetch as jest.Mock).mock.calls;
    return calls[calls.length - 1]?.[1] as RequestInit ?? {};
}

// ─── setup/teardown ───────────────────────────────────────────────────────────

beforeEach(() => {
    global.fetch = jest.fn();
    setCookieJwt();
});

afterEach(() => {
    jest.resetAllMocks();
});

// ─── 1. v3 envelope unwrap ────────────────────────────────────────────────────

describe('v3 envelope unwrap (coreRequest central logic)', () => {
    it('strips { data, meta } wrapper — caller receives payload directly', async () => {
        mockFetchV3({
            status: 'ok',
            timestamp: '2025-01-01T00:00:00Z',
            metrics: { cpu: 0.1, memory_usage: 0.3, memory_available_mb: 4096, os: 'Linux', uptime_seconds: 3600 },
            intelligence: { mora_load: 0.05, active_analysts: 2, cognition_rate: 'normal' },
        });
        const result = await fetchSystemStats();

        expect(result).not.toBeNull();
        expect(result).toHaveProperty('status', 'ok');
        // Envelope keys must not leak through
        expect(result).not.toHaveProperty('meta');
        expect(result).not.toHaveProperty('data');
    });

    it('passes raw v1 arrays through unchanged (no spurious unwrap)', async () => {
        mockFetchRaw([{ id: 'd1', name: 'Dept A', color: '#6366F1' }]);
        const result = await fetchDepartments('company-1');

        expect(Array.isArray(result)).toBe(true);
        expect(result[0]).toMatchObject({ id: 'd1', name: 'Dept A' });
        // Confirm /v3/ is used for this already-migrated list endpoint
        expect(lastFetchUrl()).toContain('/v3/departments');
    });

    it('normalizes object list payloads with a data key to arrays for list endpoints', async () => {
        // e.g. legacy shape { data: [...], total: 5 } without api_version
        mockFetchRaw({ data: [{ id: 'x' }], total: 1 });
        const result = await fetchDepartments('co');
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(1);
        expect((result as any[])[0]).toHaveProperty('id', 'x');
    });
});

// ─── 2. System stats ──────────────────────────────────────────────────────────

describe('fetchSystemStats', () => {
    it('routes to /v3/system/stats', async () => {
        mockFetchV3({ status: 'ok', metrics: {}, intelligence: {} });
        await fetchSystemStats();
        expect(lastFetchUrl()).toContain('/v3/system/stats');
    });

    it('returns null when server is unavailable (isOptional)', async () => {
        mockFetchError(503);
        const result = await fetchSystemStats();
        expect(result).toBeNull();
    });
});

// ─── 3. Department stats ──────────────────────────────────────────────────────

describe('fetchDepartmentStats', () => {
    it('routes to /v3/stats/departments', async () => {
        mockFetchV3({ departments: [] });
        await fetchDepartmentStats('co-1');
        expect(lastFetchUrl()).toContain('/v3/stats/departments');
    });

    it('passes company_id as query param', async () => {
        mockFetchV3({ departments: [] });
        await fetchDepartmentStats('my-company-id');
        expect(lastFetchUrl()).toContain('company_id=my-company-id');
    });

    it('extracts departments[] from v3 payload (result?.departments accessor)', async () => {
        const dept = { department_id: 'd1', health: 0.9, spaces: 3, folders: 12, nodes: 48, docs: 10, by_type: {}, department_name: 'HR' };
        mockFetchV3({ departments: [dept] });
        const result = await fetchDepartmentStats('co-1');
        expect(result).toEqual([dept]);
    });

    it('returns [] on error (isOptional)', async () => {
        mockFetchError(500);
        const result = await fetchDepartmentStats('co-1');
        expect(result).toEqual([]);
    });

    it('returns [] when v3 payload has no departments key', async () => {
        mockFetchV3({});
        const result = await fetchDepartmentStats();
        expect(result).toEqual([]);
    });
});

describe('fetchSingleDepartmentStats', () => {
    it('routes to /v3/stats/department/{id}', async () => {
        mockFetchV3({ department_id: 'dept-abc', health: 0.85 });
        await fetchSingleDepartmentStats('dept-abc');
        expect(lastFetchUrl()).toContain('/v3/stats/department/dept-abc');
    });

    it('returns null on error (isOptional)', async () => {
        mockFetchError(404);
        const result = await fetchSingleDepartmentStats('nonexistent');
        expect(result).toBeNull();
    });
});

// ─── 4. Memory reads ──────────────────────────────────────────────────────────

describe('searchMemory', () => {
    it('routes to /v3/memory/search', async () => {
        mockFetchV3([]);
        await searchMemory('invoice', 10, 'co-123');
        expect(lastFetchUrl()).toContain('/v3/memory/search');
    });

    it('encodes query, limit, and company_id in URL', async () => {
        mockFetchV3([{ id: 'm1' }]);
        await searchMemory('tax report', 5, 'co-abc');
        const url = lastFetchUrl();
        expect(url).toContain('q=tax%20report');
        expect(url).toContain('limit=5');
        expect(url).toContain('company_id=co-abc');
    });

    it('throws when company_id is empty', async () => {
        await expect(searchMemory('q', 5, '')).rejects.toThrow('Memory API requires company_id');
    });

    it('returns [] on error (isOptional)', async () => {
        mockFetchError(500);
        const result = await searchMemory('q', 5, 'co');
        expect(result).toEqual([]);
    });

    it('normalizes object payloads with results[] to array', async () => {
        mockFetchRaw({ results: [{ id: 'm-1', summary: 'x' }], total: 1 });
        const result = await searchMemory('q', 5, 'co');
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ id: 'm-1' });
    });
});

describe('getMemoryPending', () => {
    it('routes to /v3/memory/pending', async () => {
        mockFetchV3([]);
        await getMemoryPending('co-1');
        expect(lastFetchUrl()).toContain('/v3/memory/pending');
    });

    it('passes company_id as query param', async () => {
        mockFetchV3([]);
        await getMemoryPending('tenant-xyz');
        expect(lastFetchUrl()).toContain('company_id=tenant-xyz');
    });

    it('throws when company_id is empty', async () => {
        await expect(getMemoryPending('')).rejects.toThrow('Memory API requires company_id');
    });

    it('normalizes object payloads with pending[] to array', async () => {
        mockFetchRaw({ pending: [{ id: 'p-1' }] });
        const result = await getMemoryPending('co-1');
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ id: 'p-1' });
    });
});

describe('getMemoryMetrics', () => {
    it('routes to /v3/memory/metrics', async () => {
        mockFetchV3({ total: 42, approved: 30, pending: 12 });
        await getMemoryMetrics('co-1');
        expect(lastFetchUrl()).toContain('/v3/memory/metrics');
    });

    it('passes company_id as query param', async () => {
        mockFetchV3({});
        await getMemoryMetrics('co-xyz');
        expect(lastFetchUrl()).toContain('company_id=co-xyz');
    });
});

// ─── 5. Memory writes ─────────────────────────────────────────────────────────

describe('learnInsight', () => {
    it('routes to /v3/memory/learn via POST', async () => {
        mockFetchV3({ status: 'committed', message: 'Stored', committed: true });
        await learnInsight({ insight: 'Revenue up 12%', category: 'finance', company_id: 'co-1' });
        expect(lastFetchUrl()).toContain('/v3/memory/learn');
        expect(lastFetchInit()).toMatchObject({ method: 'POST' });
    });

    it('unwraps v3 envelope on write response', async () => {
        const payload = { status: 'pending', message: 'Queued for review', committed: false, risk: 'low' };
        mockFetchV3(payload);
        const result = await learnInsight({ insight: 'i', category: 'c', company_id: 'co' });
        expect(result).toEqual(payload);
        expect(result).not.toHaveProperty('meta');
        expect(result).not.toHaveProperty('data');
    });

    it('sends insight body in POST payload', async () => {
        mockFetchV3({ status: 'committed', message: 'ok', committed: true });
        await learnInsight({ insight: 'Test insight', category: 'ops', auto_commit: true, company_id: 'co-1' });
        const body = JSON.parse(lastFetchInit().body as string);
        expect(body).toMatchObject({ insight: 'Test insight', category: 'ops', auto_commit: true, company_id: 'co-1' });
    });
});

describe('approveMemoryItem', () => {
    it('routes to /v3/memory/approve/{id} via POST', async () => {
        mockFetchV3({ success: true });
        await approveMemoryItem(42, 'co-1');
        expect(lastFetchUrl()).toContain('/v3/memory/approve/42');
        expect(lastFetchInit()).toMatchObject({ method: 'POST' });
    });

    it('includes company_id query param', async () => {
        mockFetchV3({ success: true });
        await approveMemoryItem('item-99', 'company-abc');
        expect(lastFetchUrl()).toContain('company_id=company-abc');
    });

    it('unwraps v3 envelope on approve response', async () => {
        mockFetchV3({ success: true });
        const result = await approveMemoryItem(1, 'co');
        expect(result).toEqual({ success: true });
        expect(result).not.toHaveProperty('meta');
    });

    it('throws when company_id is empty', async () => {
        await expect(approveMemoryItem(1, '')).rejects.toThrow('Memory API requires company_id');
    });
});

describe('rejectMemoryItem', () => {
    it('routes to /v3/memory/reject/{id} via POST', async () => {
        mockFetchV3({ success: true });
        await rejectMemoryItem('item-7', 'co-2');
        expect(lastFetchUrl()).toContain('/v3/memory/reject/item-7');
        expect(lastFetchInit()).toMatchObject({ method: 'POST' });
    });

    it('includes company_id query param', async () => {
        mockFetchV3({ success: true });
        await rejectMemoryItem(5, 'my-co');
        expect(lastFetchUrl()).toContain('company_id=my-co');
    });

    it('throws when company_id is empty', async () => {
        await expect(rejectMemoryItem('x', '')).rejects.toThrow('Memory API requires company_id');
    });
});

// ─── 6. v1 paths that must NOT change ────────────────────────────────────────

describe('v1 paths unchanged — auth, CRUD, tree', () => {
    it('authLogin uses /v1/auth/login (skipAuth = no token needed)', async () => {
        mockFetchRaw({ token: 'tok', user_id: 'u1', role: 'member', tenant_id: 't1' });
        await authLogin({ email: 'x@x.com', password: 'pw' });
        expect(lastFetchUrl()).toContain('/v1/auth/login');
    });
});

// ─── 7. Already-migrated list endpoints (regression guard) ───────────────────

describe('previously-migrated v3 list endpoints (regression guard)', () => {
    it('fetchDepartments uses /v3/departments', async () => {
        mockFetchRaw([]);
        await fetchDepartments('co-1');
        expect(lastFetchUrl()).toContain('/v3/departments');
    });

    it('fetchSpaces uses /v3/spaces', async () => {
        mockFetchRaw([]);
        await fetchSpaces('dept-1');
        expect(lastFetchUrl()).toContain('/v3/spaces');
    });
});

// ─── 8. Folder context (breadcrumb) ──────────────────────────────────────────

describe('fetchFolderContext', () => {
    it('routes to /v3/folders/{id}/context', async () => {
        mockFetchV3({
            scope: 'folder',
            folder: { id: 'f1', name: 'Invoices' },
            path: {
                company: { id: 'c1', name: 'Acme' },
                department: { id: 'd1', name: 'Sales' },
                space: { id: 's1', name: 'Shared Files' },
                breadcrumbs: [{ id: 'f1', name: 'Invoices' }],
            },
            counts: { nodes: 5, subfolders: 2 },
        });
        await fetchFolderContext('f1');
        expect(lastFetchUrl()).toContain('/v3/folders/f1/context');
    });

    it('returns null on error (isOptional)', async () => {
        mockFetchError(404);
        const result = await fetchFolderContext('nonexistent');
        expect(result).toBeNull();
    });

    it('unwraps v3 envelope', async () => {
        const ctx = {
            scope: 'folder',
            folder: { id: 'f2', name: 'Q1' },
            path: { company: null, department: null, space: null, breadcrumbs: [] },
            counts: { nodes: 0, subfolders: 0 },
        };
        mockFetchV3(ctx);
        const result = await fetchFolderContext('f2');
        expect(result).toEqual(ctx);
        expect(result).not.toHaveProperty('meta');
        expect(result).not.toHaveProperty('data');
    });
});

// ─── 9. Admin user management (v3) ───────────────────────────────────────────

describe('fetchAdminUsers', () => {
    it('routes to /v3/team/admin/users with include_inactive=true', async () => {
        mockFetchV3([]);
        await fetchAdminUsers(true);
        expect(lastFetchUrl()).toContain('/v3/team/admin/users');
        expect(lastFetchUrl()).toContain('include_inactive=true');
    });

    it('returns [] on error (isOptional)', async () => {
        mockFetchError(403);
        const result = await fetchAdminUsers();
        expect(result).toEqual([]);
    });

    it('normalizes object payloads with users[] to array', async () => {
        mockFetchRaw({ users: [{ user_id: 'u-1', email: 'x@test.dev', role: 'member', is_active: true }] });
        const result = await fetchAdminUsers();
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ user_id: 'u-1' });
    });
});

describe('patchAdminUser', () => {
    it('routes to /v3/team/admin/users/{id} via PATCH', async () => {
        mockFetchV3({ user_id: 'u1', role: 'admin', is_active: true });
        await patchAdminUser('u1', { role: 'admin' });
        expect(lastFetchUrl()).toContain('/v3/team/admin/users/u1');
        expect(lastFetchInit().method).toBe('PATCH');
    });

    it('sends patch body', async () => {
        mockFetchV3({});
        await patchAdminUser('u2', { is_active: false });
        const body = JSON.parse(lastFetchInit().body as string);
        expect(body).toMatchObject({ is_active: false });
    });
});

describe('patchUserCompanyBinding', () => {
    it('routes to /v3/team/admin/users/{id}/company-binding via PATCH', async () => {
        mockFetchV3({ success: true });
        await patchUserCompanyBinding('u1', 'co-abc');
        expect(lastFetchUrl()).toContain('/v3/team/admin/users/u1/company-binding');
        expect(lastFetchInit().method).toBe('PATCH');
    });

    it('sends default_company_id in body', async () => {
        mockFetchV3({ success: true });
        await patchUserCompanyBinding('u3', 'my-company');
        const body = JSON.parse(lastFetchInit().body as string);
        expect(body).toMatchObject({ default_company_id: 'my-company' });
    });
});
