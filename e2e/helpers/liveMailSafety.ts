/** Guard for the destructive reset in the disposable local mail E2E. */
export function assertLocalMailTarget(value: string | undefined, label: string) {
  if (!value) throw new Error(label + ' must be configured');
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error(label + ' must be a plain loopback HTTP origin');
  }
}

export function assertDisposableMailRun(core: string, ui: string | undefined, consent: string | undefined) {
  if (consent !== 'disposable-local') {
    throw new Error('Set OS_LIVE_TEST_SCOPE=disposable-local only for a disposable CORE database and test account');
  }
  assertLocalMailTarget(core, 'CORE');
  assertLocalMailTarget(ui, 'UI');
}
