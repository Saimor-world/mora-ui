import { NextRequest, NextResponse } from 'next/server';
import { CAPITAL_POOLS, currencyLabel, positionValue, xrpDebit, lpDelta } from '@/lib/capital/xrpl-capital';

const RPC = process.env.XRPL_RPC_URL || 'https://xrplcluster.com';
async function rpc(method: string, params: Record<string, unknown>) {
  const response = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ method, params: [{ ...params, api_version: 2 }] }), cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('XRPL nicht erreichbar');
  const data = await response.json();
  if (!data.result || data.result.error || data.error || data.result.status === 'error') throw new Error('XRPL-Abfrage fehlgeschlagen');
  return data.result;
}
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')?.trim() || '';
  const baselineHash = request.nextUrl.searchParams.get('deposit')?.trim() || '';
  if (!/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(address) || (baselineHash && !/^[A-Fa-f0-9]{64}$/.test(baselineHash))) return NextResponse.json({ error: 'Ungültige öffentliche Adresse oder Transaktions-ID' }, { status: 400 });
  try {
    const server = await rpc('server_info', {});
    if (server.info?.network_id !== 0) throw new Error('Mainnet nicht bestätigt');
    const info = await rpc('account_info', { account: address, ledger_index: 'validated', signer_lists: true });
    if (info.validated !== true || info.account_data?.Account !== address || !info.ledger_hash) throw new Error('Validierter Account fehlt');
    const ledger = { ledger_hash: info.ledger_hash };
    const linesResult = await rpc('account_lines', { account: address, ...ledger, limit: 400 });
    if (linesResult.validated !== true || !Array.isArray(linesResult.lines)) throw new Error('Trustlines nicht bestätigt');
    const lines = linesResult.lines;
    const candidateAccounts = [...new Set([...CAPITAL_POOLS.map((pool) => pool.account as string), ...lines.filter((line: any) => /^03[A-Fa-f0-9]{38}$/.test(line.currency) && Number(line.balance) > 0).map((line: any) => String(line.account))])];
    const pools = await Promise.all(candidateAccounts.slice(0, 10).map(async (account) => {
      const known = CAPITAL_POOLS.find((pool) => pool.account === account);
      try {
        const data = await rpc('amm_info', { amm_account: account, ...ledger });
        const amm = data.amm;
        if (data.validated !== true || amm?.account !== account) throw new Error('Pool nicht bestätigt');
        const xrpAmount = [amm.amount, amm.amount2].find((a) => typeof a === 'string');
        const token = [amm.amount, amm.amount2].find((a) => a && typeof a === 'object');
        if (!xrpAmount || !token || !amm.lp_token) throw new Error('Kein unterstützter XRP-Pool');
        if (known && (token.currency !== known.currency || token.issuer !== known.issuer)) throw new Error('Issuer stimmt nicht überein');
        const owned = lines.find((line: any) => line.account === account && line.currency === amm.lp_token.currency);
        const ownedLp = Number(owned?.balance || 0);
        const totalLp = Number(amm.lp_token.value);
        const xrp = Number(xrpAmount) / 1_000_000;
        const tokenAmount = Number(token.value);
        const position = positionValue(xrp, tokenAmount, totalLp, ownedLp);
        if (!position) throw new Error('Pool-Zahlen unplausibel');
        return { account, name: known?.name || 'XRP / ' + currencyLabel(token.currency), status: 'verified' as const, symbol: known?.symbol || currencyLabel(token.currency), issuer: token.issuer, currency: token.currency, xrp, tokenAmount, totalLp, ownedLp, lpCurrency: amm.lp_token.currency, feePercent: Number(amm.trading_fee) / 1000, frozen: Boolean(amm.asset_frozen || amm.asset2_frozen), position, volume24h: null, earnedFeesXrp: null, exitQuoteXrp: null };
      } catch {
        return { account, name: known?.name || account, status: 'unavailable' as const };
      }
    }));
    let baseline: any = null;
    if (baselineHash) {
      try {
        const data = await rpc('tx', { transaction: baselineHash, binary: false });
        const tx = data.tx_json || data;
        if (data.validated !== true || data.meta?.TransactionResult !== 'tesSUCCESS' || tx.Account !== address || tx.TransactionType !== 'AMMDeposit' || typeof tx.Amount !== 'string' || tx.Amount2 !== undefined) throw new Error('Kein erfolgreicher einzelner XRP-Deposit dieses Accounts');
        const pool = pools.find((p) => p.status === 'verified' && [tx.Asset, tx.Asset2].some((a) => a?.currency === p.currency && a?.issuer === p.issuer) && [tx.Asset, tx.Asset2].some((a) => a?.currency === 'XRP'));
        if (!pool || pool.status !== 'verified') throw new Error('Pool fehlt');
        const investedXrp = xrpDebit(data.meta, address);
        const mintedLp = lpDelta(data.meta, address, pool.account, pool.lpCurrency);
        if (!investedXrp || !mintedLp || mintedLp <= 0) throw new Error('Balance-Änderung nicht bestätigt');
        // Verify that no subsequent LP balance change distorts a one-deposit HOLD comparison.
        const history = await rpc('account_tx', { account: address, ledger_index_min: data.ledger_index, ledger_index_max: info.ledger_index, limit: 200, binary: false, forward: true });
        const events = history.transactions;
        const complete = !history.marker && Array.isArray(events);
        const onlyDeposit = complete && events.every((e: any) => {
          const hash = e.hash || e.tx?.hash;
          const change = lpDelta(e.meta, address, pool.account, pool.lpCurrency);
          return hash?.toUpperCase() === baselineHash.toUpperCase() || change === null || change === 0;
        });
        const unchanged = Math.abs(pool.ownedLp - mintedLp) <= Math.max(1e-10, mintedLp * 1e-12);
        baseline = { hash: baselineHash, pool: pool.account, investedXrp, status: onlyDeposit && unchanged ? 'verified' : 'needs_reconciliation', spotDifferenceXrp: onlyDeposit && unchanged ? pool.position.spotEquivalentXrp - investedXrp : null, realizedFeesXrp: null };
      } catch {
        baseline = { hash: baselineHash, status: 'unavailable' };
      }
    }
    const r = server.info.validated_ledger;
    const balanceXrp = Number(info.account_data.Balance) / 1_000_000;
    const base = Number(r?.reserve_base_xrp);
    const increment = Number(r?.reserve_inc_xrp);
    const reserveXrp = Number.isFinite(base) && Number.isFinite(increment) ? base + Number(info.account_data.OwnerCount) * increment : null;
    return NextResponse.json({ address, network: 'mainnet', ledgerIndex: info.ledger_index, ledgerHash: info.ledger_hash, fetchedAt: new Date().toISOString(), balanceXrp, reserveXrp, spendableXrp: reserveXrp === null ? null : Math.max(0, balanceXrp - reserveXrp), positionsComplete: !linesResult.marker && candidateAccounts.length <= 10 && pools.every((p) => p.status === 'verified'), pools, baseline, feeAccounting: 'Pool-Gebühren sind im LP-Anteil enthalten; separat verdiente Gebühren sind nicht aus diesem Snapshot ableitbar.' });
  } catch {
    return NextResponse.json({ error: 'Capital-Daten konnten nicht auf einem validierten Mainnet-Ledger bestätigt werden.' }, { status: 502 });
  }
}

