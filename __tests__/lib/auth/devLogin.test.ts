import { isDevLoginEnabled } from '@/lib/auth/devLogin';

describe('isDevLoginEnabled', () => {
  const originalEmail = process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL;
  afterEach(() => {
    if (originalEmail === undefined) delete process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL;
    else process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL = originalEmail;
  });

  it('is DISABLED outside development — even if a dev login email is configured', () => {
    // Jest runs with NODE_ENV='test'. A configured dev email must NOT enable
    // the master-login button in any non-development build (security gate).
    process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL = 'admin@example.com';
    expect(isDevLoginEnabled()).toBe(false);
  });

  it('is disabled when no dev email is set', () => {
    delete process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL;
    expect(isDevLoginEnabled()).toBe(false);
  });
});
