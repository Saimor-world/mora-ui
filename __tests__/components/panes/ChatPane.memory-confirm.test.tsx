// __tests__/components/panes/ChatPane.memory-confirm.test.tsx
import { detectMemoryIntent, extractInsightFromRequest } from '@/lib/chat/memoryIntent';

describe('memory save confirmation logic', () => {
    it('extracts insight correctly', () => {
        expect(extractInsightFromRequest('merke dir: Marius mag keine Listen')).toBe('Marius mag keine Listen');
        expect(extractInsightFromRequest('wichtig: Launch Q3')).toBe('Launch Q3');
    });
    it('detects memory save intent', () => {
        expect(detectMemoryIntent('merke dir: Marius mag keine Listen')).toBe(true);
    });
});
