import { fetchUserProfile } from '@/lib/api/authClient';
import { coreGet, isLocalDemoFallback } from '@/lib/api/http';

jest.mock('@/lib/api/http', () => ({
  AUTH_COOKIE: 'mora_auth_token',
  coreGet: jest.fn(), corePost: jest.fn(),
  isLocalDemoFallback: jest.fn(() => true),
  isLocalhost: jest.fn(() => true),
  readCookie: jest.fn(() => 'local_demo_fallback'),
}));

afterEach(() => jest.clearAllMocks());

it('identifies an offline local session as a synthetic demo with no owner or HQ claim', async () => {
  const profile = await fetchUserProfile();
  expect(profile.demo_mode).toBe(true);
  expect(profile.role).toBe('demo');
  expect(profile.active_company_name).toBe('Lokale Vorschau');
  expect(profile.email).toBe('preview@example.test');
  expect(profile.scope_source).toBe('local_demo_fallback');
  expect(coreGet).not.toHaveBeenCalled();
});

it('uses CORE for a real session instead of substituting preview identity', async () => {
  jest.mocked(isLocalDemoFallback).mockReturnValue(false);
  const http = jest.requireMock('@/lib/api/http');
  http.readCookie.mockReturnValue('sess_synthetic_verified');
  jest.mocked(coreGet).mockResolvedValue({ user_id: 'real-test', full_name: 'Synthetic Owner', role: 'owner', tenant_id: 'tenant-test' });
  const profile = await fetchUserProfile();
  expect(coreGet).toHaveBeenCalledWith('/v3/auth/session', expect.any(Object));
  expect(profile.user_id).toBe('real-test');
  expect(profile.role).toBe('owner');
});
