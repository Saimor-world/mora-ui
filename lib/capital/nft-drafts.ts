/** Unsigned review drafts only. Wallet/ledger validation and fee/expiry filling remain required. */
export function xrpPriceToDrops(input: string): string {
  const value = input.trim().replace(',', '.');
  if (!/^(0|[1-9]\d*)(\.\d{1,6})?$/.test(value)) throw new Error('Preis mit höchstens sechs Nachkommastellen eingeben.');
  const [whole, fraction = ''] = value.split('.');
  const drops = BigInt(whole) * BigInt(1000000) + BigInt(fraction.padEnd(6, '0'));
  if (drops <= BigInt(0) || drops > BigInt('100000000000000000')) throw new Error('Positiven XRP-Preis innerhalb der XRP-Gesamtmenge eingeben.');
  return drops.toString();
}
function accountShape(account: string) {
  if (!/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(account)) throw new Error('Öffentliche XRPL-Adresse prüfen.');
}
export function mintReviewDraft(account: string, metadataUri: string) {
  accountShape(account);
  const uri = metadataUri.trim();
  const parsed = new URL(uri);
  if (!['https:', 'ipfs:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) throw new Error('Öffentliche HTTPS- oder IPFS-Metadatenadresse verwenden.');
  const bytes = new TextEncoder().encode(uri);
  if (bytes.length > 256) throw new Error('Metadatenadresse darf höchstens 256 UTF-8-Bytes enthalten.');
  return { TransactionType: 'NFTokenMint', Account: account, NFTokenTaxon: 0, Flags: 10, TransferFee: 0,
    URI: Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase() };
}
export function sellReviewDraft(account: string, tokenId: string, price: string) {
  accountShape(account);
  if (!/^[A-Fa-f0-9]{64}$/.test(tokenId)) throw new Error('Gültige NFT-ID auswählen.');
  return { TransactionType: 'NFTokenCreateOffer', Account: account, NFTokenID: tokenId.toUpperCase(), Amount: xrpPriceToDrops(price), Flags: 1 };
}
