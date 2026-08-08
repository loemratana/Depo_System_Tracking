-- Dynamic KPI architecture (Approach B)

CREATE TYPE "KpiDirection" AS ENUM ('higher_better', 'lower_better');
CREATE TYPE "KpiValueType" AS ENUM ('number', 'percent', 'currency');
CREATE TYPE "ImportBatchStatus" AS ENUM ('pending', 'validating', 'importing', 'success', 'failed', 'partial');

CREATE TABLE "kpi_definitions" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "unit" VARCHAR(30),
    "value_type" "KpiValueType" NOT NULL DEFAULT 'number',
    "direction" "KpiDirection" NOT NULL DEFAULT 'higher_better',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "kpi_definitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "kpi_definitions_code_key" ON "kpi_definitions"("code");

CREATE TABLE "kpi_packs" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "kpi_packs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "kpi_packs_code_key" ON "kpi_packs"("code");

CREATE TABLE "kpi_pack_items" (
    "id" SERIAL NOT NULL,
    "pack_id" INTEGER NOT NULL,
    "kpi_definition_id" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "kpi_pack_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "kpi_pack_items_pack_id_kpi_definition_id_key" ON "kpi_pack_items"("pack_id", "kpi_definition_id");

CREATE TABLE "kpi_pack_assignments" (
    "id" SERIAL NOT NULL,
    "pack_id" INTEGER NOT NULL,
    "brand_id" INTEGER,
    "department" VARCHAR(100),
    CONSTRAINT "kpi_pack_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "kpi_pack_assignments_brand_id_idx" ON "kpi_pack_assignments"("brand_id");

CREATE TABLE "import_batches" (
    "id" SERIAL NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'pending',
    "period_month" DATE,
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "success_rows" INTEGER NOT NULL DEFAULT 0,
    "failed_rows" INTEGER NOT NULL DEFAULT 0,
    "error_report" JSONB,
    "uploaded_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "kpi_values" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "depot_id" INTEGER NOT NULL,
    "brand_id" INTEGER,
    "kpi_definition_id" INTEGER NOT NULL,
    "period_month" DATE NOT NULL,
    "target_value" DOUBLE PRECISION,
    "actual_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION,
    "remarks" TEXT,
    "import_batch_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    CONSTRAINT "kpi_values_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "kpi_values_natural_key" ON "kpi_values"("employee_id", "depot_id", "kpi_definition_id", "period_month");
CREATE INDEX "idx_kpi_values_period_employee" ON "kpi_values"("period_month", "employee_id");
CREATE INDEX "idx_kpi_values_period_depot" ON "kpi_values"("period_month", "depot_id");
CREATE INDEX "idx_kpi_values_def_period" ON "kpi_values"("kpi_definition_id", "period_month");
CREATE INDEX "idx_kpi_values_batch" ON "kpi_values"("import_batch_id");

ALTER TABLE "kpi_pack_items" ADD CONSTRAINT "kpi_pack_items_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "kpi_packs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kpi_pack_items" ADD CONSTRAINT "kpi_pack_items_kpi_definition_id_fkey" FOREIGN KEY ("kpi_definition_id") REFERENCES "kpi_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kpi_pack_assignments" ADD CONSTRAINT "kpi_pack_assignments_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "kpi_packs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kpi_pack_assignments" ADD CONSTRAINT "kpi_pack_assignments_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "kpi_values" ADD CONSTRAINT "kpi_values_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kpi_values" ADD CONSTRAINT "kpi_values_depot_id_fkey" FOREIGN KEY ("depot_id") REFERENCES "depots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kpi_values" ADD CONSTRAINT "kpi_values_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "kpi_values" ADD CONSTRAINT "kpi_values_kpi_definition_id_fkey" FOREIGN KEY ("kpi_definition_id") REFERENCES "kpi_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kpi_values" ADD CONSTRAINT "kpi_values_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- BI-friendly wide view for the current field-force pack
CREATE OR REPLACE VIEW v_monthly_kpi_wide AS
SELECT
  kv.employee_id,
  kv.depot_id,
  kv.brand_id,
  kv.period_month,
  MAX(CASE WHEN d.code = 'PO_COUNT' THEN kv.actual_value END) AS po_count,
  MAX(CASE WHEN d.code = 'PO_TARGET' THEN kv.actual_value END) AS po_target,
  MAX(CASE WHEN d.code = 'PRODUCT_AVAILABLE_PCT' THEN kv.actual_value END) AS product_available_pct,
  MAX(CASE WHEN d.code = 'VOLUME_DISPLAY_PCT' THEN kv.actual_value END) AS volume_display_pct
FROM kpi_values kv
JOIN kpi_definitions d ON d.id = kv.kpi_definition_id
GROUP BY kv.employee_id, kv.depot_id, kv.brand_id, kv.period_month;
