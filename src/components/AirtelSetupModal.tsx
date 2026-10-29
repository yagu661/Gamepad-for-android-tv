import React, { useState } from 'react';
import { Tv, Wifi, Bluetooth, Terminal, Gamepad2, X, Check, Copy, ExternalLink, HelpCircle, ShieldCheck } from 'lucide-react';

interface AirtelSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
}

export const AirtelSetupModal: React.FC<AirtelSetupModalProps> = ({ isOpen, onClose, roomCode }) => {
  const [activeTab, setActiveTab] = useState<'browser' | 'adb' | 'bluetooth' | 'mantis' | 'shortcuts'>('browser');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [boxIp, setBoxIp] = useState('192.168.1.100');

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const currentAppUrl = typeof window !== 'undefined' ? window.location.origin : 'https://...';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base md:text-lg flex items-center gap-2">
                Airtel Xstream Box Setup Guide
                <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-semibold uppercase">
                  Roblox TV
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Connect your phone gamepad to play Roblox on Airtel Xstream Smart Box
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/40 p-1.5 gap-1 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('browser')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === 'browser'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            1. TV Web Receiver (Zero Setup)
          </button>
          <button
            onClick={() => setActiveTab('adb')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === 'adb'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            2. WiFi ADB Bridge (Direct APK)
          </button>
          <button
            onClick={() => setActiveTab('bluetooth')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === 'bluetooth'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Bluetooth className="w-3.5 h-3.5" />
            3. Bluetooth HID Mode
          </button>
          <button
            onClick={() => setActiveTab('mantis')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === 'mantis'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            4. Keymapper Overlay
          </button>
          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === 'shortcuts'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Roblox Keymap
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 md:p-5 overflow-y-auto space-y-4 text-sm text-zinc-300">
          {activeTab === 'browser' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-red-950/30 border border-red-500/20 rounded-xl">
                <span className="font-semibold text-red-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-red-400" />
                  Recommended: Fastest, No Sideloading Required
                </span>
                <p className="text-xs text-zinc-300 mt-1">
                  You can open this receiver directly in any browser installed on your Airtel Xstream setup box (such as TV Bro, JioPages, or Puffin TV).
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-zinc-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Open Web Browser on Airtel Box</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      On your Airtel Xstream Box, launch Google Play Store and install <strong>TV Bro</strong> or <strong>JioPages</strong> (both have smooth TV remote navigation).
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-zinc-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="w-full">
                    <h4 className="font-semibold text-white">Navigate to this App URL</h4>
                    <p className="text-xs text-zinc-400 mt-0.5 mb-2">
                      Enter the app URL on the TV browser:
                    </p>
                    <div className="flex items-center gap-2 p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-emerald-400">
                      <span className="truncate flex-1">{currentAppUrl}</span>
                      <button
                        onClick={() => handleCopy(currentAppUrl, 'appUrl')}
                        className="p-1 hover:text-white text-zinc-400"
                        title="Copy URL"
                      >
                        {copiedText === 'appUrl' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-zinc-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Switch to TV Receiver Mode</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Select <strong>"TV Screen / Roblox Test Hub"</strong> at the top. It will display a big QR code and your 4-letter pairing PIN.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-zinc-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Scan or Enter Room Code</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      On your phone, point camera at the TV QR code. Your phone instantly links up with zero typing and ultra-low WebRTC latency!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'adb' && (
            <div className="space-y-4">
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                <h4 className="font-semibold text-white text-xs uppercase tracking-wider text-red-400">
                  Direct Android TV Input Injection via WiFi ADB
                </h4>
                <p className="text-xs text-zinc-400">
                  If you have sideloaded the official <strong>Roblox APK</strong> on your Airtel Xstream Box, you can transmit gamepad events directly into Android OS without root:
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-lg space-y-1">
                  <div className="text-xs font-bold text-white">Step 1: Enable Developer Options on Airtel Box</div>
                  <div className="text-xs text-zinc-400">
                    Airtel Box Home &rarr; <span className="text-zinc-200">Settings (Gear icon)</span> &rarr; <span className="text-zinc-200">Device Preferences</span> &rarr; <span className="text-zinc-200">About</span> &rarr; Click <strong>"Android TV OS build"</strong> 7 times until it says "You are now a developer!".
                  </div>
                </div>

                <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-lg space-y-1">
                  <div className="text-xs font-bold text-white">Step 2: Turn on Network Debugging</div>
                  <div className="text-xs text-zinc-400">
                    Go back to <span className="text-zinc-200">Device Preferences &rarr; Developer Options</span> &rarr; Enable <strong>"Network ADB Debugging"</strong> (or USB Debugging).
                  </div>
                </div>

                <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Step 3: Enter Airtel Box IP Address</span>
                    <span className="text-[10px] text-zinc-400">Find in Settings &rarr; Network</span>
                  </div>
                  <input
                    type="text"
                    value={boxIp}
                    onChange={(e) => setBoxIp(e.target.value)}
                    placeholder="e.g. 192.168.1.100"
                    className="w-full bg-zinc-900 border border-zinc-700 px-3 py-1.5 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-500"
                  />
                  <div className="text-[11px] text-zinc-400">
                    Run this command on your PC or local terminal bridge connected to the same Wi-Fi:
                  </div>
                  <div className="flex items-center justify-between p-2 bg-zinc-900 border border-zinc-700 rounded font-mono text-xs text-emerald-400">
                    <code>adb connect {boxIp}:5555</code>
                    <button
                      onClick={() => handleCopy(`adb connect ${boxIp}:5555`, 'adbConnect')}
                      className="text-zinc-400 hover:text-white"
                    >
                      {copiedText === 'adbConnect' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-lg space-y-1.5">
                  <div className="text-xs font-bold text-white">Standard Android TV Keyevents Mapped by XstreamPad:</div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-zinc-400">
                    <div className="bg-zinc-900 p-1.5 rounded">Jump (A): <code>KEYCODE_BUTTON_A (96)</code></div>
                    <div className="bg-zinc-900 p-1.5 rounded">Back (B): <code>KEYCODE_BUTTON_B (97)</code></div>
                    <div className="bg-zinc-900 p-1.5 rounded">Action (X): <code>KEYCODE_BUTTON_X (99)</code></div>
                    <div className="bg-zinc-900 p-1.5 rounded">Inv (Y): <code>KEYCODE_BUTTON_Y (100)</code></div>
                    <div className="bg-zinc-900 p-1.5 rounded">Click (R1): <code>KEYCODE_BUTTON_R1 (103)</code></div>
                    <div className="bg-zinc-900 p-1.5 rounded">Sprint (L1): <code>KEYCODE_BUTTON_L1 (102)</code></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bluetooth' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-950/30 border border-blue-500/20 rounded-xl space-y-1">
                <span className="font-semibold text-blue-400 flex items-center gap-2">
                  <Bluetooth className="w-4 h-4 text-blue-400" />
                  Turn Phone into Hardware Bluetooth Controller
                </span>
                <p className="text-xs text-zinc-300">
                  Android phones support Bluetooth HID Gamepad profile. The Airtel Xstream Box will detect your phone just like an Xbox Wireless Controller!
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-zinc-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Install Bluetooth Gamepad HID App</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      On your phone from Google Play Store, install <strong>"Serverless Bluetooth Keyboard & Mouse"</strong> or <strong>"Bluetooth Gamepad"</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-zinc-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">On Airtel Xstream Box: Pair New Accessory</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Go to <span className="text-zinc-200">Airtel Box Settings &rarr; Remotes & Accessories &rarr; Add Accessory</span>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-zinc-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Select Your Phone & Confirm</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Your phone will be recognized as a Wireless Game Controller. Roblox on Android TV will automatically detect Xbox controller inputs!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mantis' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/20 rounded-xl space-y-1">
                <span className="font-semibold text-emerald-400 flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-emerald-400" />
                  Mantis Gamepad Pro / Octopus On-Screen Mapping
                </span>
                <p className="text-xs text-zinc-300">
                  Because some Roblox Android games are touch-designed, keymappers let you place virtual buttons directly over the Roblox touch controls on the TV screen.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-lg space-y-1.5">
                  <div className="text-xs font-bold text-white">Recommended Screen Positions for Roblox:</div>
                  <ul className="list-disc list-inside text-xs text-zinc-400 space-y-1">
                    <li><strong>Movement Joystick (Left Stick):</strong> Bottom-left corner (covers virtual thumbstick).</li>
                    <li><strong>Jump Button (A):</strong> Bottom-right round button.</li>
                    <li><strong>Camera Pan (Right Stick):</strong> Upper right half of screen.</li>
                    <li><strong>Tool Action (R1):</strong> Center-right screen tap.</li>
                    <li><strong>Backpack (Y):</strong> Top-left inventory icon.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="space-y-3">
              <h4 className="font-semibold text-white text-xs uppercase tracking-wider text-zinc-400">
                Roblox Android TV Controller Button Chart
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between">
                  <span className="font-medium text-emerald-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center font-bold text-[10px]">A</span>
                    Jump
                  </span>
                  <span className="text-zinc-400">Spacebar / Obstacle hop</span>
                </div>

                <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between">
                  <span className="font-medium text-red-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center font-bold text-[10px]">B</span>
                    Back / Cancel
                  </span>
                  <span className="text-zinc-400">Close modal / Crouch</span>
                </div>

                <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between">
                  <span className="font-medium text-blue-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500 flex items-center justify-center font-bold text-[10px]">X</span>
                    Interact / Tool
                  </span>
                  <span className="text-zinc-400">Roblox 'E' trigger</span>
                </div>

                <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between">
                  <span className="font-medium text-amber-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500 flex items-center justify-center font-bold text-[10px]">Y</span>
                    Backpack
                  </span>
                  <span className="text-zinc-400">Toggle inventory bar</span>
                </div>

                <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between">
                  <span className="font-medium text-purple-400">R1 / RT</span>
                  <span className="text-zinc-400">Primary action / Tool click</span>
                </div>

                <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between">
                  <span className="font-medium text-purple-400">L1 / LT</span>
                  <span className="text-zinc-400">Sprint / Zoom out</span>
                </div>

                <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between">
                  <span className="font-medium text-zinc-300">Left Stick (LS)</span>
                  <span className="text-zinc-400">Character 360 walk</span>
                </div>

                <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between">
                  <span className="font-medium text-zinc-300">Right Stick (RS)</span>
                  <span className="text-zinc-400">Camera 360 orbit</span>
                </div>

                <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between">
                  <span className="font-medium text-zinc-300">D-Pad 1, 2, 3, 4</span>
                  <span className="text-zinc-400">Quick select tool slots</span>
                </div>

                <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between">
                  <span className="font-medium text-zinc-300">Start / Menu</span>
                  <span className="text-zinc-400">Roblox Settings / Esc</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950/70 flex items-center justify-between text-xs">
          <div className="text-zinc-400 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Current Room Code: <strong className="text-white font-mono uppercase">{roomCode || 'NONE'}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
          >
            Got it, Let's Play!
          </button>
        </div>
      </div>
    </div>
  );
};
