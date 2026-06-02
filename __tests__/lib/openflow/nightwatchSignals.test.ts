import { nightwatchIncidentsToSignals } from '@/lib/openflow/nightwatch';

const inc = (over: any = {}) => ({
  id: 'n1', title: 'Domain down', summary: 'HTTP 502', severity: 'critical',
  status: 'open', host: 'saimor.world', detected_at: '2026-06-02T10:00:00Z', ...over,
});

describe('nightwatchIncidentsToSignals', () => {
  it('maps an incident to a server signal with an open-pane action', () => {
    const [s] = nightwatchIncidentsToSignals([inc()]);
    expect(s.id).toBe('nightwatch-n1');
    expect(s.source).toBe('server');
    expect(s.title).toBe('Domain down');
    expect(s.summary).toBe('HTTP 502');
    expect(s.priority).toBe('urgent');          // critical → urgent (via status.ts)
    expect(s.trustScope).toBe('organization');
    expect(s.relatedNodeIds).toEqual(['n1']);
    expect(s.occurredAt).toBe('2026-06-02T10:00:00Z');
    const a = s.suggestedActions[0];
    expect(a.kind).toBe('open_pane');
    expect(a.paneData).toEqual({ nodeId: 'n1' });
  });

  it('maps severity bands via the central status logic', () => {
    expect(nightwatchIncidentsToSignals([inc({ severity: 'warning' })])[0].priority).toBe('high');
    expect(nightwatchIncidentsToSignals([inc({ severity: 'info' })])[0].priority).toBe('normal');
    expect(nightwatchIncidentsToSignals([inc({ severity: undefined })])[0].priority).toBe('normal');
  });

  it('excludes resolved / dismissed / closed incidents', () => {
    expect(nightwatchIncidentsToSignals([inc({ status: 'resolved' })])).toEqual([]);
    expect(nightwatchIncidentsToSignals([inc({ status: 'dismissed' })])).toEqual([]);
    expect(nightwatchIncidentsToSignals([inc({ status: 'closed' })])).toEqual([]);
  });

  it('falls back for missing fields and never invents a repair action', () => {
    const [s] = nightwatchIncidentsToSignals([{ id: 'n2', host: 'x.de' } as any]);
    expect(s.title).toBeTruthy();
    expect(s.summary).toBe('x.de');           // falls back to host
    expect(s.priority).toBe('normal');         // no severity → normal
    expect(s.suggestedActions).toHaveLength(1); // only "open", no fake repair
    expect(s.suggestedActions[0].kind).toBe('open_pane');
  });

  it('handles empty / nullish input', () => {
    expect(nightwatchIncidentsToSignals([])).toEqual([]);
    expect(nightwatchIncidentsToSignals(undefined as any)).toEqual([]);
  });
});
