export type XrplGuardVerdict = 'review' | 'elevated' | 'unknown' | 'critical' | 'blocked';

export type XrplGuardFinding = {
  severity: 'info' | 'warning' | 'danger';
  code: string;
  title: string;
  detail: string;
};

export type XrplSignGuardResult = {
  verdict: XrplGuardVerdict;
  transactionType: string | null;
  account: string | null;
  expectedAccount: string | null;
  accountMatches: boolean | null;
  networkId: number | null;
  fee: string | null;
  lastLedgerSequence: string | null;
  effects: string[];
  findings: XrplGuardFinding[];
  unknownFields: string[];
  transaction: Record<string, unknown> | null;
};

type JsonObject = Record<string, unknown>;

const VERDICT_RANK: Record<XrplGuardVerdict, number> = {
  review: 0,
  elevated: 1,
  unknown: 2,
  critical: 3,
  blocked: 4,
};

const SECRET_KEYS = new Set([
  'seed',
  'secret',
  'privatekey',
  'private_key',
  'mnemonic',
  'passphrase',
  'familyseed',
  'family_seed',
]);

const COMMON_FIELDS = new Set([
  'TransactionType',
  'Account',
  'Fee',
  'Sequence',
  'TicketSequence',
  'LastLedgerSequence',
  'Flags',
  'SourceTag',
  'AccountTxnID',
  'NetworkID',
  'Memos',
  'SigningPubKey',
  'TxnSignature',
  'Signers',
]);

const TYPE_FIELDS: Record<string, string[]> = {
  Payment: ['Destination', 'DestinationTag', 'Amount', 'SendMax', 'DeliverMin', 'Paths'],
  TrustSet: ['LimitAmount', 'QualityIn', 'QualityOut'],
  AccountSet: ['SetFlag', 'ClearFlag', 'Domain', 'EmailHash', 'MessageKey', 'TransferRate', 'TickSize', 'NFTokenMinter'],
  SetRegularKey: ['RegularKey'],
  SignerListSet: ['SignerQuorum', 'SignerEntries'],
  OfferCreate: ['TakerGets', 'TakerPays', 'OfferSequence', 'Expiration'],
  OfferCancel: ['OfferSequence'],
  NFTokenMint: ['NFTokenTaxon', 'Issuer', 'TransferFee', 'URI'],
  NFTokenCreateOffer: ['NFTokenID', 'Amount', 'Owner', 'Destination', 'Expiration'],
  NFTokenAcceptOffer: ['NFTokenSellOffer', 'NFTokenBuyOffer', 'NFTokenBrokerFee'],
  NFTokenCancelOffer: ['NFTokenOffers'],
  NFTokenBurn: ['NFTokenID', 'Owner'],
  AMMCreate: ['Amount', 'Amount2', 'TradingFee'],
  AMMDeposit: ['Asset', 'Asset2', 'Amount', 'Amount2', 'EPrice', 'LPTokenOut'],
  AMMWithdraw: ['Asset', 'Asset2', 'Amount', 'Amount2', 'EPrice', 'LPTokenIn'],
  AMMVote: ['Asset', 'Asset2', 'TradingFee'],
  AMMBid: ['Asset', 'Asset2', 'BidMin', 'BidMax', 'AuthAccounts'],
  AMMDelete: ['Asset', 'Asset2'],
  EscrowCreate: ['Destination', 'DestinationTag', 'Amount', 'CancelAfter', 'FinishAfter', 'Condition'],
  EscrowFinish: ['Owner', 'OfferSequence', 'Condition', 'Fulfillment'],
  EscrowCancel: ['Owner', 'OfferSequence'],
  PaymentChannelCreate: ['Destination', 'Amount', 'SettleDelay', 'PublicKey', 'CancelAfter', 'DestinationTag'],
  PaymentChannelFund: ['Channel', 'Amount', 'Expiration'],
  PaymentChannelClaim: ['Channel', 'Balance', 'Amount', 'Signature', 'PublicKey'],
  DepositPreauth: ['Authorize', 'Unauthorize', 'AuthorizeCredentials', 'UnauthorizeCredentials'],
  CheckCreate: ['Destination', 'SendMax', 'DestinationTag', 'Expiration', 'InvoiceID'],
  CheckCash: ['CheckID', 'Amount', 'DeliverMin'],
  CheckCancel: ['CheckID'],
  AccountDelete: ['Destination', 'DestinationTag'],
  Clawback: ['Amount', 'Holder'],
  TicketCreate: ['TicketCount'],
};

