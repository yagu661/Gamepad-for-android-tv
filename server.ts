import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';

interface RoomSession {
  tvClient?: WebSocket;
  controllerClients: Set<WebSocket>;
  lastActive: number;
}

const rooms = new Map<string, RoomSession>();

// Cleanup stale rooms every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.lastActive > 1000 * 60 * 30 && room.controllerClients.size === 0 && !room.tvClient) {
      rooms.delete(code);
    }
  }
}, 1000 * 60 * 5);

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const port = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // API endpoint for health and room status
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      activeRooms: rooms.size,
      time: new Date().toISOString()
    });
  });

  // Setup WebSocket server on path /ws
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    let currentRoomCode: string | null = null;
    let clientRole: 'tv' | 'controller' | null = null;

    ws.on('message', (data: string | Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'create-room': {
            // TV is creating or claiming a room
            const code = (message.roomCode || Math.random().toString(36).substring(2, 6).toUpperCase()).toUpperCase();
            currentRoomCode = code;
            clientRole = 'tv';

            let room = rooms.get(code);
            if (!room) {
              room = { controllerClients: new Set(), lastActive: Date.now() };
              rooms.set(code, room);
            }
            room.tvClient = ws;
            room.lastActive = Date.now();

            ws.send(JSON.stringify({
              type: 'room-created',
              roomCode: code,
              connectedControllers: room.controllerClients.size
            }));
            break;
          }

          case 'join-room': {
            // Controller (phone) is joining a room
            const code = (message.roomCode || '').toUpperCase().trim();
            currentRoomCode = code;
            clientRole = 'controller';

            let room = rooms.get(code);
            if (!room) {
              // Create room on the fly if not exists
              room = { controllerClients: new Set(), lastActive: Date.now() };
              rooms.set(code, room);
            }
            room.controllerClients.add(ws);
            room.lastActive = Date.now();

            ws.send(JSON.stringify({
              type: 'room-joined',
              roomCode: code,
              tvConnected: !!room.tvClient && room.tvClient.readyState === WebSocket.OPEN
            }));

            // Notify TV receiver that a controller joined
            if (room.tvClient && room.tvClient.readyState === WebSocket.OPEN) {
              room.tvClient.send(JSON.stringify({
                type: 'controller-connected',
                controllerCount: room.controllerClients.size
              }));
            }
            break;
          }

          case 'input': {
            // Forward real-time gamepad input frame to TV receiver
            if (currentRoomCode) {
              const room = rooms.get(currentRoomCode);
              if (room) {
                room.lastActive = Date.now();
                if (room.tvClient && room.tvClient.readyState === WebSocket.OPEN) {
                  // Attach server timestamp for latency calculation
                  message.serverTime = Date.now();
                  room.tvClient.send(JSON.stringify(message));
                }
              }
            }
            break;
          }

          case 'webrtc-signal': {
            // Route WebRTC signaling (offer, answer, candidate) between peers
            if (currentRoomCode) {
              const room = rooms.get(currentRoomCode);
              if (room) {
                if (clientRole === 'controller' && room.tvClient && room.tvClient.readyState === WebSocket.OPEN) {
                  room.tvClient.send(JSON.stringify(message));
                } else if (clientRole === 'tv') {
                  // Broadcast to controllers
                  for (const c of room.controllerClients) {
                    if (c.readyState === WebSocket.OPEN) {
                      c.send(JSON.stringify(message));
                    }
                  }
                }
              }
            }
            break;
          }

          case 'ping': {
            ws.send(JSON.stringify({ type: 'pong', clientTimestamp: message.timestamp, serverTime: Date.now() }));
            break;
          }

          case 'rumble-request': {
            // TV requesting rumble on the phone controller (e.g. hit obstacle, explosion)
            if (currentRoomCode) {
              const room = rooms.get(currentRoomCode);
              if (room) {
                for (const c of room.controllerClients) {
                  if (c.readyState === WebSocket.OPEN) {
                    c.send(JSON.stringify({ type: 'rumble', pattern: message.pattern || [50, 50, 100] }));
                  }
                }
              }
            }
            break;
          }
        }
      } catch (err) {
        console.error('Error handling WS message:', err);
      }
    });

    ws.on('close', () => {
      if (currentRoomCode) {
        const room = rooms.get(currentRoomCode);
        if (room) {
          if (clientRole === 'tv' && room.tvClient === ws) {
            room.tvClient = undefined;
            // Notify controllers that TV disconnected
            for (const c of room.controllerClients) {
              if (c.readyState === WebSocket.OPEN) {
                c.send(JSON.stringify({ type: 'tv-disconnected' }));
              }
            }
          } else if (clientRole === 'controller') {
            room.controllerClients.delete(ws);
            if (room.tvClient && room.tvClient.readyState === WebSocket.OPEN) {
              room.tvClient.send(JSON.stringify({
                type: 'controller-disconnected',
                controllerCount: room.controllerClients.size
              }));
            }
          }
        }
      }
    });
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`XstreamPad Gamepad Server running at http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
