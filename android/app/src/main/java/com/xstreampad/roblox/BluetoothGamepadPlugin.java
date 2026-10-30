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

    // Standard 16-button + D-pad + 4 analog axes HID Gamepad Report Descriptor
    private static final byte[] GAMEPAD_REPORT_DESCRIPTOR = new byte[] {
        (byte) 0x05, (byte) 0x01, // Usage Page (Generic Desktop)
        (byte) 0x09, (byte) 0x05, // Usage (Gamepad)
        (byte) 0xA1, (byte) 0x01, // Collection (Application)
        (byte) 0x85, (byte) 0x01, //   Report ID (1)
        
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

        (byte) 0xC0               // End Collection
    };

    private final BluetoothHidDevice.Callback hidCallback = new BluetoothHidDevice.Callback() {
        @Override
        public void onAppStatusChanged(BluetoothDevice pluggedDevice, boolean registered) {
            isRegistered = registered;
            Log.d(TAG, "HID Gamepad App Registration status: " + registered);
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

        // On Android 9+, BluetoothProfile.HID_DEVICE is supported
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
            ret.put("message", "Already registered as Xbox Bluetooth Gamepad");
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
                        "Xbox Wireless Gamepad",
                        "XstreamPad Xbox Controller for Airtel TV",
                        "Microsoft / XstreamPad",
                        BluetoothHidDevice.SUBCLASS2_GAMEPAD,
                        GAMEPAD_REPORT_DESCRIPTOR
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

    @SuppressLint("MissingPermission")
    @PluginMethod
    public void sendReport(PluginCall call) {
        if (hidDeviceProxy == null || connectedHostDevice == null) {
            call.resolve(new JSObject().put("sent", false));
            return;
        }

        try {
            // Read buttons bitmask (16 bits = 2 bytes)
            int buttonsMask = call.getInt("buttons", 0);
            int dpad = call.getInt("dpad", 0); // 0 = neutral, 1 = up, 2 = up-right, 3 = right, 4 = down-right, 5 = down, 6 = down-left, 7 = left, 8 = up-left
            int lx = call.getInt("lx", 0); // -127 to 127
            int ly = call.getInt("ly", 0); // -127 to 127
            int rx = call.getInt("rx", 0); // -127 to 127
            int ry = call.getInt("ry", 0); // -127 to 127
            int lt = call.getInt("lt", 0); // 0 to 255
            int rt = call.getInt("rt", 0); // 0 to 255

            byte[] report = new byte[8];
            report[0] = (byte) (buttonsMask & 0xFF);
            report[1] = (byte) ((buttonsMask >> 8) & 0xFF);
            report[2] = (byte) (dpad & 0x0F);
            report[3] = (byte) Math.max(-127, Math.min(127, lx));
            report[4] = (byte) Math.max(-127, Math.min(127, ly));
            report[5] = (byte) Math.max(-127, Math.min(127, rx));
            report[6] = (byte) Math.max(-127, Math.min(127, ry));
            report[7] = (byte) (lt > 0 ? (byte)(lt & 0xFF) : (rt > 0 ? (byte)(rt & 0xFF) : 0));

            boolean sent = hidDeviceProxy.sendReport(connectedHostDevice, 1, report);
            JSObject ret = new JSObject();
            ret.put("sent", sent);
            call.resolve(ret);
        } catch (Exception e) {
            call.resolve(new JSObject().put("sent", false).put("error", e.getMessage()));
        }
    }
}
