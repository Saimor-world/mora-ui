import { corePost } from '@/lib/api/coreClient';
import { hasVerifiedExecutionPath, normalizeModeResult, sendModeMessage, describeFlag } from '@/lib/mora/moraModes';

jest.mock('@/lib/api/coreClient', () => ({ corePost: jest.fn() }));

describe('moraModes', () => {
    beforeEach(() => (corePost as jest.Mock).mockReset());

    it('posts bauen/recherche to /v3/chat/mode with trimmed history', async () => {
        (corePost as jest.Mock).mockResolvedValue({ mode: 'recherche', text: 'x [1]', citations: [1], sources: [{ title: 'A' }], flags: [] });
        const history = Array.from({ length: 25 }, (_, i) => ({ role: 'user' as const, content: `m${i}` }));
        const r = await sendModeMessage('recherche', 'frage', history);
        const [path, body] = (corePost as jest.Mock).mock.calls[0];
        expect(path).toBe('/v3/chat/mode');
        expect(body.mode).toBe('recherche');
        expect(body.history).toHaveLength(20);
        expect(r.sources).toHaveLength(1);
        expect(r.citations).toEqual([1]);
    });

    it('normalizes malformed payloads without inventing data', () => {
        const r = normalizeModeResult({ proposals: [{ label: 'kein id' }], flags: [1, 'no_sources'], citations: ['1', 2] }, 'bauen');
        expect(r).toEqual({ mode: 'bauen', text: '', proposals: [], citations: [2], sources: [], flags: ['no_sources'] });
        expect(normalizeModeResult(null, 'denken').proposals).toEqual([]);
    });

    it('allows approval only with a verified CORE execution path', () => {
        expect(hasVerifiedExecutionPath({ id: 'p', label: 'x', status: 'awaiting_approval', requiresConfirmation: true })).toBe(false);
        expect(hasVerifiedExecutionPath({ id: 'p', label: 'x', execution: { verified: false, endpoint: '/v3/actions/run' } })).toBe(false);
        expect(hasVerifiedExecutionPath({ id: 'p', label: 'x', execution: { verified: true, endpoint: 'https://evil' } })).toBe(false);
        expect(hasVerifiedExecutionPath({ id: 'p', label: 'x', execution: { verified: true, endpoint: '/v3/actions/run' } })).toBe(true);
    });

    it('describes missing evidence in German', () => {
        expect(describeFlag('no_sources')).toMatch(/Keine Belege/);
        expect(describeFlag('other')).toBe('Hinweis: other');
    });
});
