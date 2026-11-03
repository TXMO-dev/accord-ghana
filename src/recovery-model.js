const HASH = /^[a-f0-9]{64}$/i;
const ACTIONS = new Set(['create','fund','submit','release','dispute','settle']);
const positive = n => Number.isSafeInteger(n) && n > 0;

export function pendingMetadata(hash, details) {
  if (!HASH.test(hash || '') || !details || details.hash !== hash ||
      !positive(details.firstLedger) || !positive(details.maxTime)) return null;
  return {hash, firstLedger:details.firstLedger, maxTime:details.maxTime,
    action:ACTIONS.has(details.action) ? details.action : 'SUCCESS'};
}

// NOT_FOUND alone is never proof of failure. Only release the lock when the RPC
// still covers the entire submission window and a closed ledger exceeds maxTime.
export function recoveryOutcome(hash, details, result) {
  if (!HASH.test(hash || '')) throw Error('Pending transaction hash is invalid. Keep the agreement and contact support.');
  if (result?.txHash && result.txHash.toLowerCase() !== hash.toLowerCase())
    throw Error('RPC returned a different transaction hash.');
  if (result?.status === 'SUCCESS' || result?.status === 'FAILED') return result.status;
  if (result?.status !== 'NOT_FOUND') return 'PENDING';
  const meta = pendingMetadata(hash, details);
  if (!meta) return 'PENDING'; // Older releases saved only a hash; never guess expiry.
  const oldest = result.oldestLedger, latest = result.latestLedger;
  const closed = Number(result.latestLedgerCloseTime);
  if (!positive(oldest) || !positive(latest) || latest < oldest || !positive(closed)) return 'PENDING';
  if (oldest > meta.firstLedger) return 'HISTORY_UNAVAILABLE';
  return latest > meta.firstLedger && closed > meta.maxTime ? 'EXPIRED' : 'PENDING';
}

export function recoveryEvent(hash, details, outcome, now = new Date().toISOString()) {
  if (!['SUCCESS','FAILED','EXPIRED'].includes(outcome)) return null;
  return {hash, action:outcome === 'SUCCESS' ? pendingMetadata(hash, details)?.action || 'SUCCESS' : outcome,
    confirmedAt:now};
}