const ACCOUNT_SET_FLAGS: Record<number, string> = {
  1: 'Require destination tags',
  2: 'Require authorization for trust lines',
  3: 'Disallow incoming XRP flag',
  4: 'Disable master key',
  5: 'Track AccountTxnID',
  6: 'NoFreeze (irreversible)',
  7: 'Global freeze',
  8: 'Default Ripple',
  9: 'Deposit authorization',
  10: 'Authorized NFT minter',
};

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeKey(value: string): string {
  return value.replace(/[-\s]/g, '').toLowerCase();
}

function secretPath(value: unknown, path = '$'): string | null {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const match = secretPath(value[index], `${path}[${index}]`);
      if (match) return match;
    }
    return null;
  }
  if (!isObject(value)) return null;

  for (const [key, nested] of Object.entries(value)) {
    if (SECRET_KEYS.has(normalizeKey(key))) return `${path}.${key}`;
    const match = secretPath(nested, `${path}.${key}`);
    if (match) return match;
  }
  return null;
}

function extractTransaction(root: JsonObject): JsonObject | null {
  const payload = isObject(root.payload) ? root.payload : null;
  const candidates = [
    root.txjson,
    root.transaction,
    root.tx,
    payload?.txjson,
    payload?.transaction,
    root,
  ];
  return candidates.find((candidate): candidate is JsonObject => isObject(candidate) && typeof candidate.TransactionType === 'string') || null;
}

function toInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

