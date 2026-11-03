import {LOCAL_TESTING} from './local-mode.js';
// Public Testnet access enabled. Appeal outcome supplied by the founder; wallet propagation still needs verification.
export const WALLET_REVIEW_HOLD = false;
export const DOMAIN_REVIEW_PENDING = false;
export const WALLET_PROPAGATION_VERIFIED = false;
export const DOMAIN_REVIEW_NOTICE = "Blockaid has confirmed that the domain flag was incorrect and reports that it has been corrected. Wallet updates may take up to 24 hours. If Varial still warns, cancel and retry later. Testnet only; use valueless test assets.";
export const REVIEW_MESSAGE = 'Wallet connections and signing are paused while the Varial / Blockaid domain warning is investigated. Do not bypass the wallet warning. Switching to Testnet does not resolve a domain reputation warning.';
export function requireWalletReviewClear(reviewHold = WALLET_REVIEW_HOLD) {
  if (reviewHold && !LOCAL_TESTING) throw Error(REVIEW_MESSAGE);
}
export async function connectTestnet(api, passphrase, reviewHold = WALLET_REVIEW_HOLD) {
  if (reviewHold) throw Error(REVIEW_MESSAGE);
  const installed = await api.isConnected();
  if (installed.error || !installed.isConnected) throw Error('Varial (formerly Freighter) was not detected. Open Accord in the same browser profile where Varial is installed, unlock the extension, and reload.');
  // Ask for address access first so the wallet can show its own connection UI.
  // A granted address is not an Accord session until its network is verified.
  const result = await api.requestAccess();
  if (result.error || !result.address) throw Error(result.error?.message || 'Wallet connection was declined.');
  const after = await api.getNetworkDetails();
  if (after.error || after.networkPassphrase !== passphrase) throw Error('Wallet access approved. Select Stellar Testnet in Varial Settings → Network, then reconnect. No transaction was signed.');
  return result.address;
}
