import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import XRPLCommerceLabPage from "@/app/xrpl-commerce-lab/page";

jest.mock("next/link", () => {
  const LinkMock = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  LinkMock.displayName = "NextLinkMock";
  return LinkMock;
});

describe("XRPL Commerce Lab — visible UI boundaries", () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    // JSDOM deliberately does not implement fetch. Simulate a pending read-only
    // status request; scenario tests must never rely on blockchain availability.
    global.fetch = jest.fn(() => new Promise<Response>(() => undefined)) as typeof fetch;
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });
  it("clearly labels synthetic data and never promises a live payment", () => {
    render(<XRPLCommerceLabPage />);
    expect(screen.getByText("Nur Simulation")).toBeInTheDocument();
    expect(screen.getByText("LIVE SETTLEMENT: DEAKTIVIERT")).toBeInTheDocument();
    expect(screen.getByText(/Keine Verbindung zur Blockchain/)).toBeInTheDocument();
    expect(screen.getByText("Bereit für die Überprüfung")).toBeInTheDocument();
  });

  it("shows a review only after running a synthetic valid-payment case", () => {
    render(<XRPLCommerceLabPage />);
    fireEvent.click(screen.getByRole("button", { name: /Zahlungsprüfung simulieren/i }));
    expect(screen.getByText("Zahlungsnachweis plausibel")).toBeInTheDocument();
    expect(screen.getByText("REVIEW_REQUIRED")).toBeInTheDocument();
    expect(screen.getByText(/Nur zur menschlichen Prüfung/)).toBeInTheDocument();
    expect(screen.getByText("LIVE SETTLEMENT: DEAKTIVIERT")).toBeInTheDocument();
  });

  it("rejects underpayment, then resets to prepared state with new order", () => {
    render(<XRPLCommerceLabPage />);
    fireEvent.click(screen.getByRole("button", { name: /Falscher Betrag/i }));
    fireEvent.click(screen.getByRole("button", { name: /Zahlungsprüfung simulieren/i }));
    expect(screen.getByText("AMOUNT_MISMATCH")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Neuen Demo-Auftrag/i }));
    expect(screen.queryByText("AMOUNT_MISMATCH")).not.toBeInTheDocument();
    expect(screen.getByText(/#0002/)).toBeInTheDocument();
  });

  it("accepts a pasted Testnet hash but never reports that a product was purchased", async () => {
    const tx = "A".repeat(64);
    global.fetch = jest.fn(async (url: string) => ({
      ok: true,
      json: async () => url.includes("public-transaction")
        ? { status: "validated", hash: tx, ledgerIndex: 9999, ledgerHash: "B".repeat(64),
            transactionType: "Payment", result: "tesSUCCESS", nativePaymentDrops: "1000", successful: true }
        : { status: "connected", validatedLedger: 10001 },
    })) as typeof fetch;
    render(<XRPLCommerceLabPage />);
    expect(screen.getByRole("button", { name: /Echten Nachweis prüfen/i })).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "Testnet-Transaktionshash" }), {
      target: { value: tx },
    });
    fireEvent.click(screen.getByRole("button", { name: /Echten Nachweis prüfen/i }));
    await waitFor(() => expect(screen.getByText("Validierter Testnet-Ledger")).toBeInTheDocument());
    expect(screen.getByText("Kein Shop-Zahlungsbeleg")).toBeInTheDocument();
    expect(screen.getByText(/weder Bestellzuordnung noch Freigabe/)).toBeInTheDocument();
  });

  it("requires a new simulation after switching scenarios", () => {
    render(<XRPLCommerceLabPage />);
    fireEvent.click(screen.getByRole("button", { name: /Zahlungsprüfung simulieren/i }));
    fireEvent.click(screen.getByRole("button", { name: /Nicht bestätigt/i }));
    expect(screen.queryByText("REVIEW_REQUIRED")).not.toBeInTheDocument();
    expect(screen.getByText("Bereit für die Überprüfung")).toBeInTheDocument();
  });
});
