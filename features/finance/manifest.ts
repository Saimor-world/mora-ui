import { Landmark } from 'lucide-react';
import type { FeatureManifest } from '../types';

export const financeManifest: FeatureManifest = {
  id: 'finance',
  title: 'Finance',
  description: 'Cashflow, Profit Center, Treasury und Quellen – belegt aus CORE.',
  icon: Landmark,
  slot: 'primary',
  order: 30,
  // Owner/admin roles; demo + member are not shown company finance.
  permissions: ['system_owner', 'owner', 'admin', 'manager'],
  visibility: 'nav',
  mobile: 'bar',
  load: () => import('./index'),
  mora: {
    contextLabel: 'Finance',
    suggestions: ['Wie ist mein Finanzstand belegt?', 'Welche Kontostände sind veraltet?', 'Erkläre mir das Profit-Center-Modell.'],
  },
  legacyApps: ['finance-v2', 'finance'],
  keywords: ['finanzen', 'geld', 'treasury', 'cashflow', 'profit', 'xrpl', 'capital', 'revolut'],
};
