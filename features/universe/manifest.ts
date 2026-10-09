import { Orbit } from 'lucide-react';
import type { FeatureManifest } from '../types';

/**
 * Universe — a place, not a main surface. Second-level nav entry, reached from
 * the Heute card. Renders the real legacy UniverseView (components/home).
 */
export const universeManifest: FeatureManifest = {
  id: 'universe',
  title: 'Universe',
  description: 'Den Raum deines Unternehmens betreten – Bereiche, Spaces und Zusammenhänge als Landschaft.',
  icon: Orbit,
  slot: 'secondary',
  order: 80,
  visibility: 'nav',
  mobile: 'more',
  atmosphere: 'universe',
  load: () => import('./index'),
  mora: {
    contextLabel: 'Universe',
    suggestions: ['Welche Bereiche hat mein Unternehmen?', 'Wo ist gerade am meisten los?'],
  },
  keywords: ['universe', 'raum', 'spaces', 'bereiche', 'landschaft', 'karte'],
};
