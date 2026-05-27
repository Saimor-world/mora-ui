import { NextRequest, NextResponse } from "next/server";

import { CORE_BASE_URL } from '@/lib/api/coreBase';

export async function POST(request: NextRequest) {
  const body = await request.text();
  let upstream: Response;
  try {
    upstream = await fetch(`${CORE_BASE_URL}/v3/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body,
      redirect: "manual",
    });
  } catch (error) {
    const fallback = buildLocalDemoLoginFallback(body);
    if (fallback) return fallback;
    console.error("[core-login] Core auth proxy failed:", error);
    return NextResponse.json(
      {
        success: false,
        detail: "Mora Core ist lokal nicht erreichbar. Starte CORE auf dem konfigurierten Port (SAIMOR_CORE_URL) oder nutze den lokalen Demo-Zugang.",
      },
      { status: 503 }
    );
  }

  const responseText = await upstream.text();
  const response = new NextResponse(responseText, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") || "application/json",
      "cache-control": "no-store",
    },
  });

  const setCookie = upstream.headers.get("set-cookie");
  if (setCookie) {
    response.headers.set("set-cookie", setCookie);

    // Bridge: extract the opaque session token value from the HttpOnly mora_session cookie
    // and also set it as mora_auth_token (JS-readable, no HttpOnly flag).
    // coreClient reads mora_auth_token for its Authorization: Bearer header, and the Core
    // accepts opaque sess_xxx tokens as valid Bearer credentials (auth_type: "session").
    // This ensures loadCompanies / tree / all subsequent coreGet calls work after login.
    const sessionMatch = setCookie.match(/mora_session=([^;]+)/);
    if (sessionMatch) {
      const sessionToken = sessionMatch[1];
      const maxAge = setCookie.match(/Max-Age=(\d+)/)?.[1] ?? "604800";
      response.headers.append(
        "set-cookie",
        `mora_auth_token=${sessionToken}; Path=/; Max-Age=${maxAge}; SameSite=Lax`
      );
    }
  }

  return response;
}

function buildLocalDemoLoginFallback(rawBody: string) {
  if (process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test") return null;
  if (process.env.SAIMOR_ENABLE_LOCAL_DEMO_FALLBACK !== "1") return null;

  try {
    const payload = JSON.parse(rawBody);
    const email = String(payload?.email || "").trim().toLowerCase();
    const password = String(payload?.password || "");
    const isDemo = email === "demo" || email === "demo@saimor.io";
    if (!isDemo || password !== "demo123") return null;

    const response = NextResponse.json(
      {
        success: true,
        user_id: "local-demo-user",
        email: "demo@saimor.io",
        role: "demo",
        tenant_id: "tenant-demo",
        auth_type: "local_demo_fallback",
        scope: "local-preview",
        message: "Lokaler Demo-Fallback aktiv, weil Mora Core nicht erreichbar ist.",
      },
      {
        status: 200,
        headers: { "cache-control": "no-store" },
      }
    );
    response.headers.set(
      "set-cookie",
      "mora_session=local_demo_fallback; Path=/; Max-Age=604800; SameSite=Lax"
    );
    return response;
  } catch {
    return null;
  }
}
