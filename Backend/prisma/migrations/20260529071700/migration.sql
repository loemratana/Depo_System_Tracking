/*
  Warnings:

  - The values [assignment] on the enum `ReportType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `depot_id` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the `assignments` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ReportType_new" AS ENUM ('inventory', 'sales', 'employee', 'depot');
ALTER TABLE "reports" ALTER COLUMN "report_type" TYPE "ReportType_new" USING ("report_type"::text::"ReportType_new");
ALTER TYPE "ReportType" RENAME TO "ReportType_old";
ALTER TYPE "ReportType_new" RENAME TO "ReportType";
DROP TYPE "public"."ReportType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "assignments" DROP CONSTRAINT "assignments_depot_id_fkey";

-- DropForeignKey
ALTER TABLE "assignments" DROP CONSTRAINT "assignments_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "employees" DROP CONSTRAINT "employees_depot_id_fkey";

-- AlterTable
ALTER TABLE "depot_brands" ADD COLUMN     "province_id" INTEGER;

-- AlterTable
ALTER TABLE "depots" ADD COLUMN     "commune" VARCHAR(100),
ADD COLUMN     "employee_id" INTEGER,
ADD COLUMN     "expiry_date" TIMESTAMPTZ(6),
ADD COLUMN     "house_number" VARCHAR(50),
ADD COLUMN     "province_id" INTEGER,
ADD COLUMN     "street" VARCHAR(100),
ADD COLUMN     "village" VARCHAR(100);

-- AlterTable
ALTER TABLE "employees" DROP COLUMN "depot_id",
DROP COLUMN "name",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "date_of_birth" DATE,
ADD COLUMN     "department" VARCHAR(100),
ADD COLUMN     "english_name" VARCHAR(100),
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "images" TEXT,
ADD COLUMN     "khmer_name" VARCHAR(100),
ADD COLUMN     "salary" REAL,
ADD COLUMN     "updated_at" TIMESTAMP(3);

-- DropTable
DROP TABLE "assignments";

-- DropEnum
DROP TYPE "AssignmentStatus";

-- DropEnum
DROP TYPE "AssignmentType";

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "refresh_tokens_pkey" TEXT NOT NULL,
    "refresh_tokens_token_key" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("refresh_tokens_pkey")
);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_refresh_tokens_token_key_key" ON "refresh_tokens"("refresh_tokens_token_key");

-- CreateIndex
CREATE INDEX "idx_depots_created_at" ON "depots"("created_at");

-- CreateIndex
CREATE INDEX "idx_depots_district_id" ON "depots"("district_id");

-- AddForeignKey
ALTER TABLE "depots" ADD CONSTRAINT "fk_depot_province" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depots" ADD CONSTRAINT "depots_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depot_brands" ADD CONSTRAINT "fk_depot_brand_province" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
