import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Maximize,
  Minimize,
  Settings,
  HelpCircle,
  Sparkles,
  WifiOff,
  Flame,
  RotateCcw,
  Download,
  MousePointer,
  Search,
  Lock,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Lightbulb,
  Trash2,
  Tv,
  ChevronDown,
  Layers
} from 'lucide-react';
import { VirtualStick } from './VirtualStick';
import { AirtelSetupModal } from './AirtelSetupModal';
import { SettingsModal } from './SettingsModal';
import { EmoteWheelModal } from './EmoteWheelModal';
import { ApkReleaseModal } from './ApkReleaseModal';
import { SearchKeypadModal } from './SearchKeypadModal';
import { AirMouseOverlay } from './AirMouseOverlay';
import {
  GamepadButtons,
  GamepadAxes,
  GamepadPacket,
  GamepadCursor,
  GamepadKeyboard,
  ControllerSettings,
  RoomConnectionStatus
} from '../types/gamepad';
import { connectionManager } from '../utils/connection';
import { triggerHaptic, playButtonSound } from '../utils/audio';
import { requestAutoLandscape, setupAutoLandscapeOnFirstTouch } from '../utils/orientation';

interface GamepadControllerProps {
  roomCode: string;
  onSwitchToTV: () => void;
}

const DEFAULT_SETTINGS: ControllerSettings = {
  vibration: true,
  vibrationStrength: 0.85,
  audioFeedback: true,
  audioVolume: 0.5,
  leftStickDeadzone: 0.08,
  rightStickSensitivity: 1.25,
  cursorSensitivity: 1.5,
  invertY: false,
  theme: 'xbox',
  floatingStick: false,
  gyroAiming: false,
};

