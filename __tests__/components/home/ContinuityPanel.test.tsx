import React from "react";
import "@testing-library/jest-dom";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ContinuityPanel } from "@/components/home/ContinuityPanel";
afterEach(cleanup);
const thread = {
 id: "ct_123", state: "open", proposal_hash: "a".repeat(64), task_id: null,
 proposal: { statement: "Keine verknüpfte SAIMÔR-Aufgabe.", suggestion: "Vorbereiten?",
 expires_at: new Date(Date.now() + 600000).toISOString(),
 action: { title: "Vorbereiten: Testtermin", due_date: new Date().toISOString(), visibility: "private", type: "task.create_internal" },
 evidence: { provider: "google_calendar", observed_at: new Date().toISOString() },
 confidence: { level: "high", limitation: "Keine Aussage über externe Reminder." }}
};
it("requires review then explicit confirmation of the exact CORE proposal", async () => {
 const request = jest.fn().mockResolvedValueOnce([thread]).mockResolvedValueOnce({task_id:"task_1"}).mockResolvedValueOnce([{...thread,state:"approved",task_id:"task_1"}]);
 render(<ContinuityPanel request={request} />);
 fireEvent.click(await screen.findByRole("button",{name:"Vorschlag prüfen"}));
 expect(request).toHaveBeenCalledTimes(1);
 expect(screen.getByText(/Keine Aussage über externe Reminder/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"Private Aufgabe bestätigen"}));
 await screen.findByText("Aufgabe gespeichert · nur für dich");
 expect(request).toHaveBeenNthCalledWith(2,"approve",{id:thread.id,proposal_hash:thread.proposal_hash});
 expect(request).not.toHaveBeenCalledWith("scan");
});
it("does not turn source failure into an empty calendar", async () => {
 const request = jest.fn().mockRejectedValue(new Error("Nicht verbunden"));
 render(<ContinuityPanel request={request} />);
 expect(await screen.findByText("Nicht verbunden")).toBeInTheDocument();
 expect(screen.queryByText(/Keine vorbereiteten Vorschläge/)).not.toBeInTheDocument();
});
it("clears the old confirmation after a conflict", async () => {
 const request = jest.fn().mockResolvedValueOnce([thread]).mockRejectedValueOnce(new Error("Vorschlag geändert"));
 render(<ContinuityPanel request={request} />);
 fireEvent.click(await screen.findByRole("button",{name:"Vorschlag prüfen"}));
 fireEvent.click(screen.getByRole("button",{name:"Private Aufgabe bestätigen"}));
 await screen.findByText("Vorschlag geändert");
 expect(screen.queryByRole("button",{name:"Private Aufgabe bestätigen"})).not.toBeInTheDocument();
});
it("never scans automatically and reloads threads after an explicit scan", async () => {
 const request = jest.fn().mockResolvedValue([]);
 render(<ContinuityPanel request={request} />);
 await screen.findByText(/Keine vorbereiteten Vorschläge/);
 expect(request.mock.calls).toEqual([["list"]]);
 fireEvent.click(screen.getByRole("button",{name:"Kalender prüfen"}));
 await waitFor(()=>expect(request.mock.calls).toEqual([["list"],["scan"],["list"]]));
});

