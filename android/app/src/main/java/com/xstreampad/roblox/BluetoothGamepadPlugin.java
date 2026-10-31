package com.xstreampad.roblox;

import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothHidDevice;
import android.bluetooth.BluetoothHidDeviceAppSdpSettings;
import android.bluetooth.BluetoothProfile;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Set;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "BluetoothGamepad")
public class BluetoothGamepadPlugin extends Plugin {
    private static final String TAG = "BluetoothGamepad";
    private BluetoothAdapter bluetoothAdapter;
    private BluetoothHidDevice hidDeviceProxy;
    private BluetoothDevice connectedHostDevice;
    private boolean isRegistered = false;

    // Report IDs
    public static final byte REPORT_ID_GAMEPAD = 1;
    public static final byte REPORT_ID_MOUSE = 2;
    public static final byte REPORT_ID_KEYBOARD = 3;

    // Composite Report Descriptor: Gamepad (ID 1) + Mouse (ID 2) + Keyboard (ID 3)
    private static final byte[] COMPOSITE_REPORT_DESCRIPTOR = new byte[] {
        // =========================================================================
        // 1. GAMEPAD (Report ID 1)
        // =========================================================================
        (byte) 0x05, (byte) 0x01, // Usage Page (Generic Desktop)
        (byte) 0x09, (byte) 0x05, // Usage (Gamepad)
        (byte) 0xA1, (byte) 0x01, // Collection (Application)
        (byte) 0x85, REPORT_ID_GAMEPAD, //   Report ID (1)
        
        // 16 Buttons (A, B, X, Y, LB, RB, LT_click, RT_click, Select, Start, L3, R3, Guide, Emote, Turbo, Jump) -> 2 bytes
        (byte) 0x05, (byte) 0x09, //   Usage Page (Button)
        (byte) 0x19, (byte) 0x01, //   Usage Minimum (Button 1)
        (byte) 0x29, (byte) 0x10, //   Usage Maximum (Button 16)
        (byte) 0x15, (byte) 0x00, //   Logical Minimum (0)
        (byte) 0x25, (byte) 0x01, //   Logical Maximum (1)
        (byte) 0x75, (byte) 0x01, //   Report Size (1 bit)
        (byte) 0x95, (byte) 0x10, //   Report Count (16 buttons)
        (byte) 0x81, (byte) 0x02, //   Input (Data,Var,Abs)

        // Hat switch / D-Pad (4 bits, 1 to 8 directions, 0 = neutral)
        (byte) 0x05, (byte) 0x01, //   Usage Page (Generic Desktop)
        (byte) 0x09, (byte) 0x39, //   Usage (Hat switch)
        (byte) 0x15, (byte) 0x01, //   Logical Minimum (1)
        (byte) 0x25, (byte) 0x08, //   Logical Maximum (8)
        (byte) 0x35, (byte) 0x00, //   Physical Minimum (0)
        (byte) 0x46, (byte) 0x3B, (byte) 0x01, // Physical Maximum (315 deg)
        (byte) 0x65, (byte) 0x14, //   Unit (Eng Rot: Angular Pos)
        (byte) 0x75, (byte) 0x04, //   Report Size (4 bits)
        (byte) 0x95, (byte) 0x01, //   Report Count (1)
        (byte) 0x81, (byte) 0x42, //   Input (Data,Var,Abs,Null)
        
        // 4 bits padding for alignment
        (byte) 0x75, (byte) 0x04, //   Report Size (4 bits)
        (byte) 0x95, (byte) 0x01, //   Report Count (1)
        (byte) 0x81, (byte) 0x03, //   Input (Const,Var,Abs)

        // 4 Analog Axes: Left Stick X/Y, Right Stick X/Y (1 byte each: -127 to 127)
        (byte) 0x05, (byte) 0x01, //   Usage Page (Generic Desktop)
        (byte) 0x09, (byte) 0x30, //   Usage (X) -> Left Stick X
        (byte) 0x09, (byte) 0x31, //   Usage (Y) -> Left Stick Y
        (byte) 0x09, (byte) 0x32, //   Usage (Z) -> Right Stick X
        (byte) 0x09, (byte) 0x35, //   Usage (Rz) -> Right Stick Y
        (byte) 0x15, (byte) 0x81, //   Logical Minimum (-127)
        (byte) 0x25, (byte) 0x7F, //   Logical Maximum (127)
        (byte) 0x75, (byte) 0x08, //   Report Size (8 bits)
        (byte) 0x95, (byte) 0x04, //   Report Count (4 axes)
        (byte) 0x81, (byte) 0x02, //   Input (Data,Var,Abs)

        // Analog Triggers: LT (0-255), RT (0-255)
        (byte) 0x05, (byte) 0x02, //   Usage Page (Simulation Ctrls)
        (byte) 0x09, (byte) 0xC5, //   Usage (Brake / LT)
        (byte) 0x09, (byte) 0xC4, //   Usage (Accelerator / RT)
        (byte) 0x15, (byte) 0x00, //   Logical Minimum (0)
        (byte) 0x26, (byte) 0xFF, (byte) 0x00, // Logical Maximum (255)
        (byte) 0x75, (byte) 0x08, //   Report Size (8 bits)
        (byte) 0x95, (byte) 0x02, //   Report Count (2)
        (byte) 0x81, (byte) 0x02, //   Input (Data,Var,Abs)
        (byte) 0xC0,              // End Collection (Gamepad)

        // =========================================================================
        // 2. MOUSE (Report ID 2)
        // =========================================================================
        (byte) 0x05, (byte) 0x01, // Usage Page (Generic Desktop)
        (byte) 0x09, (byte) 0x02, // Usage (Mouse)
        (byte) 0xA1, (byte) 0x01, // Collection (Application)
        (byte) 0x85, REPORT_ID_MOUSE, //   Report ID (2)
        (byte) 0x09, (byte) 0x01, //   Usage (Pointer)
        (byte) 0xA1, (byte) 0x00, //   Collection (Physical)
        // Mouse Buttons (Left, Right, Middle)
        (byte) 0x05, (byte) 0x09, //     Usage Page (Buttons)
        (byte) 0x19, (byte) 0x01, //     Usage Minimum (1)
        (byte) 0x29, (byte) 0x03, //     Usage Maximum (3)
        (byte) 0x15, (byte) 0x00, //     Logical Minimum (0)
        (byte) 0x25, (byte) 0x01, //     Logical Maximum (1)
        (byte) 0x75, (byte) 0x01, //     Report Size (1 bit)
        (byte) 0x95, (byte) 0x03, //     Report Count (3 buttons)
        (byte) 0x81, (byte) 0x02, //     Input (Data, Variable, Absolute)
        // 5 bits padding
        (byte) 0x75, (byte) 0x05, //     Report Size (5 bits)
        (byte) 0x95, (byte) 0x01, //     Report Count (1)
        (byte) 0x81, (byte) 0x03, //     Input (Constant, Variable, Absolute)
        // Relative X, Y movement
        (byte) 0x05, (byte) 0x01, //     Usage Page (Generic Desktop)
        (byte) 0x09, (byte) 0x30, //     Usage (X)
        (byte) 0x09, (byte) 0x31, //     Usage (Y)
        (byte) 0x15, (byte) 0x81, //     Logical Minimum (-127)
        (byte) 0x25, (byte) 0x7F, //     Logical Maximum (127)
        (byte) 0x75, (byte) 0x08, //     Report Size (8 bits)
        (byte) 0x95, (byte) 0x02, //     Report Count (2 axes)
        (byte) 0x81, (byte) 0x06, //     Input (Data, Variable, Relative)
        // Wheel Scroll
        (byte) 0x09, (byte) 0x38, //     Usage (Wheel)
        (byte) 0x15, (byte) 0x81, //     Logical Minimum (-127)
        (byte) 0x25, (byte) 0x7F, //     Logical Maximum (127)
        (byte) 0x75, (byte) 0x08, //     Report Size (8 bits)
        (byte) 0x95, (byte) 0x01, //     Report Count (1)
        (byte) 0x81, (byte) 0x06, //     Input (Data, Variable, Relative)
        (byte) 0xC0,              //   End Collection (Physical)
        (byte) 0xC0,              // End Collection (Mouse)

        // =========================================================================
        // 3. KEYBOARD (Report ID 3)
        // =========================================================================
        (byte) 0x05, (byte) 0x01, // Usage Page (Generic Desktop)
        (byte) 0x09, (byte) 0x06, // Usage (Keyboard)
        (byte) 0xA1, (byte) 0x01, // Collection (Application)
        (byte) 0x85, REPORT_ID_KEYBOARD, // Report ID (3)
        // Modifiers (Control, Shift, Alt, GUI)
        (byte) 0x05, (byte) 0x07, //   Usage Page (Key Codes)
        (byte) 0x19, (byte) 0xE0, //   Usage Minimum (Left Control)
        (byte) 0x29, (byte) 0xE7, //   Usage Maximum (Right GUI)
        (byte) 0x15, (byte) 0x00, //   Logical Minimum (0)
        (byte) 0x25, (byte) 0x01, //   Logical Maximum (1)
        (byte) 0x75, (byte) 0x01, //   Report Size (1 bit)
        (byte) 0x95, (byte) 0x08, //   Report Count (8 bits)
        (byte) 0x81, (byte) 0x02, //   Input (Data, Variable, Absolute)
        // Reserved byte
        (byte) 0x75, (byte) 0x08, //   Report Size (8 bits)
        (byte) 0x95, (byte) 0x01, //   Report Count (1 byte)
        (byte) 0x81, (byte) 0x01, //   Input (Constant)
        // Key Array (Up to 6 concurrent keycodes)
        (byte) 0x75, (byte) 0x08, //   Report Size (8 bits)
        (byte) 0x95, (byte) 0x06, //   Report Count (6 key bytes)
        (byte) 0x15, (byte) 0x00, //   Logical Minimum (0)
        (byte) 0x25, (byte) 0x65, //   Logical Maximum (101)
        (byte) 0x05, (byte) 0x07, //   Usage Page (Key Codes)
        (byte) 0x19, (byte) 0x00, //   Usage Minimum (0)
        (byte) 0x29, (byte) 0x65, //   Usage Maximum (101)
        (byte) 0x81, (byte) 0x00, //   Input (Data, Array)
        (byte) 0xC0               // End Collection (Keyboard)
    };

