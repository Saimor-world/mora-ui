#!/usr/bin/env node

/**
 * Fail-fast guard for MR16 critical flow regressions.
 *
 * Checks:
 * - critical gate pass must be true
 * - legacy_v1_critical_calls.count must be 0
 * - context_routes.status_5xx must be 0
 * - v3_list_routes.unbounded_unscoped_count must be 0
 *
 * Usage:
 *   node scripts/check-critical-flow-gate.mjs
 *   node scripts/check-critical-flow-gate.mjs --base-url https://api.saimor.world
 *   node scripts/check-critical-flow-gate.mjs --input docs/reports/mr16-baseline-latest.json
 *
 * Env:
 *   SAIMOR_BASE_URL
 *   SAIMOR_SMOKE_EMAIL
 *   SAIMOR_SMOKE_PASSWORD
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
  return { cookie };
}

async function loadCriticalFromApi() {
  const baseUrl = (argValue('--base-url') || process.env.SAIMOR_BASE_URL || 'https://api.saimor.world').replace(/\/+$/, '');
  const email = argValue('--email') || process.env.SAIMOR_SMOKE_EMAIL || 'demo@saimor.io';
  const password = argValue('--password') || process.env.SAIMOR_SMOKE_PASSWORD || 'demo123';

  const { cookie } = await loginWithSession(baseUrl, email, password);

  const criticalRaw = await reqJson(`${baseUrl}/v3/system/performance/critical-flows`, {
    headers: { Cookie: cookie },
  });
  return unwrapV3Envelope(criticalRaw);
}

async function loadCriticalFromFile(inputPath) {
  const abs = path.resolve(process.cwd(), inputPath);
  const raw = await fs.readFile(abs, 'utf8');
  const parsed = JSON.parse(raw);
  return parsed?.critical_flow_gate ?? null;
}

function evaluateGate(critical) {
  const gatePass = critical?.pass ?? critical?.gate?.pass ?? false;
  const violations = [];

  const v1Count = critical?.legacy_v1_critical_calls?.count ?? 0;
  const context5xx = critical?.context_routes?.status_5xx ?? 0;
  const unboundedUnscoped = critical?.v3_list_routes?.unbounded_unscoped_count ?? 0;

  if (!gatePass) violations.push('gate.pass != true');
  if (v1Count > 0) violations.push(`legacy_v1_critical_calls.count=${v1Count}`);
  if (context5xx > 0) violations.push(`context_routes.status_5xx=${context5xx}`);
  if (unboundedUnscoped > 0) violations.push(`v3_list_routes.unbounded_unscoped_count=${unboundedUnscoped}`);

  return {
    ok: violations.length === 0,
    violations,
    summary: {
      gate_pass: gatePass,
      legacy_v1_critical_calls: v1Count,
      context_5xx: context5xx,
      unbounded_unscoped_v3_lists: unboundedUnscoped,
      total_events: critical?.total_events ?? null,
      window_seconds: critical?.window_seconds ?? null,
    },
  };
}

async function main() {
  const inputPath = argValue('--input');
  const critical = inputPath
    ? await loadCriticalFromFile(inputPath)
    : await loadCriticalFromApi();

  if (!critical) {
    throw new Error('Critical flow payload missing');
  }

  const result = evaluateGate(critical);
  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[check-critical-flow-gate] failed:', err.message);
  process.exitCode = 1;
});
