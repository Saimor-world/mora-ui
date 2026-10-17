import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { XRPLTestnetInspector } from "@/components/os/commerce/XRPLTestnetInspector";
import { inspectRealTestnetTransaction } from "@/lib/api/xrplCommerceInspector";
import { CoreError } from "@/lib/api/http";

jest.mock("@/lib/api/xrplCommerceInspector", () => ({
  inspectRealTestnetTransaction: jest.fn(),
}));
const inspect = inspectRealTestnetTransaction as jest.Mock;
const HASH = "A".repeat(64);

beforeEach(() => jest.clearAllMocks());

describe("Real XRPL Testnet inspector panel", () => {
  it("does not call the ledger for an incomplete hash", () => {
    render(<XRPLTestnetInspector />);
    fireEvent.change(screen.getByTestId("testnet-hash-input"), { target: { value: "invalid" } });
    expect(screen.getByRole("button", { name: /Echten Testnet-Hash prüfen/i })).toBeDisabled();
    expect(inspect).not.toHaveBeenCalled();
  });

  it("shows confirmed ledger facts without granting any access", async () => {
    inspect.mockResolvedValue({
      network: "xrpl:1", tx_hash: HASH, ledger_index: 123, ledger_hash: "B".repeat(64),
      delivered_drops: 1000, sender: "r" + "S".repeat(30), destination: "r" + "D".repeat(30),
      invoice_id: null, destination_tag: null, status: "validated_testnet_xrp_transfer_observed",
      order_verified: false, receipt_issued: false,
      product_access_granted: false, finance_posting_created: false,
    });
    render(<XRPLTestnetInspector />);
    fireEvent.change(screen.getByTestId("testnet-hash-input"), { target: { value: HASH } });
    fireEvent.click(screen.getByRole("button", { name: /Echten Testnet-Hash prüfen/i }));
    await waitFor(() => expect(screen.getByText("Validierter Testnet-Transfer beobachtet")).toBeInTheDocument());
    expect(screen.getByText(/Keine Finanzbuchung/)).toBeInTheDocument();
    expect(screen.getByText("123")).toBeInTheDocument();
    expect(screen.getByText(/1000 Drops/)).toBeInTheDocument();
  });

  it("labels disabled CORE honestly without inventing payment", async () => {
    inspect.mockRejectedValue(new CoreError("Testnet inspector disabled", 404));
    render(<XRPLTestnetInspector />);
    fireEvent.change(screen.getByTestId("testnet-hash-input"), { target: { value: HASH } });
    fireEvent.click(screen.getByRole("button", { name: /Echten Testnet-Hash prüfen/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/noch nicht aktiviert/));
    expect(screen.queryByText("Validierter Testnet-Transfer beobachtet")).not.toBeInTheDocument();
  });

  it("rejects a stale result when input hash changes", async () => {
    inspect.mockResolvedValue({
      network: "xrpl:1", tx_hash: HASH, ledger_index: 123, ledger_hash: "B".repeat(64),
      delivered_drops: 1000, sender: "r" + "S".repeat(30), destination: "r" + "D".repeat(30),
      invoice_id: null, destination_tag: null, status: "validated_testnet_xrp_transfer_observed",
      order_verified: false, receipt_issued: false,
      product_access_granted: false, finance_posting_created: false,
    });
    render(<XRPLTestnetInspector />);
    fireEvent.change(screen.getByTestId("testnet-hash-input"), { target: { value: HASH } });
    fireEvent.click(screen.getByRole("button", { name: /Echten Testnet-Hash prüfen/i }));
    await waitFor(() => expect(screen.getByText("Validierter Testnet-Transfer beobachtet")).toBeInTheDocument());
    fireEvent.change(screen.getByTestId("testnet-hash-input"), { target: { value: "C".repeat(64) } });
    expect(screen.queryByText("Validierter Testnet-Transfer beobachtet")).not.toBeInTheDocument();
  });
});
