const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { execFile, exec } = require('child_process');
const fs = require('fs');
const https = require('https');

// ---------- Window ----------
function createWindow() {
  const win = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 820,
    minHeight: 600,
    backgroundColor: '#0b0b0f',
    titleBarStyle: 'hiddenInset',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  if (!app.isPackaged) win.webContents.openDevTools({ mode: 'detach' });
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ---------- Config paths (writable) ----------
function bundledCfgDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'wireguard-config')
    : path.join(__dirname, 'wireguard-config');
}
function userCfgDir() {
  return path.join(app.getPath('userData'), 'wireguard-config');
}
function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dst, name);
    const stat = fs.statSync(s);
    if (stat.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
function ensureWritableConfig() {
  const dst = userCfgDir();
  if (!fs.existsSync(dst)) {
    try { copyDir(bundledCfgDir(), dst); } catch (_) {}
  }
  return dst;
}
function cfgPath() {
  const dir = ensureWritableConfig();
  const cands = ['config.conf', 'config.wg'].map(n => path.join(dir, n));
  for (const p of cands) if (fs.existsSync(p)) return p;
  throw new Error(`WireGuard config not found. Put "config.conf" here:\n${dir}`);
}
function cfgName() {
  return path.basename(cfgPath()).replace(/\.(conf|wg)$/i, '');
}

// ---------- WireGuard helpers ----------
const WG_DIR = 'C:\\Program Files\\WireGuard';
const WG_EXE = path.join(WG_DIR, 'wireguard.exe');
const WG_CTL = path.join(WG_DIR, 'wg.exe');

function run(file, args) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { windowsHide: true }, (err, stdout, stderr) => {
      if (err) return reject(new Error((stderr || stdout || err.message).trim()));
      resolve(stdout || 'ok');
    });
  });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function connectWindows() {
  if (!fs.existsSync(WG_EXE)) throw new Error('WireGuard not installed');
  try {
    return await run(WG_EXE, ['/installtunnelservice', cfgPath()]);
  } catch (e) {
    if (/already installed/i.test(e.message)) return 'already running';
    throw e;
  }
}
async function disconnectWindows() {
  if (!fs.existsSync(WG_EXE)) throw new Error('WireGuard not installed');
  try {
    return await run(WG_EXE, ['/uninstalltunnelservice', cfgName()]);
  } catch (e) {
    if (/service name is invalid|not found/i.test(e.message)) return 'already stopped';
    throw e;
  }
}
async function connectPosix() { return run('wg-quick', ['up', cfgPath()]); }
async function disconnectPosix() { return run('wg-quick', ['down', cfgPath()]); }

async function flushDns() { try { await sh('ipconfig /flushdns'); } catch (_) {} }

async function waitForHandshake(timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if (!fs.existsSync(WG_CTL)) break;
      const out = await run(WG_CTL, []);
      if (/latest handshake|transfer:/i.test(out)) return true;
    } catch (_) {}
    await sleep(600);
  }
  return false;
}

