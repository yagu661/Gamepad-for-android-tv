import { GamepadPacket, RoomConnectionStatus } from '../types/gamepad';
import { NativeBluetoothGamepad, encodeHidGamepadReport } from './bluetoothGamepad';

export type MessageCallback = (data: any) => void;

export class GamepadConnectionManager {
  private ws: WebSocket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private role: 'tv' | 'controller' = 'controller';
  private roomCode = '';
  private isConnected = false;
  private listeners: Set<MessageCallback> = new Set();
  private statusListeners: Set<(status: RoomConnectionStatus) => void> = new Set();
  private pingInterval: any = null;
  private reconnectTimeout: any = null;
  private packetsSent = 0;
  private packetsReceived = 0;
  private currentPing = 0;
  private controllerCount = 0;
  private transport: 'webrtc' | 'websocket' | 'bluetooth_hid' | 'wifi_ip' | 'offline' = 'offline';
  private customTvHost: string | null = null;
  private connectedBluetoothDeviceName: string | null = null;

  constructor() {
    this.initNativeBluetoothListeners();
  }

  private initNativeBluetoothListeners() {
    try {
      NativeBluetoothGamepad.addListener('onConnectionChanged', (data) => {
        if (data.status === 'connected') {
          this.isConnected = true;
          this.transport = 'bluetooth_hid';
          this.connectedBluetoothDeviceName = data.deviceName || 'Airtel Xstream Box';
          this.notifyStatus();
        } else if (data.status === 'disconnected') {
          if (this.transport === 'bluetooth_hid') {
            this.isConnected = false;
            this.transport = 'offline';
            this.connectedBluetoothDeviceName = null;
            this.notifyStatus();
          }
        }
      }).catch(() => {});
    } catch {}
  }

  public getStatus(): RoomConnectionStatus {
    return {
      connected: this.isConnected,
      role: this.role,
      roomCode: this.roomCode,
      ping: this.currentPing,
      latencyMs: this.currentPing,
      packetsSent: this.packetsSent,
      packetsReceived: this.packetsReceived,
      controllerCount: this.controllerCount,
      transport: this.transport,
      deviceName: this.connectedBluetoothDeviceName || undefined,
      tvHost: this.customTvHost || undefined
    };
  }

  public subscribe(cb: MessageCallback): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  public subscribeStatus(cb: (status: RoomConnectionStatus) => void): () => void {
    this.statusListeners.add(cb);
    cb(this.getStatus());
    return () => {
      this.statusListeners.delete(cb);
    };
  }

  private notifyStatus() {
    const status = this.getStatus();
    this.statusListeners.forEach(cb => cb(status));
  }

  private notifyMessage(data: any) {
    this.listeners.forEach(cb => cb(data));
  }

  /**
   * Set custom TV IP on the local Wi-Fi network (e.g. 192.168.1.100:3000)
   */
  public setCustomTvHost(hostWithPort: string | null) {
    this.customTvHost = hostWithPort ? hostWithPort.trim() : null;
    if (this.role === 'controller' && this.roomCode) {
      this.connect('controller', this.roomCode);
    }
  }

  public connect(role: 'tv' | 'controller', roomCode: string) {
    this.disconnect();
    this.role = role;
    this.roomCode = roomCode.toUpperCase().trim();
    this.transport = 'offline';

    let wsUrl: string;

    if (this.customTvHost) {
      // Connect directly to the TV box's local Wi-Fi IP
      const cleanHost = this.customTvHost.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '').replace(/\/.*$/, '');
      const hasPort = cleanHost.includes(':');
      const target = hasPort ? cleanHost : `${cleanHost}:3000`;
      wsUrl = `ws://${target}/ws`;
    } else {
      // Use current window origin
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let host = window.location.host;
      if (!host || host === 'localhost' || host === '127.0.0.1') {
        host = `${window.location.hostname || 'localhost'}:3000`;
      }
      wsUrl = `${protocol}//${host}/ws`;
    }

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.transport = this.customTvHost ? 'wifi_ip' : 'websocket';
        this.notifyStatus();

        if (this.role === 'tv') {
          this.ws?.send(JSON.stringify({ type: 'create-room', roomCode: this.roomCode }));
        } else {
          this.ws?.send(JSON.stringify({ type: 'join-room', roomCode: this.roomCode }));
          this.setupWebRTCInitiator();
        }

        this.startPingLoop();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.packetsReceived++;

          if (data.type === 'room-created') {
            this.roomCode = data.roomCode;
            this.controllerCount = data.connectedControllers || 0;
            this.notifyStatus();
          } else if (data.type === 'room-joined') {
            this.notifyStatus();
          } else if (data.type === 'controller-connected') {
            this.controllerCount = data.controllerCount || 1;
            this.notifyStatus();
          } else if (data.type === 'controller-disconnected') {
            this.controllerCount = data.controllerCount || 0;
            this.notifyStatus();
          } else if (data.type === 'pong') {
            if (data.clientTimestamp) {
              this.currentPing = Math.max(1, Math.round((Date.now() - data.clientTimestamp) / 2));
              this.notifyStatus();
            }
          } else if (data.type === 'webrtc-signal') {
            this.handleWebRTCSignal(data.signal);
          }

