import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import logger from './logger.js';
import env from './env.js';
import { withoutSslMode } from './dbUrl.js';

const { Pool } = pg;

// Ownership: this Database class creates the pg.Pool and hands it to
// PrismaPg by reference — PrismaPg does NOT take ownership of it. Verified
// directly against @prisma/adapter-pg's source (PrismaPgAdapterFactory's
// dispose logic): it only calls `pool.end()` on an externally-supplied pool
// when constructed with `{ disposeExternalPool: true }`, which this file
// does not pass. So `prisma.$disconnect()` alone leaves the pool's
// connections open — this class must close it explicitly (see disconnect()
// below), exactly once (pg's Pool throws "Called end on pool more than
// once" on a second .end() call).

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

        // Create a pg Pool with SSL configuration to fix the "self-signed certificate" error.
        // Detected from the connection string itself (hosted providers), not NODE_ENV —
        // a self-hosted Postgres (e.g. the docker-compose stack) has no SSL listener even
        // when the app runs with NODE_ENV=production.
        const isRemoteDb =
            env.databaseUrl.includes('supabase') ||
            env.databaseUrl.includes('render') ||
            env.databaseUrl.includes('pooler') ||
            env.databaseUrl.includes('sslmode=require');

        // ssl.rejectUnauthorized: false is scoped to just this Postgres
        // connection — it does NOT disable TLS verification process-wide.
        // (A previous version of this file also set
        // `process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'` globally, which
        // disabled certificate verification for every outgoing HTTPS
        // request the whole process makes — Cloudinary, Telegram, anything
        // — not just this one. Removed; nothing else in the app needs it.)
        // TODO: if the provider (Supabase) publishes a CA certificate,
        // switch to `ssl: { ca: <cert>, rejectUnauthorized: true }` for real
        // verification instead of skipping it.
        //
        // `sslmode=` is stripped from the URL for remote databases: pg would
        // otherwise parse `sslmode=require` as "verify the certificate" and
        // override the explicit `ssl` option below, so Supabase's certificate
        // chain would be rejected ("self-signed certificate in certificate
        // chain") — see config/dbUrl.js. (That failure was previously hidden
        // by the process-wide NODE_TLS_REJECT_UNAUTHORIZED=0 removed above.)
        this.pool = new Pool({
            connectionString: isRemoteDb ? withoutSslMode(env.databaseUrl) : env.databaseUrl,
            ssl: isRemoteDb ? { rejectUnauthorized: false } : false,
            // Keep pool small on hosted Postgres (Supabase pooler limits)
            max: Number(process.env.DB_POOL_MAX || (env.isProduction ? 8 : 10)),
            idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_MS || 20_000),
            connectionTimeoutMillis: Number(
                process.env.DB_POOL_CONNECT_MS || (env.isProduction ? 10_000 : 5_000),
            ),
            allowExitOnIdle: true,
        });

        // Prisma v7 requires a database adapter for the new "client" engine.
        // PrismaPg does not take ownership of `this.pool` (see the comment
        // above the class) — this.pool.end() in disconnect() below is what
        // actually closes it.
        const adapter = new PrismaPg(this.pool);

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

    // Idempotent: pg's Pool throws "Called end on pool more than once" on a
    // second .end() call, and graceful shutdown (server.js) may attempt to
    // disconnect from more than one code path (a signal handler racing a
    // fatal-error handler, for instance) — this flag guarantees the actual
    // close only ever runs once regardless of how many callers ask for it.
    #disconnected = false;

    async disconnect() {
        if (this.#disconnected) return;
        this.#disconnected = true;

        try {
            await this.prisma.$disconnect();
        } catch (error) {
            logger.error('Error disconnecting Prisma client:', error);
        }

        try {
            await this.pool.end();
            logger.info('Database pool closed successfully');
        } catch (error) {
            logger.error('Error closing database pool:', error);
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
