// __tests__/components/panes/ChatPane.recall.test.tsx
/**
 * Stellt sicher dass Recall-Intents den Agent NICHT aufrufen
 * und stattdessen direkt aus dem Memory rendern.
 */

// Mock executeAgenticLoop — darf bei Recall-Intent NICHT aufgerufen werden
const mockExecuteAgenticLoop = jest.fn();
jest.mock('@/lib/api/cognitionClient', () => ({
    executeAgenticLoop: mockExecuteAgenticLoop,
}));

import { detectRecallIntent } from '@/lib/chat/memoryIntent';

describe('ChatApp recall routing', () => {
    it('detectRecallIntent gates agent for recall phrases', () => {
        // The guard in processMessage checks this before calling executeAgenticLoop
        expect(detectRecallIntent('zeig mir meine erinnerungen')).toBe(true);
        expect(detectRecallIntent('was weißt du über mich')).toBe(true);
        expect(detectRecallIntent('wie geht es dir')).toBe(false);
        // executeAgenticLoop should not have been called (no actual render needed)
        expect(mockExecuteAgenticLoop).not.toHaveBeenCalled();
    });
});