    private final BluetoothHidDevice.Callback hidCallback = new BluetoothHidDevice.Callback() {
        @Override
        public void onAppStatusChanged(BluetoothDevice pluggedDevice, boolean registered) {
            isRegistered = registered;
            Log.d(TAG, "HID Composite App Registration status: " + registered);
            JSObject data = new JSObject();
            data.put("registered", registered);
            data.put("status", registered ? "ready_for_pairing" : "registration_failed");
            notifyListeners("onRegistrationChanged", data);
        }

        @Override
        public void onConnectionStateChanged(BluetoothDevice device, int state) {
            Log.d(TAG, "HID Connection state changed with device: " + (device != null ? device.getName() : "null") + " state=" + state);
            JSObject data = new JSObject();
            data.put("deviceName", device != null ? device.getName() : "Unknown");
            data.put("deviceAddress", device != null ? device.getAddress() : "");
            data.put("state", state);

            if (state == BluetoothProfile.STATE_CONNECTED) {
                connectedHostDevice = device;
                data.put("status", "connected");
            } else if (state == BluetoothProfile.STATE_DISCONNECTED) {
                if (connectedHostDevice != null && device != null && device.getAddress().equals(connectedHostDevice.getAddress())) {
                    connectedHostDevice = null;
                }
                data.put("status", "disconnected");
            } else if (state == BluetoothProfile.STATE_CONNECTING) {
                data.put("status", "connecting");
            }

            notifyListeners("onConnectionChanged", data);
        }
    };

