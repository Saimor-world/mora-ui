import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { AppRole } from '@/lib/apps/types';

/**
 * Feature manifest — the only thing the OS shell knows about a feature.
 * The shell renders navigation, the command palette and MÔRA context from
 * manifests; the feature's UI is loaded lazily via `load()`.
 */
export interface FeatureSurfaceProps {
  /** Navigate to another feature (by manifest id). */
  navigate: (featureId: string) => void;
  /** Local preview without CORE (localhost + NEXT_PUBLIC_OS_PREVIEW=local only). */
  preview: boolean;
}

export type FeatureSlot = 'primary' | 'secondary';

export interface FeatureManifest {
  id: string;
  title: string;
  /** One calm sentence shown under the title and in the palette. */
  description: string;
  icon: LucideIcon;
  slot: FeatureSlot;
  order: number;
  /** Roles that may see the feature. Undefined = every authenticated role. */
  permissions?: AppRole[];
  /** Required NEXT_PUBLIC_OS_FLAGS entry. Undefined = always on. */
  flag?: string;
  /** 'nav' = visible in navigation; 'palette' = only via command palette / deep link. */
  visibility: 'nav' | 'palette';
  /** Mobile placement: in the bottom bar, or in the "Mehr" sheet. */
  mobile: 'bar' | 'more';
  /** Atmosphere of the shell while this feature is active. Default 'calm'. */
  atmosphere?: 'calm' | 'universe';
  load: () => Promise<{ default: ComponentType<FeatureSurfaceProps> }>;
  mora: {
    /** How MÔRA names the module context ("Du bist in Finance"). */
    contextLabel: string;
    /** Suggested prompts shown in MÔRA while this surface is active. */
    suggestions: string[];
  };
  /** Legacy app ids (lib/apps/appRegistry) this feature owns/embeds. */
  legacyApps?: string[];
  keywords?: string[];
}

export interface FeatureVisibilityContext {
  role: AppRole | null;
  flags: Set<string>;
  /** Local preview without session: role checks are skipped (all data reads still fail closed). */
  preview?: boolean;
}
