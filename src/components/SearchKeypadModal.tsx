import React, { useState, useEffect } from 'react';
import { X, Search, Send, MessageSquare, Mic, Sparkles, Delete, CornerDownLeft, ArrowUp } from 'lucide-react';
import { triggerHaptic, playButtonSound } from '../utils/audio';

interface SearchKeypadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendText: (text: string, isSearch: boolean) => void;
  hapticEnabled?: boolean;
}

const COMMON_ROBLOX_TAGS = ['Car', 'House', 'Gun', 'Sword', 'Pet', 'Music', 'Armor', 'Obby', 'Skin', 'Fruit'];
const COMMON_ROBLOX_CHATS = ['gg!', 'hi everyone', 'trade?', 'need help!', 'follow me', 'afk', 'nice jump!'];

export const SearchKeypadModal: React.FC<SearchKeypadModalProps> = ({
  isOpen,
  onClose,
  onSendText,
  hapticEnabled = true,
}) => {
  const [text, setText] = useState('');
  const [activeTab, setActiveTab] = useState<'search' | 'chat'>('search');
  const [isShift, setIsShift] = useState(false);

  if (!isOpen) return null;

  const handleKeyPress = (char: string) => {
    triggerHaptic(10, hapticEnabled);
    playButtonSound('dpad', 0.3);
    setText((prev) => prev + (isShift ? char.toUpperCase() : char.toLowerCase()));
  };

  const handleBackspace = () => {
    triggerHaptic(12, hapticEnabled);
    playButtonSound('click', 0.3);
    setText((prev) => prev.slice(0, -1));
  };

  const handleSpace = () => {
    triggerHaptic(8, hapticEnabled);
    playButtonSound('click', 0.2);
    setText((prev) => prev + ' ');
  };

  const handleSend = () => {
    if (!text.trim()) return;
    triggerHaptic([15, 20], hapticEnabled);
    playButtonSound('menu', 0.5);
    onSendText(text, activeTab === 'search');
    setText('');
    onClose();
  };

  const KEYBOARD_ROWS = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', '/', '?']
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-2 sm:p-4">
      <div className="bg-zinc-900 border border-emerald-500/40 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6">
        {/* Header with Mode Switcher */}
        <div className="p-3 border-b border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('search')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'search'
                  ? 'bg-emerald-600 text-black shadow-md'
                  : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              Roblox Search Keypad
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'chat'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              In-Game Chat ( / )
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-3 bg-zinc-950/60 flex items-center gap-2 border-b border-zinc-800">
          <div className="relative flex-1">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={activeTab === 'search' ? 'Search items, catalog, props, music ID...' : 'Type message to send to Roblox TV...'}
              className="w-full bg-black/70 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              autoFocus
            />
            {text && (
              <button
                onClick={() => setText('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-black text-xs rounded-xl flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
          >
            <span>{activeTab === 'search' ? 'Search TV' : 'Send'}</span>
            <CornerDownLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Tag Pills */}
        <div className="px-3 py-2 bg-zinc-950/40 flex items-center gap-1.5 overflow-x-auto text-[11px] border-b border-zinc-800/60">
          <span className="text-zinc-500 font-bold shrink-0">QUICK:</span>
          {(activeTab === 'search' ? COMMON_ROBLOX_TAGS : COMMON_ROBLOX_CHATS).map((tag) => (
            <button
              key={tag}
              onClick={() => {
                triggerHaptic(10, hapticEnabled);
                setText(tag);
              }}
              className="px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 font-medium whitespace-nowrap active:scale-95 transition-transform"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Virtual Alphanumeric Keyboard */}
        <div className="p-2 sm:p-3 bg-zinc-950 flex flex-col gap-1.5 select-none touch-none">
          {KEYBOARD_ROWS.map((row, rIdx) => (
            <div key={rIdx} className="flex justify-center gap-1">
              {rIdx === 3 && (
                <button
                  onClick={() => setIsShift(!isShift)}
                  className={`px-3 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                    isShift ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
              )}

              {row.map((char) => (
                <button
                  key={char}
                  onClick={() => handleKeyPress(char)}
                  className="flex-1 max-w-[38px] py-2.5 rounded-lg bg-zinc-800/90 active:bg-emerald-500 active:text-black hover:bg-zinc-700 text-white font-bold text-sm shadow-sm transition-transform active:scale-90 flex items-center justify-center uppercase"
                >
                  {isShift ? char.toUpperCase() : char}
                </button>
              ))}

              {rIdx === 3 && (
                <button
                  onClick={handleBackspace}
                  className="px-3 py-2.5 rounded-lg bg-zinc-800 active:bg-red-500 text-zinc-300 active:text-white"
                >
                  <Delete className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          {/* Bottom Row (Space, Clear, Send) */}
          <div className="flex justify-center gap-2 mt-1">
            <button
              onClick={() => setText('')}
              className="px-3 py-2 rounded-xl bg-zinc-800 text-zinc-400 text-xs font-bold hover:text-white"
            >
              Clear
            </button>
            <button
              onClick={handleSpace}
              className="flex-1 max-w-xs py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-400 font-bold text-xs uppercase tracking-wider"
            >
              Space
            </button>
            <button
              onClick={handleSend}
              disabled={!text.trim()}
              className="px-5 py-2 rounded-xl bg-emerald-500 disabled:opacity-40 text-black font-black text-xs flex items-center gap-1 shadow-md"
            >
              <span>{activeTab === 'search' ? 'Search' : 'Send'}</span>
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
