#!/usr/bin/env node

/**
 * MR16 baseline collector.
 *
 * Usage:
 *   node scripts/collect-mr16-baseline.mjs
 *   node scripts/collect-mr16-baseline.mjs --out docs/reports/mr16-baseline.json
 *
 * Env:
 *   SAIMOR_BASE_URL=https://api.saimor.world
 *   SAIMOR_SMOKE_EMAIL=demo@saimor.io
 *   SAIMOR_SMOKE_PASSWORD=demo123
 */

import fs from 'node:fs/promises';
import path from 'node:path';

function argValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

function unwrapV3Envelope(json) {
  if (
    json &&
    typeof json === 'object' &&
    !Array.isArray(json) &&
    json.data &&
    json.meta?.api_version === 'v3'
  ) {
    return json.data;
  }
  return json;
}

async function reqJson(url, init = {}) {
  const res = await fetch(url, init);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${url} :: ${JSON.stringify(json)}`);
  }
  return json;
}

async function loginWithSession(baseUrl, email, password) {
  const res = await fetch(`${baseUrl}/v3/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${baseUrl}/v3/auth/login :: ${JSON.stringify(json)}`);
  }
  const cookie = res.headers.get('set-cookie');
  if (!cookie || !json?.success) {
    throw new Error('Session login cookie missing');
  }
  return { cookie, login: json };
}

async function main() {
  const baseUrl = (argValue('--base-url') || process.env.SAIMOR_BASE_URL || 'https://api.saimor.world').replace(/\/+$/, '');
  const email = argValue('--email') || process.env.SAIMOR_SMOKE_EMAIL || 'demo@saimor.io';
  const password = argValue('--password') || process.env.SAIMOR_SMOKE_PASSWORD || 'demo123';
  const outPath = argValue('--out');

  const { cookie, login } = await loginWithSession(baseUrl, email, password);
  const headers = { Cookie: cookie };

  const [healthRaw, cachesRaw, criticalRaw, memoryRaw] = await Promise.all([
    reqJson(`${baseUrl}/v3/health`),
    reqJson(`${baseUrl}/v3/system/performance/caches`, { headers }),
    reqJson(`${baseUrl}/v3/system/performance/critical-flows`, { headers }),
    reqJson(`${baseUrl}/v3/memory/debug/scope`, { headers }),
  ]);

  const health = healthRaw;
  const caches = unwrapV3Envelope(cachesRaw);
  const critical = unwrapV3Envelope(criticalRaw);
  const memory = unwrapV3Envelope(memoryRaw);

  const result = {
    collected_at_utc: new Date().toISOString(),
    base_url: baseUrl,
    auth: {
      email: login?.email ?? email,
      role: login?.role ?? null,
      scope: login?.scope ?? null,
      tenant_id: login?.tenant_id ?? null,
    },
    health: {
      build_git: health?.build?.git ?? null,
      awareness_status: health?.awareness_status ?? null,
      environment: health?.environment ?? null,
    },
    critical_flow_gate: {
      pass: critical?.gate?.pass ?? null,
      violations: critical?.gate?.violations ?? [],
      window_seconds: critical?.window_seconds ?? null,
      total_events: critical?.total_events ?? null,
      legacy_v1_critical_calls: critical?.legacy_v1_critical_calls ?? null,
      context_routes: critical?.context_routes ?? null,
      v3_list_routes: critical?.v3_list_routes ?? null,
    },
    caches: {
      entity_context: caches?.entity_context ?? null,
      folder_context: caches?.folder_context ?? null,
      memory_debug_scope: caches?.memory_debug_scope ?? null,
      default_company_scope: caches?.default_company_scope ?? null,
      learning_brain: caches?.learning_brain ?? null,
    },
    memory_debug_scope: {
      diagnostics: memory?.diagnostics ?? null,
      hints: memory?.hints ?? [],
      errors_count: memory?.errors ? Object.keys(memory.errors).length : 0,
      counts: memory?.counts ?? null,
      scope: memory?.scope ?? null,
    },
  };

  const json = JSON.stringify(result, null, 2);
  if (outPath) {
    const absOut = path.resolve(process.cwd(), outPath);
    await fs.mkdir(path.dirname(absOut), { recursive: true });
    await fs.writeFile(absOut, json + '\n', 'utf8');
    console.log(`Wrote MR16 baseline: ${absOut}`);
  } else {
    console.log(json);
  }
}

main().catch((err) => {
  console.error('[collect-mr16-baseline] failed:', err.message);
  process.exitCode = 1;
});
