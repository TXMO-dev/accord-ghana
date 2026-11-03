// Read-only wallet discovery. Never request access, sign, or change networks here.
export async function discoverRememberedWallet(api,expected,network){
 if(!expected)return '';
 const installed=await api.isConnected();if(installed.error||!installed.isConnected)return '';
 const allowed=await api.isAllowed();if(allowed.error||!allowed.isAllowed)return '';
 const current=await api.getAddress();if(current.error||current.address!==expected)return '';
 const details=await api.getNetworkDetails();if(details.error||details.networkPassphrase!==network)return '';
 return current.address;
}
