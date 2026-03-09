import {
    getProactiveSuggestions,
    triggerWorkspaceAnalysis,
    enrichContent,
    synthesizeContext,
    getCognitionStatus,
    executeAgenticLoop,
} from '@/lib/api/cognitionClient';

jest.mock('@/lib/api/coreClient', () => ({
    coreGet: jest.fn(),
    corePost: jest.fn(),
}));
import { coreGet, corePost } from '@/lib/api/coreClient';

beforeEach(() => jest.clearAllMocks());

describe('cognitionClient v3', () => {
    it('getProactiveSuggestions calls GET /v3/autonomous/suggestions', async () => {
        (coreGet as jest.Mock).mockResolvedValue({ suggestions: [] });
        await getProactiveSuggestions();
        expect(coreGet).toHaveBeenCalledWith('/v3/autonomous/suggestions', expect.anything());
    });

    it('triggerWorkspaceAnalysis calls POST /v3/autonomous/analyze', async () => {
        (corePost as jest.Mock).mockResolvedValue({ success: true });
        await triggerWorkspaceAnalysis();
        expect(corePost).toHaveBeenCalledWith('/v3/autonomous/analyze', expect.anything());
    });

    it('enrichContent calls POST /v3/autonomous/enrich', async () => {
        (corePost as jest.Mock).mockResolvedValue({ success: true });
        await enrichContent('nd-1', 'Title', 'Content');
        expect(corePost).toHaveBeenCalledWith('/v3/autonomous/enrich', expect.anything());
    });

    it('synthesizeContext calls POST /v3/autonomous/synthesize', async () => {
        (corePost as jest.Mock).mockResolvedValue({ success: true });
        await synthesizeContext('nd-1');
        expect(corePost).toHaveBeenCalledWith('/v3/autonomous/synthesize', expect.anything());
    });

    it('getCognitionStatus calls GET /v3/autonomous/status', async () => {
        (coreGet as jest.Mock).mockResolvedValue({ active: true, queue_length: 0, is_running: false, capabilities: [], timestamp: '' });
        await getCognitionStatus();
        expect(coreGet).toHaveBeenCalledWith('/v3/autonomous/status', expect.anything());
    });

    it('executeAgenticLoop calls POST /v3/cognition/agent', async () => {
        (corePost as jest.Mock).mockResolvedValue({ success: true, final_state: 'done', final_message: '', iterations: [], tools_executed: [], pending_confirmations: [], mode: 'auto', transparency_note: '' });
        await executeAgenticLoop('do something');
        expect(corePost).toHaveBeenCalledWith('/v3/cognition/agent', expect.anything());
    });
});
