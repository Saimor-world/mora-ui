/**
 * SAIMOR API v2 Proxy
 * ===================
 * Proxies requests to the backend v2 endpoints.
 * Handles session cookies transparently.
 *
 * Next.js 15: params are now async (Promise)
 */
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
    process.env.GATEWAY_URL ||
    process.env.SAIMOR_GATEWAY_URL ||
    (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000" : "http://gateway:8000");

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    return proxyRequest(request, path, "GET");
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    return proxyRequest(request, path, "POST");
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    return proxyRequest(request, path, "PUT");
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    return proxyRequest(request, path, "PATCH");
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    return proxyRequest(request, path, "DELETE");
}

async function proxyRequest(
    request: NextRequest,
    pathSegments: string[],
    method: string
): Promise<NextResponse> {
    const path = "/" + pathSegments.join("/");
    const url = new URL(request.url);
    const queryString = url.search;

    const backendUrl = `${BACKEND_URL}/v2${path}${queryString}`;

    // Forward headers (including cookies for session)
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    // Forward session cookie
    const sessionCookie = request.cookies.get("mora_session");
    if (sessionCookie) {
        headers["Cookie"] = `mora_session=${sessionCookie.value}`;
    }

    // Forward authorization header if present
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
        headers["Authorization"] = authHeader;
    }

    try {
        let body: string | undefined;
        if (method !== "GET" && method !== "HEAD") {
            try {
                const jsonBody = await request.json();
                body = JSON.stringify(jsonBody);
            } catch {
                // No body or not JSON
            }
        }

        const response = await fetch(backendUrl, {
            method,
            headers,
            body,
        });

        // Get response body
        const responseText = await response.text();
        let responseBody: any;
        try {
            responseBody = JSON.parse(responseText);
        } catch {
            responseBody = responseText;
        }

        // Create response
        const nextResponse = NextResponse.json(responseBody, {
            status: response.status,
        });

        // Forward Set-Cookie headers from backend
        const setCookieHeader = response.headers.get("set-cookie");
        if (setCookieHeader) {
            nextResponse.headers.set("Set-Cookie", setCookieHeader);
        }

        return nextResponse;
    } catch (error: any) {
        console.error("[v2 Proxy] Error:", error.message);
        return NextResponse.json(
            { error: "Backend unavailable", detail: error.message },
            { status: 502 }
        );
    }
}
