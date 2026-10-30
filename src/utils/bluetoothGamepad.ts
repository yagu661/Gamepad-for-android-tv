import { registerPlugin } from '@capacitor/core';
import { GamepadButtons, GamepadAxes } from '../types/gamepad';

export interface BluetoothDeviceInfo {
  name: string;
  address: string;
  isXstream?: boolean;
}

export interface BluetoothPluginStatus {
  supported: boolean;
  enabled: boolean;
  isRegistered: boolean;
  connected: boolean;
  connectedDevice?: string | null;
  reason?: string;
}

export interface BluetoothGamepadPlugin {
  checkSupport(): Promise<BluetoothPluginStatus>;
  registerGamepad(): Promise<{ success: boolean; status: string; message?: string }>;
  makeDiscoverable(): Promise<{ success: boolean; duration: number }>;
  getBondedDevices(): Promise<{ devices: BluetoothDeviceInfo[] }>;
  connectDevice(options: { address: string }): Promise<{ success: boolean; targetDevice: string }>;
  disconnect(): Promise<{ success: boolean }>;
  sendReport(options: {
    buttons: number;
    dpad: number;
    lx: number;
    ly: number;
    rx: number;
    ry: number;
    lt: number;
    rt: number;
  }): Promise<{ sent: boolean; error?: string }>;
  addListener(eventName: 'onRegistrationChanged', listenerFunc: (data: { registered: boolean; status: string }) => void): Promise<any>;
  addListener(eventName: 'onConnectionChanged', listenerFunc: (data: { status: string; deviceName: string; deviceAddress: string; state: number }) => void): Promise<any>;
}

export const NativeBluetoothGamepad = registerPlugin<BluetoothGamepadPlugin>('BluetoothGamepad');

/**
 * Encodes our unified GamepadButtons + GamepadAxes into the 16-button + D-pad HID bitmask
 */
export function encodeHidGamepadReport(buttons: GamepadButtons, axes: GamepadAxes) {
  let buttonsMask = 0;

  // Bit 0: A
  if (buttons.a || buttons.jump) buttonsMask |= (1 << 0);
  // Bit 1: B
  if (buttons.b || buttons.crouch) buttonsMask |= (1 << 1);
  // Bit 2: X (Interact E)
  if (buttons.x) buttonsMask |= (1 << 2);
  // Bit 3: Y (Backpack)
  if (buttons.y) buttonsMask |= (1 << 3);
  // Bit 4: LB (Sprint)
  if (buttons.l1 || buttons.sprint) buttonsMask |= (1 << 4);
  // Bit 5: RB (Action)
  if (buttons.r1) buttonsMask |= (1 << 5);
  // Bit 6: LT Click
  if (buttons.l2 > 0.5) buttonsMask |= (1 << 6);
  // Bit 7: RT Click
  if (buttons.r2 > 0.5) buttonsMask |= (1 << 7);
  // Bit 8: Select / View
  if (buttons.select) buttonsMask |= (1 << 8);
  // Bit 9: Start / Menu
  if (buttons.start) buttonsMask |= (1 << 9);
  // Bit 10: Left Stick Click (L3)
  if (buttons.l3 || buttons.shiftLock) buttonsMask |= (1 << 10);
  // Bit 11: Right Stick Click (R3)
  if (buttons.r3) buttonsMask |= (1 << 11);
  // Bit 12: Guide (Xbox Nexus button)
  if (buttons.guide) buttonsMask |= (1 << 12);
  // Bit 13: Emote
  if (buttons.emote) buttonsMask |= (1 << 13);
  // Bit 14: Turbo
  if (buttons.turbo) buttonsMask |= (1 << 14);
  // Bit 15: Flashlight
  if (buttons.flashlight) buttonsMask |= (1 << 15);

  // Hat switch / D-Pad (0 = neutral, 1 = up, 2 = up-right, 3 = right, 4 = down-right, 5 = down, 6 = down-left, 7 = left, 8 = up-left)
  let dpad = 0;
  const up = buttons.dpadUp;
  const down = buttons.dpadDown;
  const left = buttons.dpadLeft;
  const right = buttons.dpadRight;

  if (up && right) dpad = 2;
  else if (down && right) dpad = 4;
  else if (down && left) dpad = 6;
  else if (up && left) dpad = 8;
  else if (up) dpad = 1;
  else if (right) dpad = 3;
  else if (down) dpad = 5;
  else if (left) dpad = 7;

  // Analog axes: -127 to +127
  const lx = Math.round(axes.lx * 127);
  const ly = Math.round(axes.ly * 127);
  const rx = Math.round(axes.rx * 127);
  const ry = Math.round(axes.ry * 127);

  // Triggers: 0 to 255
  const lt = Math.round(buttons.l2 * 255);
  const rt = Math.round(buttons.r2 * 255);

  return {
    buttons: buttonsMask,
    dpad,
    lx,
    ly,
    rx,
    ry,
    lt,
    rt
  };
}
