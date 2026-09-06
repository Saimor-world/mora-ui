import { NextRequest, NextResponse } from 'next/server';

const XRPL_RPC = process.env.XRPL_RPC_URL || 'https://xrplcluster.com';
const XRPL_ADDRESS_RE = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;

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

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')?.trim() || '';

  if (!XRPL_ADDRESS_RE.test(address)) {
    return NextResponse.json({ error: 'Invalid XRPL address' }, { status: 400 });
  }

  try {
    const [info, lines] = await Promise.all([
      rpc<any>('account_info', { account: address, ledger_index: 'validated', signer_lists: true }),
      rpc<any>('account_lines', { account: address, ledger_index: 'validated', limit: 400 }),
    ]);

    const drops = BigInt(info?.account_data?.Balance || '0');
    const xrp = Number(drops) / 1_000_000;
    const trustLines = Array.isArray(lines?.lines)
      ? lines.lines.map((line: any) => ({
          currency: String(line.currency || ''),
          balance: String(line.balance || '0'),
          issuer: String(line.account || ''),
          limit: String(line.limit || '0'),
          noRipple: Boolean(line.no_ripple),
        }))
      : [];

    return NextResponse.json({
      network: 'mainnet',
      mode: 'read-only',
      address,
      ledgerIndex: info?.ledger_index ?? lines?.ledger_index ?? null,
      xrp,
      drops: drops.toString(),
      ownerCount: Number(info?.account_data?.OwnerCount || 0),
      sequence: Number(info?.account_data?.Sequence || 0),
      signerListCount: Array.isArray(info?.signer_lists) ? info.signer_lists.length : 0,
      trustLines,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'XRPL request failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
