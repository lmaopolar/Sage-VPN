# Sage VPN

A minimal, elegant WireGuard client for Windows — created by **Aethera Intelligence**.

> **What it does:** One‑click connect/disconnect to your WireGuard tunnel, optional killswitch, endpoint selection, live traffic, and a quick public‑IP check. No accounts. No telemetry.

---

## Download & Install

1. **Install WireGuard for Windows** from the official site.  
2. Download **Sage VPN** from the **Releases** page of this repository (installer `.exe`).  
3. Run the installer. On first connect/disconnect you may be prompted for **Administrator** access (needed to install/uninstall the WireGuard tunnel service).

> Portable build is available if you prefer no installer.

---

## Requirements

- Windows 10/11 (x64)
- WireGuard for Windows (provides the driver and `wg.exe`/`wireguard.exe`)
- A valid WireGuard **client config** (`.conf` or `.wg`)

---

## Getting Started

1. Place your WireGuard client config file in the app’s `wireguard-config/` folder as **`config.conf`** (or **`config.wg`**).  
2. Launch **Sage VPN**.  
3. Click **Connect**.  
4. (Optional) Press **Check VPN Status** to confirm your public IP changed.

### Endpoint selection
Use the **Server Endpoint** selector to switch anycast or your own VPS endpoint. Changing the endpoint will reconnect automatically.

### Killswitch (Windows)
Toggle **Killswitch** in Settings to block outbound traffic unless it goes through the WireGuard interface. Turning it off removes all Sage VPN firewall rules.

---

## Troubleshooting

**Public IP check fails (`ENOTFOUND`/`ECONNRESET`)**  
- DNS was briefly unavailable or a firewall rule is blocking HTTP. Try:
  - Disconnect → wait 2–3s → Reconnect
  - `ipconfig /flushdns`
  - Turn **Killswitch** off and back on

**Reconnect doesn’t change IP**  
- Give it a couple seconds; Sage VPN waits, flushes DNS, and verifies handshake. If another VPN is running, it may override routes.

**“WireGuard not installed”**  
- Install WireGuard for Windows and ensure these exist:  
  `C:\Program Files\WireGuard\wireguard.exe`, `C:\Program Files\WireGuard\wg.exe`

**Logs**
- WireGuard app → **Log** tab
- Windows Event Viewer → Applications and Services Logs → WireGuard

---

## Safety & Privacy

- Sage VPN does **not** collect analytics or telemetry.
- All networking is handled locally via the WireGuard driver and your configured endpoint.

---

## Credits

Built by **Aethera Intelligence** — https://github.com/aethera-intelligence

