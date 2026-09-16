export const CAPITAL_POOLS = [
  { name: 'XRP / RLUSD', account: 'rhWTXC2m2gGGA9WozUaoMm6kLAVPb1tcS3', currency: '524C555344000000000000000000000000000000', issuer: 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De', symbol: 'RLUSD' },
  { name: 'XRP / USDC', account: 'rM7cHVPfhe9yxQNk2kDNBEQqoQmMcQGPWE', currency: '5553444300000000000000000000000000000000', issuer: 'rGm7WCVp9gb4jZHWTEtGUr4dd74z2XuWhE', symbol: 'USDC' },
] as const;

export function currencyLabel(value: string): string {
  if (!/^[0-9a-f]{40}$/i.test(value) || value.startsWith('03')) return value;
  const bytes = value.match(/../g)!.map((byte) => parseInt(byte, 16)).filter(Boolean);
  return bytes.every((byte) => byte >= 32 && byte <= 126) ? String.fromCharCode(...bytes) : value;
}

// Constant-product, balanced XRP/stablecoin scenario. No fee income,
// issuer depeg, deposit/withdrawal fee, or execution costs assumed.
export function holdScenario(capitalXrp: number, xrpPriceRatio: number) {
  if (!Number.isFinite(capitalXrp) || capitalXrp < 0 || !Number.isFinite(xrpPriceRatio) || xrpPriceRatio <= 0) return null;
  const lpXrp = capitalXrp / Math.sqrt(xrpPriceRatio);
  return { holdXrp: capitalXrp, lpXrp, differenceXrp: lpXrp - capitalXrp };
}

export function positionValue(poolXrp: number, poolToken: number, totalLp: number, ownedLp: number) {
  if (![poolXrp, poolToken, totalLp, ownedLp].every(Number.isFinite) || poolXrp <= 0 || poolToken <= 0 || totalLp <= 0 || ownedLp < 0 || ownedLp > totalLp) return null;
  const share = ownedLp / totalLp;
  return { share, xrp: poolXrp * share, token: poolToken * share, spotEquivalentXrp: 2 * poolXrp * share };
}

export function xrpDebit(meta: any, account: string): number | null {
  for (const entry of meta?.AffectedNodes || []) {
    const node = entry.ModifiedNode;
    if (node?.LedgerEntryType !== 'AccountRoot' || node.FinalFields?.Account !== account) continue;
    const previous = node.PreviousFields?.Balance;
    const final = node.FinalFields?.Balance;
    if (!/^\d+$/.test(String(previous)) || !/^\d+$/.test(String(final))) continue;
    const delta = Number(BigInt(previous) - BigInt(final)) / 1_000_000;
    return delta > 0 ? delta : null;
  }
  return null;
}

export function lpDelta(meta: any, account: string, issuer: string, currency: string): number | null {
  for (const entry of meta?.AffectedNodes || []) {
    const node = entry.ModifiedNode || entry.CreatedNode || entry.DeletedNode;
    if (node?.LedgerEntryType !== 'RippleState') continue;
    const f = node.FinalFields || node.NewFields;
    if (!f || f.Balance?.currency !== currency) continue;
    const low = f.LowLimit?.issuer;
    const high = f.HighLimit?.issuer;
    if (!((low === account && high === issuer) || (low === issuer && high === account))) continue;
    const before = entry.CreatedNode ? 0 : Number(node.PreviousFields?.Balance?.value ?? f.Balance.value);
    const after = entry.DeletedNode ? 0 : Number(f.Balance.value);
    return (after - before) * (low === account ? 1 : -1);
  }
  return null;
}

