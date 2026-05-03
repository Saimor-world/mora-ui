import { NextRequest, NextResponse } from "next/server";

const CORE_BASE_URL =
  process.env.SAIMOR_CORE_URL ||
  (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8081" : "http://core:8081");

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
    upstream = await fetch(`${CORE_BASE_URL}/v3/entry/website-preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ token }),
      redirect: "manual",
    });
  } catch (error) {
    console.error("[website-entry-login] Core preview login failed:", error);
    return NextResponse.json(
      { success: false, detail: "Mora Core ist lokal nicht erreichbar." },
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
