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
    suggestions: ['Zeig mir Management', 'Was gibt es Neues?', 'Was läuft in HR & Culture?', 'Hilf mir beim Organisieren', 'Was weißt du über mein Unternehmen?'],
  },
  legacyApps: ['chat'],
  keywords: ['mora', 'chat', 'assistent', 'fragen', 'ki'],
};
