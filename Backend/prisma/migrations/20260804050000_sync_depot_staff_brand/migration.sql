-- Sync Prisma schema gaps for local Docker DB
-- Adds depot brand/owner metadata columns + staffs table

-- Sex enum used by Depot.sex
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Sex') THEN
    CREATE TYPE "Sex" AS ENUM ('male', 'female');
  END IF;
END $$;

-- Depot columns expected by schema.prisma
ALTER TABLE "depots"
  ADD COLUMN IF NOT EXISTS "brand_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "assigned_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "khmer_name" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "date_of_birth" DATE,
  ADD COLUMN IF NOT EXISTS "sex" "Sex" DEFAULT 'male',
  ADD COLUMN IF NOT EXISTS "Depot_id_number" VARCHAR(20);

-- Indexes used by Prisma schema
CREATE INDEX IF NOT EXISTS "idx_depots_province_id" ON "depots"("province_id");
CREATE INDEX IF NOT EXISTS "idx_depots_employee_id" ON "depots"("employee_id");
CREATE INDEX IF NOT EXISTS "idx_name_depot" ON "depots"("name");

-- Brand FK on depots
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_brand'
  ) THEN
    ALTER TABLE "depots"
      ADD CONSTRAINT "fk_brand"
      FOREIGN KEY ("brand_id") REFERENCES "brands"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
END $$;

-- Staffs table for depot staff management
CREATE TABLE IF NOT EXISTS "staffs" (
  "id" SERIAL PRIMARY KEY,
  "depot_id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" VARCHAR(20),
  CONSTRAINT "staffs_email_key" UNIQUE ("email"),
  CONSTRAINT "staffs_depot_id_fkey"
    FOREIGN KEY ("depot_id") REFERENCES "depots"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);
