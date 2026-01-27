/**
 * Next.js API Proxy Route for SAIMÔR Core
 * Proxies all /api/core/* requests to backend at http://127.0.0.1:8083/v1/*
 */

import { NextRequest, NextResponse } from 'next/server';

const LOCAL_BACKEND_URL = 'http://127.0.0.1:8081';
const REMOTE_AGENT_URL = process.env.NEXT_PUBLIC_MORA_AGENT_URL || 'https://api.saimor.world/api';

/**
 * Build backend URL with /v1/ prefix if not present
 */
function resolveBackendBase(slug: string): string {
  if (slug.startsWith('v1/mora/agent/')) return REMOTE_AGENT_URL;
  return LOCAL_BACKEND_URL;
}

function buildBackendUrl(slug: string): string {
  // If slug already starts with v1/, don't add it again
  const path = slug.startsWith('v1/') ? slug : `v1/${slug}`;
  const baseUrl = resolveBackendBase(slug);
  return `${baseUrl}/${path}`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  const params = await context.params;
  const slug = params.slug.join('/');

  try {
    const backendUrl = buildBackendUrl(slug);

    // Extract query parameters
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const queryString = searchParams.toString();
    const finalUrl = queryString ? `${backendUrl}?${queryString}` : backendUrl;

    console.log(`[API Proxy] GET ${request.url} -> ${finalUrl}`);

    // Forward the request to backend
    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward authorization if present
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!
        })
      }
    });

    // Handle non-JSON responses
    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        return NextResponse.json(errorData, { status: response.status });
      } catch {
        return NextResponse.json(
          { error: 'Backend error', details: errorText },
          { status: response.status }
        );
      }
    }

    try {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } catch {
      // If response is not JSON, return empty object
      return NextResponse.json({}, { status: response.status });
    }
  } catch (error) {
    console.error('[API Proxy] Error:', error);
    return NextResponse.json(
      { 
        error: 'Backend unreachable', 
        details: error instanceof Error ? error.message : 'Unknown error',
        path: `/api/core/${params.slug.join('/')}`
      },
      { status: 503 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  const params = await context.params;
  const slug = params.slug.join('/');

  try {
    const backendUrl = buildBackendUrl(slug);

    // Extract query parameters
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const queryString = searchParams.toString();
    const finalUrl = queryString ? `${backendUrl}?${queryString}` : backendUrl;

    console.log(`[API Proxy] POST ${request.url} -> ${finalUrl}`);

    // Get request body
    let body = null;
    try {
      body = await request.json();
    } catch {
      // No body or invalid JSON
    }

    // Forward the request to backend
    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward authorization if present
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!
        })
      },
      body: body ? JSON.stringify(body) : undefined
    });

    // Handle non-JSON responses
    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        return NextResponse.json(errorData, { status: response.status });
      } catch {
        return NextResponse.json(
          { error: 'Backend error', details: errorText },
          { status: response.status }
        );
      }
    }

    try {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } catch {
      // If response is not JSON, return empty object
      return NextResponse.json({}, { status: response.status });
    }
  } catch (error) {
    console.error('[API Proxy] Error:', error);
    return NextResponse.json(
      { 
        error: 'Backend unreachable', 
        details: error instanceof Error ? error.message : 'Unknown error',
        path: `/api/core/${params.slug.join('/')}`
      },
      { status: 503 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  const params = await context.params;
  const slug = params.slug.join('/');

  try {
    const backendUrl = buildBackendUrl(slug);

    console.log(`[API Proxy] PUT ${request.url} -> ${backendUrl}`);

    // Get request body
    let body = null;
    try {
      body = await request.json();
    } catch {
      // No body or invalid JSON
    }

    // Forward the request to backend
    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // Forward authorization if present
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!
        })
      },
      body: body ? JSON.stringify(body) : undefined
    });

    // Handle non-JSON responses
    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        return NextResponse.json(errorData, { status: response.status });
      } catch {
        return NextResponse.json(
          { error: 'Backend error', details: errorText },
          { status: response.status }
        );
      }
    }

    try {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } catch {
      // If response is not JSON, return empty object
      return NextResponse.json({}, { status: response.status });
    }
  } catch (error) {
    console.error('[API Proxy] Error:', error);
    return NextResponse.json(
      { 
        error: 'Backend unreachable', 
        details: error instanceof Error ? error.message : 'Unknown error',
        path: `/api/core/${params.slug.join('/')}`
      },
      { status: 503 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  const params = await context.params;
  const slug = params.slug.join('/');

  try {
    const backendUrl = buildBackendUrl(slug);

    // Extract query parameters
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const queryString = searchParams.toString();
    const finalUrl = queryString ? `${backendUrl}?${queryString}` : backendUrl;

    console.log(`[API Proxy] PATCH ${request.url} -> ${finalUrl}`);

    // Get request body
    let body = null;
    try {
      body = await request.json();
    } catch {
      // No body or invalid JSON
    }

    // Forward the request to backend
    const response = await fetch(finalUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        // Forward authorization if present
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!
        })
      },
      body: body ? JSON.stringify(body) : undefined
    });

    // Handle non-JSON responses
    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        return NextResponse.json(errorData, { status: response.status });
      } catch {
        return NextResponse.json(
          { error: 'Backend error', details: errorText },
          { status: response.status }
        );
      }
    }

    try {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } catch {
      // If response is not JSON, return empty object
      return NextResponse.json({}, { status: response.status });
    }
  } catch (error) {
    console.error('[API Proxy] Error:', error);
    return NextResponse.json(
      { 
        error: 'Backend unreachable', 
        details: error instanceof Error ? error.message : 'Unknown error',
        path: `/api/core/${params.slug.join('/')}`
      },
      { status: 503 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  const params = await context.params;
  const slug = params.slug.join('/');

  try {
    const backendUrl = buildBackendUrl(slug);

    console.log(`[API Proxy] DELETE ${request.url} -> ${backendUrl}`);

    // Forward the request to backend
    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        // Forward authorization if present
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!
        })
      }
    });

    // DELETE might not have a response body
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    try {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } catch {
      return NextResponse.json({ success: true }, { status: response.status });
    }
  } catch (error) {
    console.error('[API Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Backend unreachable', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 503 }
    );
  }
}
