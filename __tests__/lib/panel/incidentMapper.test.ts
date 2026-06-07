import { mapIncidentToPanel } from '@/lib/panel/incidentMapper';

const inc = (over: any = {}) => ({
  id: 'n1', title: 'Domain down', summary: 'HTTP 502', severity: 'critical',
  status: 'open', host: 'saimor.world', detected_at: '2026-06-02T10:00:00Z', ...over,
});

describe('mapIncidentToPanel', () => {
  it('maps active incidents to verified panel with evidence', () => {
    const p = mapIncidentToPanel(inc());
    expect(p.id).toBe('panel-incident-n1');
    expect(p.type).toBe('incident_status');
    expect(p.state).toBe('verified');
    expect(p.source).toBe('nightwatch');
    expect(p.source_type).toBe('incident');
    expect(p.confidence).toBe('verified');
    expect(p.payload.title).toBe('Domain down');
    expect(p.evidence).toHaveLength(1);
    expect(p.evidence![0].status).toBe('open');
  });

  it('maps resolved incidents to placeholder state', () => {
    const p = mapIncidentToPanel(inc({ status: 'resolved' }));
    expect(p.state).toBe('placeholder');
  });

  it('sets confidence warning for non-critical incidents', () => {
    const p = mapIncidentToPanel(inc({ severity: 'warning' }));
    expect(p.confidence).toBe('warning');
  });
});
