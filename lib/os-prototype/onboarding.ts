'use client';
import {
  PRODUCT_TOUR_RESTART_EVENT,
  isFirstRunTourDone,
  markFirstRunTourDone,
  requestProductTourRestart,
} from '@/lib/onboarding/firstRunStore';

/**
 * V1.6 Onboarding – baut auf dem Legacy-`firstRunStore` auf (gleiche Schlüssel,
 * gleiches Restart-Event), damit „Tour erledigt“ zwischen klassischer Oberfläche
 * und /os übereinstimmt. Firmen-/Abteilungsnamen bleiben ausschließlich lokal.
 */
export const ONBOARDING_ORG_KEY = 'saimor_os_onboarding_org';
export const ONBOARDING_RESTART_EVENT = PRODUCT_TOUR_RESTART_EVENT;

export interface LocalOrg { company: string; departments: string[] }

export function isOnboardingDone(): boolean {
  if (typeof window === 'undefined') return true;
  if (new URLSearchParams(window.location.search).get('onboarding') === 'off') return true;
  return isFirstRunTourDone(null);
}

export function finishOnboarding(): void { markFirstRunTourDone(); }

export function requestOnboarding(): void { requestProductTourRestart(); }

export function readLocalOrg(): LocalOrg {
  if (typeof window === 'undefined') return { company: '', departments: [] };
  try {
    const raw = JSON.parse(window.localStorage.getItem(ONBOARDING_ORG_KEY) || 'null');
    if (raw && typeof raw.company === 'string' && Array.isArray(raw.departments)) return { company: raw.company.slice(0, 80), departments: raw.departments.filter((d: unknown) => typeof d === 'string').slice(0, 12) };
  } catch { /* ignore */ }
  return { company: '', departments: [] };
}

export function saveLocalOrg(org: LocalOrg): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(ONBOARDING_ORG_KEY, JSON.stringify({ company: org.company.trim().slice(0, 80), departments: org.departments.map((d) => d.trim()).filter(Boolean).slice(0, 12) })); } catch { /* ignore */ }
}
