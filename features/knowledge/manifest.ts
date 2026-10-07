import { Library } from 'lucide-react';
import type { FeatureManifest } from '../types';

export const knowledgeManifest: FeatureManifest = {
  id: 'knowledge',
  title: 'Wissen',
  description: 'Hier weiß SAIMÔR Dinge – Dateien, Notizen, Erinnerungen, Suche.',
  icon: Library,
  slot: 'primary',
  order: 50,
  visibility: 'nav',
  mobile: 'bar',
  load: () => import('./index'),
  mora: {
    contextLabel: 'Wissen',
    suggestions: ['Finde Dokumente zu meinem letzten Projekt.', 'Was hast du dir zuletzt gemerkt?', 'Fasse ein Dokument zusammen.'],
  },
  legacyApps: ['finder', 'meine-dateien', 'search', 'document', 'notes'],
  keywords: ['dateien', 'finder', 'suche', 'memory', 'notizen', 'dokumente', 'files'],
};
