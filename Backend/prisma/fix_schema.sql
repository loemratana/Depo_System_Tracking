-- 1. Drop the FK constraint on employees.depot_id (if it exists)
ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "employees_depot_id_fkey";

-- 2. Drop the depot_id column from employees (no longer needed)
ALTER TABLE "employees" DROP COLUMN IF EXISTS "depot_id";

-- 3. Add unique constraint on assignments(depot_id, status) to enforce 1 depot → 1 active employee
-- First drop if exists to be safe
ALTER TABLE "assignments" DROP CONSTRAINT IF EXISTS "uq_depot_active_assignment";
CREATE UNIQUE INDEX "uq_depot_active_assignment" ON "assignments"("depot_id", "status");
