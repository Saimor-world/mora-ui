import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

const RPC = "https://s.altnet.rippletest.net:51234/";
const HASH = /^[0-9A-Fa-f]{64}$/;
const MAX_ATTEMPTS = 4;

type Dict = Record<string, unknown>;

function dict(input: unknown): Dict | null {
  return input !== null && typeof input === "object" && !Array.isArray(input)
    ? input as Dict : null;
}

async function rpc(method: string, params: Dict): Promise<Dict> {
  const response = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ method, params: [{ api_version: 1, ...params }] }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(4500),
  });
  if (!response.ok) throw new Error("XRPL node unavailable");
  const body = dict(await response.json());
  const result = dict(body?.result);
  if (result?.status !== "success") throw new Error("XRPL node did not return success");
  return result;
}

/** Finds a real public Testnet tx hash; NEVER a purchase receipt or checkout. */
export async function GET() {
  try {
    const info = dict((await rpc("server_info", {})).info);
    const latest = dict(info?.validated_ledger);
    const seq = latest?.seq;
    if (info?.network_id !== 1 || !Number.isSafeInteger(seq) || (seq as number) < MAX_ATTEMPTS) {
      throw new Error("Node identity or validated ledger unavailable");
    }

    for (let offset = 0; offset < MAX_ATTEMPTS; offset++) {
      const index = (seq as number) - offset;
      const response = await rpc("ledger", {
        ledger_index: index,
        transactions: true,
        expand: false,
      });
      const header = dict(response.ledger);
      const txs = header?.transactions;
      if (
        response.validated !== true ||
        response.ledger_index !== index ||
        typeof response.ledger_hash !== "string" ||
        !HASH.test(response.ledger_hash)
      ) {
        throw new Error("Ledger validation failed");
      }
      if (!Array.isArray(txs)) continue;
      const hash = txs.find((candidate): candidate is string =>
        typeof candidate === "string" && HASH.test(candidate)
      );
      if (hash) {
        return NextResponse.json(
          {
            status: "sample",
            network: "xrpl:1",
            txHash: hash.toUpperCase(),
            ledgerIndex: index,
            ledgerHash: response.ledger_hash.toUpperCase(),
            commerceMatched: false,
            source: "XRPL Testnet validated ledger (public transaction)",
          },
          { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=30" } },
        );
      }
    }

    return NextResponse.json(
      { status: "empty", network: "xrpl:1", commerceMatched: false },
      { status: 404, headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "unavailable", network: "xrpl:1", commerceMatched: false },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
