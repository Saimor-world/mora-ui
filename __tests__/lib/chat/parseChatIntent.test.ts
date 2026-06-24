import { parseChatIntent } from '@/lib/chat/parseChatIntent';

const departments = [{ id: 'dept-ops', name: 'Operations' }];

describe('parseChatIntent', () => {
    it('keeps workspace-awareness questions in chat', () => {
        expect(parseChatIntent('Ich habe jetzt gerade Nightwatch geöffnet, siehst du das?', departments))
            .toEqual({ type: 'chat' });
    });

    it('recognizes an explicit open command', () => {
        expect(parseChatIntent('Öffne Nightwatch', departments))
            .toEqual({ type: 'search', target: 'Nightwatch' });
    });

    it('navigates to an explicitly named department', () => {
        expect(parseChatIntent('Zeig mir Operations', departments))
            .toEqual({ type: 'navigate', target: 'dept-ops' });
    });
});
