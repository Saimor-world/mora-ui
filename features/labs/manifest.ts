import { FlaskConical } from 'lucide-react';
import type { FeatureManifest } from '../types';

export const labsManifest: FeatureManifest = {
  id: 'labs',
  title: 'App-Center',
  description: 'Deine Werkzeuge im neuen OS: Arbeit, Zusatz-Apps und klassische Übergangsfunktionen.'
  icon: FlaskConical,
  slot: 'secondary',
  order: 90,
  visibility: 'nav',
  mobile: 'more',
  load: () => import('./index'),
  mora: {
    contextLabel: 'App-Center',
    suggestions: ['Wo finde ich meine Werkzeuge?', 'Welche Apps sind noch klassisch?'],
  },
  legacyApps: ['scanner', 'nightwatch', 'lagefeld', 'codex', 'canvas', 'grid', 'website-dossier', 'timeline', 'feeds', 'terminal', 'team', 'users', 'apps', 'work', 'tasks', 'action-center', 'work-session', 'finance'],
  keywords: ['apps', 'app-center', 'werkzeuge', 'appbibliothek', 'labs', 'system', 'legacy', 'experimente', 'scanner'],
};
