import React from 'react';
import { X, Sparkles, Smile, RefreshCw, Hand, Heart, ThumbsUp, Flame } from 'lucide-react';
import { triggerHaptic, playButtonSound } from '../utils/audio';

interface EmoteWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmote: (emoteCmd: string) => void;
  hapticEnabled?: boolean;
}

const ROBLOX_EMOTES = [
  { name: 'Dance 1', cmd: '/e dance', icon: Sparkles, color: 'from-amber-500 to-orange-600' },
  { name: 'Dance 2', cmd: '/e dance2', icon: Flame, color: 'from-rose-500 to-pink-600' },
  { name: 'Wave', cmd: '/e wave', icon: Hand, color: 'from-blue-500 to-cyan-600' },
  { name: 'Cheer', cmd: '/e cheer', icon: ThumbsUp, color: 'from-emerald-500 to-teal-600' },
  { name: 'Laugh', cmd: '/e laugh', icon: Smile, color: 'from-yellow-400 to-amber-500' },
  { name: 'Point', cmd: '/e point', icon: Heart, color: 'from-purple-500 to-indigo-600' },
  { name: 'Reset Char', cmd: '/reset', icon: RefreshCw, color: 'from-red-600 to-rose-700' },
];

export const EmoteWheelModal: React.FC<EmoteWheelModalProps> = ({
  isOpen,
  onClose,
  onSelectEmote,
  hapticEnabled = true,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl p-5 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-sm">Roblox Quick Actions & Emotes</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mt-4">
          {ROBLOX_EMOTES.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.cmd}
                onClick={() => {
                  triggerHaptic([10, 15], hapticEnabled);
                  playButtonSound('menu', 0.4);
                  onSelectEmote(item.cmd);
                  onClose();
                }}
                className={`flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-r ${item.color} text-white font-medium text-xs shadow-lg active:scale-95 transition-transform text-left`}
              >
                <div className="p-1.5 bg-black/20 rounded-lg">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold">{item.name}</div>
                  <div className="text-[10px] opacity-80 font-mono">{item.cmd}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-zinc-800/80 text-center">
          <p className="text-[11px] text-zinc-400">
            Tapping an action sends the Roblox command directly to your Airtel Xstream TV!
          </p>
        </div>
      </div>
    </div>
  );
};
