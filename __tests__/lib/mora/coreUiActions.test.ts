import { executeCoreUiActions } from '@/lib/mora/coreUiActions';
import { useNavStore } from '@/lib/store/navStore';
import { usePaneStore } from '@/lib/store/paneStore';
import { MORA_PRESENCE_EVENT } from '@/lib/mora/presenceEvents';

const navigateToDepartment = jest.fn();
const navigateToSpace = jest.fn();
const navigateToFolder = jest.fn();
const openPane = jest.fn();

describe('executeCoreUiActions', () => {
    let presence: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        useNavStore.setState({ navigateToDepartment, navigateToSpace, navigateToFolder } as any);
        usePaneStore.setState({ openPane } as any);
        presence = jest.fn();
        window.addEventListener(MORA_PRESENCE_EVENT, presence);
    });

    afterEach(() => {
        window.removeEventListener(MORA_PRESENCE_EVENT, presence);
    });

    it('executes allowlisted navigation and highlight actions from CORE', () => {
        const count = executeCoreUiActions([
            { type: 'navigate_department', target_id: 'dept-1' },
            { type: 'navigate_space', target_id: 'space-1' },
            { type: 'navigate_folder', target_id: 'folder-1' },
            { type: 'highlight', target_id: 'node-1' },
        ]);

        expect(count).toBe(4);
        expect(navigateToDepartment).toHaveBeenCalledWith('dept-1');
        expect(navigateToSpace).toHaveBeenCalledWith('space-1');
        expect(navigateToFolder).toHaveBeenCalledWith('folder-1');
        expect(presence).toHaveBeenCalledTimes(1);
        expect(presence.mock.calls[0][0].detail).toEqual({ action: 'highlight', targetId: 'node-1', source: 'ai' });
    });

    it('opens only search and document panes with sanitized data', () => {
        const count = executeCoreUiActions([
            { type: 'open_pane', target_id: 'search-main', pane_type: 'search', data: { query: 'Rechnung', extra: 'x' } },
            { type: 'open_pane', target_id: 'document-n1', pane_type: 'document', data: { nodeId: 'n1' } },
            { type: 'open_pane', target_id: 'terminal-main', pane_type: 'terminal', data: {} },
            { type: 'open_pane', target_id: 'files-inbox', pane_type: 'files' },
        ]);

        expect(count).toBe(2);
        expect(openPane).toHaveBeenCalledTimes(2);
        expect(openPane.mock.calls[0][0]).toMatchObject({ type: 'search', data: { query: 'Rechnung' } });
        expect(openPane.mock.calls[0][0].data).not.toHaveProperty('extra');
        expect(openPane.mock.calls[1][0]).toMatchObject({ id: 'document-n1', type: 'document', data: { nodeId: 'n1' } });
    });

    it('ignores unknown types, missing ids and non-array input', () => {
        expect(executeCoreUiActions(undefined)).toBe(0);
        expect(executeCoreUiActions('[[MORA_ACTION:{"type":"pulse"}]]')).toBe(0);
        expect(executeCoreUiActions([
            { type: 'pulse', target_id: 'orb' },
            { type: 'pane', target_id: 'x' },
            { type: 'navigate_department', target_id: '' },
            { type: 'navigate_space' },
            null,
        ])).toBe(0);
        expect(navigateToDepartment).not.toHaveBeenCalled();
        expect(navigateToSpace).not.toHaveBeenCalled();
        expect(openPane).not.toHaveBeenCalled();
        expect(presence).not.toHaveBeenCalled();
    });

    it('caps the number of executed actions per response', () => {
        const actions = Array.from({ length: 10 }, (_, i) => ({ type: 'navigate_department', target_id: `d${i}` }));
        expect(executeCoreUiActions(actions)).toBe(5);
        expect(navigateToDepartment).toHaveBeenCalledTimes(5);
    });
});
