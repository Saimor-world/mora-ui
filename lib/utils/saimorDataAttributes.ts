/// UI MASTER DOCUMENTATION
/// Component Data Attributes for AI Agent Readability

/**
 * SAIMÔR UI Components sind mit data-saimor Attributen ausgestattet,
 * um Machine-Readable identifizierbar zu sein.
 * 
 * Beispiel:
 * <div data-saimor="folder-item" data-folder-id="abc123">
 *   <div data-saimor="folder-name">My Folder</div>
 * </div>
 */

export const SAIMOR_DATA_ATTRIBUTES = {
    // Core Components
    CORE_VIEW: 'core-view',
    DEPARTMENT_VIEW: 'department-view',
    SPACE_VIEW: 'space-view',
    FOLDER_VIEW: 'folder-view',

    // Items
    DEPARTMENT_ITEM: 'department-item',
    SPACE_ITEM: 'space-item',
    FOLDER_ITEM: 'folder-item',
    NODE_ITEM: 'node-item',

    // Modals & Overlays
    FOLDER_QUICK_VIEW: 'folder-quick-view',
    DOCUMENT_VIEWER: 'document-viewer',
    CREATE_MODAL: 'create-modal',

    // Actions
    ADD_BUTTON: 'add-button',
    MORA_SCAN_BUTTON: 'mora-scan-button',
    UPLOAD_BUTTON: 'upload-button',
    BACK_BUTTON: 'back-button',
    CLOSE_BUTTON: 'close-button',

    // Intelligence
    INTELLIGENCE_PANEL: 'intelligence-panel',
    SYNTHESIS_DATA: 'synthesis-data',
    EVENT_ITEM: 'event-item',
    RISK_ITEM: 'risk-item',

    // View Modes
    MYCELIUM_VIEW: 'mycelium-view',
    GRID_VIEW: 'grid-view',
    LIST_VIEW: 'list-view',
} as const;

/**
 * Helper function to create data attributes
 */
export function saimorData(type: keyof typeof SAIMOR_DATA_ATTRIBUTES, id?: string) {
    const attrs: Record<string, string> = {
        'data-saimor': SAIMOR_DATA_ATTRIBUTES[type]
    };

    if (id) {
        attrs['data-id'] = id;
    }

    return attrs;
}
