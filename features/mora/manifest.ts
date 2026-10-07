import { Sparkles } from 'lucide-react';
import type { FeatureManifest } from '../types';

export const moraManifest: FeatureManifest = {
  id: 'mora',
  title: 'MÔRA',
  description: 'Fragen, verstehen, vorschlagen lassen – du bestätigst.',
  icon: Sparkles,
  slot: 'primary',
  order: 20,
  visibility: 'nav',
  mobile: 'bar',
  load: () => import('./index'),
  mora: {
    contextLabel: 'MÔRA',
    suggestions: ['Was weißt du über mein Unternehmen?', 'Welche Quellen sind verbunden?', 'Was hat sich seit gestern verändert?'],
  },
  legacyApps: ['chat'],
  keywords: ['mora', 'chat', 'assistent', 'fragen', 'ki'],
};
