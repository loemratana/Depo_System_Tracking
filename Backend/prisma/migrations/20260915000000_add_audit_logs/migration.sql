-- CreateTable
--
-- Hand-written (not `prisma migrate dev`'s auto-generated diff): the
-- `audit_logs` table already exists in some environments, created directly
-- via SQL before this migration was written. Every statement below is
-- IF NOT EXISTS / has a duplicate-object guard, so running this migration
-- against a DB that already has the table (and applying it fresh
-- elsewhere, e.g. production) both work — it's a no-op on the former,
-- a real create on the latter.
--
-- If your dev DB already has this table: mark this migration as applied
-- without running its SQL —
--   npx prisma migrate resolve --applied 20260915000000_add_audit_logs
-- (see Backend/prisma/migrations/README in the repo root commit message,
-- or just re-run `npx prisma migrate deploy` — the IF NOT EXISTS guards
-- make it safe to run either way.)
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" INTEGER,
    "username" VARCHAR(100),
    "action" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(100),
    "entity_id" VARCHAR(100),
    "request_id" VARCHAR(100),
    "ip_address" INET,
    "user_agent" TEXT,
    "old_data" JSONB,
    "new_data" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs"("created_at");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_user_id_fkey'
    ) THEN
        ALTER TABLE "audit_logs"
            ADD CONSTRAINT "audit_logs_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
