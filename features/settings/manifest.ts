import { Settings2 } from 'lucide-react';
import type { FeatureManifest } from '../types';

export const settingsManifest: FeatureManifest = {
  id: 'settings',
  title: 'Einstellungen',
  description: 'Konto, Identität, Quellen, Berechtigungen, System.',
  icon: Settings2,
  slot: 'primary',
  order: 60,
  visibility: 'nav',
  mobile: 'more',
  load: () => import('./index'),
  mora: {
    contextLabel: 'Einstellungen',
    suggestions: ['Welche Quellen sind angedockt?', 'Welche Rechte habe ich?'],
  },
  legacyApps: ['settings', 'integrations'],
  keywords: ['settings', 'konto', 'account', 'verbindungen', 'integrations', 'rechte', 'system'],
};
