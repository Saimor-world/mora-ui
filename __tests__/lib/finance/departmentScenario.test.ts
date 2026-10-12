import { departmentScenario } from '@/lib/finance/departmentScenario';

describe('department planning scenario', () => {
  it('keeps an unspecified reserve or budget unknown', () => {
    expect(departmentScenario('3600', '', '100').state).toBe('incomplete');
  });
  it('protects the reserve before calculating full spend months', () => {
    expect(departmentScenario('3600', '3000', '100')).toEqual({ state: 'scenario', capacityCents: BigInt(60000), fullMonths: BigInt(6) });
  });
  it('rejects reserve and budget beyond assumed capacity', () => {
    expect(departmentScenario('100', '101', '1').state).toBe('reserve_exceeds_treasury');
    expect(departmentScenario('100', '90', '11').state).toBe('budget_exceeds_capacity');
  });
  it('does not divide by zero or round fractional cents into cash', () => {
    expect(departmentScenario('0.30', '0.10', '0.10')).toEqual({ state: 'scenario', capacityCents: BigInt(20), fullMonths: BigInt(2) });
    expect(departmentScenario('100', '0', '0').fullMonths).toBeNull();
    expect(departmentScenario('1.001', '0', '1').state).toBe('incomplete');
  });
});
