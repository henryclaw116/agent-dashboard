/**
 * VNC WebSocket Proxy Service
 * Handles WebSocket connections and proxies VNC traffic
 */

import { Server as WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import net from 'net';
import { db } from '../server';

export class VNCProxyService {
  private wss: WebSocketServer;
  
  constructor(server: HTTPServer) {
    // Create WebSocket server on /api/vnc/ws
    this.wss = new WebSocketServer({ 
      server,
      path: '/api/vnc/ws'
    });
    
    this.wss.on('connection', this.handleConnection.bind(this));
    console.log('[VNC Proxy] WebSocket server initialized on /api/vnc/ws');
  }
  
  private async handleConnection(ws: WebSocket, req: any) {
    console.log('[VNC Proxy] New WebSocket connection');
    
    // Extract console ID from query params
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const consoleId = url.searchParams.get('console');
    
    if (!consoleId) {
      console.error('[VNC Proxy] Missing console ID');
      ws.close(1008, 'Missing console ID');
      return;
    }
    
    try {
      // Get console VNC details from database
      const result = await db.query(
        'SELECT vnc_host, vnc_port, vnc_enabled FROM consoles WHERE id = $1',
        [consoleId]
      );
      
      if (result.rows.length === 0) {
        console.error(`[VNC Proxy] Console ${consoleId} not found`);
        ws.close(1008, 'Console not found');
        return;
      }
      
      const console = result.rows[0];
      
      if (!console.vnc_enabled) {
        console.error(`[VNC Proxy] VNC not enabled for console ${consoleId}`);
        ws.close(1008, 'VNC not enabled for this console');
        return;
      }
      
      // Connect to VNC server
      const vncHost = console.vnc_host;
      const vncPort = console.vnc_port || 5900;
      
      console.log(`[VNC Proxy] Connecting to VNC server ${vncHost}:${vncPort}`);
      
      const vncSocket = net.connect(vncPort, vncHost);
      
      // VNC server connected
      vncSocket.on('connect', () => {
        console.log(`[VNC Proxy] Connected to VNC server ${vncHost}:${vncPort}`);
        
        // Update last connected timestamp
        db.query('UPDATE consoles SET vnc_last_connected = NOW() WHERE id = $1', [consoleId])
          .catch(err => console.error('[VNC Proxy] Failed to update last_connected:', err));
      });
      
      // Forward VNC data to WebSocket
      vncSocket.on('data', (data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });
      
      // Forward WebSocket data to VNC server
      ws.on('message', (data) => {
        vncSocket.write(data as Buffer);
      });
      
      // Handle errors
      vncSocket.on('error', (err) => {
        console.error(`[VNC Proxy] VNC socket error:`, err);
        ws.close(1011, 'VNC connection error');
      });
      
      ws.on('error', (err) => {
        console.error(`[VNC Proxy] WebSocket error:`, err);
        vncSocket.destroy();
      });
      
      // Handle disconnections
      vncSocket.on('close', () => {
        console.log(`[VNC Proxy] VNC connection closed`);
        ws.close();
      });
      
      ws.on('close', () => {
        console.log(`[VNC Proxy] WebSocket closed`);
        vncSocket.destroy();
      });
      
    } catch (error) {
      console.error('[VNC Proxy] Error setting up connection:', error);
      ws.close(1011, 'Internal server error');
    }
  }
}
