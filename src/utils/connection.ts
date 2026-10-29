import { GamepadPacket, RoomConnectionStatus } from '../types/gamepad';

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
  private transport: 'webrtc' | 'websocket' | 'offline' = 'offline';

  constructor() {}

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
      transport: this.transport
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

  public connect(role: 'tv' | 'controller', roomCode: string) {
    this.disconnect();
    this.role = role;
    this.roomCode = roomCode.toUpperCase().trim();
    this.transport = 'offline';

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.transport = 'websocket';
        this.notifyStatus();

        if (this.role === 'tv') {
          this.ws?.send(JSON.stringify({ type: 'create-room', roomCode: this.roomCode }));
        } else {
          this.ws?.send(JSON.stringify({ type: 'join-room', roomCode: this.roomCode }));
          // Controller can initiate WebRTC peer connection
          this.setupWebRTCInitiator();
        }

        // Start ping loop
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
        this.isConnected = false;
        this.transport = 'offline';
        this.notifyStatus();
        this.cleanupWebRTC();
        this.stopPingLoop();

        // Auto reconnect after 3 seconds if not intentionally closed
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
          if (this.roomCode) {
            this.connect(this.role, this.roomCode);
          }
        }, 3000);
      };

      this.ws.onerror = () => {
        this.isConnected = false;
        this.transport = 'offline';
        this.notifyStatus();
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
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, 2000);
  }

  private stopPingLoop() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // WebRTC DataChannel setup for ultra-low latency peer-to-peer input
  private setupWebRTCInitiator() {
    if (typeof RTCPeerConnection === 'undefined') return;

    try {
      this.cleanupWebRTC();
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      this.peerConnection = pc;

      // Ordered false, maxPacketLifeTime 100ms for instantaneous gaming input
      const dc = pc.createDataChannel('gamepad', { ordered: false, maxPacketLifeTime: 100 });
      this.dataChannel = dc;

      dc.onopen = () => {
        this.transport = 'webrtc';
        this.notifyStatus();
      };

      dc.onclose = () => {
        if (this.transport === 'webrtc') {
          this.transport = 'websocket';
          this.notifyStatus();
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate && this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: 'webrtc-signal',
            signal: { candidate: e.candidate }
          }));
        }
      };

      pc.createOffer().then(offer => {
        return pc.setLocalDescription(offer);
      }).then(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: 'webrtc-signal',
            signal: { sdp: pc.localDescription }
          }));
        }
      }).catch(() => {
        // Fallback transparently to WebSocket
      });
    } catch {
      // Fallback to WebSocket
    }
  }

  private handleWebRTCSignal(signal: any) {
    if (!signal) return;
    try {
      if (this.role === 'tv') {
        if (!this.peerConnection) {
          const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
          });
          this.peerConnection = pc;

          pc.ondatachannel = (event) => {
            const dc = event.channel;
            this.dataChannel = dc;
            dc.onopen = () => {
              this.transport = 'webrtc';
              this.notifyStatus();
            };
            dc.onmessage = (e) => {
              try {
                const data = JSON.parse(e.data);
                this.packetsReceived++;
                this.notifyMessage(data);
              } catch {}
            };
          };

          pc.onicecandidate = (e) => {
            if (e.candidate && this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.ws.send(JSON.stringify({
                type: 'webrtc-signal',
                signal: { candidate: e.candidate }
              }));
            }
          };
        }

        const pc = this.peerConnection;
        if (signal.sdp) {
          pc.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
            if (signal.sdp.type === 'offer') {
              return pc.createAnswer().then(answer => {
                return pc.setLocalDescription(answer);
              }).then(() => {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                  this.ws.send(JSON.stringify({
                    type: 'webrtc-signal',
                    signal: { sdp: pc.localDescription }
                  }));
                }
              });
            }
          }).catch(() => {});
        } else if (signal.candidate) {
          pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
        }
      } else {
        // Controller handling answers and candidates
        const pc = this.peerConnection;
        if (!pc) return;
        if (signal.sdp) {
          pc.setRemoteDescription(new RTCSessionDescription(signal.sdp)).catch(() => {});
        } else if (signal.candidate) {
          pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
        }
      }
    } catch {
      // Ignored
    }
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
    const payload = JSON.stringify(packet);

    // Prefer WebRTC DataChannel for UDP direct speed
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(payload);
        return;
      } catch {}
    }

    // Fallback to WebSocket
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
    this.isConnected = false;
    this.transport = 'offline';
    this.notifyStatus();
  }
}

export const connectionManager = new GamepadConnectionManager();
