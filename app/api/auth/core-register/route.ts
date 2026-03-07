import { NextRequest, NextResponse } from "next/server";

const CORE_BASE_URL =
  process.env.SAIMOR_CORE_URL ||
  (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8081" : "http://core:8081");

export async function POST(request: NextRequest) {
  const body = await request.text();
  const upstream = await fetch(`${CORE_BASE_URL}/v3/auth/register`, {
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
  }

  return response;
}
