/**
 * coreBase — single source of truth for the CORE backend URL.
 *
 * Resolution order (first wins):
 *   1. SAIMOR_CORE_URL env var  (set this in .env.local — no hardcoded fallback in code)
 *   2. Docker service DNS       (only in non-dev, when SAIMOR_CORE_URL is absent)
 *
 * For local dev: set SAIMOR_CORE_URL=http://127.0.0.1:8081 in .env.local
 * For Docker:    set SAIMOR_CORE_URL=http://core:8081 (or rely on the fallback below)
 */
export const CORE_BASE_URL: string =
    process.env.SAIMOR_CORE_URL ||
    (process.env.NODE_ENV === 'development' ? '' : 'http://core:8081');
