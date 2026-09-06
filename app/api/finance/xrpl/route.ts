import { NextRequest, NextResponse } from 'next/server';

const XRPL_RPC = process.env.XRPL_RPC_URL || 'https://xrplcluster.com';
const XRPL_ADDRESS_RE = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
const LSF_DISABLE_MASTER = 0x00100000;
const SAIMOR_COMMERCE_TAG_MIN = 0x53000000;
const SAIMOR_COMMERCE_TAG_MAX = 0x53ffffff;

async function rpc<T>(method: string, params: Record<string, unknown>): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(XRPL_RPC, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method, params: [{ ...params, api_version: 2 }] }),
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`XRPL RPC returned ${response.status}`);
    }

    const payload = await response.json();
    if (payload?.result?.status === 'error' || payload?.error) {
      throw new Error(payload?.result?.error_message || payload?.result?.error || payload?.error || 'XRPL RPC error');
    }

    return payload.result as T;
  } finally {
    clearTimeout(timeout);
  }
}

function deliveredAmount(entry: any, tx: any) {
  const metaDelivered = entry?.meta?.delivered_amount ?? entry?.meta?.DeliveredAmount;
  if (metaDelivered && metaDelivered !== 'unavailable') return metaDelivered;
  return tx?.DeliverMax ?? tx?.Amount ?? null;
}

function normalizeTransaction(entry: any, address: string) {
  const tx = entry?.tx_json || entry?.tx || {};
  const destinationTag = Number.isInteger(tx?.DestinationTag) ? Number(tx.DestinationTag) : null;
  const commerce = destinationTag !== null
    && destinationTag >= SAIMOR_COMMERCE_TAG_MIN
    && destinationTag <= SAIMOR_COMMERCE_TAG_MAX;

  return {
    hash: String(entry?.hash || tx?.hash || ''),
    ledgerIndex: Number(entry?.ledger_index || 0) || null,
    closeTimeIso: entry?.close_time_iso || null,
    type: String(tx?.TransactionType || 'Unknown'),
    direction: tx?.Account === address ? 'out' : 'in',
    account: String(tx?.Account || ''),
    destination: tx?.Destination ? String(tx.Destination) : null,
    destinationTag,
    invoiceId: tx?.InvoiceID ? String(tx.InvoiceID) : null,
    commerce,
    commerceProductCode: commerce && destinationTag !== null
      ? Math.floor((destinationTag - SAIMOR_COMMERCE_TAG_MIN) / 0x10000)
      : null,
    amount: deliveredAmount(entry, tx),
    result: String(entry?.meta?.TransactionResult || entry?.meta?.transaction_result || ''),
    validated: entry?.validated !== false,
  };
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')?.trim() || '';

  if (!XRPL_ADDRESS_RE.test(address)) {
    return NextResponse.json({ error: 'Invalid XRPL address' }, { status: 400 });
  }

  try {
    const [accountInfo, lines, server, history] = await Promise.all([
      rpc<any>('account_info', { account: address, ledger_index: 'validated', signer_lists: true }),
      rpc<any>('account_lines', { account: address, ledger_index: 'validated', limit: 400 }),
      rpc<any>('server_info', {}),
      rpc<any>('account_tx', {
        account: address,
        ledger_index_min: -1,
        ledger_index_max: -1,
        binary: false,
        limit: 40,
        forward: false,
      }),
    ]);

    const accountData = accountInfo?.account_data || {};
    const drops = BigInt(accountData?.Balance || '0');
    const xrp = Number(drops) / 1_000_000;
    const ownerCount = Number(accountData?.OwnerCount || 0);
    const accountFlags = Number(accountData?.Flags || 0);

    const validatedLedger = server?.info?.validated_ledger || server?.info?.closed_ledger || {};
    const reserveBaseXrp = Number(validatedLedger?.reserve_base_xrp || 0);
    const reserveIncrementXrp = Number(validatedLedger?.reserve_inc_xrp || 0);
    const reserveRequiredXrp = reserveBaseXrp + ownerCount * reserveIncrementXrp;
    const availableXrp = Math.max(0, xrp - reserveRequiredXrp);

    const trustLines = Array.isArray(lines?.lines)
      ? lines.lines.map((line: any) => ({
          currency: String(line.currency || ''),
          balance: String(line.balance || '0'),
          issuer: String(line.account || ''),
          limit: String(line.limit || '0'),
          noRipple: Boolean(line.no_ripple),
          freeze: Boolean(line.freeze),
          authorized: line.authorized === undefined ? null : Boolean(line.authorized),
        }))
      : [];

    const transactions = Array.isArray(history?.transactions)
      ? history.transactions.map((entry: any) => normalizeTransaction(entry, address))
      : [];

    const commerceTransactions = transactions.filter((tx: any) => (
      tx.commerce
      && tx.direction === 'in'
      && tx.type === 'Payment'
      && tx.validated
      && (!tx.result || tx.result === 'tesSUCCESS')
      && typeof tx.amount === 'string'
    ));

    const commerceRevenueDrops = commerceTransactions.reduce((sum: bigint, tx: any) => {
      try {
        return sum + BigInt(tx.amount);
      } catch {
        return sum;
      }
    }, BigInt(0));

    const signerListCount = Array.isArray(accountInfo?.signer_lists) ? accountInfo.signer_lists.length : 0;

    return NextResponse.json({
      network: 'mainnet',
      mode: 'read-only',
      address,
      ledgerIndex: accountInfo?.ledger_index ?? lines?.ledger_index ?? null,
      xrp,
      drops: drops.toString(),
      availableXrp,
      reserve: {
        baseXrp: reserveBaseXrp,
        incrementXrp: reserveIncrementXrp,
        requiredXrp: reserveRequiredXrp,
      },
      ownerCount,
      sequence: Number(accountData?.Sequence || 0),
      security: {
        accountFlags,
        masterKeyDisabled: (accountFlags & LSF_DISABLE_MASTER) !== 0,
        regularKey: accountData?.RegularKey ? String(accountData.RegularKey) : null,
        signerListCount,
      },
      commerce: {
        namespace: '0x53',
        recognizedPayments: commerceTransactions.length,
        recognizedRevenueXrp: Number(commerceRevenueDrops) / 1_000_000,
      },
      trustLines,
      transactions,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'XRPL request failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