    @Override
    public void load() {
        super.load();
        bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    public void checkSupport(PluginCall call) {
        JSObject ret = new JSObject();
        if (bluetoothAdapter == null) {
            ret.put("supported", false);
            ret.put("reason", "No Bluetooth adapter found on this device");
            call.resolve(ret);
            return;
        }

        boolean enabled = bluetoothAdapter.isEnabled();
        ret.put("enabled", enabled);

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
            ret.put("supported", false);
            ret.put("reason", "Android 9.0 (Pie) or higher is required for Bluetooth HID Device profile");
            call.resolve(ret);
            return;
        }

        ret.put("supported", true);
        ret.put("isRegistered", isRegistered);
        ret.put("connected", connectedHostDevice != null);
        ret.put("connectedDevice", connectedHostDevice != null ? connectedHostDevice.getName() : null);
        call.resolve(ret);
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    public void registerGamepad(PluginCall call) {
        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
            call.reject("Bluetooth is turned off. Please turn on Bluetooth first.");
            return;
        }

        if (isRegistered && hidDeviceProxy != null) {
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("message", "Already registered as Xbox Wireless Controller & Peripheral");
            call.resolve(ret);
            return;
        }

        Context context = getContext();
        bluetoothAdapter.getProfileProxy(context, new BluetoothProfile.ServiceListener() {
            @Override
            public void onServiceConnected(int profile, BluetoothProfile proxy) {
                if (profile == BluetoothProfile.HID_DEVICE) {
                    hidDeviceProxy = (BluetoothHidDevice) proxy;
                    Log.d(TAG, "Bluetooth HID_DEVICE profile proxy connected");

                    BluetoothHidDeviceAppSdpSettings sdp = new BluetoothHidDeviceAppSdpSettings(
                        "Xbox Wireless Controller",
                        "XstreamPad Xbox Gamepad, Air Mouse & Keyboard for Airtel TV",
                        "Microsoft / XstreamPad",
                        BluetoothHidDevice.SUBCLASS1_COMBO, // Combo device allows Gamepad + Mouse + Keyboard
                        COMPOSITE_REPORT_DESCRIPTOR
                    );

                    boolean success = hidDeviceProxy.registerApp(
                        sdp,
                        null,
                        null,
                        Executors.newSingleThreadExecutor(),
                        hidCallback
                    );

                    JSObject res = new JSObject();
                    res.put("success", success);
                    res.put("status", success ? "registering" : "failed");
                    call.resolve(res);
                }
            }

            @Override
            public void onServiceDisconnected(int profile) {
                if (profile == BluetoothProfile.HID_DEVICE) {
                    hidDeviceProxy = null;
                    isRegistered = false;
                    connectedHostDevice = null;
                }
            }
        }, BluetoothProfile.HID_DEVICE);
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    public void makeDiscoverable(PluginCall call) {
        try {
            Intent discoverableIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_DISCOVERABLE);
            discoverableIntent.putExtra(BluetoothAdapter.EXTRA_DISCOVERABLE_DURATION, 300);
            discoverableIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(discoverableIntent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("duration", 300);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to request discoverability: " + e.getMessage());
        }
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    public void getBondedDevices(PluginCall call) {
        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
            call.reject("Bluetooth is not enabled");
            return;
        }

        Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
        com.getcapacitor.JSArray array = new com.getcapacitor.JSArray();
        if (pairedDevices != null) {
            for (BluetoothDevice device : pairedDevices) {
                JSObject obj = new JSObject();
                obj.put("name", device.getName() != null ? device.getName() : "Unknown");
                obj.put("address", device.getAddress());
                obj.put("isXstream", device.getName() != null && (device.getName().toLowerCase().contains("airtel") || device.getName().toLowerCase().contains("xstream") || device.getName().toLowerCase().contains("hy0001") || device.getName().toLowerCase().contains("tv")));
                array.put(obj);
            }
        }
        JSObject ret = new JSObject();
        ret.put("devices", array);
        call.resolve(ret);
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    public void connectDevice(PluginCall call) {
        String address = call.getString("address");
        if (address == null || hidDeviceProxy == null) {
            call.reject("Invalid device address or HID proxy not initialized");
            return;
        }

        try {
            BluetoothDevice device = bluetoothAdapter.getRemoteDevice(address);
            boolean success = hidDeviceProxy.connect(device);
            JSObject ret = new JSObject();
            ret.put("success", success);
            ret.put("targetDevice", device.getName());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to connect: " + e.getMessage());
        }
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    public void disconnect(PluginCall call) {
        if (hidDeviceProxy != null && connectedHostDevice != null) {
            hidDeviceProxy.disconnect(connectedHostDevice);
        }
        connectedHostDevice = null;
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    // 1. Send Gamepad Report (Report ID 1)
    @SuppressLint("MissingPermission")
    @PluginMethod
    public void sendReport(PluginCall call) {
        if (hidDeviceProxy == null || connectedHostDevice == null) {
            call.resolve(new JSObject().put("sent", false));
            return;
        }

        try {
            int buttonsMask = call.getInt("buttons", 0);
            int dpad = call.getInt("dpad", 0);
            int lx = call.getInt("lx", 0);
            int ly = call.getInt("ly", 0);
            int rx = call.getInt("rx", 0);
            int ry = call.getInt("ry", 0);
            int lt = call.getInt("lt", 0);
            int rt = call.getInt("rt", 0);

            byte[] report = new byte[8];
            report[0] = (byte) (buttonsMask & 0xFF);
            report[1] = (byte) ((buttonsMask >> 8) & 0xFF);
            report[2] = (byte) (dpad & 0x0F);
            report[3] = (byte) Math.max(-127, Math.min(127, lx));
            report[4] = (byte) Math.max(-127, Math.min(127, ly));
            report[5] = (byte) Math.max(-127, Math.min(127, rx));
            report[6] = (byte) Math.max(-127, Math.min(127, ry));
            report[7] = (byte) (lt > 0 ? (byte)(lt & 0xFF) : (rt > 0 ? (byte)(rt & 0xFF) : 0));

            boolean sent = hidDeviceProxy.sendReport(connectedHostDevice, REPORT_ID_GAMEPAD, report);
            JSObject ret = new JSObject();
            ret.put("sent", sent);
            call.resolve(ret);
        } catch (Exception e) {
            call.resolve(new JSObject().put("sent", false).put("error", e.getMessage()));
        }
    }

    // 2. Send Mouse Report (Report ID 2)
    @SuppressLint("MissingPermission")
    @PluginMethod
    public void sendMouseReport(PluginCall call) {
        if (hidDeviceProxy == null || connectedHostDevice == null) {
            call.resolve(new JSObject().put("sent", false));
            return;
        }

        try {
            int buttons = call.getInt("buttons", 0); // 1 = Left, 2 = Right, 4 = Middle
            int dx = call.getInt("dx", 0); // -127 to 127
            int dy = call.getInt("dy", 0); // -127 to 127
            int scroll = call.getInt("scroll", 0); // -127 to 127

            byte[] report = new byte[4];
            report[0] = (byte) (buttons & 0x07);
            report[1] = (byte) Math.max(-127, Math.min(127, dx));
            report[2] = (byte) Math.max(-127, Math.min(127, dy));
            report[3] = (byte) Math.max(-127, Math.min(127, scroll));

            boolean sent = hidDeviceProxy.sendReport(connectedHostDevice, REPORT_ID_MOUSE, report);
            JSObject ret = new JSObject();
            ret.put("sent", sent);
            call.resolve(ret);
        } catch (Exception e) {
            call.resolve(new JSObject().put("sent", false).put("error", e.getMessage()));
        }
    }

    // 3. Send Keyboard Keycode Report (Report ID 3)
    @SuppressLint("MissingPermission")
    @PluginMethod
    public void sendKeyboardReport(PluginCall call) {
        if (hidDeviceProxy == null || connectedHostDevice == null) {
            call.resolve(new JSObject().put("sent", false));
            return;
        }

        try {
            int modifiers = call.getInt("modifiers", 0); // 0x02 = Shift, 0x01 = Ctrl, etc.
            int keycode = call.getInt("keycode", 0);

            byte[] report = new byte[8];
            report[0] = (byte) (modifiers & 0xFF);
            report[1] = 0; // Reserved
            report[2] = (byte) (keycode & 0xFF); // Primary keycode

            boolean sent = hidDeviceProxy.sendReport(connectedHostDevice, REPORT_ID_KEYBOARD, report);

            // Automatically send key release if requested
            boolean autoRelease = call.getBoolean("autoRelease", true);
            if (autoRelease && keycode != 0) {
                byte[] releaseReport = new byte[8];
                Executors.newSingleThreadScheduledExecutor().schedule(() -> {
                    if (hidDeviceProxy != null && connectedHostDevice != null) {
                        hidDeviceProxy.sendReport(connectedHostDevice, REPORT_ID_KEYBOARD, releaseReport);
                    }
                }, 40, java.util.concurrent.TimeUnit.MILLISECONDS);
            }

            JSObject ret = new JSObject();
            ret.put("sent", sent);
            call.resolve(ret);
        } catch (Exception e) {
            call.resolve(new JSObject().put("sent", false).put("error", e.getMessage()));
        }
    }

    // 4. Send Complete Text String via Native Keyboard Emulation
    @SuppressLint("MissingPermission")
    @PluginMethod
    public void sendKeyboardText(PluginCall call) {
        String text = call.getString("text", "");
        if (text == null || text.isEmpty() || hidDeviceProxy == null || connectedHostDevice == null) {
            call.resolve(new JSObject().put("sent", false));
            return;
        }

        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                for (char c : text.toCharArray()) {
                    int[] hidKey = charToHidKeycode(c);
                    if (hidKey != null) {
                        byte[] press = new byte[8];
                        press[0] = (byte) hidKey[0]; // modifier (e.g. shift)
                        press[2] = (byte) hidKey[1]; // HID keycode
                        hidDeviceProxy.sendReport(connectedHostDevice, REPORT_ID_KEYBOARD, press);
                        Thread.sleep(30);

                        byte[] release = new byte[8];
                        hidDeviceProxy.sendReport(connectedHostDevice, REPORT_ID_KEYBOARD, release);
                        Thread.sleep(30);
                    }
                }

                // Send Enter key at end if requested
                boolean sendEnter = call.getBoolean("sendEnter", true);
                if (sendEnter) {
                    byte[] enterPress = new byte[8];
                    enterPress[2] = 0x28; // HID code for Enter
                    hidDeviceProxy.sendReport(connectedHostDevice, REPORT_ID_KEYBOARD, enterPress);
                    Thread.sleep(35);
                    byte[] enterRelease = new byte[8];
                    hidDeviceProxy.sendReport(connectedHostDevice, REPORT_ID_KEYBOARD, enterRelease);
                }

                JSObject ret = new JSObject();
                ret.put("sent", true);
                call.resolve(ret);
            } catch (Exception e) {
                call.resolve(new JSObject().put("sent", false).put("error", e.getMessage()));
            }
        });
    }

    /**
     * Converts ASCII char to [modifier, HID_keycode]
     */
    private int[] charToHidKeycode(char c) {
        if (c >= 'a' && c <= 'z') {
            return new int[] { 0, 0x04 + (c - 'a') };
        }
        if (c >= 'A' && c <= 'Z') {
            return new int[] { 0x02, 0x04 + (c - 'A') }; // Shift modifier (0x02)
        }
        if (c >= '1' && c <= '9') {
            return new int[] { 0, 0x1E + (c - '1') };
        }
        if (c == '0') return new int[] { 0, 0x27 };
        if (c == ' ') return new int[] { 0, 0x2C };
        if (c == '\n' || c == '\r') return new int[] { 0, 0x28 }; // Enter
        if (c == '\b') return new int[] { 0, 0x2A }; // Backspace
        if (c == '/') return new int[] { 0, 0x38 };
        if (c == '?') return new int[] { 0x02, 0x38 }; // Shift + /
        if (c == '!') return new int[] { 0x02, 0x1E }; // Shift + 1
        if (c == '.') return new int[] { 0, 0x37 };
        if (c == ',') return new int[] { 0, 0x36 };
        if (c == '-') return new int[] { 0, 0x2D };
        if (c == '_') return new int[] { 0x02, 0x2D };

        return null;
    }
}
