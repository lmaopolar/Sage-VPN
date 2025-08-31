const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  connectVpn: () => ipcRenderer.invoke('connect-vpn'),
  disconnectVpn: () => ipcRenderer.invoke('disconnect-vpn'),
  reconnectVpn: () => ipcRenderer.invoke('reconnect-vpn'),
  vpnStatus: () => ipcRenderer.invoke('vpn-status'),
  wgState: () => ipcRenderer.invoke('wg-state'),
  setEndpoint: (endpoint) => ipcRenderer.invoke('set-endpoint', endpoint),
  killswitch: (enabled) => ipcRenderer.invoke('killswitch', enabled),
  openExternal: (url) => ipcRenderer.invoke('open-external', url)
});
