export type CommerceScenario = "valid" | "underpaid" | "replay" | "pending" | "wrong_destination";

export type ScenarioOutcome = {
  accepted: boolean;
  title: string;
  detail: string;
  code: string;
  events: readonly string[];
};

export const COMMERCE_SCENARIOS: ReadonlyArray<{ key: CommerceScenario; label: string; hint: string }> = [
  { key: "valid", label: "Korrekte Zahlung", hint: "Ledger bestätigt · Betrag passt" },
  { key: "underpaid", label: "Falscher Betrag", hint: "999 statt 1.000 Drops" },
  { key: "replay", label: "Doppelte Zahlung", hint: "Transaktion bereits beansprucht" },
  { key: "pending", label: "Nicht bestätigt", hint: "Kein validierter Ledger-Eintrag" },
  { key: "wrong_destination", label: "Falsches Ziel", hint: "Empfänger stimmt nicht überein" },
] as const;

/** Pure client-side story data. NEVER interpret it as actual blockchain evidence. */
export function simulateCommerceOutcome(scenario: CommerceScenario): ScenarioOutcome {
  switch (scenario) {
    case "valid":
      return {
        accepted: true,
        title: "Zahlungsnachweis plausibel",
        detail: "Die synthetische Transaktion ist dem Demo-Auftrag eindeutig zugeordnet. Eine Produktfreigabe bleibt gesperrt und benötigt ein separates CORE-Review.",
        code: "REVIEW_REQUIRED",
        events: ["Testauftrag vorbereitet", "Simulierte Ledger-Prüfung bestanden", "Rechnungskennung und Betrag passen", "Menschliche Freigabe erforderlich"],
      };
    case "underpaid":
      return {
        accepted: false,
        title: "Betrag stimmt nicht",
        detail: "Erwartet: 1.000 Drops. Simuliert eingegangen: 999 Drops. Es wird keine Freigabe erzeugt.",
        code: "AMOUNT_MISMATCH",
        events: ["Testauftrag vorbereitet", "Simulierte Transaktion gelesen", "Betragsprüfung fehlgeschlagen", "Keine Freigabe"],
      };
    case "replay":
      return {
        accepted: false,
        title: "Zahlung bereits zugeordnet",
        detail: "Die simulierte Transaktionskennung wurde bereits für eine andere Bestellung verwendet. Mehrfachverwendung wird blockiert.",
        code: "REPLAY_REJECTED",
        events: ["Testauftrag vorbereitet", "Simulierte Transaktion gelesen", "Eindeutigkeit verletzt", "Keine zweite Zuordnung"],
      };
    case "pending":
      return {
        accepted: false,
        title: "Ledger-Bestätigung fehlt",
        detail: "Ohne validierten Ledger und überprüften Hash bleibt der Auftrag offen.",
        code: "LEDGER_NOT_VALIDATED",
        events: ["Testauftrag vorbereitet", "Simulierte Transaktion gelesen", "Bestätigung nicht vorhanden", "Keine Freigabe"],
      };
    case "wrong_destination":
      return {
        accepted: false,
        title: "Empfänger stimmt nicht",
        detail: "Das Ziel der simulierten Zahlung weicht von den unveränderlichen Angebotsdaten ab.",
        code: "DESTINATION_MISMATCH",
        events: ["Testauftrag vorbereitet", "Simulierte Transaktion gelesen", "Empfängerprüfung fehlgeschlagen", "Keine Freigabe"],
      };
  }
}
