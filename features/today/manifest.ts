import { Sun } from 'lucide-react';
import type { FeatureManifest } from '../types';

export const todayManifest: FeatureManifest = {
  id: 'today',
  title: 'Heute',
  description: 'Was heute Aufmerksamkeit braucht – ruhig zusammengeführt.',
  icon: Sun,
  slot: 'primary',
  order: 10,
  visibility: 'nav',
  mobile: 'bar',
  load: () => import('./index'),
  mora: {
    contextLabel: 'Heute',
    suggestions: ['Was ist heute wichtig?', 'Fasse meinen Tag in drei Sätzen zusammen.', 'Welche Aufgaben sind überfällig?'],
  },
  legacyApps: ['tasks', 'nightwatch'],
  keywords: ['today', 'home', 'start', 'briefing', 'tag'],
};
