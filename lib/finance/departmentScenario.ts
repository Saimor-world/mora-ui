/** Planning only. No ledger, mandate or execution authority is created. */
export function departmentScenario(treasury: string, reserve: string, monthly: string) {
  function cents(raw: string): bigint | null {
    if (!/^\d{1,12}(\.\d{1,2})?$/.test(raw)) return null;
    const [whole, fraction = ''] = raw.split('.');
    return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, '0'));
  }
  const total = cents(treasury);
  const protectedAmount = cents(reserve);
  const budget = cents(monthly);
  if (total === null || protectedAmount === null || budget === null) return { state: 'incomplete' as const };
  if (protectedAmount > total) return { state: 'reserve_exceeds_treasury' as const };
  const capacity = total - protectedAmount;
  return {
    state: budget > capacity ? 'budget_exceeds_capacity' as const : 'scenario' as const,
    capacityCents: capacity,
    fullMonths: budget > BigInt(0) ? capacity / budget : null,
  };
}
