import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const RPC = "https://s.altnet.rippletest.net:51234/";
const NETWORK_ID = 1;

/** Real public XRPL Testnet state, never payment evidence or finance settlement. */
export async function GET() {
  try {
    const response = await fetch(RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ method: "server_info", params: [{ api_version: 1 }] }),
      signal: AbortSignal.timeout(6500),
      next: { revalidate: 45 },
    });
    if (!response.ok) throw new Error("upstream unavailable");
    const json = await response.json();
    const info = json?.result?.info;
    const ledger = info?.validated_ledger;
    if (
      json?.result?.status !== "success" ||
      info?.network_id !== NETWORK_ID ||
      !ledger ||
      !Number.isSafeInteger(ledger.seq) ||
      ledger.seq <= 0
    ) {
      throw new Error("incorrect or unverifiable Testnet identity");
    }
    return NextResponse.json(
      {
        status: "connected",
        network: "xrpl:1",
        validatedLedger: ledger.seq,
        checkedAt: new Date().toISOString(),
        source: "XRPL public Testnet server_info",
        paymentVerified: false,
      },
      { headers: { "cache-control": "public, s-maxage=45, stale-while-revalidate=30" } },
    );
  } catch {
    return NextResponse.json(
      {
        status: "unavailable",
        network: "xrpl:1",
        validatedLedger: null,
        checkedAt: new Date().toISOString(),
        paymentVerified: false,
      },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
