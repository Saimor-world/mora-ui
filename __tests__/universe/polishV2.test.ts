import { approvalEndpoint, canApprove, readOutcome, approveLabel } from '@/lib/universe/approve';
import { answerBox, easeApart } from '@/lib/universe/answerLayout';
import { buildOrganicUniverseLayout } from '@/lib/universe/layout';
import { homeLayerFor } from '@/lib/universe/motion';

jest.mock('@/lib/api/coreClient', () => ({ corePost: jest.fn() }));

describe('Freigabe', () => {
  it('bleibt aus ohne verifizierten Weg', () => {
    expect(canApprove({ id: 'uv_abc123' })).toBe(false);
    expect(canApprove({ id: 'x', execution: { verified: false, endpoint: '/v3/actions/confirm' } })).toBe(false);
  });
  it('nutzt nur echte CORE-Endpunkte', () => {
    expect(approvalEndpoint({ id: 'uv_abc123', execution: { verified: true } })).toBe('/v3/universe/proposals/uv_abc123/approve');
    expect(approvalEndpoint({ id: 'p', confirm_token: 't', execution: { verified: true } })).toBe('/v3/actions/confirm');
    expect(approvalEndpoint({ id: 'p', execution: { verified: true, endpoint: '/v3/evil' } })).toBeNull();
  });
  it('liest den Ausgang ehrlich', () => {
    expect(readOutcome({ status: 'done', result: { ok: true, verified: true } })).toEqual({ state: 'done', verified: true });
    expect(readOutcome({ status: 'failed', result: { ok: false, error: 'Kein Token' } })).toEqual({ state: 'failed', detail: 'Kein Token' });
    expect(readOutcome({ status: 'pending' }).state).toBe('failed');
    expect(approveLabel({ state: 'done', verified: false })).toMatch(/nicht bestätigt/);
  });
});

describe('Antwort überdeckt keine Planeten', () => {
  it('ist schmal und Planeten im Korridor weichen aus', () => {
    const b = answerBox(1440, 720, 441);
    expect(b.width).toBeLessThanOrEqual(380);
    const dx = easeApart(800, 60, 720, b.width);
    expect(800 + dx - 60).toBeGreaterThanOrEqual(720 + b.width / 2 + 28);
    expect(easeApart(1200, 60, 720, b.width)).toBe(0);
    expect(easeApart(640, 60, 720, b.width)).toBeLessThan(0);
  });
});

describe('Feld bleibt ruhig', () => {
  it('Positionen hängen ohne Metriken nur an der Struktur', () => {
    const d = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }];
    const p1 = buildOrganicUniverseLayout(d, {});
    const p2 = buildOrganicUniverseLayout(d.map((x) => ({ ...x })), {});
    expect(p1.map((p: any) => [p.x, p.y])).toEqual(p2.map((p: any) => [p.x, p.y]));
  });
});

describe('Rückkehr aus Home', () => {
  it('ist ein reiner Crossfade ohne Weichzeichner', () => {
    expect(homeLayerFor('far', false).filter).toBe('blur(0px)');
  });
});
