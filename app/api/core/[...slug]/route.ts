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
 * - In production/preview, fallback to SAIMOR_CORE_URL / NEXT_PUBLIC_CORE_API_URL / https://api.saimor.world
 */

import { NextRequest, NextResponse } from 'next/server';
import { CORE_BASE_URL } from '@/lib/api/coreBase';

const REMOTE_AGENT_URL = process.env.NEXT_PUBLIC_MORA_AGENT_URL || 'https://api.saimor.world/api';

function resolveBackendBase(slug: string): string {
  // Keep an escape hatch for a remote agent endpoint.
  if (slug.startsWith('v1/mora/agent/')) return REMOTE_AGENT_URL;
  return (
    CORE_BASE_URL ||
    process.env.SAIMOR_CORE_URL ||
    process.env.NEXT_PUBLIC_SAIMOR_CORE_URL ||
    process.env.NEXT_PUBLIC_CORE_API_URL ||
    'https://api.saimor.world'
  );
}

function buildBackendUrl(slug: string): string {
  const path = /^(v1|v2|v3)\//.test(slug) ? slug : `v1/${slug}`;
  const base = resolveBackendBase(slug).replace(/\/+$/, '') || 'https://api.saimor.world';
  return `${base}/${path}`;
}

function isForwardableCoreToken(token: string | null | undefined): token is string {
  const value = token?.trim();
  if (!value || value === 'undefined' || value === 'null') return false;
  if (value.startsWith('sess_') || value.startsWith('sk_')) return true;
  const parts = value.split('.');
  return parts.length === 3 && parts.every(Boolean);
}

function sanitizeAuthorization(headers: Headers): void {
  const authorization = headers.get('authorization');
  if (!authorization) return;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match || !isForwardableCoreToken(match[1])) headers.delete('authorization');
}

function copyRequestHeaders(req: NextRequest): Headers {
  const headers = new Headers(req.headers);
  // These are either meaningless or can break upstream fetch.
  headers.delete('host');
  headers.delete('connection');
  headers.delete('content-length');
  // Undici rejects this header and throws `UND_ERR_NOT_SUPPORTED`.
  headers.delete('expect');
  sanitizeAuthorization(headers);
  return headers;
}

function attachAuthFromCookie(req: NextRequest, headers: Headers): void {
  if (headers.get('authorization')) return;
  let token = req.cookies.get('mora_auth_token')?.value || req.cookies.get('mora_session')?.value;
  if (token) {
    try {
      token = decodeURIComponent(token);
    } catch {
      // Keep raw token if decode fails
    }
  }
  if (!isForwardableCoreToken(token)) return;
  headers.set('authorization', `Bearer ${token}`);
  // Strip external cookie header when auth bearer token is attached
  headers.delete('cookie');
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

  let upstream: Response;
  try {
    upstream = await fetch(finalUrl, {
      method,
      headers,
      body: body ? body : undefined,
      redirect: 'manual',
    });
  } catch (error: any) {
    console.error(`[core proxy error] ${method} ${finalUrl}:`, error?.message || error);
    return NextResponse.json(
      {
        error: 'core_upstream_unreachable',
        message: error?.message || 'Verbindung zu CORE fehlgeschlagen',
      },
      { status: 502 }
    );
  }

  if (!upstream.ok && upstream.status >= 400) {
    console.warn(`[core proxy upstream ${upstream.status}] ${method} ${finalUrl}`);
  }

  // Stream response back to the browser.
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.set('cache-control', 'no-store');
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('content-length');

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
