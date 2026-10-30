import React, { useRef, useState, useCallback, useEffect } from 'react';
import { triggerHaptic, playButtonSound } from '../utils/audio';

interface VirtualStickProps {
  label: string;
  subLabel?: string;
  deadzone?: number;
  sensitivity?: number;
  invertY?: boolean;
  hapticEnabled?: boolean;
  hapticStrength?: number;
  audioFeedback?: boolean;
  onChange: (x: number, y: number) => void;
  onClick?: () => void;
  accentColor?: string;
  size?: number;
}

export const VirtualStick: React.FC<VirtualStickProps> = ({
  label,
  subLabel,
  deadzone = 0.1,
  sensitivity = 1.0,
  invertY = false,
  hapticEnabled = true,
  hapticStrength = 1.0,
  audioFeedback = true,
  onChange,
  onClick,
  accentColor = '#ef4444',
  size = 140
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [thumbPos, setThumbPos] = useState({ x: 0, y: 0 });
  const activePointerIdRef = useRef<number | null>(null);
  const wasAtMaxRef = useRef<boolean>(false);

  const radius = size / 2;
  const thumbRadius = size * 0.28;
  const maxDistance = radius - thumbRadius * 0.5;

  const handlePointerStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (activePointerIdRef.current !== null) return;

    activePointerIdRef.current = e.pointerId;
    setActive(true);
    triggerHaptic(12, hapticEnabled, hapticStrength);
    if (audioFeedback) playButtonSound('stick', 0.2);

    updatePosition(e.clientX, e.clientY);
  }, [hapticEnabled, hapticStrength, audioFeedback]);

  const updatePosition = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let normX = 0;
    let normY = 0;

    let posX = dx;
    let posY = dy;

    if (dist > maxDistance) {
      posX = (dx / dist) * maxDistance;
      posY = (dy / dist) * maxDistance;
      normX = dx / dist;
      normY = dy / dist;
      wasAtMaxRef.current = true;
    } else {
      wasAtMaxRef.current = false;
      const magnitude = dist / maxDistance;
      if (magnitude > deadzone) {
        const scaledMag = (magnitude - deadzone) / (1 - deadzone);
        normX = (dx / dist) * scaledMag;
        normY = (dy / dist) * scaledMag;
      }
    }

    normX = Math.max(-1, Math.min(1, normX * sensitivity));
    normY = Math.max(-1, Math.min(1, (invertY ? -normY : normY) * sensitivity));

    setThumbPos({ x: posX, y: posY });
    onChange(normX, normY);
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    updatePosition(e.clientX, e.clientY);
  }, [deadzone, sensitivity, invertY, hapticEnabled, hapticStrength]);

  const handlePointerEnd = useCallback((e: React.PointerEvent) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    activePointerIdRef.current = null;
    setActive(false);
    wasAtMaxRef.current = false;
    setThumbPos({ x: 0, y: 0 });
    onChange(0, 0);
  }, [onChange]);

  // Handle double-tap stick click (L3/R3)
  const lastTapRef = useRef<number>(0);
  const handleContainerClick = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      triggerHaptic([20, 30, 20], hapticEnabled, hapticStrength);
      if (audioFeedback) playButtonSound('click', 0.6);
      onClick?.();
    }
    lastTapRef.current = now;
  };

  useEffect(() => {
    const handleGlobalPointerUp = (e: PointerEvent) => {
      if (activePointerIdRef.current === e.pointerId) {
        activePointerIdRef.current = null;
        setActive(false);
        setThumbPos({ x: 0, y: 0 });
        onChange(0, 0);
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [onChange]);

  return (
    <div className="flex flex-col items-center select-none touch-none">
      <div
        ref={containerRef}
        onPointerDown={handlePointerStart}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onClick={handleContainerClick}
        style={{ width: `${size}px`, height: `${size}px` }}
        className={`relative rounded-full flex items-center justify-center transition-shadow border-2 cursor-pointer select-none touch-none ${
          active
            ? 'border-white/40 shadow-[0_0_25px_rgba(255,255,255,0.15)] bg-black/60'
            : 'border-white/15 bg-black/40 shadow-inner'
        }`}
      >
        {/* Crosshair guidelines */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className="w-full h-px bg-white/40" />
          <div className="h-full w-px bg-white/40 absolute" />
        </div>

        {/* Outer directional indicator notches */}
        <div className="absolute inset-2 rounded-full border border-dashed border-white/10 pointer-events-none" />

        {/* Thumb Knob - Xbox Concave Thumbstick */}
        <div
          style={{
            width: `${thumbRadius * 2}px`,
            height: `${thumbRadius * 2}px`,
            transform: `translate3d(${thumbPos.x}px, ${thumbPos.y}px, 0)`,
            transition: active ? 'none' : 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
          className="absolute rounded-full flex items-center justify-center shadow-2xl pointer-events-none"
        >
          {/* Outer textured rubber edge with Xbox grip ridge */}
          <div
            className="w-full h-full rounded-full flex items-center justify-center p-1.5"
            style={{
              background: `radial-gradient(circle at 35% 35%, #27272a, #18181b 70%, #09090b 100%)`,
              border: `2px solid ${active ? accentColor : 'rgba(255,255,255,0.25)'}`,
              boxShadow: active ? `0 0 16px ${accentColor}90` : '0 6px 14px rgba(0,0,0,0.85)'
            }}
          >
            {/* Inner concave dish */}
            <div className="w-full h-full rounded-full border border-black/80 flex items-center justify-center bg-gradient-to-b from-zinc-900 to-black relative shadow-inner">
              {/* 4 Xbox quadrant grip nubs at 12, 3, 6, 9 o'clock */}
              <div className="absolute top-1 w-1 h-1 rounded-full bg-white/40 shadow-xs" />
              <div className="absolute bottom-1 w-1 h-1 rounded-full bg-white/40 shadow-xs" />
              <div className="absolute left-1 w-1 h-1 rounded-full bg-white/40 shadow-xs" />
              <div className="absolute right-1 w-1 h-1 rounded-full bg-white/40 shadow-xs" />

              {/* Center thumb depression */}
              <div
                className="w-3.5 h-3.5 rounded-full border border-white/10 flex items-center justify-center shadow-inner"
                style={{
                  backgroundColor: active ? `${accentColor}30` : 'rgba(0,0,0,0.6)',
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: active ? accentColor : 'rgba(255,255,255,0.4)',
                    boxShadow: active ? `0 0 6px ${accentColor}` : 'none'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-1 text-center pointer-events-none select-none">
        <span className="text-[11px] font-bold tracking-wider uppercase text-zinc-300">
          {label}
        </span>
        {subLabel && (
          <span className="block text-[9px] text-zinc-500 font-mono">
            {subLabel}
          </span>
        )}
      </div>
    </div>
  );
};
