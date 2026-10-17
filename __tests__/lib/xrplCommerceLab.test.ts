import { COMMERCE_SCENARIOS, simulateCommerceOutcome } from "@/lib/xrplCommerceLab";

describe("XRPL Commerce Lab — explicit synthetic story", () => {
  it("always labels the valid example as requiring a human review, never product access", () => {
    const result = simulateCommerceOutcome("valid");
    expect(result.accepted).toBe(true);
    expect(result.code).toBe("REVIEW_REQUIRED");
    expect(result.detail).toMatch(/gesperrt/);
  });

  it("fails closed for all negative scenarios", () => {
    for (const scenario of COMMERCE_SCENARIOS) {
      const result = simulateCommerceOutcome(scenario.key);
      expect(result.title.length).toBeGreaterThan(4);
      expect(result.events.length).toBeGreaterThan(2);
      if (scenario.key !== "valid") {
        expect(result.accepted).toBe(false);
        expect(result.code).not.toBe("REVIEW_REQUIRED");
      }
    }
  });

  it("never describes scenarios as real ledger evidence", () => {
    for (const scenario of COMMERCE_SCENARIOS) {
      const result = simulateCommerceOutcome(scenario.key);
      expect(result.events.some((event) => event.includes("Simuliert") || event.includes("Testauftrag"))).toBe(true);
    }
  });
});
