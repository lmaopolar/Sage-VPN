const api = () => window.electron || {};

export async function connect()      { return api().connectVpn?.(); }
export async function disconnect()   { return api().disconnectVpn?.(); }
export async function reconnect()    { return api().reconnectVpn?.(); }
export async function vpnStatus()    { return api().vpnStatus?.(); }
export async function wgState()      { return api().wgState?.(); }
export async function setEndpoint(v) { return api().setEndpoint?.(v); }
export async function setKillswitch(enabled) { return api().killswitch?.(enabled); }
export function openExternal(url)    { return api().openExternal?.(url); }
