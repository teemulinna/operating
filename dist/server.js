"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const app_1 = require("./app");
const database_service_1 = require("./database/database.service");
const service_registration_1 = require("./container/service-registration");
const websocket_service_1 = require("./websocket/websocket.service");
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
async function startServer() {
    try {
        await (0, service_registration_1.initializeServices)();
        if (NODE_ENV !== 'test') {
            const dbService = database_service_1.DatabaseService.getInstance();
            await dbService.runMigrations();
            console.log('Database migrations completed');
        }
        const healthStatus = await (0, service_registration_1.checkServiceHealth)();
        if (!healthStatus.overall) {
            throw new Error('Service health check failed');
        }
        const server = (0, http_1.createServer)(app_1.app);
        const webSocketService = websocket_service_1.WebSocketService.getInstance();
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
        process.on('SIGTERM', async () => {
            console.log('SIGTERM received, shutting down gracefully');
            server.close(async () => {
                await (0, service_registration_1.shutdownServices)();
                console.log('Server shut down complete');
                process.exit(0);
            });
        });
        process.on('SIGINT', async () => {
            console.log('SIGINT received, shutting down gracefully');
            server.close(async () => {
                await (0, service_registration_1.shutdownServices)();
                console.log('Server shut down complete');
                process.exit(0);
            });
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    startServer();
}
//# sourceMappingURL=server.js.map