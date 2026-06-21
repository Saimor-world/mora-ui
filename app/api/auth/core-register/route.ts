import { NextRequest, NextResponse } from "next/server";

import {
  coreUnreachableUserMessage,
  fetchCoreUpstream,
  probePublicCoreHealth,
} from '@/lib/api/coreReachability';

export async function POST(request: NextRequest) {
  const body = await request.text();
  let upstream: Response;
  try {
    upstream = await fetchCoreUpstream('/v3/auth/register', {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body,
      redirect: "manual",
    });
  } catch (error) {
    const publicHealthy = await probePublicCoreHealth();
    console.error("[core-register] Core register proxy failed:", error, { publicHealthy });
    return NextResponse.json(
      { success: false, detail: coreUnreachableUserMessage() },
      { status: 503, headers: { "cache-control": "no-store" } }
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
  }

  return response;
}