          this.notifyMessage(data);
        } catch {
          // ignore parsing error
        }
      };

      this.ws.onclose = () => {
        // If Bluetooth HID is currently connected, don't mark completely offline
        if (this.transport !== 'bluetooth_hid') {
          this.isConnected = false;
          this.transport = 'offline';
        }
        this.notifyStatus();
        this.cleanupWebRTC();
        this.stopPingLoop();

        // Auto reconnect after 3 seconds if roomCode exists
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
          if (this.roomCode && this.transport !== 'bluetooth_hid') {
            this.connect(this.role, this.roomCode);
          }
        }, 3000);
      };

      this.ws.onerror = () => {
        if (this.transport !== 'bluetooth_hid') {
          this.isConnected = false;
          this.transport = 'offline';
          this.notifyStatus();
        }
      };
    } catch {
      this.isConnected = false;
      this.transport = 'offline';
      this.notifyStatus();
    }
  }

  private startPingLoop() {
    this.stopPingLoop();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', clientTimestamp: Date.now() }));
      }
    }, 2500);
  }

  private stopPingLoop() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // --- WebRTC Peer-to-Peer ---
  private setupWebRTCInitiator() {
    try {
      this.cleanupWebRTC();
      this.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      this.dataChannel = this.peerConnection.createDataChannel('gamepad-inputs', {
        ordered: false,
        maxRetransmits: 0
      });

      this.dataChannel.onopen = () => {
        this.transport = 'webrtc';
        this.notifyStatus();
      };

      this.dataChannel.onclose = () => {
        if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.transport = this.customTvHost ? 'wifi_ip' : 'websocket';
        }
        this.notifyStatus();
      };

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: 'webrtc-signal',
            roomCode: this.roomCode,
            signal: { candidate: event.candidate }
          }));
        }
      };

      this.peerConnection.createOffer().then((offer) => {
        return this.peerConnection?.setLocalDescription(offer).then(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
              type: 'webrtc-signal',
              roomCode: this.roomCode,
              signal: { description: this.peerConnection?.localDescription }
            }));
          }
        });
      }).catch(() => {});
    } catch {}
  }

  private handleWebRTCSignal(signal: any) {
    if (!signal) return;
    try {
      if (!this.peerConnection) {
        this.peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        this.peerConnection.ondatachannel = (event) => {
          this.dataChannel = event.channel;
          this.dataChannel.onopen = () => {
            this.transport = 'webrtc';
            this.notifyStatus();
          };
          this.dataChannel.onmessage = (e) => {
            try {
              const parsed = JSON.parse(e.data);
              this.packetsReceived++;
              this.notifyMessage(parsed);
            } catch {}
          };
        };

        this.peerConnection.onicecandidate = (event) => {
          if (event.candidate && this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
              type: 'webrtc-signal',
              roomCode: this.roomCode,
              signal: { candidate: event.candidate }
            }));
          }
        };
      }

      if (signal.description) {
        this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.description)).then(() => {
          if (signal.description.type === 'offer') {
            return this.peerConnection?.createAnswer().then((answer) => {
              return this.peerConnection?.setLocalDescription(answer).then(() => {
                if (this.ws?.readyState === WebSocket.OPEN) {
                  this.ws.send(JSON.stringify({
                    type: 'webrtc-signal',
                    roomCode: this.roomCode,
                    signal: { description: this.peerConnection?.localDescription }
                  }));
                }
              });
            });
          }
        }).catch(() => {});
      } else if (signal.candidate) {
        this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
      }
    } catch {}
  }

  private cleanupWebRTC() {
    if (this.dataChannel) {
      try { this.dataChannel.close(); } catch {}
      this.dataChannel = null;
    }
    if (this.peerConnection) {
      try { this.peerConnection.close(); } catch {}
      this.peerConnection = null;
    }
  }

  public sendInput(packet: GamepadPacket) {
    this.packetsSent++;

    // 1. PRIORITY 1: Native Bluetooth HID Device Transmission directly to paired TV
    if (this.transport === 'bluetooth_hid' || this.connectedBluetoothDeviceName) {
      try {
        // Send Gamepad Report (Report ID 1)
        const report = encodeHidGamepadReport(packet.buttons, packet.axes);
        NativeBluetoothGamepad.sendReport(report).catch(() => {});

        // Send Mouse Report (Report ID 2) if active, moved, or clicked
        if (packet.cursor && packet.cursor.active) {
          const mouseButtons = (packet.cursor.leftClick ? 1 : 0) | (packet.cursor.rightClick ? 2 : 0);
          const dx = Math.round(packet.cursor.dx);
          const dy = Math.round(packet.cursor.dy);
          const scroll = Math.round(packet.cursor.scrollDelta || 0);

          if (dx !== 0 || dy !== 0 || mouseButtons !== 0 || scroll !== 0) {
            NativeBluetoothGamepad.sendMouseReport({
              buttons: mouseButtons,
              dx,
              dy,
              scroll
            }).catch(() => {});
          }
        }

        // Send Keyboard Text (Report ID 3) if text submitted
        if (packet.keyboard && packet.keyboard.text) {
          NativeBluetoothGamepad.sendKeyboardText({
            text: packet.keyboard.text,
            sendEnter: true
          }).catch(() => {});
        }
      } catch {}
    }

    // 2. PRIORITY 2: Wi-Fi P2P WebRTC / Local IP WebSocket to TV
    const payload = JSON.stringify(packet);

    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(payload);
        return;
      } catch {}
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    }
  }

  public sendRumble(pattern: number[]) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'rumble-request', pattern }));
    }
  }

  public disconnect() {
    clearTimeout(this.reconnectTimeout);
    this.stopPingLoop();
    this.cleanupWebRTC();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }
    if (this.transport !== 'bluetooth_hid') {
      this.isConnected = false;
      this.transport = 'offline';
    }
    this.notifyStatus();
  }
}

export const connectionManager = new GamepadConnectionManager();
