import { createServer } from 'http';
import { DatabaseService } from './database/database.service';
import { shutdownServices, checkServiceHealth } from './container/service-registration';
import { WebSocketService } from './websocket/websocket.service';
import { app, initializeApp } from './init-app';

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function startServer() {
  try {
    // Initialize the app with all services and routes
    await initializeApp();

    // Run migrations in production/staging
    if (NODE_ENV !== 'test') {
      const dbService = DatabaseService.getInstance();
      await dbService.runMigrations();
      console.log('Database migrations completed');
    }

    // Check service health
    const healthStatus = await checkServiceHealth();
    if (!healthStatus.overall) {
      throw new Error('Service health check failed');
    }

    // Create HTTP server and start the server
    const server = createServer(app);

    // Initialize WebSocket service
    const webSocketService = WebSocketService.getInstance();
    webSocketService.initialize(server);

    server.listen(PORT, () => {
      console.log(`🚀 Employee Management API is running!`);
      console.log(`📡 Server: http://localhost:${PORT}`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`📚 API Docs: http://localhost:${PORT}/api`);
      console.log(`🌍 Environment: ${NODE_ENV}`);
      console.log(`🕐 Started at: ${new Date().toISOString()}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(async () => {
        await shutdownServices();
        console.log('Server shut down complete');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully');
      server.close(async () => {
        await shutdownServices();
        console.log('Server shut down complete');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server only if this file is run directly
if (require.main === module) {
  startServer();
}