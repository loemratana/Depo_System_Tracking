CREATE TABLE "brand_depot_month_kpis" (
  "id" SERIAL NOT NULL,
  "depot_id" INTEGER NOT NULL,
  "brand_id" INTEGER NOT NULL,
  "period_month" DATE NOT NULL,
  "po_actual" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "po_target" DOUBLE PRECISION,
  "product_available_pct" DOUBLE PRECISION,
  "volume_display_pct" DOUBLE PRECISION,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3),
  CONSTRAINT "brand_depot_month_kpis_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "brand_depot_month_kpis_natural_key"
  ON "brand_depot_month_kpis"("depot_id", "brand_id", "period_month");

CREATE INDEX "idx_brand_depot_month_kpis_brand_period"
  ON "brand_depot_month_kpis"("brand_id", "period_month");

CREATE INDEX "idx_brand_depot_month_kpis_depot_period"
  ON "brand_depot_month_kpis"("depot_id", "period_month");

ALTER TABLE "brand_depot_month_kpis"
  ADD CONSTRAINT "brand_depot_month_kpis_depot_id_fkey"
  FOREIGN KEY ("depot_id") REFERENCES "depots"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "brand_depot_month_kpis"
  ADD CONSTRAINT "brand_depot_month_kpis_brand_id_fkey"
  FOREIGN KEY ("brand_id") REFERENCES "brands"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
