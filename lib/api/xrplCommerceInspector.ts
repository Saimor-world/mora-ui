import { corePost } from "@/lib/api/http";

export interface TestnetTransferObservation {
  network: "xrpl:1";
  tx_hash: string;
  ledger_index: number;
  ledger_hash: string;
  sender: string;
  destination: string;
  delivered_drops: number;
  invoice_id: string | null;
  destination_tag: number | null;
  status: "validated_testnet_xrp_transfer_observed";
  order_verified: false;
  receipt_issued: false;
  product_access_granted: false;
  finance_posting_created: false;
}

export const TESTNET_INSPECTOR_PATH = "/v3/blockchain/commerce-lab/inspect-testnet";
const HASH = /^[0-9a-fA-F]{64}$/;

/** Never assume a server reply is a matched merchant payment. */
export async function inspectRealTestnetTransaction(hash: string): Promise<TestnetTransferObservation> {
  if (!HASH.test(hash)) {
    throw new Error("Bitte einen vollständigen 64-stelligen Testnet-Transaktionshash eingeben.");
  }
  const result: unknown = await corePost(
    TESTNET_INSPECTOR_PATH,
    { tx_hash: hash.toUpperCase() },
    { throwAuthErrors: true },
  );
  if (!result || typeof result !== "object") {
    throw new Error("CORE nicht erreichbar. Der echte Testnet-Inspektor ist nicht verbunden.");
  }
  const d = result as Partial<TestnetTransferObservation>;
  if (
    d.network !== "xrpl:1" ||
    d.status !== "validated_testnet_xrp_transfer_observed" ||
    !HASH.test(d.tx_hash ?? "") ||
    !HASH.test(d.ledger_hash ?? "") ||
    !Number.isInteger(d.ledger_index) || (d.ledger_index ?? 0) <= 0 ||
    !Number.isSafeInteger(d.delivered_drops) || (d.delivered_drops ?? 0) <= 0 ||
    typeof d.sender !== "string" ||
    typeof d.destination !== "string" ||
    d.order_verified !== false ||
    d.receipt_issued !== false ||
    d.product_access_granted !== false ||
    d.finance_posting_created !== false
  ) {
    throw new Error("CORE lieferte keinen gültigen, eingeschränkten Testnet-Nachweis.");
  }
  return d as TestnetTransferObservation;
}
