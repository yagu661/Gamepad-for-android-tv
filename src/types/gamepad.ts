export interface GamepadAxes {
  lx: number; // -1 to 1 (left stick X)
  ly: number; // -1 to 1 (left stick Y)
  rx: number; // -1 to 1 (right stick X)
  ry: number; // -1 to 1 (right stick Y)
}

export interface GamepadCursor {
  x: number; // 0 to 1 normalized screen position
  y: number; // 0 to 1 normalized screen position
  dx: number; // delta movement
  dy: number; // delta movement
  active: boolean; // cursor is active
  leftClick: boolean; // primary mouse click
  rightClick: boolean; // secondary context click
  scrollDelta: number; // mouse wheel scroll
}

export interface GamepadKeyboard {
  text: string;
  submitted: boolean;
  action: 'search' | 'chat' | 'input' | null;
  key?: string;
}

export interface GamepadButtons {
  a: boolean; // Jump (Space in Roblox)
  b: boolean; // Back / Cancel / Crouch
  x: boolean; // Interact / ProximityPrompt ('E' key)
  y: boolean; // Inventory / Backpack ('`' key)
  l1: boolean; // LB - Zoom / Sprint
  r1: boolean; // RB - Tool Primary Action / Left Click
  l2: number; // LT - Analog trigger 0.0 - 1.0 (Right click / ADS / Context)
  r2: number; // RT - Analog trigger 0.0 - 1.0 (Turbo Attack / Fire)
  l3: boolean; // LS Click - Crouch / Shift lock toggle
  r3: boolean; // RS Click - First person view toggle
  dpadUp: boolean; // Slot 1
  dpadDown: boolean; // Slot 3
  dpadLeft: boolean; // Slot 4
  dpadRight: boolean; // Slot 2
  start: boolean; // Xbox Menu / Roblox ESC
  select: boolean; // Xbox View / Player list (Tab)
  jump: boolean; // Dedicated big jump button
  turbo: boolean; // Fast auto-repeat
  sprint: boolean; // Shift / Fast walk
  crouch: boolean; // Stealth / crawl
  shiftLock: boolean; // Shift lock mode
  zoomIn: boolean; // Camera Zoom in ('I')
  zoomOut: boolean; // Camera Zoom out ('O')
  reload: boolean; // Reload weapon ('R')
  flashlight: boolean; // Flashlight toggle ('F')
  dropTool: boolean; // Drop equipped item ('Backspace' / 'Q')
  selectedSlot: number; // Active hotbar item 1-9
  chat: boolean; // Open in-game chat ('/')
  cursorMode: boolean; // Air mouse mode toggle
  emote: string | null; // Emote trigger
}

export interface GamepadPacket {
  type: 'input';
  roomCode: string;
  seq: number;
  timestamp: number;
  serverTime?: number;
  axes: GamepadAxes;
  buttons: GamepadButtons;
  cursor?: GamepadCursor;
  keyboard?: GamepadKeyboard;
}

export type ThemeType = 'xbox' | 'airtel' | 'roblox' | 'playstation' | 'cyberpunk';

export interface ControllerSettings {
  vibration: boolean;
  vibrationStrength: number; // 0.1 to 1.0
  audioFeedback: boolean;
  audioVolume: number; // 0 to 1
  leftStickDeadzone: number;
  rightStickSensitivity: number;
  cursorSensitivity: number;
  invertY: boolean;
  theme: ThemeType;
  floatingStick: boolean;
  gyroAiming: boolean;
}

export interface RoomConnectionStatus {
  connected: boolean;
  role: 'tv' | 'controller' | 'idle';
  roomCode: string;
  ping: number;
  latencyMs: number;
  packetsSent: number;
  packetsReceived: number;
  controllerCount: number;
  transport: 'webrtc' | 'websocket' | 'offline';
}
