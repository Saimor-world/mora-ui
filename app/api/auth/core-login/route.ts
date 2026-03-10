import { NextRequest, NextResponse } from "next/server";

const CORE_BASE_URL =
  process.env.SAIMOR_CORE_URL ||
  (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8081" : "http://core:8081");

export async function POST(request: NextRequest) {
  const body = await request.text();
  const upstream = await fetch(`${CORE_BASE_URL}/v3/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body,
    redirect: "manual",
  });

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
