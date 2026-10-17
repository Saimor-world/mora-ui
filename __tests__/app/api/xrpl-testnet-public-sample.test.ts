/** @jest-environment node */
import { GET } from "@/app/api/xrpl-testnet-public-sample/route";

const SAMPLE = "A".repeat(64);
const LEDGER = "B".repeat(64);

describe("XRPL validated Testnet sample lookup", () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  function mock(updates: { network?: number; transactions?: string[]; ledgerValidated?: boolean; ledgerHash?: string } = {}) {
    global.fetch = jest.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const data = JSON.parse(String(init?.body));
      const result = data.method === "server_info"
        ? { status: "success", info: { network_id: updates.network ?? 1, validated_ledger: { seq: 1000 } } }
        : { status: "success", validated: updates.ledgerValidated ?? true,
            ledger_index: data.params[0].ledger_index, ledger_hash: updates.ledgerHash ?? LEDGER,
            ledger: { transactions: updates.transactions ?? [SAMPLE] } };
      return { ok: true, json: async () => ({ result }) } as Response;
    }) as typeof fetch;
  }

  it("discovers only a transaction from a validated Testnet ledger", async () => {
    mock();
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "sample", network: "xrpl:1", txHash: SAMPLE,
      ledgerIndex: 1000, ledgerHash: LEDGER, commerceMatched: false,
    });
    const calls = (global.fetch as jest.Mock).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls.map((call) => JSON.parse(call[1].body).method)).toEqual(["server_info", "ledger"]);
    expect(calls.every((call) => call[0] === "https://s.altnet.rippletest.net:51234/")).toBe(true);
  });

  it.each([
    ["Mainnet", { network: 0 }],
    ["unvalidated ledger", { ledgerValidated: false }],
    ["invalid ledger hash", { ledgerHash: "notahash" }],
  ])("fails closed for %s", async (_label, updates) => {
    mock(updates);
    const response = await GET();
    expect(response.status).toBe(503);
    expect((await response.json()).commerceMatched).toBe(false);
  });

  it("bounds empty-ledger lookback to four ledgers and never invents a hash", async () => {
    mock({ transactions: [] });
    const response = await GET();
    expect(response.status).toBe(404);
    expect((await response.json()).status).toBe("empty");
    expect((global.fetch as jest.Mock).mock.calls).toHaveLength(5);
  });

  it("rejects a non-hex transaction candidate", async () => {
    mock({ transactions: ["DEMO-NOT-A-REAL-HASH"] });
    const response = await GET();
    expect(response.status).toBe(404);
  });

  it("returns no internals when upstream is unreachable", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("PRIVATE CONFIG DETAIL")) as typeof fetch;
    const response = await GET();
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("PRIVATE CONFIG DETAIL");
  });
});
