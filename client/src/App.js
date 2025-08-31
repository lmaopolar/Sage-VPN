import React, { useEffect, useState } from 'react';
import { connect, disconnect, reconnect, vpnStatus, setEndpoint, setKillswitch, openExternal } from './vpn';

export default function App() {
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState('Ready.');
  const [publicIP, setPublicIP] = useState('');
  const [endpoint, setEndpointInput] = useState('162.159.192.1:2408');
  const [killswitch, setKS] = useState(false);
  const [lastAction, setLastAction] = useState('');
  const [flashSuccess, setFlashSuccess] = useState(false);
  const [flashError, setFlashError] = useState(false);

  useEffect(() => { onCheckIP(); }, []);

  const showSuccess = () => {
    setFlashSuccess(true);
    setTimeout(() => setFlashSuccess(false), 600);
  };

  const showError = () => {
    setFlashError(true);
    setTimeout(() => setFlashError(false), 500);
  };

  async function onConnect() {
    setBusy(true); 
    setMsg('Connecting…');
    setLastAction('connect');
    
    const res = await connect();
    if (res?.ok) { 
      setConnected(true); 
      setMsg('Connected successfully!'); 
      await onCheckIP();
      showSuccess();
    } else {
      setMsg(`Connect failed: ${res?.error || 'Unknown error'}`);
      showError();
    }
    setBusy(false);
  }

  async function onDisconnect() {
    setBusy(true); 
    setMsg('Disconnecting…');
    setLastAction('disconnect');
    
    const res = await disconnect();
    if (res?.ok) { 
      setConnected(false); 
      setMsg('Disconnected safely.'); 
      await onCheckIP();
      showSuccess();
    } else {
      setMsg(`Disconnect failed: ${res?.error || 'Unknown error'}`);
      showError();
    }
    setBusy(false);
  }

  async function onReconnect() {
    setBusy(true); 
    setMsg('Reconnecting…');
    setLastAction('reconnect');
    
    const res = await reconnect();
    if (res?.ok) { 
      setConnected(true); 
      setMsg('Reconnected successfully!'); 
      await onCheckIP();
      showSuccess();
    } else {
      setMsg(`Reconnect failed: ${res?.error || 'Unknown error'}`);
      showError();
    }
    setBusy(false);
  }

  async function onCheckIP() {
    setChecking(true);
    try {
      const res = await vpnStatus();
      if (!res?.ok) throw new Error(res?.error || 'Status failed');
      setPublicIP(res.ip);
      setMsg('IP status updated.');
    } catch (e) {
      setMsg(`Status check failed: ${e.message}`);
      showError();
    } finally {
      setChecking(false);
    }
  }

  async function onApplyEndpoint() {
    if (!endpoint || !/:\d+$/.test(endpoint)) {
      setMsg('Endpoint must be in format host:port'); 
      showError();
      return;
    }
    setBusy(true);
    setMsg('Updating endpoint…');
    
    const res = await setEndpoint(endpoint);
    if (!res?.ok) { 
      setMsg(`Set endpoint failed: ${res?.error}`); 
      setBusy(false); 
      showError();
      return; 
    }
    setMsg('Endpoint updated. Reconnecting…');
    await onReconnect();
  }

  async function onToggleKS(e) {
    const enabled = e.target.checked;
    setKS(enabled);
    
    const res = await setKillswitch(enabled);
    if (!res?.ok) {
      setMsg(`Killswitch error: ${res?.error}`);
      showError();
    } else {
      setMsg(enabled ? 'Killswitch enabled.' : 'Killswitch disabled.');
      showSuccess();
    }
  }

  const getButtonClass = (baseClass) => {
    let classes = `btn ${baseClass}`;
    if (busy && (lastAction === 'connect' || lastAction === 'disconnect' || lastAction === 'reconnect')) {
      classes += ' btn-loading';
    }
    return classes;
  };

  const getCardClass = () => {
    let classes = 'card';
    if (flashSuccess) classes += ' success-flash';
    if (flashError) classes += ' error-shake';
    return classes;
  };

  return (
    <div className="container">
      <div className={getCardClass()}>
        <div className="header">
          <div 
            className="dot" 
            style={{background: connected ? 'var(--ok)' : '#666'}} 
          />
          <div className="h1">Sage VPN</div>
        </div>

        <div className={`status ${connected ? 'status-connected' : 'status-disconnected'}`}>
          <span>{connected ? '🔒 Secured & Connected' : '🔓 Not Protected'}</span>
        </div>

        {connected ? (
          <button 
            className={getButtonClass('danger')} 
            onClick={onDisconnect} 
            disabled={busy}
          >
            {busy && lastAction === 'disconnect' ? 'Disconnecting…' : 'Disconnect'}
          </button>
        ) : (
          <button 
            className={getButtonClass('primary')} 
            onClick={onConnect} 
            disabled={busy}
          >
            {busy && lastAction === 'connect' ? 'Connecting…' : 'Connect VPN'}
          </button>
        )}

        <div className="row">
          <button 
            className={getButtonClass('secondary')} 
            onClick={onReconnect} 
            disabled={busy}
          >
            {busy && lastAction === 'reconnect' ? 'Reconnecting…' : 'Reconnect'}
          </button>
          <button 
            className="btn secondary" 
            onClick={onCheckIP} 
            disabled={checking}
          >
            {checking ? 'Checking…' : 'Check Status'}
          </button>
        </div>

        <div className="row2">
          <input 
            className="input" 
            value={endpoint} 
            onChange={e => setEndpointInput(e.target.value)} 
            placeholder="host:port (e.g., 162.159.192.1:2408)" 
          />
          <button 
            className="btn secondary" 
            onClick={onApplyEndpoint} 
            disabled={busy}
          >
            Apply & Reconnect
          </button>
        </div>

        <label className="switch" onClick={e => e.target.tagName !== 'INPUT' && e.preventDefault()}>
          <input 
            type="checkbox" 
            checked={killswitch} 
            onChange={onToggleKS} 
          />
          <span>Killswitch (Windows Firewall)</span>
        </label>

        <div className="ip">
          <span>Public IP: {publicIP || '—'}</span>
        </div>
        
        <div className="msg">{msg}</div>

        <div className="foot">
          Created by <a 
            href="#" 
            onClick={(e) => {
              e.preventDefault(); 
              openExternal('https://github.com/aethera-intelligence');
            }}
          >
            Aethera Intelligence
          </a>
        </div>
      </div>
    </div>
  );
}