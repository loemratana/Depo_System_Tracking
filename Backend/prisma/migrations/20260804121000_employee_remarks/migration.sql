-- Employee remarks + name index expected by Prisma schema
ALTER TABLE "employees"
  ADD COLUMN IF NOT EXISTS "remarks" TEXT;

CREATE INDEX IF NOT EXISTS "idx_employees_names"
  ON "employees"("khmer_name", "english_name");
