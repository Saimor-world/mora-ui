/**
 * Next.js API Proxy Route for SAIMOR Core
 *
 * Browser-side code may use `getCoreBaseUrl()` which can fall back to `/api/core`.
 * This route must therefore:
 * - Forward all HTTP methods to the Core API
 * - Forward request bodies (incl. multipart/form-data for uploads)
 * - Attach `Authorization: Bearer <mora_auth_token>` when the browser didn't set it
 *
 * Notes:
 * - In Docker, the Core API is reachable via service DNS: `http://core:8081`
 * - In local dev, `http://127.0.0.1:8081` is fine
 */

import { NextRequest, NextResponse } from 'next/server';

const CORE_BASE_URL =
  process.env.SAIMOR_CORE_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8081' : 'http://core:8081');

const REMOTE_AGENT_URL = process.env.NEXT_PUBLIC_MORA_AGENT_URL || 'https://api.saimor.world/api';

function resolveBackendBase(slug: string): string {
  // Keep an escape hatch for a remote agent endpoint.
  if (slug.startsWith('v1/mora/agent/')) return REMOTE_AGENT_URL;
  return CORE_BASE_URL;
}

function buildBackendUrl(slug: string): string {
  const path = slug.startsWith('v1/') ? slug : `v1/${slug}`;
  const base = resolveBackendBase(slug).replace(/\/+$/, '');
  return `${base}/${path}`;
}

function copyRequestHeaders(req: NextRequest): Headers {
  const headers = new Headers(req.headers);
  // These are either meaningless or can break upstream fetch.
  headers.delete('host');
  headers.delete('connection');
  headers.delete('content-length');
  // Undici rejects this header and throws `UND_ERR_NOT_SUPPORTED`.
  headers.delete('expect');
  return headers;
}

function attachAuthFromCookie(req: NextRequest, headers: Headers): void {
  if (headers.get('authorization')) return;
  const token = req.cookies.get('mora_auth_token')?.value;
  if (!token) return;
  headers.set('authorization', `Bearer ${token}`);
}

async function proxy(request: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  const params = await context.params;
  const slug = params.slug.join('/');

  const backendUrl = buildBackendUrl(slug);
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const finalUrl = qs ? `${backendUrl}?${qs}` : backendUrl;

  const headers = copyRequestHeaders(request);
  attachAuthFromCookie(request, headers);

  const method = request.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const upstream = await fetch(finalUrl, {
    method,
    headers,
    body: body ? body : undefined,
    redirect: 'manual',
  });

  // Stream response back to the browser.
  const responseHeaders = new Headers(upstream.headers);
  // Avoid caching surprises for auth'd JSON.
  responseHeaders.set('cache-control', 'no-store');

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  return proxy(request, context);
}
export async function POST(request: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  return proxy(request, context);
}
export async function PUT(request: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  return proxy(request, context);
}
export async function PATCH(request: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  return proxy(request, context);
}
export async function DELETE(request: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  return proxy(request, context);
}
