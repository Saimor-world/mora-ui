import type { FeatureManifest, FeatureVisibilityContext } from './types';
import { todayManifest } from './today/manifest';
import { moraManifest } from './mora/manifest';
import { financeManifest } from './finance/manifest';
import { postManifest } from './post/manifest';
import { knowledgeManifest } from './knowledge/manifest';
import { settingsManifest } from './settings/manifest';
import { labsManifest } from './labs/manifest';

/**
 * Feature registry — driven exclusively by manifests. Adding a feature means
 * adding a folder with a manifest and listing it here; the shell never changes.
 */
export const FEATURE_MANIFESTS: FeatureManifest[] = [
  todayManifest,
  moraManifest,
  financeManifest,
  postManifest,
  knowledgeManifest,
  settingsManifest,
  labsManifest,
];

export const DEFAULT_FEATURE_ID = 'today';

export function isFeatureVisible(manifest: FeatureManifest, ctx: FeatureVisibilityContext): boolean {
  if (manifest.flag && !ctx.flags.has(manifest.flag)) return false;
  if (!ctx.preview && manifest.permissions && (!ctx.role || !manifest.permissions.includes(ctx.role))) return false;
  return true;
}

export function visibleFeatures(ctx: FeatureVisibilityContext, manifests: FeatureManifest[] = FEATURE_MANIFESTS) {
  return manifests.filter((m) => isFeatureVisible(m, ctx)).sort((a, b) => a.order - b.order);
}

export function navigationModel(ctx: FeatureVisibilityContext, manifests: FeatureManifest[] = FEATURE_MANIFESTS) {
  const visible = visibleFeatures(ctx, manifests).filter((m) => m.visibility === 'nav');
  return {
    primary: visible.filter((m) => m.slot === 'primary'),
    secondary: visible.filter((m) => m.slot === 'secondary'),
    mobileBar: visible.filter((m) => m.mobile === 'bar'),
    mobileMore: visible.filter((m) => m.mobile === 'more'),
  };
}

export function getFeature(id: string, manifests: FeatureManifest[] = FEATURE_MANIFESTS): FeatureManifest | undefined {
  return manifests.find((m) => m.id === id);
}

export function resolveFeatureId(candidate: string | null | undefined, ctx: FeatureVisibilityContext): string {
  const match = candidate ? getFeature(candidate) : undefined;
  return match && isFeatureVisible(match, ctx) ? match.id : DEFAULT_FEATURE_ID;
}
