import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import logger from './logger.js';
import env from './env.js';

const { Pool } = pg;

class Database {
    constructor() {
        if (Database.instance) {
            return Database.instance;
        }

        // Create a pg Pool with SSL configuration to fix the "self-signed certificate" error
        const pool = new Pool({ 
            connectionString: env.databaseUrl,
            ssl: env.isProduction || env.databaseUrl.includes('supabase') || env.databaseUrl.includes('render') 
                ? { rejectUnauthorized: false }
                : false
        });

        // Set this as a fallback for internal Node.js TLS checks if needed
        if (env.databaseUrl.includes('supabase') || env.databaseUrl.includes('render')) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        }

        // Prisma v7 requires a database adapter for the new "client" engine.
        const adapter = new PrismaPg(pool);

        this.prisma = new PrismaClient({
            adapter,
            log: env.isDevelopment
                ? ['query', 'info', 'warn', 'error']
                : ['error'],
            errorFormat: env.isProduction ? 'minimal' : 'pretty',
        });

        Database.instance = this;
    }

    async connect() {
        try {
            await this.prisma.$connect();
            logger.info('Database connection successful');
        } catch (error) {
            logger.error('Database connection failed:', error);
            throw error;
        }
    }

    async disconnect() {
        try {
            await this.prisma.$disconnect();
            logger.info('Database disconnected successfully');
        } catch (error) {
            logger.error('Error disconnecting database:', error);
            throw error;
        }
    }

    getClient() {
        return this.prisma;
    }

    // Health check
    async healthCheck() {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            return { status: 'healthy', timestamp: new Date().toISOString() };
        } catch (error) {
            logger.error('Database health check failed:', error);
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString(),
            };
        }
    }

    // Transaction helper
    async transaction(callback) {
        return this.prisma.$transaction(callback);
    }
}

const db = new Database();

export default db;
export const prisma = db.getClient();
export const connectDB = () => db.connect();
