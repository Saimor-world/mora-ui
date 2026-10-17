/** @jest-environment node */
import { NextRequest } from "next/server";
import { GET } from "@/app/api/xrpl-testnet-public-transaction/route";

const HASH = "A".repeat(64);
const LEDGER_HASH = "B".repeat(64);
const SENDER = "r" + "S".repeat(30);
const RECEIVER = "r" + "D".repeat(30);

function request(hash: string) {
  return new NextRequest("https://os.example/api/xrpl-testnet-public-transaction?hash=" + encodeURIComponent(hash));
}

function mockRpc(overrides: {
  networkId?: number;
  txValidated?: boolean;
  txHash?: string;
  transactionResult?: string;
  ledgerValidated?: boolean;
  ledgerHash?: string;
  ledgerIndex?: number;
} = {}) {
  const info = { status: "success", info: { network_id: overrides.networkId ?? 1, validated_ledger: { seq: 12000 } } };
  const tx = {
    status: "success",
    validated: overrides.txValidated ?? true,
    hash: overrides.txHash ?? HASH,
    ledger_index: overrides.ledgerIndex ?? 9999,
    tx_json: {
      TransactionType: "Payment",
      Account: SENDER,
      Destination: RECEIVER,
      Amount: "1000",
      hash: overrides.txHash ?? HASH,
    },
    meta: { TransactionResult: overrides.transactionResult ?? "tesSUCCESS", delivered_amount: "1000" },
  };
  const ledger = {
    status: "success", validated: overrides.ledgerValidated ?? true,
    ledger_index: 9999, ledger_hash: overrides.ledgerHash ?? LEDGER_HASH,
  };
  global.fetch = jest.fn(async (_url: string | URL | Request, options?: RequestInit) => {
    const request = JSON.parse(String(options?.body));
    const data = request.method === "server_info" ? info : request.method === "tx" ? tx : ledger;
    return { ok: true, json: async () => ({ result: data }) } as Response;
  }) as typeof fetch;
}

describe("public read-only XRPL Testnet transaction inspector", () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  it("rejects malformed hash without any outbound call", async () => {
    global.fetch = jest.fn() as typeof fetch;
    const res = await GET(request("invalid"));
    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
    expect((await res.json()).commerceMatched).toBe(false);
  });

  it("only displays a validated real-lookup candidate, never a shop purchase", async () => {
    mockRpc();
    const res = await GET(request(HASH.toLowerCase()));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toMatchObject({
      status: "validated", network: "xrpl:1", hash: HASH,
      ledgerIndex: 9999, ledgerHash: LEDGER_HASH, transactionType: "Payment",
      result: "tesSUCCESS", nativePaymentDrops: "1000", successful: true,
      commerceMatched: false, productAccessGranted: false,
    });
    const calls = (global.fetch as jest.Mock).mock.calls;
    expect(calls).toHaveLength(3);
    expect(calls.map((call) => JSON.parse(call[1].body).method)).toEqual(["server_info", "tx", "ledger"]);
    expect(calls.every((call) => call[0] === "https://s.altnet.rippletest.net:51234/")).toBe(true);
    expect(JSON.stringify(calls)).not.toMatch(/secret|seed/i);
  });

  it.each([
    ["Mainnet RPC", { networkId: 0 }],
    ["unvalidated transaction", { txValidated: false }],
    ["wrong returned transaction hash", { txHash: "C".repeat(64) }],
    ["ledger not validated", { ledgerValidated: false }],
    ["ledger hash malformed", { ledgerHash: "WRONG" }],
    ["ledger index conflict", { ledgerIndex: 7777 }],
  ])("rejects %s without a commerce entitlement", async (_label, overrides) => {
    mockRpc(overrides);
    const res = await GET(request(HASH));
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.commerceMatched).toBe(false);
    expect(data.status).toBe("unavailable");
  });

  it("shows failed transactions as non-settlements without creating revenue", async () => {
    mockRpc({ transactionResult: "tecUNFUNDED_PAYMENT" });
    const res = await GET(request(HASH));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.result).toBe("tecUNFUNDED_PAYMENT");
    expect(data.successful).toBe(false);
    expect(data.nativePaymentDrops).toBeNull();
    expect(data.commerceMatched).toBe(false);
  });

  it("does not disclose internal transport errors", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("sensitive internal transport")) as typeof fetch;
    const res = await GET(request(HASH));
    expect(res.status).toBe(422);
    expect(JSON.stringify(await res.json())).not.toContain("sensitive internal transport");
  });
});
