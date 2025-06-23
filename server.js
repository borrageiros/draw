// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createServer } = require('http');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { parse } = require('url');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const next = require('next');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { WebSocketServer } = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const rooms = new Map();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request', err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url, true);

    // This is our dedicated websocket endpoint
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      // For other upgrade requests (e.g., Next.js HMR), let them be handled elsewhere
      // or destroy them if they are not expected.
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
      try {
        const parsedMessage = JSON.parse(message.toString());
        const { type, drawingId } = parsedMessage;

        if (type === 'join') {
          if (!drawingId) return;

          ws.drawingId = drawingId;
          if (parsedMessage.clientId) {
            ws.clientId = parsedMessage.clientId;
          }
          if(parsedMessage.username) {
            ws.username = parsedMessage.username;
          }

          if (!rooms.has(drawingId)) {
            rooms.set(drawingId, new Set());
          }
          const room = rooms.get(drawingId);
          
          if(room) {
            const userEnterMessage = JSON.stringify({
              type: 'userEnter',
              drawingId,
              clientId: ws.clientId,
              username: ws.username,
            });
            room.forEach(client => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(userEnterMessage);
              }
            });
            
            const existingUsers = [];
            room.forEach(client => {
              if (client !== ws && client.clientId) {
                existingUsers.push({ clientId: client.clientId, username: client.username });
              }
            });
            ws.send(JSON.stringify({ type: 'existingUsers', drawingId, users: existingUsers }));
          }

          room?.add(ws);

        } else if (type === 'drawingUpdate' && ws.drawingId) {
          const room = rooms.get(ws.drawingId);
          if (room) {
            room.forEach(client => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
              }
            });
          }
        } else if (type === 'pointerUpdate' && ws.drawingId) {
          const room = rooms.get(ws.drawingId);
          if(room) {
            const messageWithUsername = { ...parsedMessage, username: ws.username };
            const finalMessage = JSON.stringify(messageWithUsername);
            room.forEach(client => {
              if(client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(finalMessage);
              }
            });
          }
        }
      } catch (error) {
        console.error('Failed to parse message or invalid message format:', error);
      }
    });

    ws.on('close', () => {
      if (ws.drawingId) {
        const room = rooms.get(ws.drawingId);
        if (room) {
          room.delete(ws);
          if (ws.clientId) {
            const leaveMessage = JSON.stringify({
              type: 'userLeave',
              drawingId: ws.drawingId,
              clientId: ws.clientId,
            });
            room.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(leaveMessage);
              }
            });
          }
          if (room.size === 0) {
            rooms.delete(ws.drawingId);
          }
        }
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
  });
}); 