/** @jest-environment node */
import { GET } from "@/app/api/xrpl-testnet-public-status/route";

describe("XRPL Testnet public status — real but strictly read-only", () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  it("shows only Testnet validated ledger without suggesting a payment settled", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          status: "success",
          info: { network_id: 1, validated_ledger: { seq: 1234567 } },
        },
      }),
    }) as typeof fetch;
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      status: "connected",
      network: "xrpl:1",
      validatedLedger: 1234567,
      paymentVerified: false,
    });
    const [, request] = (global.fetch as jest.Mock).mock.calls[0];
    expect(request.method).toBe("POST");
    expect(request.body).toContain('"server_info"');
    expect(request.body).not.toContain("seed");
  });

  it("fails closed for Mainnet or unverifiable node identity", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: { status: "success", info: { network_id: 0, validated_ledger: { seq: 99 } } },
      }),
    }) as typeof fetch;
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.paymentVerified).toBe(false);
    expect(body.validatedLedger).toBeNull();
  });

  it("does not disclose transport or internal details on an upstream failure", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("internal endpoint secret text")) as typeof fetch;
    const res = await GET();
    expect(res.status).toBe(503);
    expect(JSON.stringify(await res.json())).not.toContain("secret text");
  });
});
