/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

jest.mock('@/lib/api/coreReachability', () => ({ fetchCoreUpstream: jest.fn() }));
jest.mock('next-auth/jwt', () => ({ getToken: jest.fn().mockResolvedValue(null) }));

import { middleware } from '@/middleware';

const ORIGINAL_ENV = { ...process.env };
const req = (host: string) => new NextRequest(`http://${host}/os`);

describe('middleware: /os local preview', () => {
  afterEach(() => { process.env = { ...ORIGINAL_ENV }; });

  it('redirects /os to login without a session by default', async () => {
    delete process.env.NEXT_PUBLIC_OS_PREVIEW;
    const res = await middleware(req('localhost:3000'));
    expect(res.status).toBe(307);
  });

  it('allows /os without session only on localhost with NEXT_PUBLIC_OS_PREVIEW=local', async () => {
    process.env.NEXT_PUBLIC_OS_PREVIEW = 'local';
    expect((await middleware(req('localhost:3000'))).status).toBe(200);
    expect((await middleware(req('hq.saimor.world'))).status).toBe(307);
  });
});
