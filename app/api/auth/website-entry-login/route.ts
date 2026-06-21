import { NextRequest, NextResponse } from "next/server";

import {
  coreUnreachableUserMessage,
  fetchCoreUpstream,
  probePublicCoreHealth,
} from '@/lib/api/coreReachability';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const token = typeof body?.entryToken === "string" ? body.entryToken.trim() : "";
  if (!token) {
    return NextResponse.json(
      { success: false, detail: "Website entry token is required." },
      { status: 400, headers: { "cache-control": "no-store" } }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetchCoreUpstream('/v3/entry/website-preview', {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ token }),
      redirect: "manual",
    });
  } catch (error) {
    const publicHealthy = await probePublicCoreHealth();
    console.error("[website-entry-login] Core preview login failed:", error, { publicHealthy });
    return NextResponse.json(
      { success: false, detail: coreUnreachableUserMessage() },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }

  const payload = await upstream.json().catch(() => null);
  const response = NextResponse.json(payload ?? { success: false }, {
    status: upstream.status,
    headers: { "cache-control": "no-store" },
  });

  const setCookie = upstream.headers.get("set-cookie");
  if (setCookie) response.headers.set("set-cookie", setCookie);
  const sessionToken = payload?.session_token || setCookie?.match(/mora_session=([^;]+)/)?.[1];
  if (sessionToken) {
    response.headers.append(
      "set-cookie",
      `mora_auth_token=${sessionToken}; Path=/; Max-Age=86400; SameSite=Lax`
    );
  }

  return response;
}
