export async function checkedWalletSign(api,method,value,options,network){
 const fields={signTransaction:'signedTxXdr',signAuthEntry:'signedAuthEntry',signMessage:'signedMessage'};
 if(!fields[method]||options?.networkPassphrase!==network||!options.address)throw Error('Unsupported wallet request or network.');
 async function check(){const current=await api.getAddress(),details=await api.getNetworkDetails();if(current.error||details.error||current.address!==options.address||details.networkPassphrase!==network)throw Error('Wallet account or network changed. Reconnect and review again.');}
 await check();const result=await api[method](value,options);
 if(result?.error||!result?.[fields[method]])throw Error(result?.error?.message||'Wallet did not return a signature.');
 if(result.signerAddress&&result.signerAddress!==options.address)throw Error('Wallet returned a different signer.');
 await check();return {...result,signerAddress:result.signerAddress||options.address};
}
