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
    suggestions: ['Was steht heute an?', 'Wer kommt als Nächstes?', 'Was ist noch offen?', 'Was gibt es Neues?'],
  },
  legacyApps: ['chat'],
  keywords: ['mora', 'chat', 'assistent', 'fragen', 'ki'],
};
