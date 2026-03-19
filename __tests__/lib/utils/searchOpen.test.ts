// __tests__/lib/utils/searchOpen.test.ts
import { mapRawSearchResult, getSearchResultSubtitle, resolveSearchResults } from '@/lib/utils/searchOpen';
import { searchGlobal, searchSemantic } from '@/lib/api/coreClient';

// Mock all imports that searchOpen.ts evaluates at module load time.
// Only mapRawSearchResult and getSearchResultSubtitle are pure — they
// need no mock invocations, but the module must be importable cleanly.
jest.mock('@/lib/api/coreClient', () => ({
    corePost: jest.fn(),
    fetchNodeDetails: jest.fn(),
    searchGlobal: jest.fn(),
    searchSemantic: jest.fn(),
}));
jest.mock('@/lib/utils/moraExplanation', () => ({
    dispatchWorkSessionPlan: jest.fn(),
}));
jest.mock('@/lib/store/workSessionStore', () => ({
    useWorkSessionStore: Object.assign(
        (selector: (s: any) => unknown) => selector({ activePlanId: null, activeSessionId: null }),
        { getState: () => ({ activePlanId: null, activeSessionId: null }) },
    ),
}));

describe('mapRawSearchResult — scope_path priority', () => {
    it('prefers scope_path over path for the path field', () => {
        const raw = { id: 'n1', type: 'node', title: 'File', scope_path: '/dept/space/folder/file', path: '/old/path' };
        const result = mapRawSearchResult(raw)!;
        expect(result.path).toBe('/dept/space/folder/file');
    });

    it('prefers scope_path over path for the subtitle field', () => {
        const raw = { id: 'n1', type: 'node', title: 'File', scope_path: '/dept/space/folder/file', path: '/old/path' };
        const result = mapRawSearchResult(raw)!;
        expect(result.subtitle).toBe('/dept/space/folder/file');
    });

    it('falls back to path when scope_path is absent', () => {
        const raw = { id: 'n1', type: 'node', title: 'File', path: '/some/path' };
        const result = mapRawSearchResult(raw)!;
        expect(result.path).toBe('/some/path');
        expect(result.subtitle).toBe('/some/path');
    });

    it('preserves score from raw so semantic results retain relevance', () => {
        const raw = { id: 'n1', type: 'node', title: 'File', score: 0.87 };
        const result = mapRawSearchResult(raw)!;
        expect(result.score).toBe(0.87);
    });

    it('returns null when id cannot be resolved', () => {
        expect(mapRawSearchResult({})).toBeNull();
    });
});

const mockSearchGlobal = searchGlobal as jest.Mock;
const mockSearchSemantic = searchSemantic as jest.Mock;

describe('resolveSearchResults — semantic normalization', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSearchGlobal.mockResolvedValue({ results: [] });
    });

    it('uses top-level scope_path as path and subtitle for semantic results', async () => {
        mockSearchSemantic.mockResolvedValue([{
            node_id: 'n1',
            score: 0.9,
            content: 'some long content preview that should not appear',
            scope_path: '/Acme/Sales/Proposals/Q4.docx',
            folder_id: 'f-top',
            company_id: 'c1',
            department_id: 'd1',
            space_id: 's1',
            metadata: { title: 'Q4 Proposal', folder_id: 'f-meta', space_id: 's-meta' },
        }]);
        const results = await resolveSearchResults('proposals', { companyId: 'c1' });
        expect(results).toHaveLength(1);
        expect(results[0].path).toBe('/Acme/Sales/Proposals/Q4.docx');
        expect(results[0].subtitle).toBe('/Acme/Sales/Proposals/Q4.docx');
    });

    it('subtitle does not contain content preview when scope_path present', async () => {
        mockSearchSemantic.mockResolvedValue([{
            node_id: 'n2',
            score: 0.8,
            content: 'THIS CONTENT SHOULD NOT BE IN SUBTITLE',
            scope_path: '/folder/file.txt',
            metadata: { title: 'File' },
        }]);
        const results = await resolveSearchResults('file', { companyId: 'c1' });
        expect(results[0].subtitle).not.toContain('THIS CONTENT SHOULD NOT BE IN SUBTITLE');
    });

    it('prefers top-level folder_id over metadata.folder_id', async () => {
        mockSearchSemantic.mockResolvedValue([{
            node_id: 'n3',
            score: 0.7,
            content: '',
            folder_id: 'top-folder-id',
            metadata: { title: 'Doc', folder_id: 'meta-folder-id' },
        }]);
        const results = await resolveSearchResults('doc', { companyId: 'c1' });
        expect(results[0].folderId).toBe('top-folder-id');
    });

    it('falls back to metadata.folder_id when top-level folder_id absent', async () => {
        mockSearchSemantic.mockResolvedValue([{
            node_id: 'n4',
            score: 0.6,
            content: '',
            metadata: { title: 'Doc', folder_id: 'meta-only-folder' },
        }]);
        const results = await resolveSearchResults('doc', { companyId: 'c1' });
        expect(results[0].folderId).toBe('meta-only-folder');
    });

    it('extracts top-level company_id, department_id, space_id', async () => {
        mockSearchSemantic.mockResolvedValue([{
            node_id: 'n5',
            score: 0.75,
            content: '',
            company_id: 'c-top',
            department_id: 'd-top',
            space_id: 's-top',
            metadata: { title: 'Doc', space_id: 's-meta' },
        }]);
        const results = await resolveSearchResults('doc', { companyId: 'c1' });
        expect(results[0].companyId).toBe('c-top');
        expect(results[0].departmentId).toBe('d-top');
        expect(results[0].spaceId).toBe('s-top');
    });
});
