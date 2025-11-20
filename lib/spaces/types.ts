/**
 * Multi-Space Platform Types
 *
 * Core type definitions for Môra's multi-space architecture
 * Each space is an isolated knowledge graph with its own sources
 */

export type SpaceSourceType =
  | 'filesystem'
  | 'notion'
  | 'github'
  | 'gmail'
  | 'slack'
  | 'email'
  | 'custom';

export interface SpaceSource {
  id: string; // "src_filesystem_acme"
  type: SpaceSourceType;
  name: string; // "Acme Documents"

  // Source-specific configuration
  config: Record<string, unknown>;

  // State
  enabled: boolean;
  lastSync: Date | null;
  objectCount: number;

  // Metadata
  created: Date;
  updated: Date;
}

export interface SpaceBranding {
  // Logo
  logo?: string; // URL, data URI, or emoji

  // Colors (hex codes)
  primaryColor?: string; // #FF6B35
  secondaryColor?: string; // #004E89

  // Theme
  theme?: 'light' | 'dark' | 'auto';

  // Custom background (advanced)
  background?: {
    type: 'gradient' | 'image' | 'solid';
    value: string; // CSS value
  };
}

export interface SpaceSettings {
  // Sync
  autoSync: boolean;
  syncInterval?: number; // minutes

  // Notifications
  notifications: boolean;
  notifyOnNewObjects?: boolean;
  notifyOnSyncErrors?: boolean;

  // Privacy
  shareable: boolean; // Can be shared with others (future)
  public: boolean; // Public space (future)
}

export interface Space {
  id: string; // "space_acme_corp"
  name: string; // "Acme Corp"
  description?: string;
  icon: string; // "🏢" or emoji

  // Branding (optional)
  branding?: SpaceBranding;

  // Connected data sources
  sources: SpaceSource[];

  // Settings
  settings: SpaceSettings;

  // Stats
  stats: {
    objectCount: number;
    lastSync: Date | null;
    totalSize?: number; // bytes
  };

  // Metadata
  created: Date;
  updated: Date;

  // Owner (for future multi-user support)
  owner?: string; // User ID
}

export interface CreateSpaceInput {
  name: string;
  description?: string;
  icon?: string;
  branding?: Partial<SpaceBranding>;
  settings?: Partial<SpaceSettings>;
}

export interface UpdateSpaceInput {
  name?: string;
  description?: string;
  icon?: string;
  branding?: Partial<SpaceBranding>;
  settings?: Partial<SpaceSettings>;
}

export interface SpacePermission {
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';

  permissions: {
    read: boolean;
    write: boolean;
    delete: boolean;
    invite: boolean;
    manageSettings: boolean;
    manageSources: boolean;
  };

  granted: Date;
}

// Default settings for new spaces
export const DEFAULT_SPACE_SETTINGS: SpaceSettings = {
  autoSync: true,
  syncInterval: 60, // 60 minutes
  notifications: true,
  notifyOnNewObjects: true,
  notifyOnSyncErrors: true,
  shareable: false,
  public: false,
};

// Default branding
export const DEFAULT_SPACE_BRANDING: SpaceBranding = {
  theme: 'auto',
};

// Space icons collection
export const SPACE_ICONS = [
  '🏢', '🏭', '🏪', '🏦', '🏛️', // Buildings
  '🚀', '⚙️', '💼', '📊', '📈', // Business
  '👤', '👥', '🤝', '💡', '🎯', // People & Ideas
  '📚', '📖', '📝', '✍️', '🗂️', // Documents
  '🎨', '🎭', '🎪', '🎬', '🎮', // Creative
  '🌳', '🌿', '🍄', '🌱', '🌸', // Nature
  '🔬', '🔭', '🧪', '🧬', '⚗️', // Science
  '💻', '🖥️', '⌨️', '🖱️', '📱', // Tech
] as const;
