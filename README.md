# Sage VPN

A minimal, Electron-based WireGuard client UI. Built and maintained by **Aethera Intelligence**.

> **TL;DR**  
> - Needs **WireGuard for Windows** installed (driver + `wg.exe` / `wireguard.exe`).  
> - Run the app **as Administrator** to install/uninstall the tunnel service.  
> - Build UI: `npm run build:ui`  
> - Package Windows installer/portable: `npm run dist`  
> - Publish to GitHub Release: set `GH_TOKEN` and run `npm run dist`

---

## Features
- One‑click Connect/Disconnect using WireGuard’s Windows service
- Reconnect with backoff + DNS flush
- Server endpoint selector (WARP anycast or your VPS)
- Live traffic sparkline (wg stats)
- Public IP check with 3 fallbacks (ipify, ifconfig.me, ipinfo)
- Optional Killswitch (Windows Firewall rules): allow WireGuard interface + WG endpoint, block everything else
- Dark/Light theme
- Branding + link to Aethera Intelligence

---

## Requirements

- **Windows 10/11 (x64)**
- **Node.js 18+** and **npm**
- **WireGuard for Windows** installed at `C:\Program Files\WireGuard\` (installer from wireguard.com). This provides:
  - `wireguard.exe` (service installer)
  - `wg.exe` (status/control)
- Admin rights (UAC prompt) for connect/disconnect via service install/uninstall

---

## Project Layout

```
client/
  main.js           # Electron main process (IPC, WG control, killswitch)
  preload.js        # Secure bridge to renderer
  src/
    App.js, App.css, index.js, vpn.js
  public/
    index.html
    icon.ico        # App icon for Windows (use the provided sage_vpn_icon.ico)
  wireguard-config/
    config.conf     # Your WireGuard client config (rename if needed)
  package.json
  webpack.config.js
  .babelrc
```

> Place your WireGuard config as `client/wireguard-config/config.conf` (or `config.wg`).  
> The app expects a `[Peer]` with `Endpoint = host:port` and `AllowedIPs = 0.0.0.0/0` (and/or v6).

---

## Setup (first time)

```powershell
cd client

# install dependencies
npm i

# verify tools
npx electron --version
npx webpack --version
```

If you ever nuke `node_modules`, reinstall with `npm i`.

---

## Development Run

```powershell
cd client
npm run build:ui
npm start
```

- **Blank window?** Open DevTools (we auto-open in dev) and check Console for errors.
- **React doesn’t mount?** Ensure `public/index.html` has `<div id="root"></div>` and `src/index.js` calls `createRoot(...).render(<App/>)`.

---

## Building a Windows Installer / Portable EXE

We use **electron-builder** (already configured in `package.json`).

```powershell
cd client
npm run dist
```

Artifacts appear in `client\dist\`:

- `Sage VPN Setup x.y.z.exe` — NSIS installer (one‑click, per‑machine, requests Admin)
- `Sage VPN x.y.z.exe` — portable app

> **Code signing (optional):** obtain an Authenticode cert and set env vars before `npm run dist`:
>
> - `WIN_CSC_LINK` — path or URL to your PFX/PEM bundle  
> - `WIN_CSC_KEY_PASSWORD` — password for the cert
>
> electron‑builder will sign the binaries automatically.

---

## Publish to GitHub Releases (optional)

1. Create a repo, e.g. `https://github.com/aethera-intelligence/sage-vpn`
2. In `client/package.json` the `build.publish` section is already set for GitHub.
3. Create a **Personal Access Token** with `repo` scope. Set it as an env var:
   ```powershell
   setx GH_TOKEN YOUR_GITHUB_PAT
   # then open a NEW terminal so the env var loads
   ```
4. Build & publish:
   ```powershell
   cd client
   npm run dist
   ```
   electron‑builder will upload artifacts to a **draft** release on GitHub. You can edit notes and publish it.

**Manual publish:** if you prefer manual upload, just drag the artifacts from `client\dist\` into a GitHub release.

---

## Killswitch Details (Windows)

- Toggle in the UI. When enabled, we create these rules with PowerShell:
  - `SageVPN-Allow-Tunnel` — allows outbound on **InterfaceAlias** `WireGuard Tunnel*`
  - `SageVPN-Allow-WG-Endpoint` — allows outbound UDP to the WG **endpoint port** (default 2408 for WARP)
  - `SageVPN-Block-NonTunnel` — block all other outbound
- Disable the toggle to remove all SageVPN rules.

**Reset/cleanup (if needed):**
```powershell
Import-Module NetSecurity
Get-NetFirewallRule | Where-Object DisplayName -like "SageVPN*" | Remove-NetFirewallRule -ErrorAction SilentlyContinue
```

---

## Troubleshooting

### Public IP check fails (`ENOTFOUND api.ipify.org` / `ECONNRESET`)
- Likely DNS or old firewall rules. Fix:
  ```powershell
  ipconfig /flushdns
  Import-Module NetSecurity
  Get-NetFirewallRule | Where-Object DisplayName -like "SageVPN*" | Remove-NetFirewallRule -ErrorAction SilentlyContinue
  ```
- Reconnect and try again. We use three fallback checkers (ipify, ifconfig.me, ipinfo).

### Reconnect doesn’t change IP
- We now wait, flush DNS, and poll for handshake—give it ~2–3 seconds.
- If you run another VPN simultaneously, route precedence may override.

### “WireGuard not installed”
- Install WireGuard for Windows. Confirm files exist:
  - `C:\Program Files\WireGuard\wireguard.exe`
  - `C:\Program Files\WireGuard\wg.exe`

### Logs
- WireGuard desktop app → **Log** tab
- App DevTools → **Console**
- Windows Event Viewer → Applications and Services Logs → WireGuard

---

## Branding & Assets

Use these provided assets:

- **App icon (.ico):** place at `client/public/icon.ico`  
- **Logo PNG (transparent):** optional for UI/readme

Download:
- Icon: `client/public/icon.ico` (use the provided `sage_vpn_icon.ico`)
- Logo: `client/public/sage-logo.png` (use the provided `sage_vpn_logo.png`)

---

## License
- © Aethera Intelligence. All rights reserved unless otherwise stated.

© Aethera Intelligence. All rights reserved unless otherwise stated.
