const short = value => value.slice(0, 6) + '…' + value.slice(-4);
export function checkWalletSelection(expected, connected, current, network, passphrase) {
 const fail = message => { const error = new Error(message); error.code = 'WALLET_SELECTION'; throw error; };
 if (!expected || connected !== expected) fail('Your wallet connection changed. Reconnect your wallet and review the agreement again.');
 if (current?.error || !current?.address) fail('Varial could not provide your account. Unlock Varial, then reconnect your wallet.');
 if (current.address !== expected) fail(`This tab expects ${short(expected)}, but Varial selected ${short(current.address)}. All tabs in this browser profile share Varial’s selected account. Select the expected account or reconnect to use the selected account.`);
 if (network?.error || !network?.networkPassphrase) fail('Varial’s network could not be checked. Unlock Varial and reconnect your wallet.');
 if (network.networkPassphrase !== passphrase) fail('Varial is not on Stellar Testnet. Select Testnet in Varial, then reconnect your wallet.');
}
