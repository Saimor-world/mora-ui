import { NextResponse } from "next/server";

export async function POST() {
  // Public self-service registration is intentionally closed until billing
  // and customer provisioning are connected end to end.
  return NextResponse.json(
    {
      success: false,
      detail: "Öffentliche Kontoerstellung ist derzeit deaktiviert. Der Zugang erfolgt ausschließlich per Freigabe.",
    },
    { status: 403, headers: { "cache-control": "no-store" } },
  );
}
