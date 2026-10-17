import { corePost } from "@/lib/api/http";
import { inspectRealTestnetTransaction } from "@/lib/api/xrplCommerceInspector";

jest.mock("@/lib/api/http", () => {
  class CoreError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
  return { corePost: jest.fn(), CoreError };
});

const rpc = corePost as jest.Mock;
const HASH = "A".repeat(64);

const valid = {
  network: "xrpl:1",
  tx_hash: HASH,
  ledger_index: 123,
  ledger_hash: "B".repeat(64),
  sender: "r" + "S".repeat(30),
  destination: "r" + "D".repeat(30),
  delivered_drops: 1000,
  invoice_id: "C".repeat(64),
  destination_tag: 42,
  status: "validated_testnet_xrp_transfer_observed",
  order_verified: false,
  receipt_issued: false,
  product_access_granted: false,
  finance_posting_created: false,
};

beforeEach(() => jest.clearAllMocks());

describe("CORE-backed read-only Testnet inspector", () => {
  it("rejects non-hex transaction IDs before making any request", async () => {
    await expect(inspectRealTestnetTransaction("wrong")).rejects.toThrow(/64-stelligen/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("calls only the owner-protected Testnet inspection endpoint", async () => {
    rpc.mockResolvedValue(valid);
    const data = await inspectRealTestnetTransaction(HASH.toLowerCase());
    expect(rpc).toHaveBeenCalledWith(
      "/v3/blockchain/commerce-lab/inspect-testnet",
      { tx_hash: HASH },
      { throwAuthErrors: true },
    );
    expect(data.order_verified).toBe(false);
    expect(data.product_access_granted).toBe(false);
  });

  it.each([
    { ...valid, network: "xrpl:0" },
    { ...valid, product_access_granted: true },
    { ...valid, order_verified: true },
    { ...valid, receipt_issued: true },
    { ...valid, finance_posting_created: true },
    { ...valid, ledger_hash: "wrong" },
    { ...valid, delivered_drops: 0 },
    null,
  ])("rejects responses that could falsely imply merchant payment", async (bad) => {
    rpc.mockResolvedValue(bad);
    await expect(inspectRealTestnetTransaction(HASH)).rejects.toThrow();
  });

  it("treats an unreachable CORE as unavailable instead of success", async () => {
    rpc.mockResolvedValue(null);
    await expect(inspectRealTestnetTransaction(HASH)).rejects.toThrow(/nicht erreichbar/);
  });
});
