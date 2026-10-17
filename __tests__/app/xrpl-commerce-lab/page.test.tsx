import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import XRPLCommerceLabPage from "@/app/xrpl-commerce-lab/page";

jest.mock("next/link", () => {
  const LinkMock = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  LinkMock.displayName = "NextLinkMock";
  return LinkMock;
});

describe("XRPL Commerce Lab — visible UI boundaries", () => {
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

  it("requires a new simulation after switching scenarios", () => {
    render(<XRPLCommerceLabPage />);
    fireEvent.click(screen.getByRole("button", { name: /Zahlungsprüfung simulieren/i }));
    fireEvent.click(screen.getByRole("button", { name: /Nicht bestätigt/i }));
    expect(screen.queryByText("REVIEW_REQUIRED")).not.toBeInTheDocument();
    expect(screen.getByText("Bereit für die Überprüfung")).toBeInTheDocument();
  });
});
