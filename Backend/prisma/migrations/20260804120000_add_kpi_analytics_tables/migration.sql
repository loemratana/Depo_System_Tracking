-- Add missing enums/tables required by seed + KPI/analytics features

-- DepotStatus: vacancy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'DepotStatus' AND e.enumlabel = 'vacancy'
  ) THEN
    ALTER TYPE "DepotStatus" ADD VALUE 'vacancy';
  END IF;
END $$;

-- Sex: other
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'Sex' AND e.enumlabel = 'other'
  ) THEN
    ALTER TYPE "Sex" ADD VALUE 'other';
  END IF;
END $$;

-- ProductStatus: OK / LOW / OUT_OF_STOCK (replace legacy values)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'ProductStatus'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ProductStatus' AND e.enumlabel = 'OK'
  ) THEN
    ALTER TYPE "ProductStatus" RENAME TO "ProductStatus_old";
    CREATE TYPE "ProductStatus" AS ENUM ('OK', 'LOW', 'OUT_OF_STOCK');

    ALTER TABLE "products" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "products"
      ALTER COLUMN "status" TYPE "ProductStatus"
      USING (
        CASE "status"::text
          WHEN 'available' THEN 'OK'
          WHEN 'out_of_stock' THEN 'OUT_OF_STOCK'
          WHEN 'discontinued' THEN 'OUT_OF_STOCK'
          WHEN 'OK' THEN 'OK'
          WHEN 'LOW' THEN 'LOW'
          WHEN 'OUT_OF_STOCK' THEN 'OUT_OF_STOCK'
          ELSE 'OK'
        END::"ProductStatus"
      );
    ALTER TABLE "products" ALTER COLUMN "status" SET DEFAULT 'OK'::"ProductStatus";
    DROP TYPE "ProductStatus_old";
  END IF;
END $$;

-- employee_kpis
CREATE TABLE IF NOT EXISTS "employee_kpis" (
  "id" SERIAL PRIMARY KEY,
  "employee_id" INTEGER NOT NULL,
  "depot_id" INTEGER NOT NULL,
  "month" DATE NOT NULL,
  "target_value" DOUBLE PRECISION NOT NULL,
  "actual_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "performance" DOUBLE PRECISION,
  "remarks" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employee_kpis_employee_id_depot_id_month_key"
    UNIQUE ("employee_id", "depot_id", "month"),
  CONSTRAINT "employee_kpis_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employees"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "employee_kpis_depot_id_fkey"
    FOREIGN KEY ("depot_id") REFERENCES "depots"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

-- product_performances
CREATE TABLE IF NOT EXISTS "product_performances" (
  "id" SERIAL PRIMARY KEY,
  "product_id" INTEGER NOT NULL,
  "employee_id" INTEGER NOT NULL,
  "month" DATE NOT NULL,
  "quantity_sold" INTEGER NOT NULL DEFAULT 0,
  "revenue" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_performances_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "product_performances_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employees"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

-- employee_documents
CREATE TABLE IF NOT EXISTS "employee_documents" (
  "id" SERIAL PRIMARY KEY,
  "employee_id" INTEGER NOT NULL,
  "file_name" VARCHAR(200) NOT NULL,
  "file_url" TEXT NOT NULL,
  "file_type" TEXT,
  "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employee_documents_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employees"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);
