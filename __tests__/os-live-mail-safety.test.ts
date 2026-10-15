import { assertDisposableMailRun } from '../e2e/helpers/liveMailSafety';

describe('disposable local mail E2E guard', () => {
  it.each(['http://localhost:8081', 'http://127.0.0.1:8081', 'http://[::1]:8081'])('allows explicit disposable loopback CORE %s', (core) => {
    expect(() => assertDisposableMailRun(core, 'http://localhost:3000', 'disposable-local')).not.toThrow();
  });
  it.each([
    'https://core.saimor.world', 'http://localhost.evil.test:8081', 'http://10.0.0.1:8081',
    'ftp://localhost:8081', 'http://user:pass@localhost:8081',
    'http://localhost:8081/api', 'http://localhost:8081/?target=production',
  ])('blocks nonlocal or ambiguous CORE %s', (core) => {
    expect(() => assertDisposableMailRun(core, 'http://localhost:3000', 'disposable-local')).toThrow();
  });
  it.each([undefined, '', 'true'])('blocks missing or incorrect disposable consent %s', (consent) => {
    expect(() => assertDisposableMailRun('http://localhost:8081', 'http://localhost:3000', consent)).toThrow();
  });
  it.each([undefined, 'https://mora.saimor.world', 'http://localhost.evil.test'])('blocks nonlocal or missing UI %s', (ui) => {
    expect(() => assertDisposableMailRun('http://localhost:8081', ui, 'disposable-local')).toThrow();
  });
});