export function dropsToXrp(drops: string): string | null {
  if (!/^\d+$/.test(drops)) return null;
  const value = BigInt(drops);
  const dropsPerXrp = BigInt(1000000);
  const whole = value / dropsPerXrp;
  const fraction = (value % dropsPerXrp).toString().padStart(6, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction} XRP` : `${whole} XRP`;
}

export function describeXrplAmount(value: unknown): string {
  if (typeof value === 'string') {
    return dropsToXrp(value) || value;
  }
  if (isObject(value)) {
    const amount = typeof value.value === 'string' ? value.value : null;
    const currency = typeof value.currency === 'string' ? value.currency : null;
    const issuer = typeof value.issuer === 'string' ? value.issuer : null;
    if (amount && currency) return `${amount} ${currency}${issuer ? ` · issuer ${issuer}` : ''}`;
  }
  return 'unbekannter Betrag';
}

function blocked(detail: string): XrplSignGuardResult {
  return {
    verdict: 'blocked',
    transactionType: null,
    account: null,
    expectedAccount: null,
    accountMatches: null,
    networkId: null,
    fee: null,
    lastLedgerSequence: null,
    effects: [],
    findings: [{ severity: 'danger', code: 'blocked_input', title: 'Nicht prüfen oder signieren', detail }],
    unknownFields: [],
    transaction: null,
  };
}

export function analyzeXrplSigningRequest(raw: string, expectedAccount?: string | null): XrplSignGuardResult {
  const input = raw.trim();
  if (!input) return blocked('Kein Transaktions-JSON eingefügt.');
  if (input.length > 100_000) return blocked('Der Payload ist für den lokalen Review ungewöhnlich groß.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return blocked('Das ist kein gültiges JSON. Ein Link oder QR-Code allein enthält nicht genug Informationen für einen sicheren Review.');
  }
  if (!isObject(parsed)) return blocked('Der Payload muss ein JSON-Objekt sein.');

  const secret = secretPath(parsed);
  if (secret) {
    return blocked(`Der Payload enthält ein Feld, das wie Seed/Secret/Private-Key-Material aussieht (${secret}). Solche Daten gehören niemals in SAIMÔR.`);
  }

  const tx = extractTransaction(parsed);
  if (!tx) return blocked('Keine XRPL-Transaktion mit TransactionType gefunden.');

  let verdict: XrplGuardVerdict = 'review';
  const findings: XrplGuardFinding[] = [];
  const effects: string[] = [];
  const promote = (next: XrplGuardVerdict) => {
    if (VERDICT_RANK[next] > VERDICT_RANK[verdict]) verdict = next;
  };
  const finding = (severity: XrplGuardFinding['severity'], code: string, title: string, detail: string, next?: XrplGuardVerdict) => {
    findings.push({ severity, code, title, detail });
    if (next) promote(next);
  };

  const transactionType = typeof tx.TransactionType === 'string' ? tx.TransactionType : null;
  const account = typeof tx.Account === 'string' ? tx.Account : null;
  const expected = expectedAccount?.trim() || null;
  const accountMatches = expected && account ? expected === account : null;
  const flags = toInteger(tx.Flags) ?? 0;
  const networkId = toInteger(tx.NetworkID);
  const lastLedger = toInteger(tx.LastLedgerSequence);
  const fee = typeof tx.Fee === 'string' ? dropsToXrp(tx.Fee) || tx.Fee : null;

  if (!account) {
    finding('danger', 'missing_account', 'Signing account fehlt', 'Die Transaktion enthält kein Account-Feld.', 'unknown');
  }
  if (expected && account && expected !== account) {
    finding('danger', 'account_mismatch', 'Falsches Signing-Konto', `Erwartet ${expected}, Payload fordert ${account}.`, 'critical');
  } else if (expected && account) {
    finding('info', 'account_match', 'Signing-Konto stimmt überein', account);
  }
  if (networkId !== null) {
    finding('warning', 'network_id', 'Explizite NetworkID', `NetworkID ${networkId} ist gesetzt. Netzwerk vor dem Signieren separat prüfen.`, 'elevated');
  }
  if (!lastLedger) {
    finding('warning', 'no_expiry', 'Keine LastLedgerSequence', 'Der Payload hat keine klare Ledger-Ablaufgrenze. Das ist nicht automatisch gefährlich, aber schlechter begrenzt.', 'elevated');
  }
  if (fee) effects.push(`Netzwerkgebühr: ${fee}`);

  switch (transactionType) {
    case 'Payment': {
      const destination = typeof tx.Destination === 'string' ? tx.Destination : null;
      const amount = describeXrplAmount(tx.Amount);
      effects.push(`Zahlung ${amount}${destination ? ` an ${destination}` : ''}`);
      finding('warning', 'moves_value', 'Kapitalbewegung', 'Payment kann XRP oder Tokens übertragen.', 'elevated');
      if (!destination) finding('danger', 'missing_destination', 'Ziel fehlt', 'Payment enthält kein Destination-Feld.', 'unknown');
      if (tx.SendMax !== undefined) effects.push(`Maximaler Sendeaufwand: ${describeXrplAmount(tx.SendMax)}`);
      if (tx.DeliverMin !== undefined) effects.push(`Mindestauszahlung: ${describeXrplAmount(tx.DeliverMin)}`);
      if ((flags & 0x00020000) !== 0) {
        finding('danger', 'partial_payment', 'Partial Payment aktiv', 'Das Amount-Feld allein ist dann nicht die tatsächlich gelieferte Menge. DeliveredAmount nach Validierung prüfen.', 'critical');
      }
      if (tx.Paths !== undefined || tx.SendMax !== undefined) {
        finding('warning', 'path_payment', 'Path-/Cross-Currency-Payment', 'Der Payload kann DEX-Liquidität und andere Assets auf dem Zahlungsweg verwenden.', 'elevated');
      }
      break;
    }
    case 'TrustSet':
      effects.push(`Trustline ändern: ${describeXrplAmount(tx.LimitAmount)}`);
      finding('warning', 'trustline_change', 'Trustline-/Issuer-Beziehung ändert sich', 'Limit, Rippling- oder Freeze-bezogene Trustline-Eigenschaften können verändert werden.', 'elevated');
      break;
    case 'AccountSet': {
      const setFlag = toInteger(tx.SetFlag);
      const clearFlag = toInteger(tx.ClearFlag);
      if (setFlag) effects.push(`Account-Flag setzen: ${ACCOUNT_SET_FLAGS[setFlag] || setFlag}`);
      if (clearFlag) effects.push(`Account-Flag löschen: ${ACCOUNT_SET_FLAGS[clearFlag] || clearFlag}`);
      finding('danger', 'account_settings', 'Account-Einstellungen werden verändert', 'AccountSet kann Sicherheits-, Freeze-, Deposit- oder Routing-Verhalten dauerhaft verändern.', 'critical');
      if (setFlag === 4) finding('danger', 'disable_master', 'Master Key deaktivieren', 'Nur signieren, wenn ein funktionierender alternativer Signierweg bereits verifiziert ist.', 'critical');
      if (setFlag === 6) finding('danger', 'no_freeze', 'NoFreeze ist irreversibel', 'Das NoFreeze-Flag kann nach dem Setzen nicht wieder entfernt werden.', 'critical');
      break;
    }
    case 'SetRegularKey':
      effects.push(typeof tx.RegularKey === 'string' ? `Regular Key setzen: ${tx.RegularKey}` : 'Regular Key entfernen');
      finding('danger', 'regular_key', 'Signierberechtigung ändert sich', 'SetRegularKey verändert, welcher Schlüssel Transaktionen für das Konto signieren darf.', 'critical');
      break;
    case 'SignerListSet':
      effects.push(`Signer-Quorum ändern: ${String(tx.SignerQuorum ?? 'unbekannt')}`);
      finding('danger', 'signer_list', 'Multi-Signing-Konfiguration ändert sich', 'SignerListSet kann Kontrolle über das Konto neu verteilen.', 'critical');
      break;
    case 'OfferCreate':
      effects.push(`DEX-Angebot: gibt ${describeXrplAmount(tx.TakerGets)} gegen ${describeXrplAmount(tx.TakerPays)}`);
      finding('warning', 'dex_offer', 'DEX-Order kann sofort ausführen', 'Ein OfferCreate kann beim Einreichen direkt gegen vorhandene Orders handeln.', 'elevated');
      break;
    case 'OfferCancel':
      effects.push(`DEX-Angebot #${String(tx.OfferSequence ?? 'unbekannt')} stornieren`);
      promote('elevated');
      break;
    case 'NFTokenMint':
      effects.push(`NFT minten · Taxon ${String(tx.NFTokenTaxon ?? 'unbekannt')}`);
      finding('warning', 'nft_mint', 'Neues NFT wird erzeugt', 'Flags, TransferFee, Issuer und URI vor externer Signatur prüfen.', 'elevated');
      break;
    case 'NFTokenCreateOffer':
      effects.push(`NFT-Angebot für ${String(tx.NFTokenID ?? 'unbekannt')} · Betrag ${describeXrplAmount(tx.Amount)}`);
      finding('warning', 'nft_offer', 'NFT-Angebot wird auf Ledger gelegt', 'Je nach Flags handelt es sich um Kauf- oder Verkaufsangebot.', 'elevated');
      break;
    case 'NFTokenAcceptOffer':
      effects.push('NFT-Angebot annehmen');
      finding('warning', 'nft_accept', 'NFT und/oder XRP können den Besitzer wechseln', 'Offer-IDs und eventuelle BrokerFee vollständig abgleichen.', 'elevated');
      break;
    case 'NFTokenCancelOffer':
      effects.push('NFT-Angebot(e) stornieren');
      promote('elevated');
      break;
    case 'NFTokenBurn':
      effects.push(`NFT unwiderruflich verbrennen: ${String(tx.NFTokenID ?? 'unbekannt')}`);
      finding('danger', 'nft_burn', 'NFT wird vernichtet', 'Burn ist eine destruktive Ledger-Aktion.', 'critical');
      break;
    case 'AMMCreate':
    case 'AMMDeposit':
    case 'AMMWithdraw':
    case 'AMMVote':
    case 'AMMBid':
    case 'AMMDelete':
      effects.push(`AMM-Aktion: ${transactionType}`);
      finding('warning', 'amm_action', 'AMM-/Liquiditätsposition wird verändert', 'Beträge, LP-Token, Assets, Gebühren und Slippage separat prüfen.', 'elevated');
      break;
    case 'EscrowCreate':
    case 'EscrowFinish':
    case 'EscrowCancel':
      effects.push(`Escrow-Aktion: ${transactionType}`);
      finding('warning', 'escrow_action', 'Escrow kann XRP zeitlich oder bedingt binden/freigeben', 'Betrag, Ziel und Zeit-/Condition-Felder prüfen.', 'elevated');
      break;
    case 'PaymentChannelCreate':
    case 'PaymentChannelFund':
    case 'PaymentChannelClaim':
      effects.push(`Payment-Channel-Aktion: ${transactionType}`);
      finding('warning', 'payment_channel', 'Payment Channel verändert gebundene oder claimbare XRP', 'Channel, Ziel und Beträge vor Signatur prüfen.', 'elevated');
      break;
    case 'DepositPreauth':
      effects.push('Deposit-Autorisierung ändern');
      finding('warning', 'deposit_preauth', 'Wer einzahlen darf, kann sich ändern', 'Authorize/Unauthorize bzw. Credentials genau prüfen.', 'elevated');
      break;
    case 'CheckCreate':
    case 'CheckCash':
    case 'CheckCancel':
      effects.push(`XRPL-Check-Aktion: ${transactionType}`);
      finding('warning', 'check_action', 'Check kann Zahlungsansprüche erstellen, einlösen oder stornieren', 'SendMax/Amount/DeliverMin und Ziel prüfen.', 'elevated');
      break;
    case 'AccountDelete':
      effects.push(`Account löschen; Rest-XRP an ${String(tx.Destination ?? 'unbekannt')}`);
      finding('danger', 'account_delete', 'XRPL-Konto wird gelöscht', 'Das ist eine hochwirksame, destruktive Kontoaktion.', 'critical');
      break;
    case 'Clawback':
      effects.push(`Token-Clawback: ${describeXrplAmount(tx.Amount)}`);
      finding('danger', 'clawback', 'Issued Tokens werden zurückgezogen', 'Holder und Betrag müssen exakt der beabsichtigten Aktion entsprechen.', 'critical');
      break;
    case 'TicketCreate':
      effects.push(`${String(tx.TicketCount ?? 'unbekannt')} Ticket(s) erzeugen`);
      finding('info', 'tickets', 'Tickets belegen Owner-Reserve', 'TicketCreate bewegt typischerweise kein Kapital direkt, kann aber die Reserve beeinflussen.', 'elevated');
      break;
    default:
      finding('warning', 'unsupported_type', 'Transaktionstyp noch nicht vollständig interpretiert', `TransactionType ${transactionType || 'unbekannt'} wird vom Guard nicht semantisch vollständig verstanden.`, 'unknown');
  }

  const known = new Set([...COMMON_FIELDS, ...(transactionType ? TYPE_FIELDS[transactionType] || [] : [])]);
  const unknownFields = Object.keys(tx).filter((key) => !known.has(key)).sort();
  if (unknownFields.length) {
    finding('warning', 'unknown_fields', 'Nicht interpretierte Felder vorhanden', unknownFields.join(', '), 'unknown');
  }

  if (findings.length === 0) {
    finding('info', 'review_only', 'Kein erhöhter Guard-Befund', 'Das ist keine Freigabe. Im externen Signer weiterhin Account, Netzwerk, Betrag, Gebühren und Ablaufgrenze prüfen.');
  }

  return {
    verdict,
    transactionType,
    account,
    expectedAccount: expected,
    accountMatches,
    networkId,
    fee,
    lastLedgerSequence: lastLedger === null ? null : String(lastLedger),
    effects,
    findings,
    unknownFields,
    transaction: tx,
  };
}
