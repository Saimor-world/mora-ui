import { NextRequest, NextResponse } from "next/server";

import { CORE_BASE_URL } from '@/lib/api/coreBase';

const EXPIRED_COOKIES = [
  "mora_session=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly",
  "mora_auth_token=; Path=/; Max-Age=0; SameSite=Lax",
];

export async function POST(request: NextRequest) {
  const response = NextResponse.json(await logoutCore(request), {
    status: 200,
    headers: { "cache-control": "no-store" },
  });

  expireAuthCookies(response);
  return response;
}

export async function GET(request: NextRequest) {
  await logoutCore(request);

  const response = NextResponse.redirect(new URL("/", request.url), {
    status: 303,
  });

  expireAuthCookies(response);
  return response;
}

async function logoutCore(request: NextRequest) {
  let upstreamBody: unknown = { success: true, message: "Logged out" };

  try {
    const cookie = request.headers.get("cookie");
    const authorization = request.headers.get("authorization");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };
    if (cookie) headers.Cookie = cookie;
    if (authorization) headers.Authorization = authorization;

    const upstream = await fetch(`${CORE_BASE_URL}/v3/auth/logout`, {
      method: "POST",
      headers,
      body: "{}",
      redirect: "manual",
    });

    upstreamBody = await upstream.json().catch(() => upstreamBody);
  } catch {
    // Logout must still clear browser cookies even if Core is already gone.
  }

  return upstreamBody;
}

function expireAuthCookies(response: NextResponse) {
  for (const cookie of EXPIRED_COOKIES) {
    response.headers.append("set-cookie", cookie);
  }
}
