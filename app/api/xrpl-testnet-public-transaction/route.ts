import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TESTNET_RPC = "https://s.altnet.rippletest.net:51234/";
const HASH = /^[0-9A-Fa-f]{64}$/;
const DROPS = /^(0|[1-9][0-9]*)$/;
const MAX_LEDGER = 4_294_967_295;

type RPCRecord = Record<string, unknown>;

function record(value: unknown): RPCRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as RPCRecord)
    : null;
}

async function rpc(method: string, parameters: RPCRecord): Promise<RPCRecord> {
  const res = await fetch(TESTNET_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ method, params: [{ ...parameters, api_version: 1 }] }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error("RPC unavailable");
  const envelope = record(await res.json());
  const result = record(envelope?.result);
  if (result?.status !== "success") throw new Error("RPC result unavailable");
  return result;
}

/** Public Testnet explorer; it cannot create an invoice, claim payment, or grant access. */
export async function GET(request: NextRequest) {
  const proposed = request.nextUrl.searchParams.get("hash");
  if (!proposed || !HASH.test(proposed)) {
    return NextResponse.json(
      { status: "rejected", reason: "Ungültiger 64-stelliger Transaktionshash", commerceMatched: false },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const hash = proposed.toUpperCase();
  try {
    const status = await rpc("server_info", {});
    const info = record(status.info);
    const lastValidated = record(info?.validated_ledger);
    if (
      info?.network_id !== 1 ||
      !lastValidated ||
      !Number.isSafeInteger(lastValidated.seq) ||
      (lastValidated.seq as number) < 1
    ) {
      throw new Error("Untrusted network");
    }

    const result = await rpc("tx", { transaction: hash, binary: false });
    const tx = record(result.tx_json) ?? record(result.tx) ?? result;
    if (
      result.validated !== true ||
      !Number.isSafeInteger(result.ledger_index) ||
      (result.ledger_index as number) < 1 ||
      (result.ledger_index as number) > MAX_LEDGER ||
      typeof result.hash !== "string" ||
      result.hash.toUpperCase() !== hash ||
      (typeof tx.hash === "string" && tx.hash.toUpperCase() !== hash)
    ) {
      throw new Error("Transaction is not verified and validated");
    }

    const index = result.ledger_index as number;
    const ledger = await rpc("ledger", { ledger_index: index, transactions: false, expand: false });
    if (
      ledger.validated !== true ||
      ledger.ledger_index !== index ||
      typeof ledger.ledger_hash !== "string" ||
      !HASH.test(ledger.ledger_hash) ||
      (typeof result.ledger_hash === "string" && result.ledger_hash.toUpperCase() !== ledger.ledger_hash.toUpperCase())
    ) {
      throw new Error("Ledger proof unavailable");
    }

    const meta = record(result.meta);
    const successful = meta?.TransactionResult === "tesSUCCESS";
    const native = tx.TransactionType === "Payment" &&
      typeof tx.Amount === "string" && DROPS.test(tx.Amount) &&
      typeof meta?.delivered_amount === "string" && DROPS.test(meta.delivered_amount) &&
      meta.delivered_amount === tx.Amount &&
      !(typeof tx.Flags === "number" && (tx.Flags & 0x00020000) !== 0);

    return NextResponse.json(
      {
        status: "validated",
        network: "xrpl:1",
        hash,
        ledgerIndex: index,
        ledgerHash: ledger.ledger_hash.toUpperCase(),
        transactionType: typeof tx.TransactionType === "string" ? tx.TransactionType : "Unknown",
        result: typeof meta?.TransactionResult === "string" ? meta.TransactionResult : "unknown",
        successful,
        nativePaymentDrops: successful && native ? tx.Amount : null,
        commerceMatched: false,
        productAccessGranted: false,
        source: "XRPL Testnet JSON-RPC · server_info + tx + ledger",
        checkedAt: new Date().toISOString(),
      },
      { headers: { "cache-control": "public, s-maxage=20, stale-while-revalidate=30" } },
    );
  } catch {
    return NextResponse.json(
      {
        status: "unavailable",
        network: "xrpl:1",
        reason: "Kein vollständig validierter Testnet-Nachweis verfügbar (Hash, Netzwerk oder RPC prüfen)",
        commerceMatched: false,
      },
      { status: 422, headers: { "cache-control": "no-store" } },
    );
  }
}
