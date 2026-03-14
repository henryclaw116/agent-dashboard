import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { WebSocketServer } from 'ws';
import http from 'http';
import { initializeDatabase } from './db-init';
import { setupVNCProxy } from './vnc-proxy';

dotenv.config();

// Routes
import projectRoutes from './routes/project.routes';
import taskRoutes from './routes/task.routes';
import blockerRoutes from './routes/blocker.routes';
import activityRoutes from './routes/activity.routes';
import dashboardRoutes from './routes/dashboard.routes';
import waitingRoutes from './routes/waiting.routes';
import socialMediaRoutes from './routes/socialMedia.routes';
import viralContentRoutes from './routes/viralContent.routes';
import agentRoutes from './routes/agent.routes';
import consoleRoutes from './routes/console.routes';
import workflowRoutes from './routes/workflow.routes';
import vncRoutes from './routes/vnc.routes';
import subagentRoutes from './routes/subagent.routes';
import agentSpawnRoutes from './routes/agentSpawn.routes';
import financialsRoutes from './routes/financials.routes';
import { createCostsRouter } from './routes/costs.routes';
import { createPipelineRouter } from './routes/pipeline.routes';
import { createSocialPipelineRouter } from './routes/social-pipeline.routes';
import socialLeadsRoutes from './routes/socialLeads.routes';
import orchestrationRoutes from './routes/orchestration.routes';
import relationshipsRoutes from './routes/relationships.routes';
import { createBitlyAnalyticsRouter } from './routes/bitly-analytics.routes';
import agentTrainingRoutes from './routes/agentTraining.routes';
import settingsRoutes from './routes/settings.routes';
import { startWeeklyTrainingJob } from './jobs/weeklyTrainingJob';

const app: Express = express();
const PORT = process.env.PORT || 3002;
const WS_PORT = process.env.WS_PORT || 3003;

// Placeholder for broadcast (will be set when WSS is initialized)
export let broadcast: (data: any) => void = () => {};

// Database connection
// Supabase requires SSL
export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/blockers', blockerRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/waiting', waitingRoutes);
app.use('/api/social-media', socialMediaRoutes);
app.use('/api/viral-content', viralContentRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/agents', agentSpawnRoutes);  // Spawn & scheduler endpoints
app.use('/api/consoles', consoleRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/vnc', vncRoutes);
app.use('/api/subagents', subagentRoutes);
app.use('/api/financials', financialsRoutes);
app.use('/api/costs', createCostsRouter(db));
app.use('/api/pipeline', createPipelineRouter(db));
app.use('/api/social-pipeline', createSocialPipelineRouter(db));
app.use('/api/social-leads', socialLeadsRoutes);
app.use('/api/bitly-analytics', createBitlyAnalyticsRouter(db));
app.use('/api/orchestration', orchestrationRoutes);
app.use('/api/relationships', relationshipsRoutes);
app.use('/api/agent-training', agentTrainingRoutes);
app.use('/api/settings', settingsRoutes); // Training routes registered

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: any) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize database and start server
async function startServer() {
  try {
    console.log('🔗 Connecting to database...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')); // Log URL with masked password
    
    // Test connection
    const testResult = await db.query('SELECT NOW()');
    console.log('✅ Database connected at:', testResult.rows[0].now);
    
    // Skip auto-initialization - will do manually
    // await initializeDatabase(db);
    console.log('⏭️  Skipping auto-initialization (will do manually)');

    // Start HTTP server after DB is ready
    const server = http.createServer(app);
    
    // Setup VNC WebSocket proxy
    setupVNCProxy(server);
    
    server.listen(PORT, () => {
      console.log(`🚀 Agent Dashboard API running on port ${PORT}`);
    });

    // WebSocket server for real-time updates
    const wss = new WebSocketServer({ port: parseInt(WS_PORT as string) });

    wss.on('connection', (ws) => {
      console.log('WebSocket client connected');

      ws.on('message', (message) => {
        console.log('Received:', message.toString());
      });

      ws.on('close', () => {
        console.log('WebSocket client disconnected');
      });

      // Send welcome message
      ws.send(JSON.stringify({ type: 'connected', message: 'Dashboard WebSocket connected' }));
    });

    // Broadcast function for real-time updates
    broadcast = (data: any) => {
      wss.clients.forEach((client) => {
        if (client.readyState === 1) { // OPEN
          client.send(JSON.stringify(data));
        }
      });
    };

    console.log(`🔌 WebSocket server running on port ${WS_PORT}`);

    // Start weekly agent training job
    startWeeklyTrainingJob();

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, closing servers...');
      wss.close();
      server.close(() => {
        db.end(() => {
          console.log('Servers closed');
          process.exit(0);
        });
      });
    });
  } catch (err) {
    console.error('❌ Server startup failed:', err);
    process.exit(1);
  }
}

// Global error handlers to catch silent crashes
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('❌ UNHANDLED REJECTION - Server will crash if not handled!');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  console.error('Stack:', reason?.stack);
});

process.on('uncaughtException', (error: Error) => {
  console.error('❌ UNCAUGHT EXCEPTION - Server will crash!');
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  // Don't exit immediately - let PM2 handle restart
});

// Start the server
startServer();

