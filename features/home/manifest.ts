import { Home } from 'lucide-react';
import type { FeatureManifest } from '../types';

export const homeManifest: FeatureManifest = {
  id: 'home',
  title: 'Home',
  description: 'Dein Tag auf einen Blick: was dich braucht, alles andere läuft.',
  icon: Home,
  slot: 'primary',
  order: 1,
  visibility: 'nav',
  mobile: 'bar',
  load: () => import('./index'),
  mora: {
    contextLabel: 'Home',
    suggestions: ['Was braucht mich heute?', 'Wer arbeitet heute?', 'Wie lief gestern?'],
  },
  keywords: ['home', 'start', 'morgen', 'tag', 'heute'],
};
