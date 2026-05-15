import {
    detectMemoryIntent,
    detectRecallIntent,
    extractInsightFromRequest,
} from '@/lib/chat/memoryIntent';

describe('detectMemoryIntent (save)', () => {
    it('detects German save keywords', () => {
        expect(detectMemoryIntent('merke dir das')).toBe(true);
        expect(detectMemoryIntent('wichtig: wir launchen Q3')).toBe(true);
        expect(detectMemoryIntent('vergiss nicht den Termin')).toBe(true);
    });
    it('does not flag normal chat', () => {
        expect(detectMemoryIntent('wie geht es dir')).toBe(false);
        expect(detectMemoryIntent('zeig mir meine erinnerungen')).toBe(false);
    });
});

describe('detectRecallIntent', () => {
    it('detects German recall keywords', () => {
        expect(detectRecallIntent('zeig mir meine erinnerungen')).toBe(true);
        expect(detectRecallIntent('was weißt du über mich')).toBe(true);
        expect(detectRecallIntent('erinnerst du dich daran')).toBe(true);
        expect(detectRecallIntent('was hast du gespeichert')).toBe(true);
        expect(detectRecallIntent('zeige mir dein gedächtnis')).toBe(true);
    });
    it('detects English recall keywords', () => {
        expect(detectRecallIntent('show me my memories')).toBe(true);
        expect(detectRecallIntent('what do you remember')).toBe(true);
    });
    it('does not flag save intents as recall', () => {
        expect(detectRecallIntent('merke dir das')).toBe(false);
        expect(detectRecallIntent('wie geht es dir')).toBe(false);
    });
});
