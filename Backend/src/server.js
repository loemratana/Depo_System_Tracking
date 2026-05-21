import http from 'http';

import app from './app.js';
import { connectDB } from './config/db.js';
import logger from './config/logger.js';
import environment from './config/env.js';


class Server {
    constructor() {
        this.app = app;
        this.server = http.createServer(app);
        this.port = environment.port || 3000;
        this.host = environment.host || '0.0.0.0';
    }
    // Create HTTP server

    createServer() {
        return http.createServer(this.app);
    }
    // Start server

    async start() {
        try {
            // 1. Connect Database (Prisma)
            await connectDB();
            logger.info("Database connected successfully");
            // 2. Create server
            this.server = this.createServer();
            // 3. Listen server
            this.server.listen(this.port, this.host, () => {
                logger.info(
                    `🚀 Server running on http://${this.host}:${this.port}`
                );

                logger.info(`Environment: ${environment.nodeEnv}`);
            });

            // 4. Handle server errors
            this.server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    logger.error(`Port ${this.port} is already in use`);
                } else {
                    logger.error('Server error:', error);
                }
                process.exit(1);
            });

        }
        catch (error) {
            logger.error('❌ Failed to start server');
            logger.error(error);
            process.exit(1);
        }
    }
    // Graceful shutdown
    async stop() {
        logger.info('Shutting down server...');

        if (this.server) {
            this.server.close(() => {
                logger.info('HTTP server closed');
                process.exit(0);
            });
        }
    }

    // Handle system signals
    setupGracefulShutdown() {
        process.on('SIGINT', () => this.stop());
        process.on('SIGTERM', () => this.stop());
    }

}

// Create instance
const server = new Server();

// Setup shutdown
server.setupGracefulShutdown();

// Start only if not test
if (environment.nodeEnv !== 'test') {
    server.start();
}

export default server;