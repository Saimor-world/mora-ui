import { toToolTrace } from '@/lib/chat/toolTrace';

const t = (tool: string, success: boolean, params: any = {}, error?: string) => ({ tool, success, params, error });

describe('toToolTrace — mapping', () => {
  it('maps search → "Gesucht" with a safe detail', () => {
    const [s] = toToolTrace([t('search', true, { query: 'Angebote 2026' })]);
    expect(s.kind).toBe('searched');
    expect(s.label).toMatch(/Gesucht/i);
    expect(s.ok).toBe(true);
    expect(s.detail).toBe('Angebote 2026');
  });

  it('maps read/read_node/read_folder → "Gelesen"', () => {
    expect(toToolTrace([t('read_node', true)])[0].kind).toBe('read');
    expect(toToolTrace([t('read_folder', true)])[0].kind).toBe('read');
    expect(toToolTrace([t('read', true)])[0].kind).toBe('read');
  });

  it('maps work_session_plan → "Geplant"', () => {
    const [s] = toToolTrace([t('work_session_plan', true)]);
    expect(s.kind).toBe('planned');
    expect(s.label).toMatch(/Geplant/i);
  });

  it('maps create/update/move/navigate → "Gehandelt"', () => {
    for (const tool of ['create_node', 'update_node', 'create_folder', 'move_node', 'navigate']) {
      expect(toToolTrace([t(tool, true)])[0].kind).toBe('acted');
    }
  });

  it('uses name/title as the detail for actions', () => {
    expect(toToolTrace([t('create_node', true, { name: 'Kunden-Notiz' })])[0].detail).toBe('Kunden-Notiz');
  });

  it('maps unknown tools → "other" (never invents an action)', () => {
    const [s] = toToolTrace([t('mystery_tool_xyz', true)]);
    expect(s.kind).toBe('other');
    expect(s.ok).toBe(true);
  });
});

describe('toToolTrace — honesty (success/failure)', () => {
  it('shows failure as "Nicht abgeschlossen", never a green/ok step', () => {
    const [s] = toToolTrace([t('search', false, { query: 'x' }, 'boom')]);
    expect(s.kind).toBe('failed');
    expect(s.label).toMatch(/Nicht abgeschlossen/i);
    expect(s.ok).toBe(false);
  });
  it('does not leak a detail on failure', () => {
    expect(toToolTrace([t('search', false, { query: 'geheim' })])[0].detail).toBeUndefined();
  });
});

describe('toToolTrace — sanitizing (no secrets/tokens/mails)', () => {
  it('redacts e-mail addresses in the detail', () => {
    const [s] = toToolTrace([t('search', true, { query: 'schreib an chef@firma.de bitte' })]);
    expect(s.detail).not.toContain('chef@firma.de');
    expect(s.detail).toContain('[E-Mail]');
  });
  it('redacts long token-like strings', () => {
    const [s] = toToolTrace([t('search', true, { query: 'token abcdef0123456789abcdef0123' })]);
    expect(s.detail).not.toContain('abcdef0123456789abcdef0123');
    expect(s.detail).toContain('[…]');
  });
  it('truncates very long details', () => {
    const [s] = toToolTrace([t('search', true, { query: 'a'.repeat(200) })]);
    expect((s.detail || '').length).toBeLessThanOrEqual(61);
  });
  it('never exposes raw params beyond the allowlisted field', () => {
    const [s] = toToolTrace([t('search', true, { query: 'ok', secret_token: 'SHOULD_NOT_APPEAR', api_key: 'NOPE' })]);
    expect(JSON.stringify(s)).not.toContain('SHOULD_NOT_APPEAR');
    expect(JSON.stringify(s)).not.toContain('NOPE');
  });
});

describe('toToolTrace — edge cases', () => {
  it('returns an empty trace for no tools', () => {
    expect(toToolTrace([])).toEqual([]);
    expect(toToolTrace(undefined as any)).toEqual([]);
  });
});
