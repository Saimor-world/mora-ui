import { financeRecordMovementSummary } from '@/lib/finance/format';
import type { FinanceMoney, FinanceRecord } from '@/lib/queries/useFinanceStateFlow';

export const DEFAULT_CAPITAL_POLICY = {
  tradingBudgetShareBps: 1000,
  monthlyLossStopBps: 500,
  perTradeRiskBps: 100,
  leverageAllowed: false,
  executionMode: 'manual_approval' as const,
};

type AtomicMoney = {
  atomic: bigint;
  currency: string;
  scale: number;
};

export type MonthlyProfitCenterSnapshot = {
  period: string;
  currency: string;
  coverage: 'complete' | 'partial';
  customerReceipts: FinanceMoney;
  operatingExpenses: FinanceMoney;
  refunds: FinanceMoney;
  operatingCashResult: FinanceMoney;
  founderFunding: FinanceMoney;
  excludedAdjustments: FinanceMoney;
  includedRecords: number;
  ignoredRecords: number;
  unresolvedCorrections: number;
  financeGeneratedProfit: null;
  draftTradingBudget: FinanceMoney | null;
  draftMonthlyLossStop: FinanceMoney | null;
  draftPerTradeRisk: FinanceMoney | null;
  policy: typeof DEFAULT_CAPITAL_POLICY;
};

function parseMoney(value: FinanceMoney | null | undefined): AtomicMoney | null {
  if (!value || !/^[-+]?\d+(\.\d+)?$/.test(value.value.trim())) return null;
  const raw = value.value.trim();
  const negative = raw.startsWith('-');
  const unsigned = raw.replace(/^[-+]/, '');
  const [whole, fraction = ''] = unsigned.split('.');
  if (fraction.length > value.scale) return null;
  const atomicRaw = `${whole}${fraction.padEnd(value.scale, '0')}`.replace(/^0+(?=\d)/, '') || '0';
  const atomic = BigInt(atomicRaw);
  return {
    atomic: negative ? -atomic : atomic,
    currency: value.currency,
    scale: value.scale,
  };
}

function asMoney(atomic: bigint, currency: string, scale: number): FinanceMoney {
  const negative = atomic < 0n;
  const absolute = negative ? -atomic : atomic;
  const raw = absolute.toString().padStart(scale + 1, '0');
  const whole = scale ? raw.slice(0, -scale) : raw;
  const fraction = scale ? raw.slice(-scale) : '';
  return {
    value: `${negative ? '-' : ''}${whole}${scale ? `.${fraction}` : ''}`,
    currency,
    scale,
  };
}

function periodKey(value: string | Date, timeZone: string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  return year && month ? `${year}-${month}` : null;
}

function multiplyBps(value: bigint, bps: number) {
  return (value * BigInt(bps)) / 10_000n;
}

export function buildMonthlyProfitCenter(
  records: FinanceRecord[],
  options: {
    now?: Date;
    currency?: string;
    timeZone?: string;
    hasOlderRecords?: boolean;
    policy?: typeof DEFAULT_CAPITAL_POLICY;
  } = {},
): MonthlyProfitCenterSnapshot {
  const now = options.now ?? new Date();
  const currency = options.currency ?? 'EUR';
  const timeZone = options.timeZone ?? 'Europe/Berlin';
  const policy = options.policy ?? DEFAULT_CAPITAL_POLICY;
  const period = periodKey(now, timeZone) ?? 'unknown';

  const byId = new Map(records.map((record) => [record.id, record]));
  let scale = currency === 'EUR' ? 2 : 6;
  let customerReceipts = 0n;
  let operatingExpenseCash = 0n;
  let refundsCash = 0n;
  let founderFunding = 0n;
  let excludedAdjustments = 0n;
  let includedRecords = 0;
  let ignoredRecords = 0;
  let unresolvedCorrections = 0;

  for (const record of records) {
    if (!record.effective_at || periodKey(record.effective_at, timeZone) !== period) continue;

    const movement = financeRecordMovementSummary(record);
    const parsed = parseMoney(movement.amount);
    if (!parsed || parsed.currency !== currency) {
      ignoredRecords += 1;
      continue;
    }
    scale = parsed.scale;

    let classification = record.classification;
    if (record.correction_of_record_id) {
      const original = byId.get(record.correction_of_record_id);
      if (original) {
        classification = original.classification;
      } else {
        unresolvedCorrections += 1;
        excludedAdjustments += parsed.atomic;
        continue;
      }
    }

    switch (classification) {
      case 'customer_receipt':
        customerReceipts += parsed.atomic;
        includedRecords += 1;
        break;
      case 'operating_expense':
        operatingExpenseCash += parsed.atomic;
        includedRecords += 1;
        break;
      case 'refund':
        refundsCash += parsed.atomic;
        includedRecords += 1;
        break;
      case 'founder_funding':
        founderFunding += parsed.atomic;
        includedRecords += 1;
        break;
      case 'internal_transfer':
        includedRecords += 1;
        break;
      case 'adjustment':
      case 'unclassified':
      default:
        excludedAdjustments += parsed.atomic;
        includedRecords += 1;
        break;
    }
  }

  const operatingCashResult = customerReceipts + operatingExpenseCash + refundsCash;
  const operatingExpenses = operatingExpenseCash < 0n ? -operatingExpenseCash : -operatingExpenseCash;
  const refunds = refundsCash < 0n ? -refundsCash : -refundsCash;
  const coverage = options.hasOlderRecords ? 'partial' : 'complete';
  const canDraftBudget = (
    coverage === 'complete'
    && ignoredRecords === 0
    && unresolvedCorrections === 0
    && operatingCashResult > 0n
  );
  const draftTradingBudgetAtomic = canDraftBudget
    ? multiplyBps(operatingCashResult, policy.tradingBudgetShareBps)
    : null;
  const draftMonthlyLossStopAtomic = draftTradingBudgetAtomic == null
    ? null
    : multiplyBps(draftTradingBudgetAtomic, policy.monthlyLossStopBps);
  const draftPerTradeRiskAtomic = draftTradingBudgetAtomic == null
    ? null
    : multiplyBps(draftTradingBudgetAtomic, policy.perTradeRiskBps);

  return {
    period,
    currency,
    coverage,
    customerReceipts: asMoney(customerReceipts, currency, scale),
    operatingExpenses: asMoney(operatingExpenses, currency, scale),
    refunds: asMoney(refunds, currency, scale),
    operatingCashResult: asMoney(operatingCashResult, currency, scale),
    founderFunding: asMoney(founderFunding, currency, scale),
    excludedAdjustments: asMoney(excludedAdjustments, currency, scale),
    includedRecords,
    ignoredRecords,
    unresolvedCorrections,
    financeGeneratedProfit: null,
    draftTradingBudget: draftTradingBudgetAtomic == null ? null : asMoney(draftTradingBudgetAtomic, currency, scale),
    draftMonthlyLossStop: draftMonthlyLossStopAtomic == null ? null : asMoney(draftMonthlyLossStopAtomic, currency, scale),
    draftPerTradeRisk: draftPerTradeRiskAtomic == null ? null : asMoney(draftPerTradeRiskAtomic, currency, scale),
    policy,
  };
}
