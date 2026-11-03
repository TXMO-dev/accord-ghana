// Kept separate from the wallet adapter so transport-loss and queue behavior can
// be verified without connecting a wallet or moving funds.
export async function submitTrackedTransaction({server, transaction, hash, onStatus=()=>{}, onSubmitted=()=>{},
  wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)), polls=30}) {
  const firstLedger = (await server.getLatestLedger()).sequence;
  const maxTime = Number(transaction.timeBounds?.maxTime);
  if (!Number.isSafeInteger(firstLedger) || firstLedger <= 0 || !Number.isSafeInteger(maxTime) || maxTime <= 0)
    throw Error('Could not establish the transaction recovery window. Nothing was submitted.');
  // Must finish durable tracking before sending; exceptions prevent broadcast.
  await onSubmitted(hash, {hash, firstLedger, maxTime});
  let sent = await server.sendTransaction(transaction);
  for (let i=0; sent.status === 'TRY_AGAIN_LATER' && i<3; i++) {
    onStatus('Network queue is busy. Retrying the same signed transaction…');
    await wait(2000); sent = await server.sendTransaction(transaction);
  }
  if (sent.hash && sent.hash !== hash) throw Error('RPC returned an unexpected transaction hash. Refresh to check your original transaction.');
  if (!['PENDING','DUPLICATE'].includes(sent.status))
    throw Error('The network did not confirm acceptance. Keep this agreement and use Refresh to check the original transaction.');
  onStatus('Submitted: '+hash+'. Waiting for ledger confirmation…');
  for (let i=0; i<polls; i++) {
    await wait(2000);
    const result = await server.getTransaction(hash);
    if (result.txHash && result.txHash !== hash) throw Error('RPC returned an unexpected transaction hash.');
    if (result.status === 'SUCCESS') return {hash, result};
    if (result.status === 'FAILED') throw Error('Transaction failed on chain. Refresh to reconcile the receipt before retrying.');
  }
  throw Error('Confirmation timed out. Your transaction reference is saved. Refresh to check it before retrying.');
}
