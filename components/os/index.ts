/**
 * SAIMOR OS Components
 * ====================
 *
 * Central export for all OS-related components.
 *
 * STRUCTURE:
 * - shell/    -> MoraShell (main app shell)
 * - NotificationCenter -> System notifications
 * - FocusMode -> Focus/DND sessions
 * - QuickPreview -> Space-bar file preview
 */

export { MoraShell } from './shell';

// Notification System
export {
    NotificationCenter,
    useNotificationStore,
    notify,
} from './NotificationCenter';

// Focus Mode / DND
export {
    FocusModeWidget,
    FocusModePanel,
    useFocusModeStore,
    useFocusModeShortcut,
} from './FocusMode';

// Quick Preview / Quick Look
export {
    QuickPreview,
    useQuickPreviewStore,
    useQuickPreview,
} from './QuickPreview';

// Window Snapping
export { SnapPreview } from './SnapPreview';

// Memory Sidebar
export {
    MemorySidebar,
    useMemorySidebarStore,
    useMemorySidebarShortcut,
} from './MemorySidebar';
