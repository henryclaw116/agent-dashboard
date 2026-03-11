import { Server as WebSocketServer } from 'ws';
import { Server as HTTPServer } from 'http';
import { Socket } from 'net';
import { db } from './server';

interface VNCConnection {
  consoleId: number;
  host: string;
  port: number;
  password?: string;
}

/**
 * VNC WebSocket Proxy
 * Proxies VNC traffic between browser (noVNC) and VNC server
 */
export function setupVNCProxy(httpServer: HTTPServer) {
  const wss = new WebSocketServer({ 
    noServer: true,
    path: '/api/vnc'
  });

  // Handle WebSocket upgrade requests
  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
    
    if (pathname.startsWith('/api/vnc/')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', async (ws, request) => {
    console.log('VNC WebSocket connection established');

    try {
      // Extract console ID from URL: /api/vnc/:consoleId
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      const consoleId = parseInt(url.pathname.split('/')[3]);

      if (!consoleId || isNaN(consoleId)) {
        ws.close(1008, 'Invalid console ID');
        return;
      }

      // Get console VNC configuration from database
      const result = await db.query(
        `SELECT id, name, vnc_host, vnc_port, vnc_password, vnc_enabled 
         FROM consoles 
         WHERE id = $1`,
        [consoleId]
      );

      if (result.rows.length === 0) {
        ws.close(1008, 'Console not found');
        return;
      }

      const console = result.rows[0];

      if (!console.vnc_enabled) {
        ws.close(1008, 'VNC not enabled for this console');
        return;
      }

      if (!console.vnc_host) {
        ws.close(1008, 'VNC host not configured');
        return;
      }

      // Connect to VNC server
      const vncSocket = new Socket();
      const vncHost = console.vnc_host;
      const vncPort = console.vnc_port || 5900;

      console.log(`Connecting to VNC server: ${vncHost}:${vncPort}`);

      vncSocket.connect(vncPort, vncHost, () => {
        console.log(`Connected to VNC server for console ${consoleId}`);
      });

      // Forward data from browser to VNC server
      ws.on('message', (data) => {
        if (vncSocket.writable) {
          const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
          vncSocket.write(buffer);
        }
      });

      // Forward data from VNC server to browser
      vncSocket.on('data', (data) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(data);
        }
      });

      // Handle VNC socket errors
      vncSocket.on('error', (err) => {
        console.error('VNC socket error:', err);
        ws.close(1011, 'VNC connection error');
      });

      // Handle VNC socket close
      vncSocket.on('close', () => {
        console.log('VNC socket closed');
        ws.close();
      });

      // Handle WebSocket close
      ws.on('close', () => {
        console.log('WebSocket closed, closing VNC connection');
        vncSocket.destroy();
      });

      // Handle WebSocket error
      ws.on('error', (err) => {
        console.error('WebSocket error:', err);
        vncSocket.destroy();
      });

    } catch (error) {
      console.error('VNC proxy error:', error);
      ws.close(1011, 'Internal server error');
    }
  });

  console.log('VNC WebSocket proxy initialized');
  return wss;
}
