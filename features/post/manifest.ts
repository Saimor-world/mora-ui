import { Mail } from 'lucide-react';
import type { FeatureManifest } from '../types';

export const postManifest: FeatureManifest = {
  id: 'post',
  title: 'Post',
  description: 'Nachrichten und Termine an einem Ort.',
  icon: Mail,
  slot: 'primary',
  order: 40,
  visibility: 'nav',
  mobile: 'bar',
  load: () => import('./index'),
  mora: {
    contextLabel: 'Post',
    suggestions: ['Was ist in meinem Postfach wichtig?', 'Welche Termine habe ich heute?', 'Hilf mir, eine Antwort zu entwerfen.'],
  },
  legacyApps: ['mail', 'calendar'],
  keywords: ['mail', 'email', 'kalender', 'termine', 'calendar', 'nachrichten'],
};
