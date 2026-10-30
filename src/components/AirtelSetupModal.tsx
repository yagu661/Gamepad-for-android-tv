import React, { useState, useEffect } from 'react';
import {
  Bluetooth,
  Wifi,
  Terminal,
  Tv,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Power,
  Radio,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Info
} from 'lucide-react';
import { NativeBluetoothGamepad, BluetoothDeviceInfo, BluetoothPluginStatus } from '../utils/bluetoothGamepad';
import { connectionManager } from '../utils/connection';
import { RoomConnectionStatus } from '../types/gamepad';
import { triggerHaptic, playButtonSound } from '../utils/audio';

interface AirtelSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
}

export const AirtelSetupModal: React.FC<AirtelSetupModalProps> = ({
  isOpen,
  onClose,
  roomCode,
}) => {
  const [activeTab, setActiveTab] = useState<'bluetooth' | 'wifi' | 'adb'>('bluetooth');
  const [status, setStatus] = useState<RoomConnectionStatus>(connectionManager.getStatus());

  // Bluetooth HID state
  const [btStatus, setBtStatus] = useState<BluetoothPluginStatus | null>(null);
  const [pairedDevices, setPairedDevices] = useState<BluetoothDeviceInfo[]>([]);
  const [btLoading, setBtLoading] = useState(false);
  const [btMessage, setBtMessage] = useState<string>('');

  // Wi-Fi Local IP state
  const [customTvIp, setCustomTvIp] = useState<string>(status.tvHost || '');
  const [testingWifi, setTestingWifi] = useState(false);
  const [wifiResult, setWifiResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // ADB state
  const [adbHost, setAdbHost] = useState('192.168.1.100:5555');

  useEffect(() => {
    const unsub = connectionManager.subscribeStatus(setStatus);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isOpen) {
      checkBluetoothState();
    }
  }, [isOpen]);

  const checkBluetoothState = async () => {
    try {
      setBtLoading(true);
      const res = await NativeBluetoothGamepad.checkSupport();
      setBtStatus(res);
      if (res.enabled) {
        const bonded = await NativeBluetoothGamepad.getBondedDevices();
        setPairedDevices(bonded.devices || []);
      }
    } catch (e: any) {
      setBtStatus({
        supported: false,
        enabled: false,
        isRegistered: false,
        connected: false,
        reason: 'Native Bluetooth HID plugin active on Android APK builds. In browser, use Wi-Fi Direct or WebRTC mode.'
      });
    } finally {
      setBtLoading(false);
    }
  };

  const handleRegisterGamepad = async () => {
    try {
      setBtLoading(true);
      setBtMessage('Registering phone as Xbox Bluetooth Gamepad...');
      const res = await NativeBluetoothGamepad.registerGamepad();
      if (res.success) {
        setBtMessage('Phone registered as Xbox Gamepad! Making discoverable for Airtel TV...');
        await NativeBluetoothGamepad.makeDiscoverable();
        setBtMessage('Discoverable for 300s. Now open Airtel Box Settings > Remotes & Accessories > Add Accessory');
        triggerHaptic([30, 40], true);
      }
      checkBluetoothState();
    } catch (e: any) {
      setBtMessage('Registration error: ' + (e.message || e));
    } finally {
      setBtLoading(false);
    }
  };

  const handleConnectBtDevice = async (address: string) => {
    try {
      setBtLoading(true);
      setBtMessage(`Connecting HID channel to ${address}...`);
      const res = await NativeBluetoothGamepad.connectDevice({ address });
      setBtMessage(`Connected to ${res.targetDevice || 'Airtel TV'}!`);
      triggerHaptic([20, 20, 40], true);
      checkBluetoothState();
    } catch (e: any) {
      setBtMessage('Connection error: ' + (e.message || e));
    } finally {
      setBtLoading(false);
    }
  };

  const handleDisconnectBt = async () => {
    try {
      await NativeBluetoothGamepad.disconnect();
      setBtMessage('Disconnected Bluetooth Gamepad');
      checkBluetoothState();
    } catch {}
  };

  const handleTestWifi = async () => {
    if (!customTvIp.trim()) {
      setWifiResult({ ok: false, msg: 'Please enter your Airtel TV box IP address (e.g. 192.168.1.105)' });
      return;
    }
    setTestingWifi(true);
    setWifiResult(null);

    const clean = customTvIp.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '').replace(/\/.*$/, '');
    const target = clean.includes(':') ? clean : `${clean}:3000`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`http://${target}/api/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        setWifiResult({ ok: true, msg: `Reachable! Active TV Receiver confirmed on ${target}` });
        connectionManager.setCustomTvHost(target);
        triggerHaptic([20, 30], true);
      } else {
        setWifiResult({ ok: false, msg: `TV responded with HTTP ${res.status}. Is the TV app open?` });
      }
    } catch (err: any) {
      setWifiResult({
        ok: false,
        msg: `Could not reach ${target}. Make sure both phone & Airtel box are on the same Wi-Fi network and port 3000 is open.`
      });
    } finally {
      setTestingWifi(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base md:text-lg flex items-center gap-2">
                Airtel Xstream Box (HY0001) Connection
                <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
                  Real Hardware
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Samsung Galaxy M30s &rarr; Airtel Xstream Smart TV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation: Real 3 Hardware Connection Modes */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/50 p-1.5 gap-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('bluetooth')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
              activeTab === 'bluetooth'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Bluetooth className="w-4 h-4 text-blue-300" />
            <span>Priority 1: Bluetooth Gamepad HID</span>
          </button>

          <button
            onClick={() => setActiveTab('wifi')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
              activeTab === 'wifi'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Wifi className="w-4 h-4 text-emerald-300" />
            <span>Priority 2: Local Wi-Fi (Same Network)</span>
          </button>

          <button
            onClick={() => setActiveTab('adb')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
              activeTab === 'adb'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Terminal className="w-4 h-4 text-amber-300" />
            <span>Priority 3: Wireless ADB Bridge</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 text-xs text-zinc-300">
          {/* TAB 1: BLUETOOTH ACCESSORY MODE (HIGHEST PRIORITY) */}
          {activeTab === 'bluetooth' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-950/30 border border-blue-500/40 rounded-2xl flex items-start gap-3">
                <Bluetooth className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-white text-sm block">
                    Native Android Bluetooth HID Gamepad Emulation
                  </span>
                  <p className="text-zinc-300 leading-relaxed text-[11px]">
                    Turns your Samsung Galaxy M30s into an actual physical <strong>Xbox Wireless Controller</strong> using Android 11's <code>BluetoothHidDevice</code> API. Your Airtel Xstream box detects it as a standard hardware gamepad.
                  </p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="p-3 bg-zinc-950/80 rounded-2xl border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-200">Bluetooth HID State:</span>
                  <button
                    onClick={checkBluetoothState}
                    disabled={btLoading}
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${btLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 text-[11px]">
                  <span className={`px-2.5 py-1 rounded-lg font-bold border ${
                    status.transport === 'bluetooth_hid'
                      ? 'bg-blue-500/20 border-blue-400 text-blue-300'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                  }`}>
                    Connection: {status.transport === 'bluetooth_hid' ? `CONNECTED (${status.deviceName || 'Airtel TV'})` : 'DISCONNECTED'}
                  </span>

                  <span className={`px-2.5 py-1 rounded-lg font-bold border ${
                    btStatus?.isRegistered
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                  }`}>
                    HID Profile: {btStatus?.isRegistered ? 'REGISTERED AS XBOX' : 'NOT REGISTERED'}
                  </span>
                </div>

                {btMessage && (
                  <div className="p-2 rounded-xl bg-black/60 border border-blue-500/30 text-blue-300 font-mono text-[11px]">
                    {btMessage}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  onClick={handleRegisterGamepad}
                  disabled={btLoading}
                  className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Radio className="w-4 h-4 animate-pulse" />
                  <span>1. Start Bluetooth Pairing</span>
                </button>

                <button
                  onClick={handleDisconnectBt}
                  className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 border border-zinc-700 transition-all"
                >
                  <Power className="w-4 h-4 text-red-400" />
                  <span>Disconnect Bluetooth</span>
                </button>
              </div>

              {/* Paired Devices List */}
              <div className="p-3 bg-zinc-950/80 rounded-2xl border border-zinc-800 space-y-2">
                <span className="font-bold text-zinc-200 block text-xs">
                  Paired Devices on your Samsung Phone:
                </span>
                {pairedDevices.length === 0 ? (
                  <p className="text-[11px] text-zinc-500 italic">
                    No paired Bluetooth devices detected. Start pairing above, then look for "Xbox Wireless Gamepad" on your Airtel TV.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {pairedDevices.map((d) => (
                      <div
                        key={d.address}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                          d.isXstream ? 'bg-red-950/40 border-red-500/50' : 'bg-zinc-900 border-zinc-800'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            {d.isXstream && <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black">AIRTEL TV</span>}
                            <span>{d.name}</span>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono">{d.address}</span>
                        </div>
                        <button
                          onClick={() => handleConnectBtDevice(d.address)}
                          disabled={btLoading}
                          className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px]"
                        >
                          Connect HID
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Exact Step-by-Step for Airtel Xstream Box */}
              <div className="p-3.5 bg-black/50 border border-zinc-800 rounded-2xl space-y-2">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  Exact Airtel Xstream Box TV Steps:
                </span>
                <ol className="list-decimal list-inside space-y-1 text-zinc-400 text-[11px] leading-relaxed">
                  <li>Tap <strong>"1. Start Bluetooth Pairing"</strong> above on your Samsung phone.</li>
                  <li>On your Airtel Xstream TV Box, take the remote and go to: <strong>Settings &rarr; Remotes &amp; Accessories &rarr; Add Accessory</strong>.</li>
                  <li>Your Airtel Box will search and display <strong>"Xbox Wireless Gamepad"</strong>.</li>
                  <li>Select it on your TV remote to pair. Once paired, your phone's thumbsticks and buttons immediately control the TV!</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: LOCAL WI-FI (SAME NETWORK) */}
          {activeTab === 'wifi' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/40 rounded-2xl flex items-start gap-3">
                <Wifi className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-white text-sm block">
                    Same Wi-Fi Direct Communication (No Bluetooth Required)
                  </span>
                  <p className="text-zinc-300 leading-relaxed text-[11px]">
                    Both your Samsung Galaxy M30s and your Airtel Xstream Box are on the same Wi-Fi. Enter your Airtel TV box's local IP address below to connect directly with low-latency WebRTC UDP channels.
                  </p>
                </div>
              </div>

              {/* IP Input */}
              <div className="p-3.5 bg-zinc-950/80 rounded-2xl border border-zinc-800 space-y-3">
                <label className="font-bold text-white block">
                  Airtel Xstream Box Local IP Address:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customTvIp}
                    onChange={(e) => setCustomTvIp(e.target.value)}
                    placeholder="e.g. 192.168.1.105:3000"
                    className="flex-1 bg-black/80 border border-zinc-700 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={handleTestWifi}
                    disabled={testingWifi}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-black font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingWifi ? 'animate-spin' : ''}`} />
                    <span>Test &amp; Connect</span>
                  </button>
                </div>

                {wifiResult && (
                  <div className={`p-2.5 rounded-xl border text-[11px] font-medium ${
                    wifiResult.ok ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300' : 'bg-red-950/60 border-red-500/60 text-red-300'
                  }`}>
                    {wifiResult.msg}
                  </div>
                )}

                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <span className="font-bold text-zinc-300 block text-[11px]">
                    How to find your Airtel Xstream Box IP address:
                  </span>
                  <p className="text-zinc-400 text-[10px] leading-relaxed">
                    On your Airtel TV remote: <strong>Settings &rarr; Network &amp; Internet &rarr; Tap your connected Wi-Fi name &rarr; IP Address</strong> (typically <code>192.168.1.xxx</code>).
                  </p>
                </div>
              </div>

              {/* PIN Fallback */}
              <div className="p-3.5 bg-zinc-950/80 rounded-2xl border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">TV Web Receiver Fallback:</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">
                    PIN: {roomCode}
                  </span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Open any browser on your Airtel TV (JioPages TV, Puffin TV, or Chrome) and navigate to <code>{typeof window !== 'undefined' ? window.location.origin : 'https://...'}</code>. Enter the PIN above to pair instantly!
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: ANDROID ADB BRIDGE */}
          {activeTab === 'adb' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-950/30 border border-amber-500/40 rounded-2xl flex items-start gap-3">
                <Terminal className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-white text-sm block">
                    Wireless ADB Debugging Bridge (Truthful Requirements)
                  </span>
                  <p className="text-zinc-300 leading-relaxed text-[11px]">
                    Android TV boxes (like Airtel HY0001) do <strong>NOT</strong> accept raw ADB input injections over standard Wi-Fi without explicit Developer Options authorization.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-zinc-950/80 rounded-2xl border border-zinc-800 space-y-3">
                <span className="font-bold text-white block">
                  To Enable Wireless ADB on your Airtel Xstream Box:
                </span>
                <ol className="list-decimal list-inside space-y-1.5 text-zinc-300 text-[11px] leading-relaxed">
                  <li>On your Airtel TV, open <strong>Settings &rarr; Device Preferences &rarr; About</strong>.</li>
                  <li>Scroll down to <strong>Build</strong> and click the remote OK button <strong>7 times</strong> until it says <em>"You are now a developer!"</em>.</li>
                  <li>Go back one screen into <strong>Developer Options</strong>.</li>
                  <li>Turn on <strong>USB Debugging</strong> and <strong>Wireless Debugging</strong>.</li>
                  <li>Note the IP and Port displayed under Wireless Debugging (usually port <code>5555</code>).</li>
                </ol>
              </div>

              <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-2xl flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-zinc-300 leading-relaxed">
                  <strong className="text-white block mb-0.5">Recommended: Use Priority 1 (Bluetooth Gamepad)</strong>
                  Since you use your phone without a laptop, Bluetooth HID is 100% plug-and-play and requires zero developer settings or ADB command authorizations.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span className={`w-2 h-2 rounded-full ${status.connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span>Transport: <strong className="text-white uppercase">{status.transport}</strong></span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-black rounded-xl text-xs shadow-md active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