export const GamepadController: React.FC<GamepadControllerProps> = ({
  roomCode: initialRoomCode,
  onSwitchToTV
}) => {
  const [roomCode, setRoomCode] = useState(initialRoomCode || '');
  const [settings, setSettings] = useState<ControllerSettings>(DEFAULT_SETTINGS);
  const [isAirtelModalOpen, setIsAirtelModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isEmoteModalOpen, setIsEmoteModalOpen] = useState(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);
  const [isSearchKeypadOpen, setIsSearchKeypadOpen] = useState(false);
  const [isAirMouseActive, setIsAirMouseActive] = useState(false);
  const [showQuickBar, setShowQuickBar] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(true);
  const [forceRotate90, setForceRotate90] = useState(false);
  const [turboActive, setTurboActive] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(1);
  const [status, setStatus] = useState<RoomConnectionStatus>(connectionManager.getStatus());

  // Auto-rotate to landscape as soon as app opens like all games
  useEffect(() => {
    const cleanup = setupAutoLandscapeOnFirstTouch();
    return () => cleanup();
  }, []);

  // Input states
  const axesRef = useRef<GamepadAxes>({ lx: 0, ly: 0, rx: 0, ry: 0 });
  const cursorRef = useRef<GamepadCursor>({
    x: 0.5,
    y: 0.5,
    dx: 0,
    dy: 0,
    active: false,
    leftClick: false,
    rightClick: false,
    scrollDelta: 0
  });
  const keyboardRef = useRef<GamepadKeyboard>({
    text: '',
    submitted: false,
    action: null
  });

  const buttonsRef = useRef<GamepadButtons>({
    a: false,
    b: false,
    x: false,
    y: false,
    l1: false,
    r1: false,
    l2: 0,
    r2: 0,
    l3: false,
    r3: false,
    dpadUp: false,
    dpadDown: false,
    dpadLeft: false,
    dpadRight: false,
    start: false,
    select: false,
    jump: false,
    turbo: false,
    sprint: false,
    crouch: false,
    shiftLock: false,
    zoomIn: false,
    zoomOut: false,
    reload: false,
    flashlight: false,
    dropTool: false,
    selectedSlot: 1,
    chat: false,
    cursorMode: false,
    emote: null,
  });

  const [activeButtonsVisual, setActiveButtonsVisual] = useState<{ [key: string]: boolean }>({});
  const seqRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);

  // Connection management
  useEffect(() => {
    if (roomCode) {
      connectionManager.connect('controller', roomCode);
    }
    const unsub = connectionManager.subscribeStatus(setStatus);
    return () => {
      unsub();
      connectionManager.disconnect();
    };
  }, [roomCode]);

  // Screen Wake Lock
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch {}
    };
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) wakeLockRef.current.release().catch(() => {});
    };
  }, []);

  // Screen orientation detector
  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Rumble feedback from TV
  useEffect(() => {
    const unsub = connectionManager.subscribe((msg) => {
      if (msg.type === 'rumble' && msg.pattern) {
        triggerHaptic(msg.pattern, settings.vibration, settings.vibrationStrength);
      }
    });
    return () => unsub();
  }, [settings.vibration, settings.vibrationStrength]);

  // 60-100Hz Input Dispatch Loop
  useEffect(() => {
    let lastSentTime = 0;
    const sendLoop = (time: number) => {
      if (time - lastSentTime >= 14) {
        lastSentTime = time;
        seqRef.current++;

        if (isAirMouseActive || buttonsRef.current.cursorMode) {
          cursorRef.current.active = true;
          if (Math.abs(axesRef.current.rx) > 0.05 || Math.abs(axesRef.current.ry) > 0.05) {
            cursorRef.current.dx += axesRef.current.rx * 12 * settings.cursorSensitivity;
            cursorRef.current.dy += axesRef.current.ry * 12 * settings.cursorSensitivity;
          }
        }

        const packet: GamepadPacket = {
          type: 'input',
          roomCode: roomCode,
          seq: seqRef.current,
          timestamp: Date.now(),
          axes: { ...axesRef.current },
          buttons: { ...buttonsRef.current },
          cursor: { ...cursorRef.current },
          keyboard: keyboardRef.current.submitted ? { ...keyboardRef.current } : undefined
        };

        connectionManager.sendInput(packet);

        cursorRef.current.dx = 0;
        cursorRef.current.dy = 0;
        cursorRef.current.scrollDelta = 0;
        if (keyboardRef.current.submitted) {
          keyboardRef.current.submitted = false;
        }
        if (buttonsRef.current.emote) {
          buttonsRef.current.emote = null;
        }
      }
      animFrameRef.current = requestAnimationFrame(sendLoop);
    };

    animFrameRef.current = requestAnimationFrame(sendLoop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [roomCode, isAirMouseActive, settings.cursorSensitivity]);

  // Turbo auto-fire
  useEffect(() => {
    if (!turboActive) return;
    const interval = setInterval(() => {
      buttonsRef.current.a = !buttonsRef.current.a;
      buttonsRef.current.jump = buttonsRef.current.a;
      if (buttonsRef.current.a) {
        triggerHaptic(6, settings.vibration, settings.vibrationStrength);
      }
    }, 85);
    return () => {
      clearInterval(interval);
      buttonsRef.current.a = false;
      buttonsRef.current.jump = false;
    };
  }, [turboActive, settings.vibration, settings.vibrationStrength]);

  const setButtonState = useCallback((btn: keyof GamepadButtons, pressed: boolean, sound: any = 'click') => {
    if (pressed) {
      triggerHaptic(14, settings.vibration, settings.vibrationStrength);
      if (settings.audioFeedback) playButtonSound(sound, settings.audioVolume);
    }

    if (btn === 'l2' || btn === 'r2') {
      (buttonsRef.current[btn] as number) = pressed ? 1.0 : 0.0;
    } else {
      (buttonsRef.current[btn] as boolean) = pressed;
    }

    if (btn === 'jump') buttonsRef.current.a = pressed;
    if (btn === 'a') buttonsRef.current.jump = pressed;

    setActiveButtonsVisual((prev) => ({ ...prev, [btn]: pressed }));
  }, [settings]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleSlotSelect = (slotNum: number) => {
    setSelectedSlot(slotNum);
    buttonsRef.current.selectedSlot = slotNum;
    triggerHaptic(12, settings.vibration, settings.vibrationStrength);
    if (settings.audioFeedback) playButtonSound('click', 0.4);
  };

  const makeButtonTouchProps = (btn: keyof GamepadButtons, soundType: any = 'click') => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setButtonState(btn, true, soundType);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setButtonState(btn, false);
    },
    onPointerCancel: (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setButtonState(btn, false);
    },
    onPointerLeave: (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setButtonState(btn, false);
    },
    className: 'select-none touch-none',
  });

  return (
    <div
      className="fixed inset-0 w-full h-full select-none touch-none overflow-hidden bg-black text-white font-sans flex items-center justify-center p-0 md:p-3"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        ...( !isLandscape && forceRotate90 ? {
          transform: 'rotate(90deg)',
          transformOrigin: 'center center',
          width: '100vh',
          height: '100vw',
          position: 'fixed',
          top: '50%',
          left: '50%',
          marginTop: '-50vw',
          marginLeft: '-50vh',
        } : {})
      }}
    >
      {/* Portrait Prompt & Quick Auto-Rotate Overlay */}
      {!isLandscape && !forceRotate90 && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
            <RotateCcw className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
          <h2 className="text-xl font-black text-white mb-1">Rotate to Landscape</h2>
          <p className="text-xs text-zinc-400 max-w-xs mb-6">
            Like all mobile games, XstreamPad is designed for landscape two-thumb console gaming.
          </p>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={() => requestAutoLandscape()}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Auto-Rotate Screen</span>
            </button>

            <button
              onClick={() => setForceRotate90(true)}
              className="w-full py-3 bg-zinc-900 border border-white/20 text-zinc-300 font-bold text-xs rounded-2xl hover:text-white active:scale-95 transition-all"
            >
              Hold Phone Sideways (Force 90°)
            </button>
          </div>
        </div>
      )}

      {/* THE SCULPTED XBOX CONTROLLER CHASSIS - 100% ADAPTIVE TO PHONE SCREEN */}
      <div className="relative w-full h-full flex flex-col justify-between overflow-hidden rounded-2xl md:rounded-[36px] border-2 md:border-4 border-zinc-800 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black shadow-[0_0_60px_rgba(0,0,0,0.9)] p-1 sm:p-2.5">
        {/* Authentic Xbox Side Grip Texture (Rubberized Diamond Grip Wings) */}
        <div
          className="absolute -left-4 top-16 bottom-0 w-36 rounded-r-[80px] opacity-35 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, #3f3f46 10%, transparent 11%)',
            backgroundSize: '8px 8px',
            borderRight: '2px solid rgba(255,255,255,0.08)'
          }}
        />
        <div
          className="absolute -right-4 top-16 bottom-0 w-36 rounded-l-[80px] opacity-35 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, #3f3f46 10%, transparent 11%)',
            backgroundSize: '8px 8px',
            borderLeft: '2px solid rgba(255,255,255,0.08)'
          }}
        />

        {/* TOP SHOULDER TRIGGERS & BUMPERS (LT, LB, RB, RT) */}
        <div className="relative z-20 w-full flex items-center justify-between gap-3 px-2 pt-0.5">
          {/* Left Shoulder (LT & LB) */}
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            {/* LT Analog Trigger */}
            <button
              {...makeButtonTouchProps('l2', 'click')}
              className={`flex-1 h-9 sm:h-11 rounded-t-xl rounded-b-lg border-2 flex flex-col items-center justify-center transition-all ${
                activeButtonsVisual['l2']
                  ? 'bg-zinc-700 border-emerald-400 text-white shadow-[0_0_15px_#10b981] translate-y-1'
                  : 'bg-gradient-to-b from-zinc-700 to-zinc-900 border-zinc-600/60 text-zinc-300 active:border-emerald-400'
              }`}
            >
              <span className="text-[11px] sm:text-xs font-black tracking-wider text-emerald-400">LT</span>
              <span className="text-[6px] sm:text-[7px] text-zinc-400 font-mono">CROUCH / AIM</span>
            </button>

            {/* LB Bumper */}
            <button
              {...makeButtonTouchProps('l1', 'bumper')}
              className={`flex-1 h-9 sm:h-11 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                activeButtonsVisual['l1']
                  ? 'bg-zinc-700 border-emerald-400 text-white shadow-[0_0_15px_#10b981] translate-y-0.5'
                  : 'bg-gradient-to-b from-zinc-800 to-zinc-950 border-zinc-700 text-zinc-300'
              }`}
            >
              <span className="text-[11px] sm:text-xs font-black tracking-wider text-white">LB</span>
              <span className="text-[6px] sm:text-[7px] text-zinc-400 font-mono">SPRINT</span>
            </button>
          </div>

          {/* Top Center Mini Status & Feature Pills */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-black/60 rounded-full border border-white/10 shadow-inner">
            {/* Connection Mode Pill (Opens Real Bluetooth & Wi-Fi Pairing Modal) */}
            <button
              onClick={() => setIsAirtelModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold transition-all ${
                status.transport === 'bluetooth_hid'
                  ? 'bg-blue-600/30 border-blue-400 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                  : status.connected
                  ? 'bg-emerald-600/30 border-emerald-400 text-emerald-300'
                  : 'bg-zinc-900 border-red-500/50 text-red-400 hover:border-red-400'
              }`}
              title="Click to Connect Bluetooth Gamepad or Wi-Fi to Airtel TV"
            >
              <span className={`w-2 h-2 rounded-full ${status.connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
              <span>
                {status.transport === 'bluetooth_hid'
                  ? `BT: ${status.deviceName || 'AIRTEL TV'}`
                  : status.connected
                  ? `WI-FI (${status.transport.toUpperCase()})`
                  : 'CONNECT TV'}
              </span>
            </button>

            <div className="flex items-center gap-1">
              <span className="text-[9px] text-zinc-400 font-bold uppercase">PIN:</span>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="CODE"
                maxLength={6}
                className="w-11 bg-black/80 border border-white/20 rounded px-1 text-center font-mono font-black text-emerald-400 uppercase text-[10px] focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* TV Air Mouse Mode Button */}
            <button
              onClick={() => {
                const next = !isAirMouseActive;
                setIsAirMouseActive(next);
                buttonsRef.current.cursorMode = next;
                triggerHaptic(15, settings.vibration, settings.vibrationStrength);
                if (settings.audioFeedback) playButtonSound('menu', settings.audioVolume);
              }}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border transition-all ${
                isAirMouseActive
                  ? 'bg-cyan-500 border-cyan-300 text-black shadow-[0_0_12px_#06b6d4]'
                  : 'bg-zinc-900 border-cyan-500/40 text-cyan-400'
              }`}
            >
              <MousePointer className="w-3 h-3" />
              <span>Mouse</span>
            </button>

            {/* Search / Chat Keypad Button */}
            <button
              onClick={() => setIsSearchKeypadOpen(true)}
              className="px-2 py-0.5 rounded-full bg-zinc-900 border border-emerald-500/40 text-emerald-400 hover:text-white text-[10px] font-bold flex items-center gap-1 shadow-sm active:scale-95"
            >
              <Search className="w-3 h-3" />
              <span>Search</span>
            </button>

            {/* Quick Actions / Hotbar Drawer Toggle */}
            <button
              onClick={() => setShowQuickBar(!showQuickBar)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border ${
                showQuickBar ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-zinc-900 border-white/10 text-zinc-400'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Slots 1-9</span>
            </button>

            {/* APK Button */}
            <button
              onClick={() => setIsApkModalOpen(true)}
              className="px-2 py-0.5 rounded-full bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>APK</span>
            </button>

            {/* TV Screen View */}
            <button
              onClick={onSwitchToTV}
              className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-bold flex items-center gap-1"
            >
              <Tv className="w-3 h-3" />
            </button>

            {/* Settings */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-1 rounded-full text-zinc-400 hover:text-white"
            >
              <Settings className="w-3 h-3" />
            </button>
          </div>

          {/* Right Shoulder (RB & RT) */}
          <div className="flex items-center gap-2 flex-1 max-w-xs justify-end">
            {/* RB Bumper */}
            <button
              {...makeButtonTouchProps('r1', 'bumper')}
              className={`flex-1 h-9 sm:h-11 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                activeButtonsVisual['r1']
                  ? 'bg-zinc-700 border-emerald-400 text-white shadow-[0_0_15px_#10b981] translate-y-0.5'
                  : 'bg-gradient-to-b from-zinc-800 to-zinc-950 border-zinc-700 text-zinc-300'
              }`}
            >
              <span className="text-[11px] sm:text-xs font-black tracking-wider text-white">RB</span>
              <span className="text-[6px] sm:text-[7px] text-zinc-400 font-mono">ACTION</span>
            </button>

            {/* RT Analog Trigger */}
            <button
              {...makeButtonTouchProps('r2', 'click')}
              className={`flex-1 h-9 sm:h-11 rounded-t-xl rounded-b-lg border-2 flex flex-col items-center justify-center transition-all ${
                activeButtonsVisual['r2']
                  ? 'bg-zinc-700 border-emerald-400 text-white shadow-[0_0_15px_#10b981] translate-y-1'
                  : 'bg-gradient-to-b from-zinc-700 to-zinc-900 border-zinc-600/60 text-zinc-300 active:border-emerald-400'
              }`}
            >
              <span className="text-[11px] sm:text-xs font-black tracking-wider text-emerald-400">RT</span>
              <span className="text-[6px] sm:text-[7px] text-zinc-400 font-mono">PRIMARY FIRE</span>
            </button>
          </div>
        </div>

        {/* POP-OUT QUICK ACTION & HOTBAR BAR (Slots 1-9, Flashlight, Reload, ShiftLock) */}
        {showQuickBar && (
          <div className="relative z-20 mx-4 my-1 py-1.5 px-3 bg-zinc-900/95 border border-zinc-700 rounded-2xl flex items-center justify-between text-xs animate-in slide-in-from-top-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-zinc-500 font-bold">HOTBAR:</span>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((slot) => (
                <button
                  key={slot}
                  onClick={() => handleSlotSelect(slot)}
                  className={`w-7 h-6 rounded-lg font-mono font-bold text-xs flex items-center justify-center transition-all ${
                    selectedSlot === slot
                      ? 'bg-emerald-500 text-black shadow-[0_0_10px_#10b981]'
                      : 'bg-black/60 text-zinc-400 border border-white/10'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                {...makeButtonTouchProps('flashlight', 'click')}
                className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 ${
                  activeButtonsVisual['flashlight'] ? 'bg-amber-400 text-black' : 'bg-black/60 text-amber-400 border-white/10'
                }`}
              >
                <Lightbulb className="w-3 h-3" />
                <span>F (Light)</span>
              </button>

              <button
                {...makeButtonTouchProps('reload', 'bumper')}
                className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 ${
                  activeButtonsVisual['reload'] ? 'bg-sky-400 text-black' : 'bg-black/60 text-sky-400 border-white/10'
                }`}
              >
                <RefreshCw className="w-3 h-3" />
                <span>R (Reload)</span>
              </button>

              <button
                {...makeButtonTouchProps('shiftLock', 'click')}
                className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 ${
                  activeButtonsVisual['shiftLock'] ? 'bg-purple-500 text-white' : 'bg-black/60 text-purple-400 border-white/10'
                }`}
              >
                <Lock className="w-3 h-3" />
                <span>ShiftLock</span>
              </button>

              <button
                {...makeButtonTouchProps('dropTool', 'click')}
                className="px-2 py-1 rounded-lg bg-black/60 border border-white/10 text-rose-400 text-[10px] font-bold"
              >
                Drop (Q)
              </button>
            </div>
          </div>
        )}

        {/* MAIN CONTROLLER FACE: TRUE ASYMMETRIC XBOX GEOMETRY */}
        <div className="flex-1 flex items-center justify-between px-6 sm:px-12 relative z-10 py-1">
          {/* LEFT WING: UPPER LEFT STICK (LS) + LOWER LEFT HYBRID D-PAD */}
          <div className="flex flex-col items-center justify-around h-full">
            {/* UPPER-LEFT THUMBSTICK (LS - Character Movement WASD) */}
            <div className="relative p-2 rounded-full bg-gradient-to-br from-zinc-800 to-black border-2 border-zinc-700/80 shadow-[inset_0_4px_12px_rgba(0,0,0,0.9)]">
              <VirtualStick
                label="LS"
                subLabel="WASD"
                size={isLandscape ? (window.innerHeight < 450 ? 104 : 120) : 100}
                deadzone={settings.leftStickDeadzone}
                hapticEnabled={settings.vibration}
                hapticStrength={settings.vibrationStrength}
                audioFeedback={settings.audioFeedback}
                accentColor="#10b981"
                onChange={(x, y) => {
                  axesRef.current.lx = x;
                  axesRef.current.ly = y;
                }}
                onClick={() => {
                  setButtonState('l3', !buttonsRef.current.l3, 'stick');
                }}
              />
            </div>

            {/* LOWER-LEFT: XBOX HYBRID METALLIC FACETED D-PAD */}
            <div className="relative w-24 h-24 flex items-center justify-center select-none touch-none mt-2">
              {/* Recessed D-Pad Bowl */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-zinc-950 to-black border-2 border-zinc-700/80 shadow-[inset_0_4px_8px_rgba(0,0,0,0.9)]" />
              {/* Faceted 8-way metallic cross plate */}
              <div className="absolute inset-1 rounded-full bg-gradient-to-br from-zinc-800 via-zinc-900 to-black border border-white/10 shadow-lg" />

              {/* UP (Slot 1) */}
              <button
                {...makeButtonTouchProps('dpadUp', 'dpad')}
                className={`absolute top-0.5 w-7 h-7 rounded-t-lg flex flex-col items-center justify-center transition-all ${
                  activeButtonsVisual['dpadUp']
                    ? 'bg-emerald-500 text-black font-black shadow-md'
                    : 'text-zinc-300 hover:text-white active:bg-zinc-700'
                }`}
              >
                <span className="text-[11px] font-black">▲</span>
                <span className="text-[6px] font-mono text-zinc-400">1</span>
              </button>

              {/* DOWN (Slot 3) */}
              <button
                {...makeButtonTouchProps('dpadDown', 'dpad')}
                className={`absolute bottom-0.5 w-7 h-7 rounded-b-lg flex flex-col items-center justify-center transition-all ${
                  activeButtonsVisual['dpadDown']
                    ? 'bg-emerald-500 text-black font-black shadow-md'
                    : 'text-zinc-300 hover:text-white active:bg-zinc-700'
                }`}
              >
                <span className="text-[6px] font-mono text-zinc-400">3</span>
                <span className="text-[11px] font-black">▼</span>
              </button>

              {/* LEFT (Slot 4) */}
              <button
                {...makeButtonTouchProps('dpadLeft', 'dpad')}
                className={`absolute left-0.5 w-7 h-7 rounded-l-lg flex items-center justify-center transition-all ${
                  activeButtonsVisual['dpadLeft']
                    ? 'bg-emerald-500 text-black font-black shadow-md'
                    : 'text-zinc-300 hover:text-white active:bg-zinc-700'
                }`}
              >
                <span className="text-[11px] font-black">◀</span>
              </button>

              {/* RIGHT (Slot 2) */}
              <button
                {...makeButtonTouchProps('dpadRight', 'dpad')}
                className={`absolute right-0.5 w-7 h-7 rounded-r-lg flex items-center justify-center transition-all ${
                  activeButtonsVisual['dpadRight']
                    ? 'bg-emerald-500 text-black font-black shadow-md'
                    : 'text-zinc-300 hover:text-white active:bg-zinc-700'
                }`}
              >
                <span className="text-[11px] font-black">▶</span>
              </button>

              {/* Center D-Pad hub */}
              <div className="w-4 h-4 rounded-full bg-zinc-950 border border-zinc-700 z-10 pointer-events-none shadow-inner" />
            </div>
          </div>

          {/* CENTER ARCH: ICONIC XBOX NEXUS (GUIDE) BUTTON + VIEW + MENU + ROBLOX ESC */}
          <div className="flex flex-col items-center justify-center gap-3">
            {/* Iconic Glowing Xbox Nexus Jewel Button */}
            <button
              onClick={() => {
                triggerHaptic([30, 20, 30], settings.vibration, settings.vibrationStrength);
                if (settings.audioFeedback) playButtonSound('menu', settings.audioVolume);
                setButtonState('start', true, 'menu');
                setTimeout(() => setButtonState('start', false), 200);
              }}
              className="relative w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-90 shadow-2xl cursor-pointer"
              style={{
                background: 'radial-gradient(circle at 35% 35%, #ffffff, #d4d4d8 60%, #a1a1aa 100%)',
                boxShadow: '0 0 30px rgba(255,255,255,0.8), 0 0 60px rgba(16,185,129,0.4)',
                border: '2px solid rgba(255,255,255,0.95)'
              }}
              title="Xbox Guide / Roblox ESC"
            >
              <div className="relative w-7 h-7 flex items-center justify-center">
                <div className="absolute w-6 h-6 border-t-2 border-b-2 border-black/80 rounded-full transform rotate-45" />
                <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center">
                  <span className="font-black text-xs text-white tracking-tighter">✕</span>
                </div>
              </div>
            </button>

            {/* View (⧉) & Menu (☰) Flanking Buttons */}
            <div className="flex items-center gap-6">
              {/* VIEW (Two Overlapping Squares - Leaderboard / Tab) */}
              <button
                {...makeButtonTouchProps('select', 'menu')}
                className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all ${
                  activeButtonsVisual['select']
                    ? 'bg-zinc-700 border-white text-white shadow-md'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white'
                }`}
                title="View (Leaderboard / Tab)"
              >
                <span className="text-sm font-black leading-none">⧉</span>
              </button>

              {/* SHARE / EMOTE WHEEL */}
              <button
                onClick={() => setIsEmoteModalOpen(true)}
                className="w-7 h-7 rounded-full bg-zinc-900 border border-amber-500/50 text-amber-400 hover:text-amber-300 flex items-center justify-center shadow-md active:scale-95"
                title="Roblox Emotes Wheel"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>

              {/* MENU (Three Lines - Roblox ESC) */}
              <button
                {...makeButtonTouchProps('start', 'menu')}
                className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all ${
                  activeButtonsVisual['start']
                    ? 'bg-zinc-700 border-white text-white shadow-md'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white'
                }`}
                title="Menu (Roblox ESC)"
              >
                <span className="text-sm font-black leading-none">☰</span>
              </button>
            </div>

            {/* Turbo Mode Auto-fire Toggle */}
            <button
              onClick={() => {
                setTurboActive(!turboActive);
                triggerHaptic(20, settings.vibration, settings.vibrationStrength);
                if (settings.audioFeedback) playButtonSound('menu', settings.audioVolume);
              }}
              className={`px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1.5 border transition-all ${
                turboActive
                  ? 'bg-amber-500 border-amber-300 text-black shadow-[0_0_15px_rgba(245,158,11,0.8)] animate-pulse'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>TURBO AUTO-JUMP</span>
            </button>
          </div>

          {/* RIGHT WING: UPPER RIGHT ABXY CLUSTER + LOWER RIGHT STICK (RS) */}
          <div className="flex flex-col items-center justify-around h-full">
            {/* UPPER-RIGHT: OFFICIAL XBOX COLORED ABXY DIAMOND BUTTONS */}
            <div className="relative w-28 h-28 flex items-center justify-center select-none touch-none">
              <div className="absolute inset-1 rounded-3xl bg-zinc-950 border border-zinc-800 transform rotate-45 pointer-events-none shadow-inner" />

              {/* Y BUTTON (Top - Canary Yellow #facc15 - Backpack / `) */}
              <button
                {...makeButtonTouchProps('y', 'click')}
                className={`absolute top-0 w-9 h-9 rounded-full flex flex-col items-center justify-center border-2 shadow-xl transition-transform active:scale-90 ${
                  activeButtonsVisual['y']
                    ? 'bg-amber-400 border-amber-200 text-black shadow-[0_0_20px_#facc15] scale-95'
                    : 'bg-zinc-950 border-amber-500/80 text-amber-400'
                }`}
              >
                <span className="font-black text-sm leading-none font-sans">Y</span>
                <span className="text-[5px] font-mono opacity-80">INV</span>
              </button>

              {/* A BUTTON (Bottom - Xbox Emerald Green #22c55e - JUMP) */}
              <button
                {...makeButtonTouchProps('a', 'jump')}
                className={`absolute bottom-0 w-11 h-11 rounded-full flex flex-col items-center justify-center border-2 shadow-2xl transition-transform active:scale-90 ${
                  activeButtonsVisual['a'] || activeButtonsVisual['jump']
                    ? 'bg-emerald-500 border-emerald-200 text-black shadow-[0_0_25px_#10b981] scale-95'
                    : 'bg-zinc-950 border-emerald-500 text-emerald-400'
                }`}
              >
                <span className="font-black text-base leading-none font-sans">A</span>
                <span className="text-[6px] font-black tracking-wider uppercase">JUMP</span>
              </button>

              {/* X BUTTON (Left - Royal Blue #38bdf8 - Interact / 'E') */}
              <button
                {...makeButtonTouchProps('x', 'click')}
                className={`absolute left-0 w-9 h-9 rounded-full flex flex-col items-center justify-center border-2 shadow-xl transition-transform active:scale-90 ${
                  activeButtonsVisual['x']
                    ? 'bg-sky-400 border-sky-200 text-black shadow-[0_0_20px_#38bdf8] scale-95'
                    : 'bg-zinc-950 border-sky-500/80 text-sky-400'
                }`}
              >
                <span className="font-black text-sm leading-none font-sans">X</span>
                <span className="text-[5px] font-mono opacity-80">ACT</span>
              </button>

              {/* B BUTTON (Right - Crimson Red #ef4444 - Back / Crouch) */}
              <button
                {...makeButtonTouchProps('b', 'click')}
                className={`absolute right-0 w-9 h-9 rounded-full flex flex-col items-center justify-center border-2 shadow-xl transition-transform active:scale-90 ${
                  activeButtonsVisual['b']
                    ? 'bg-rose-500 border-rose-200 text-white shadow-[0_0_20px_#ef4444] scale-95'
                    : 'bg-zinc-950 border-rose-500/80 text-rose-400'
                }`}
              >
                <span className="font-black text-sm leading-none font-sans">B</span>
                <span className="text-[5px] font-mono opacity-80">BACK</span>
              </button>
            </div>

            {/* LOWER-RIGHT THUMBSTICK (RS - Camera Orbit / Look) */}
            <div className="relative p-2 rounded-full bg-gradient-to-br from-zinc-800 to-black border-2 border-zinc-700/80 shadow-[inset_0_4px_12px_rgba(0,0,0,0.9)] mt-2">
              <VirtualStick
                label="RS"
                subLabel="LOOK"
                size={isLandscape ? (window.innerHeight < 450 ? 104 : 120) : 100}
                sensitivity={settings.rightStickSensitivity}
                invertY={settings.invertY}
                hapticEnabled={settings.vibration}
                hapticStrength={settings.vibrationStrength}
                audioFeedback={settings.audioFeedback}
                accentColor="#38bdf8"
                onChange={(x, y) => {
                  axesRef.current.rx = x;
                  axesRef.current.ry = y;
                }}
                onClick={() => {
                  setButtonState('r3', !buttonsRef.current.r3, 'stick');
                }}
              />
            </div>
          </div>
        </div>

        {/* BOTTOM ERGONOMIC JUMP BAR (Directly under right thumb for Obby jumping) */}
        <div className="relative z-20 w-full flex items-center justify-between px-3 sm:px-6 pb-0.5 pt-0.5 shrink-0">
          <div className="text-[9px] sm:text-[10px] text-zinc-500 font-mono hidden sm:block">
            <span>TX: #{status.packetsSent}</span>
            <span className="mx-1.5">•</span>
            <span className="text-emerald-400 font-bold">XBOX CONTROLLER</span>
          </div>

          <button
            {...makeButtonTouchProps('jump', 'jump')}
            className={`flex-1 sm:flex-none px-6 sm:px-12 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border-2 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-2xl ${
              activeButtonsVisual['jump'] || activeButtonsVisual['a']
                ? 'bg-emerald-500 border-emerald-300 text-black shadow-[0_0_25px_rgba(16,185,129,0.9)]'
                : 'bg-zinc-900 border-emerald-500/60 text-emerald-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span className="font-black text-[11px] sm:text-xs md:text-sm tracking-widest uppercase">
              ROBLOX JUMP (A / SPACE)
            </span>
          </button>

          <div className="text-[9px] sm:text-[10px] text-zinc-500 font-mono hidden sm:block">
            <span>RUMBLE: {settings.vibration ? 'ON' : 'OFF'}</span>
          </div>
        </div>
      </div>

      {/* Air Mouse Overlay */}
      <AirMouseOverlay
        active={isAirMouseActive}
        onMoveDelta={(dx, dy) => {
          cursorRef.current.dx += dx;
          cursorRef.current.dy += dy;
        }}
        onClick={(isRight) => {
          if (isRight) {
            cursorRef.current.rightClick = true;
            setTimeout(() => { cursorRef.current.rightClick = false; }, 100);
          } else {
            cursorRef.current.leftClick = true;
            setTimeout(() => { cursorRef.current.leftClick = false; }, 100);
          }
        }}
        onScroll={(delta) => {
          cursorRef.current.scrollDelta += delta;
        }}
        onClose={() => {
          setIsAirMouseActive(false);
          buttonsRef.current.cursorMode = false;
        }}
        hapticEnabled={settings.vibration}
      />

      {/* Search Keypad & Chat Modal */}
      <SearchKeypadModal
        isOpen={isSearchKeypadOpen}
        onClose={() => setIsSearchKeypadOpen(false)}
        onSendText={(text, isSearch) => {
          keyboardRef.current = {
            text: text,
            submitted: true,
            action: isSearch ? 'search' : 'chat'
          };
        }}
        hapticEnabled={settings.vibration}
      />

      {/* Other Modals */}
      <AirtelSetupModal
        isOpen={isAirtelModalOpen}
        onClose={() => setIsAirtelModalOpen(false)}
        roomCode={roomCode}
      />
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
      />
      <EmoteWheelModal
        isOpen={isEmoteModalOpen}
        onClose={() => setIsEmoteModalOpen(false)}
        onSelectEmote={(cmd) => {
          buttonsRef.current.emote = cmd;
        }}
        hapticEnabled={settings.vibration}
      />
      <ApkReleaseModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
      />
    </div>
  );
};
