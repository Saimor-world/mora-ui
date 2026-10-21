/**
 * OS prototype flags.
 *
 * NEXT_PUBLIC_OS_PROTOTYPE=1   → the /os route renders the new shell (otherwise a quiet "not enabled" page).
 * NEXT_PUBLIC_OS_PREVIEW=local → local preview mode: /os may be opened WITHOUT a CORE session, but only when
 *                                the page is served from localhost/127.0.0.1. Never set this for a deploy.
 * NEXT_PUBLIC_OS_FLAGS=a,b     → optional feature flags for manifests (e.g. "atmosphere-universe").
 *
 * The values are inlined at build time, so a production image built without them
 * cannot enable the prototype or the preview mode at runtime.
 */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function isOsPrototypeEnabled(env: Record<string, string | undefined> = readEnv()): boolean {
  return env.NEXT_PUBLIC_OS_PROTOTYPE === '1' || env.NEXT_PUBLIC_OS_PREVIEW === 'local';
}

export function isLocalHostname(hostname: string | null | undefined): boolean {
  return Boolean(hostname && LOCAL_HOSTS.has(hostname));
}

/** Local preview is only ever active on localhost AND when explicitly requested at build time. */
export function isLocalPreview(hostname?: string | null, env: Record<string, string | undefined> = readEnv()): boolean {
  if (env.NEXT_PUBLIC_OS_PREVIEW !== 'local') return false;
  const host = hostname ?? (typeof window !== 'undefined' ? window.location.hostname : null);
  return isLocalHostname(host);
}

export function enabledFeatureFlags(env: Record<string, string | undefined> = readEnv()): Set<string> {
  return new Set((env.NEXT_PUBLIC_OS_FLAGS || '').split(',').map((f) => f.trim()).filter(Boolean));
}

function readEnv(): Record<string, string | undefined> {
  // Literal references so Next.js inlines them into the client bundle.
  return {
    NEXT_PUBLIC_OS_PROTOTYPE: process.env.NEXT_PUBLIC_OS_PROTOTYPE,
    NEXT_PUBLIC_OS_PREVIEW: process.env.NEXT_PUBLIC_OS_PREVIEW,
    NEXT_PUBLIC_OS_FLAGS: process.env.NEXT_PUBLIC_OS_FLAGS,
  };
}
