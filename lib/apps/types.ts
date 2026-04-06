// ─── Navigation ─────────────────────────────────────────────────────────────

export interface NavigationTarget {
  type: 'pane' | 'url' | 'node';
  id?: string;
  data?: Record<string, unknown>;
}

// ─── App Props ───────────────────────────────────────────────────────────────

/**
 * Standard props every app receives from the pane adapter.
 * Stable across Option B (lazy import) and Option C (iframe).
 * paneId is required so apps can call removePane/focusPane on themselves.
 */
export interface AppProps {
  paneId: string;
  initialData?: Record<string, unknown>;
  onClose?: () => void;
  onNavigate?: (target: NavigationTarget) => void;
}

// ─── App Manifest ────────────────────────────────────────────────────────────

export type AppCategory =
  | 'core'          // Finder, Document, Notes
  | 'intelligence'  // Scanner, Search, Chat, Timeline
  | 'workspace'     // Calendar, Tasks, WorkSession
  | 'people'        // Team, Users
  | 'system'        // Terminal, Settings
  | 'creative';     // Canvas

export type AppColor =
  | 'blue' | 'purple' | 'green' | 'orange'
  | 'rose' | 'teal' | 'amber' | 'indigo' | 'slate';

export interface AppManifest {
  id: string;
  name: string;
  description: string;
  /** Lucide icon name, e.g. 'Folder', 'MessageCircle' */
  icon: string;
  color: AppColor;
  category: AppCategory;
  defaultSize: { width: number; height: number };
  /** Only one instance at a time. */
  singleton?: boolean;
  /** Hide from AppLibrary for non-matching roles. */
  requiresRole?: ('owner' | 'admin' | 'member')[];
  /** Shows "NEW" badge in AppLibrary. */
  isNew?: boolean;
}
