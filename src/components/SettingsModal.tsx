import React from 'react';
import { X, Sliders, Vibrate, Volume2, Palette, ShieldAlert } from 'lucide-react';
import { ControllerSettings, ThemeType } from '../types/gamepad';
import { triggerHaptic, playButtonSound } from '../utils/audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ControllerSettings;
  onUpdateSettings: (newSettings: ControllerSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const update = (partial: Partial<ControllerSettings>) => {
    onUpdateSettings({ ...settings, ...partial });
  };

  const themes: { id: ThemeType; name: string; bg: string; border: string; accent: string }[] = [
    { id: 'airtel', name: 'Airtel Xstream', bg: 'bg-red-950', border: 'border-red-600', accent: '#ef4444' },
    { id: 'roblox', name: 'Roblox Red', bg: 'bg-zinc-900', border: 'border-rose-500', accent: '#e11d48' },
    { id: 'xbox', name: 'Xbox Series X', bg: 'bg-emerald-950', border: 'border-emerald-500', accent: '#10b981' },
    { id: 'playstation', name: 'PS5 DualSense', bg: 'bg-sky-950', border: 'border-sky-500', accent: '#0ea5e9' },
    { id: 'cyberpunk', name: 'Neon Cyber', bg: 'bg-purple-950', border: 'border-fuchsia-500', accent: '#d946ef' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-white text-base">Gamepad Calibration & Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 text-xs text-zinc-300 max-h-[75vh] overflow-y-auto">
          {/* Controller Theme */}
          <div>
            <label className="font-bold text-white flex items-center gap-2 mb-2">
              <Palette className="w-4 h-4 text-purple-400" />
              Gamepad Skin / Theme
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    update({ theme: t.id });
                    triggerHaptic(10, settings.vibration, settings.vibrationStrength);
                    playButtonSound('click', settings.audioVolume);
                  }}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                    settings.theme === t.id
                      ? `${t.border} ${t.bg} text-white font-bold shadow-md`
                      : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: t.accent }}
                  />
                  <span className="text-[11px] truncate">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Haptic Vibration */}
          <div className="p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-white flex items-center gap-2">
                <Vibrate className="w-4 h-4 text-emerald-400" />
                Haptic Rumble & Click Vibration
              </label>
              <input
                type="checkbox"
                checked={settings.vibration}
                onChange={(e) => {
                  update({ vibration: e.target.checked });
                  if (e.target.checked) triggerHaptic([15, 20], true, settings.vibrationStrength);
                }}
                className="w-4 h-4 accent-red-600 rounded cursor-pointer"
              />
            </div>
            {settings.vibration && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-zinc-400">
                  <span>Rumble Intensity</span>
                  <span className="font-mono text-white font-bold">{Math.round(settings.vibrationStrength * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.1"
                  value={settings.vibrationStrength}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    update({ vibrationStrength: val });
                    triggerHaptic(18, true, val);
                  }}
                  className="w-full accent-red-600 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Mechanical Audio Click Sound */}
          <div className="p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-white flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                Mechanical Switch Sound Feedback
              </label>
              <input
                type="checkbox"
                checked={settings.audioFeedback}
                onChange={(e) => {
                  update({ audioFeedback: e.target.checked });
                  if (e.target.checked) playButtonSound('click', settings.audioVolume);
                }}
                className="w-4 h-4 accent-red-600 rounded cursor-pointer"
              />
            </div>
            {settings.audioFeedback && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-zinc-400">
                  <span>Click Volume</span>
                  <span className="font-mono text-white font-bold">{Math.round(settings.audioVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={settings.audioVolume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    update({ audioVolume: val });
                    playButtonSound('click', val);
                  }}
                  className="w-full accent-red-600 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Analog Sticks Tuning */}
          <div className="space-y-3 p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl">
            <div className="font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              Thumbstick Physics & Deadzones
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Left Stick Deadzone (Character Drift)</span>
                <span className="font-mono text-white font-bold">{Math.round(settings.leftStickDeadzone * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.25"
                step="0.01"
                value={settings.leftStickDeadzone}
                onChange={(e) => update({ leftStickDeadzone: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Right Stick Deadzone (Camera Drift)</span>
                <span className="font-mono text-white font-bold">{Math.round((settings.rightStickDeadzone ?? 0.08) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.25"
                step="0.01"
                value={settings.rightStickDeadzone ?? 0.08}
                onChange={(e) => update({ rightStickDeadzone: parseFloat(e.target.value) })}
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Right Stick Sensitivity (Roblox Camera Orbit)</span>
                <span className="font-mono text-white font-bold">{settings.rightStickSensitivity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={settings.rightStickSensitivity}
                onChange={(e) => update({ rightStickSensitivity: parseFloat(e.target.value) })}
                className="w-full accent-red-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-zinc-300">Invert Y Axis (Flight / Camera pitch)</span>
              <input
                type="checkbox"
                checked={settings.invertY}
                onChange={(e) => update({ invertY: e.target.checked })}
                className="w-4 h-4 accent-red-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-xs shadow-md transition-colors"
          >
            Save & Resume
          </button>
        </div>
      </div>
    </div>
  );
};
