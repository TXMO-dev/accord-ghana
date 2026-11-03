export function localTestingAllowed({dev,mode,hostname,protocol}) {
  return dev===true && mode==='local-test' && protocol==='http:' && ['127.0.0.1','localhost','[::1]'].includes(hostname);
}
export const LOCAL_TESTING = localTestingAllowed({dev:import.meta.env?.DEV,mode:import.meta.env?.MODE,hostname:globalThis.location?.hostname,protocol:globalThis.location?.protocol});