// ---------- IPC: connect/disconnect/reconnect ----------
ipcMain.handle('connect-vpn', async () => {
  try {
    const out = process.platform === 'win32' ? await connectWindows() : await connectPosix();
    await sleep(1000);
    await waitForHandshake();
    return { ok: true, out };
  } catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('disconnect-vpn', async () => {
  try {
    const out = process.platform === 'win32' ? await disconnectWindows() : await disconnectPosix();
    await sleep(600);
    return { ok: true, out };
  } catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('reconnect-vpn', async () => {
  try {
    if (process.platform === 'win32') {
      await disconnectWindows().catch(()=>{});
      await sleep(900);
      const out = await connectWindows();
      await sleep(1200);
      await flushDns();
      await waitForHandshake();
      return { ok: true, out };
    } else {
      await disconnectPosix().catch(()=>{});
      await sleep(500);
      const out = await connectPosix();
      await sleep(800);
      await flushDns();
      return { ok: true, out };
    }
  } catch (e) { return { ok: false, error: e.message }; }
});

// ---------- Public IP checker with fallbacks ----------
function fetchText(url, timeoutMs = 2500) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data.trim()));
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { req.destroy(new Error('timeout')); });
  });
}
function parseMaybeJson(s) {
  try { const j = JSON.parse(s); return j.ip || j.origin || ''; } catch { return s; }
}
async function getPublicIP() {
  const urls = [
    'https://api.ipify.org?format=json',
    'https://ifconfig.me/ip',
    'https://ipinfo.io/ip'
  ];
  for (const u of urls) {
    try {
      const t = await fetchText(u, 3000);
      const ip = parseMaybeJson(t).trim();
      if (ip && /^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return ip;
    } catch (_) {}
  }
  throw new Error('Public IP check failed (DNS or firewall)');
}
ipcMain.handle('vpn-status', async () => {
  try { return { ok: true, ip: await getPublicIP() }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('wg-state', async () => {
  try {
    if (process.platform !== 'win32') return { ok: false, error: 'wg-state only implemented for Windows' };
    if (!fs.existsSync(WG_CTL)) return { ok: false, error: 'wg.exe not found' };
    const out = await run(WG_CTL, []);
    return { ok: true, text: out };
  } catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('set-endpoint', async (_evt, newEndpoint) => {
  try {
    const file = cfgPath();
    let txt = fs.readFileSync(file, 'utf8');
    if (!/^\s*Endpoint\s*=/mi.test(txt)) throw new Error('Endpoint= not found in config.conf');
    txt = txt.replace(/^\s*Endpoint\s*=.*$/mi, `Endpoint = ${newEndpoint}`);
    fs.writeFileSync(file, txt);
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('open-external', async (_evt, url) => {
  try { await shell.openExternal(url); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
});

// ---------- Killswitch (Windows firewall) ----------
function sh(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { windowsHide: true }, (e, out, err) =>
      e ? reject(new Error(err || out || e.message)) : resolve(out));
  });
}
const KS = {
  allowTunnel: 'SageVPN-Allow-Tunnel',
  allowWG:     'SageVPN-Allow-WG-Endpoint',
  blockAll:    'SageVPN-Block-NonTunnel'
};
ipcMain.handle('killswitch', async (_e, enabled) => {
  if (process.platform !== 'win32') return { ok:false, error:'Killswitch is Windows-only' };
  try {
    if (enabled) {
      await sh(`powershell -NoProfile -Command "New-NetFirewallRule -DisplayName '${KS.allowTunnel}' -Direction Outbound -Action Allow -InterfaceAlias 'WireGuard Tunnel*' -Profile Any -ErrorAction SilentlyContinue"`);
      await sh(`powershell -NoProfile -Command "New-NetFirewallRule -DisplayName '${KS.allowWG}' -Direction Outbound -Action Allow -Protocol UDP -RemotePort 2408 -Profile Any -ErrorAction SilentlyContinue"`);
      await sh(`powershell -NoProfile -Command "New-NetFirewallRule -DisplayName '${KS.blockAll}' -Direction Outbound -Action Block -Profile Any -ErrorAction SilentlyContinue"`);
    } else {
      await sh(`powershell -NoProfile -Command "Get-NetFirewallRule -DisplayName '${KS.allowTunnel}' -ErrorAction SilentlyContinue | Remove-NetFirewallRule"`);
      await sh(`powershell -NoProfile -Command "Get-NetFirewallRule -DisplayName '${KS.allowWG}' -ErrorAction SilentlyContinue | Remove-NetFirewallRule"`);
      await sh(`powershell -NoProfile -Command "Get-NetFirewallRule -DisplayName '${KS.blockAll}' -ErrorAction SilentlyContinue | Remove-NetFirewallRule"`);
    }
    return { ok:true };
  } catch (e) { return { ok:false, error:e.message }; }
});
