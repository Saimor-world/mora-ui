import { ShieldCheck } from 'lucide-react';
import type { FeatureManifest } from '../types';

export const administrationManifest: FeatureManifest = {
  id: 'administration', title: 'Verwaltung',
  description: 'Accounts, Rollen und Firmen auf dieser CORE-Instanz.',
  icon: ShieldCheck, slot: 'secondary', order: 65, permissions: ['system_owner'],
  internalOnly: true, visibility: 'nav', mobile: 'more',
  load: () => import('./index'),
  mora: { contextLabel: 'Systemverwaltung', suggestions: ['Welche Rechte hat meine aktuelle Rolle?'] },
  keywords: ['verwaltung', 'accounts', 'nutzer', 'benutzer', 'firmen', 'rollen'],
};
