/**
 * Registry consistency guard
 *
 * These tests enforce the contract that the four App Platform registries
 * stay in sync with each other. A failure here means one of the registries
 * was updated without updating the others — the exact class of bug that
 * caused 'apps' to be missing from APP_REGISTRY and 'browser' to be orphaned
 * in ALL_APPS.
 *
 * When you add a new app:
 *   1. apps/{id}/index.tsx        — create the app module
 *   2. lib/apps/AppLoader.tsx     — add to APP_MAP
 *   3. lib/apps/appRegistry.ts    — add manifest (these tests will fail if you forget)
 *   4. apps/apps/index.tsx        — add id to LAUNCHER_EXCLUDE if NOT user-launchable
 *   5. lib/surface/surfaceRegistry.ts — assign tier
 */

// next/dynamic is mocked so Jest can import AppLoader without a Next.js runtime
jest.mock('next/dynamic', () => (fn: () => Promise<unknown>) => {
    const Stub = () => null;
    Stub.displayName = 'DynamicStub';
    return Stub;
});

import { APP_IDS } from '@/lib/apps/AppLoader';
import { APP_REGISTRY } from '@/lib/apps/appRegistry';
import { SURFACE_TIERS } from '@/lib/surface/surfaceRegistry';

const registryIds = APP_REGISTRY.map(a => a.id).sort();

// ── APP_MAP ↔ APP_REGISTRY ────────────────────────────────────────────────────

describe('APP_MAP ↔ APP_REGISTRY consistency', () => {
    it('every APP_REGISTRY id has a loader in APP_MAP', () => {
        const missing = registryIds.filter(id => !APP_IDS.includes(id));
        expect(missing).toEqual([]);
    });

    it('every APP_MAP entry has a manifest in APP_REGISTRY', () => {
        const orphaned = APP_IDS.filter(id => !registryIds.includes(id));
        expect(orphaned).toEqual([]);
    });

    it('APP_MAP and APP_REGISTRY contain the same set of ids', () => {
        expect(APP_IDS).toEqual(registryIds);
    });
});

// ── APP_REGISTRY ↔ surfaceRegistry ───────────────────────────────────────────

describe('APP_REGISTRY ↔ surfaceRegistry consistency', () => {
    it('every APP_REGISTRY id has a surfaceRegistry tier', () => {
        const missing = registryIds.filter(id => !(id in SURFACE_TIERS));
        expect(missing).toEqual([]);
    });
});
