import type { FinanceMoney, FinancePosting, FinanceRecord } from '@/lib/queries/useFinanceStateFlow';

function normalizeDecimal(value: string) {
  const raw = value.trim();
  const negative = raw.startsWith('-');
  const unsigned = negative || raw.startsWith('+') ? raw.slice(1) : raw;
  if (!/^\d+(\.\d+)?$/.test(unsigned)) return null;
  const [wholeRaw, fractionRaw = ''] = unsigned.split('.');
  return {
    negative,
    whole: wholeRaw.replace(/^0+(?=\d)/, '') || '0',
    fraction: fractionRaw,
  };
}

export function formatFinanceMoney(value: FinanceMoney | null | undefined): string {
  if (!value) return '—';
  const parsed = normalizeDecimal(value.value);
  if (!parsed) return `${value.value} ${value.currency}`;

  const grouped = parsed.whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const fraction = parsed.fraction.padEnd(value.scale, '0').slice(0, value.scale);
  const symbol = value.currency === 'EUR' ? '€' : value.currency;
  const decimal = value.scale > 0 ? `,${fraction}` : '';
  return `${parsed.negative ? '-' : ''}${grouped}${decimal} ${symbol}`;
}

export function absoluteFinanceMoney(value: FinanceMoney | null | undefined): FinanceMoney | null {
  if (!value) return null;
  return {
    ...value,
    value: value.value.trim().replace(/^[+-]/, ''),
  };
}

function isCashPosting(posting: FinancePosting) {
  return Boolean(
    posting.account_id
    && (posting.ledger_code.startsWith('cash:') || posting.ledger_code.startsWith('reversal:cash:')),
  );
}

function signOf(value: FinanceMoney | null | undefined): 'positive' | 'negative' | 'zero' | 'unknown' {
  if (!value) return 'unknown';
  const parsed = normalizeDecimal(value.value);
  if (!parsed) return 'unknown';
  const magnitude = `${parsed.whole}${parsed.fraction}`.replace(/^0+/, '');
  if (!magnitude) return 'zero';
  return parsed.negative ? 'negative' : 'positive';
}

export type FinanceMovementSummary = {
  kind: 'movement' | 'transfer' | 'reversal' | 'unknown';
  amount: FinanceMoney | null;
  direction: 'in' | 'out' | 'neutral' | 'unknown';
  cashPostings: FinancePosting[];
};

export function financeRecordMovementSummary(record: FinanceRecord): FinanceMovementSummary {
  const cashPostings = (record.postings || []).filter(isCashPosting);

  if (record.classification === 'internal_transfer') {
    const debit = cashPostings.find((posting) => signOf(posting.amount) === 'negative');
    const credit = cashPostings.find((posting) => signOf(posting.amount) === 'positive');
    return {
      kind: 'transfer',
      amount: absoluteFinanceMoney(debit?.amount || credit?.amount),
      direction: 'neutral',
      cashPostings,
    };
  }

  if (
    record.correction_of_record_id
    || cashPostings.some((posting) => posting.ledger_code.startsWith('reversal:cash:'))
  ) {
    const posting = cashPostings[0];
    const sign = signOf(posting?.amount);
    return {
      kind: 'reversal',
      amount: posting?.amount || null,
      direction: sign === 'positive' ? 'in' : sign === 'negative' ? 'out' : 'unknown',
      cashPostings,
    };
  }

  if (cashPostings.length === 1) {
    const posting = cashPostings[0];
    const sign = signOf(posting.amount);
    return {
      kind: 'movement',
      amount: posting.amount,
      direction: sign === 'positive' ? 'in' : sign === 'negative' ? 'out' : sign === 'zero' ? 'neutral' : 'unknown',
      cashPostings,
    };
  }

  return {
    kind: 'unknown',
    amount: null,
    direction: 'unknown',
    cashPostings,
  };
}


function decimalToAtomic(value: FinanceMoney): bigint | null {
  const parsed = normalizeDecimal(value.value);
  if (!parsed) return null;
  const fraction = parsed.fraction.padEnd(value.scale, '0').slice(0, value.scale);
  const raw = `${parsed.whole}${fraction}`.replace(/^0+(?=\d)/, '') || '0';
  const atomic = BigInt(raw);
  return parsed.negative ? -atomic : atomic;
}

export function differenceFinanceMoney(
  closing: FinanceMoney | null | undefined,
  opening: FinanceMoney | null | undefined,
): FinanceMoney | null {
  if (!closing || !opening) return null;
  if (closing.currency !== opening.currency || closing.scale !== opening.scale) return null;
  const closingAtomic = decimalToAtomic(closing);
  const openingAtomic = decimalToAtomic(opening);
  if (closingAtomic == null || openingAtomic == null) return null;

  const scale = closing.scale;
  const difference = closingAtomic - openingAtomic;
  const negative = difference < BigInt(0);
  const absolute = negative ? -difference : difference;
  const raw = absolute.toString().padStart(scale + 1, '0');
  const whole = scale > 0 ? raw.slice(0, -scale) : raw;
  const fraction = scale > 0 ? raw.slice(-scale) : '';
  return {
    value: `${negative ? '-' : ''}${whole}${scale > 0 ? `.${fraction}` : ''}`,
    currency: closing.currency,
    scale,
  };
}
