// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createServer } = require('http');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { parse } = require('url');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const next = require('next');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { WebSocketServer } = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
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
    console.log('Client connected via integrated server');

    ws.on('message', (message) => {
      try {
        const parsedMessage = JSON.parse(message.toString());
        const { type, drawingId } = parsedMessage;

        if (type === 'join') {
          if (!drawingId) return;

          ws.drawingId = drawingId;
          if (!rooms.has(drawingId)) {
            rooms.set(drawingId, new Set());
          }
          rooms.get(drawingId)?.add(ws);
          console.log(`Client joined room: ${drawingId}`);

        } else if (type === 'drawingUpdate' && ws.drawingId) {
          const room = rooms.get(ws.drawingId);
          if (room) {
            room.forEach(client => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
              }
            });
          }
        }
      } catch (error) {
        console.error('Failed to parse message or invalid message format:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected from integrated server');
      if (ws.drawingId) {
        const room = rooms.get(ws.drawingId);
        if (room) {
          room.delete(ws);
          if (room.size === 0) {
            rooms.delete(ws.drawingId);
            console.log(`Room ${ws.drawingId} is now empty and has been removed.`);
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
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}); 