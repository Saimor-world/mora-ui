import { filterIncidentsForDepartment, incidentBelongsToDepartment } from '@/lib/openflow/departmentIncidentContext';
import type { NightwatchIncidentItem } from '@/lib/openflow/nightwatch';

const incident = (overrides: Partial<NightwatchIncidentItem> = {}): NightwatchIncidentItem => ({
  id: 'incident-1',
  title: 'API outage in Engineering',
  summary: 'api.saimor.world is unavailable',
  severity: 'critical',
  status: 'open',
  host: 'api.saimor.world',
  detected_at: '2026-06-08T08:00:00Z',
  ...overrides,
});

describe('department incident context evidence gate', () => {
  it('matches incidents with an explicit department_id', () => {
    expect(incidentBelongsToDepartment(incident({ department_id: 'dept-ops' }), 'dept-ops')).toBe(true);
  });

  it('matches incidents with an explicit affected_department_id', () => {
    expect(incidentBelongsToDepartment(incident({ affected_department_id: 'dept-ops' }), 'dept-ops')).toBe(true);
  });

  it('matches incidents whose node is under the active department in the tree', () => {
    const tree = [
      {
        id: 'dept-ops',
        type: 'department',
        children: [
          {
            id: 'space-ops',
            type: 'space',
            children: [{ id: 'incident-1', type: 'node' }],
          },
        ],
      },
    ];

    expect(incidentBelongsToDepartment(incident(), 'dept-ops', tree)).toBe(true);
  });

  it('matches incidents with related node ids under the active department in the tree', () => {
    const tree = [
      {
        id: 'dept-ops',
        type: 'department',
        children: [{ id: 'node-related', type: 'node' }],
      },
    ];

    expect(incidentBelongsToDepartment(incident({ id: 'incident-1', relatedNodeIds: ['node-related'] }), 'dept-ops', tree)).toBe(true);
  });

  it('does not use host text as department truth', () => {
    expect(incidentBelongsToDepartment(incident({ host: 'api.engineering.saimor.world' }), 'dept-engineering')).toBe(false);
  });

  it('does not use title text as department truth', () => {
    expect(incidentBelongsToDepartment(incident({ title: 'Engineering API down' }), 'dept-engineering')).toBe(false);
  });

  it('does not match without a department evidence path', () => {
    expect(incidentBelongsToDepartment(incident(), 'dept-ops', [])).toBe(false);
  });

  it('filters only incidents with evidence for the active department', () => {
    const scoped = incident({ id: 'incident-scoped', department_id: 'dept-ops' });
    const global = incident({ id: 'incident-global', host: 'api.engineering.saimor.world' });

    expect(filterIncidentsForDepartment([scoped, global], 'dept-ops').map((item) => item.id)).toEqual([
      'incident-scoped',
    ]);
  });
});
