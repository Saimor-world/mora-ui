import { FlaskConical } from 'lucide-react';
import type { FeatureManifest } from '../types';

export const labsManifest: FeatureManifest = {
  id: 'labs',
  title: 'Labs & System',
  description: 'Alles Weitere – experimentell, systemnah oder klassisch. Nichts ist verloren.',
  icon: FlaskConical,
  slot: 'secondary',
  order: 90,
  visibility: 'nav',
  mobile: 'more',
  load: () => import('./index'),
  mora: {
    contextLabel: 'Labs & System',
    suggestions: ['Welche Labor-Apps gibt es?', 'Wo finde ich die alte Oberfläche?'],
  },
  legacyApps: ['scanner', 'nightwatch', 'lagefeld', 'codex', 'canvas', 'grid', 'website-dossier', 'timeline', 'feeds', 'terminal', 'team', 'users', 'apps', 'work', 'tasks', 'action-center', 'work-session', 'finance'],
  keywords: ['labs', 'system', 'legacy', 'alt', 'experimente', 'terminal', 'scanner', 'nightwatch'],
};
