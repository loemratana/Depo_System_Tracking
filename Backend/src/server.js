import http from 'http';

import app from './app.js';
import { connectDB } from './config/db.js';
import logger from './config/logger.js';
import environment from './config/env.js';
import { startTelegramBot } from './services/telegram/index.js';
import { telegramService } from './services/telegram/telegram.service.js';


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
                    `Server running on http://${this.host}:${this.port}`
                );



                logger.info(`Environment: ${environment.nodeEnv}`);

                startTelegramBot();
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
            logger.error('Failed to start server');
            logger.error(error);
            process.exit(1);
        }
    }
    // Graceful shutdown
    async stop() {
        logger.info('Shutting down server...');

        telegramService.stop();

        const forceExit = setTimeout(() => {
            logger.error('Forced shutdown after timeout');
            process.exit(1);
        }, 5000);
        forceExit.unref();

        if (this.server) {
            this.server.close(() => {
                logger.info('HTTP server closed');
                clearTimeout(forceExit);
                process.exit(0);
            });
        } else {
            clearTimeout(forceExit);
            process.exit(0);
        }
    }

    // Handle system signals
    setupGracefulShutdown() {
        process.on('SIGINT', () => this.stop());
        process.on('SIGTERM', () => this.stop());
    }

    // Fatal errors leave the process in an unknown state — log everything we
    // have, then exit non-zero so Docker/the process manager restarts us
    // with a clean slate instead of limping along.
    fatalShutdown(exitCode) {
        const forceExit = setTimeout(() => process.exit(exitCode), 5000);
        forceExit.unref();

        if (this.server) {
            this.server.close(() => {
                clearTimeout(forceExit);
                process.exit(exitCode);
            });
        } else {
            clearTimeout(forceExit);
            process.exit(exitCode);
        }
    }

}

// Create instance
const server = new Server();

// Setup shutdown
server.setupGracefulShutdown();

// Unrecoverable errors: log the full error, then exit non-zero. Node
// already treats an unhandled rejection as fatal by default, so this just
// makes sure it's logged via Winston (structured, redacted) before exiting
// instead of only printing to stderr.
process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', {
        err: reason,
        action: 'process.unhandled_rejection',
    });
    server.fatalShutdown(1);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', {
        err: error,
        action: 'process.uncaught_exception',
    });
    server.fatalShutdown(1);
});

// Start only if not test
if (environment.nodeEnv !== 'test') {
    server.start();
}

export default server;
