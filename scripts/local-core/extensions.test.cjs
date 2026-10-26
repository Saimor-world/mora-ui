const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { createExtensions } = require('./extensions.cjs');

async function server(t, options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mora-core-contract-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const events = [{ id: 'example-event', title: 'Example' }];
  const statePath = path.join(dir, 'phases.json');
  const config = { events, statePath, companyId: 'example-company', tenantId: 'example-tenant', env: {}, ...options };
  const handler = createExtensions(config);
  const srv = http.createServer(async (req, res) => {
    if (!await handler(req, res, new URL(req.url, 'http://localhost'))) { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => srv.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { srv.close(resolve); srv.closeAllConnections(); }));
  const base = `http://127.0.0.1:${srv.address().port}`;
  return { config, events, post: (route, body) => fetch(base + route, { method: route.includes('/appointments/') ? 'PUT' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) };
}
const route = '/v3/appointments/example-event/status?company_id=example-company';

test('calendar persists across server instances and rejects stale undo / wrong company', async t => {
  const s = await server(t);
  assert.equal((await s.post(route, { phase: 'erledigt', expected_version: 0 })).status, 200);
  const freshEvents = [{ id: 'example-event' }];
  const restarted = createExtensions({ ...s.config, events: freshEvents });
  let read;
  await restarted({ method: 'GET' }, { writeHead() {}, end(body) { read = JSON.parse(body); } }, new URL('http://localhost/v3/appointments/status?company_id=example-company'));
  assert.equal(read.data.items[0].phase, 'erledigt');
  assert.equal(read.data.items[0].version, 1);
  assert.equal((await s.post(route, { phase: 'geplant', expected_version: 0 })).status, 409);
  assert.equal((await s.post(route.replace('example-company', 'other'), { phase: 'geplant', expected_version: 1 })).status, 404);
  assert.equal((await s.post(route, { phase: 'geplant', expected_version: 1 })).status, 200);
});

test('disabled model never contacts an upstream or fabricates an answer', async t => {
  const s = await server(t, { fetchImpl: () => assert.fail('No outbound call allowed') });
  assert.equal((await s.post('/v3/chat/stream', { message: 'Test' })).status, 503);
});

test('enabled interchangeable provider returns CORE thought protocol without exposing its key', async t => {
  const env = { MORA_LOCAL_LLM_ENABLED: 'true', MORA_LOCAL_LLM_BASE_URL: 'http://127.0.0.1:9999/v1', MORA_LOCAL_LLM_MODEL: 'test-model', MORA_LOCAL_LLM_API_KEY: 'unit-test-only' };
  const s = await server(t, { env, fetchImpl: async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:9999/v1/chat/completions');
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'test-model');
    assert.equal(body.messages[1].role, 'user');
    assert.match(body.messages[1].content, /Example/);
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'Provider-Testantwort' } }] }) };
  } });
  const response = await s.post('/v3/chat/stream', { message: 'Test', context: { task: 'Example' } });
  assert.equal(response.status, 200);
  const text = await response.text();
  assert.match(text, /"kind":"thought"/);
  assert.match(text, /Provider-Testantwort/);
  assert.doesNotMatch(text, /unit-test-only/);
});

test('provider failure returns a safe error, never a substitute answer', async t => {
  const s = await server(t, { env: { MORA_LOCAL_LLM_ENABLED: 'true', MORA_LOCAL_LLM_BASE_URL: 'http://localhost:9999/v1', MORA_LOCAL_LLM_MODEL: 'test' }, fetchImpl: async () => { throw new Error('private provider detail'); } });
  const response = await s.post('/v3/chat/stream', { message: 'Test' });
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /private provider detail/);
});

test('invalid bodies fail without crashing the local example server', async t => {
  const s = await server(t);
  assert.equal((await s.post(route, null)).status, 422);
  assert.equal((await s.post(route, { phase: 'erledigt', expected_version: true })).status, 422);
  assert.equal((await s.post(route, { phase: 'erledigt', expected_version: 0 })).status, 200);
});
