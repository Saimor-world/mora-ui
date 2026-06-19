import { buildNightwatchGlanceSuggestions } from '@/lib/nightwatch/glanceSuggestions';
import type { NightwatchIncidentItem } from '@/lib/openflow/nightwatch';
import type { NightwatchMonitorItem } from '@/lib/api/nightwatchClient';

const inc = (partial: Partial<NightwatchIncidentItem> & { id: string }): NightwatchIncidentItem => partial;

describe('buildNightwatchGlanceSuggestions', () => {
    it('prioritizes critical incidents', () => {
        const suggestions = buildNightwatchGlanceSuggestions(
            [inc({ id: '1', title: 'API down', severity: 'critical', status: 'open' })],
            [],
        );
        expect(suggestions[0]?.label).toBe('API down');
        expect(suggestions[0]?.tone).toBe('alert');
    });

    it('flags down monitors by host match', () => {
        const suggestions = buildNightwatchGlanceSuggestions(
            [inc({ id: '1', host: 'core', severity: 'critical', status: 'open' })],
            [{ id: 'm1', name: 'CORE', host: 'core', target_type: 'container' }],
        );
        expect(suggestions.some((s) => s.label.includes('CORE'))).toBe(true);
    });

    it('uses monitor status when provided', () => {
        const suggestions = buildNightwatchGlanceSuggestions(
            [],
            [{ id: 'm1', name: 'Redis', status: 'down', target_type: 'container' }],
        );
        expect(suggestions.some((s) => s.label.includes('Redis'))).toBe(true);
    });

    it('reports calm state when nothing is wrong', () => {
        const suggestions = buildNightwatchGlanceSuggestions(
            [],
            [{ id: 'm1', name: 'API', status: 'ok', target_type: 'endpoint' }],
        );
        expect(suggestions[0]?.label).toMatch(/Alle 1 Monitore online/);
        expect(suggestions[0]?.tone).toBe('ok');
    });

    it('detects recurring hosts within 7 days', () => {
        const now = new Date().toISOString();
        const suggestions = buildNightwatchGlanceSuggestions(
            [
                inc({ id: '1', host: 'db.internal', severity: 'warning', status: 'resolved', detected_at: now }),
                inc({ id: '2', host: 'db.internal', severity: 'warning', status: 'open', detected_at: now }),
            ],
            [],
        );
        expect(suggestions.some((s) => s.label.includes('Wiederkehrend'))).toBe(true);
    });
});
