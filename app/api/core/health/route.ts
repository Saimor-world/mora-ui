import { NextResponse } from 'next/server';

const CORE_BASE_URL =
  process.env.SAIMOR_CORE_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8081' : 'http://core:8081');

function buildHealthUrl(): string {
  return `${CORE_BASE_URL.replace(/\/+$/, '')}/v1/health`;
}

export async function GET(): Promise<NextResponse> {
  try {
    const upstream = await fetch(buildHealthUrl(), {
      method: 'GET',
      redirect: 'manual',
      cache: 'no-store',
    });

    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.set('cache-control', 'no-store');
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return NextResponse.json(
      {
        detail: 'Core health unavailable',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503, headers: { 'cache-control': 'no-store' } }
    );
  }
}
