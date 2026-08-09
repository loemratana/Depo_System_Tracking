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

        if (!env.databaseUrl) {
            throw new Error(
                'DATABASE_URL is missing. Copy Backend/.env.example to Backend/.env and set DATABASE_URL.',
            );
        }

        // Create a pg Pool with SSL configuration to fix the "self-signed certificate" error
        const isRemoteDb =
            env.isProduction ||
            env.databaseUrl.includes('supabase') ||
            env.databaseUrl.includes('render') ||
            env.databaseUrl.includes('pooler');

        const pool = new Pool({
            connectionString: env.databaseUrl,
            ssl: isRemoteDb ? { rejectUnauthorized: false } : false,
            // Keep pool small on hosted Postgres (Supabase pooler limits)
            max: Number(process.env.DB_POOL_MAX || (env.isProduction ? 8 : 10)),
            idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_MS || 20_000),
            connectionTimeoutMillis: Number(
                process.env.DB_POOL_CONNECT_MS || (env.isProduction ? 10_000 : 5_000),
            ),
            allowExitOnIdle: true,
        });

        // Set this as a fallback for internal Node.js TLS checks if needed
        if (isRemoteDb) {
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
            transactionOptions: {
                maxWait: 10000,
                timeout: 30000,
            },
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
