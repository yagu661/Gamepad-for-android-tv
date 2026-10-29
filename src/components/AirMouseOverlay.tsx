import React, { useRef, useState, useCallback, useEffect } from 'react';
import { MousePointer, ArrowUpDown, CornerDownLeft, Target, Sparkles, X } from 'lucide-react';
import { triggerHaptic, playButtonSound } from '../utils/audio';

interface AirMouseOverlayProps {
  active: boolean;
  onMoveDelta: (dx: number, dy: number) => void;
  onClick: (isRight: boolean) => void;
  onScroll: (delta: number) => void;
  onClose: () => void;
  hapticEnabled?: boolean;
}

export const AirMouseOverlay: React.FC<AirMouseOverlayProps> = ({
  active,
  onMoveDelta,
  onClick,
  onScroll,
  onClose,
  hapticEnabled = true,
}) => {
  const trackpadRef = useRef<HTMLDivElement>(null);
  const lastTouchPos = useRef<{ x: number; y: number } | null>(null);
  const [isClicking, setIsClicking] = useState(false);
  const [isRightClicking, setIsRightClicking] = useState(false);

  if (!active) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    lastTouchPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!lastTouchPos.current) return;
    e.preventDefault();
    e.stopPropagation();

    const dx = e.clientX - lastTouchPos.current.x;
    const dy = e.clientY - lastTouchPos.current.y;
    lastTouchPos.current = { x: e.clientX, y: e.clientY };

    // Scale sensitivity
    onMoveDelta(dx * 1.8, dy * 1.8);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    lastTouchPos.current = null;
  };

  return (
    <div className="absolute inset-x-4 top-14 bottom-14 z-30 bg-black/80 backdrop-blur-md border-2 border-cyan-500/50 rounded-3xl p-4 flex flex-col shadow-2xl animate-in zoom-in-95 select-none touch-none">
      {/* Top Trackpad Header */}
      <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
            <MousePointer className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <span className="font-black text-white uppercase tracking-wider block">TV Air Mouse Trackpad</span>
            <span className="text-[10px] text-zinc-400">Glide thumb to move pointer on TV screen</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Trackpad Touch Surface */}
      <div
        ref={trackpadRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="flex-1 my-3 bg-zinc-950/80 rounded-2xl border border-cyan-500/30 relative flex items-center justify-center cursor-crosshair overflow-hidden shadow-inner"
      >
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#06b6d420_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

        <div className="text-center pointer-events-none opacity-40">
          <Target className="w-12 h-12 text-cyan-400 mx-auto mb-2 animate-pulse" />
          <span className="text-xs font-mono uppercase tracking-widest text-cyan-200">
            Slide to Control TV Mouse
          </span>
        </div>

        {/* Scroll strip on the right side */}
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-black/40 border-l border-white/10 flex flex-col items-center justify-around py-4">
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              triggerHaptic(8, hapticEnabled);
              playButtonSound('click', 0.2);
              onScroll(-50);
            }}
            className="p-2 rounded-lg bg-zinc-900 active:bg-cyan-500 text-cyan-400 active:text-black"
            title="Scroll Up"
          >
            ▲
          </button>
          <span className="text-[8px] font-mono text-zinc-500 transform -rotate-90">SCROLL</span>
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              triggerHaptic(8, hapticEnabled);
              playButtonSound('click', 0.2);
              onScroll(50);
            }}
            className="p-2 rounded-lg bg-zinc-900 active:bg-cyan-500 text-cyan-400 active:text-black"
            title="Scroll Down"
          >
            ▼
          </button>
        </div>
      </div>

      {/* Bottom Mouse Buttons: Left Click & Right Click */}
      <div className="grid grid-cols-2 gap-3 h-16 shrink-0">
        <button
          onPointerDown={() => {
            setIsClicking(true);
            triggerHaptic(15, hapticEnabled);
            playButtonSound('bumper', 0.5);
            onClick(false);
          }}
          onPointerUp={() => setIsClicking(false)}
          onPointerLeave={() => setIsClicking(false)}
          className={`rounded-2xl border-2 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-98 ${
            isClicking
              ? 'bg-cyan-500 border-cyan-300 text-black shadow-[0_0_20px_#06b6d4]'
              : 'bg-zinc-900 border-cyan-500/40 text-cyan-300 hover:border-cyan-400'
          }`}
        >
          <MousePointer className="w-4 h-4" />
          <span>Left Click (Select / Drag)</span>
        </button>

        <button
          onPointerDown={() => {
            setIsRightClicking(true);
            triggerHaptic(15, hapticEnabled);
            playButtonSound('click', 0.5);
            onClick(true);
          }}
          onPointerUp={() => setIsRightClicking(false)}
          onPointerLeave={() => setIsRightClicking(false)}
          className={`rounded-2xl border-2 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-98 ${
            isRightClicking
              ? 'bg-cyan-500 border-cyan-300 text-black shadow-[0_0_20px_#06b6d4]'
              : 'bg-zinc-900 border-white/20 text-zinc-300 hover:border-white/40'
          }`}
        >
          <span>Right Click (Context)</span>
        </button>
      </div>
    </div>
  );
};
