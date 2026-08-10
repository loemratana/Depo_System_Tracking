-- AlterTable
ALTER TABLE "depots" ADD COLUMN IF NOT EXISTS "owner_photo_url" VARCHAR(500);
ALTER TABLE "depots" ADD COLUMN IF NOT EXISTS "manager_name" VARCHAR(100);
ALTER TABLE "depots" ADD COLUMN IF NOT EXISTS "manager_phone" VARCHAR(20);
ALTER TABLE "depots" ADD COLUMN IF NOT EXISTS "manager_photo_url" VARCHAR(500);
