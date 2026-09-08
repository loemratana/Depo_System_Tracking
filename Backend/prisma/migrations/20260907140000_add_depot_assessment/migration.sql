-- CreateEnum
CREATE TYPE "AssessmentCycleType" AS ENUM ('mid_year', 'year_end', 'ad_hoc');

-- CreateEnum
CREATE TYPE "AssessmentCriterionCategory" AS ENUM ('objective', 'subjective', 'behavioral');

-- CreateEnum
CREATE TYPE "DepotAssessmentStatus" AS ENUM ('draft', 'submitted', 'finalized');

-- CreateEnum
CREATE TYPE "AssessmentItemResult" AS ENUM ('our_side', 'competitor', 'none');

-- CreateEnum
CREATE TYPE "QualificationStatus" AS ENUM ('qualified', 'needs_review', 'not_qualified');

-- CreateEnum
CREATE TYPE "AssessmentAuditAction" AS ENUM ('created', 'submitted', 'finalized', 'reopened', 'edited');

-- CreateTable
CREATE TABLE "assessment_cycles" (
    "id" SERIAL NOT NULL,
    "type" "AssessmentCycleType" NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_criteria" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "label_km" TEXT NOT NULL,
    "label_en" TEXT NOT NULL,
    "category" "AssessmentCriterionCategory" NOT NULL,
    "is_structural" BOOLEAN NOT NULL DEFAULT false,
    "is_comparable" BOOLEAN NOT NULL DEFAULT true,
    "needs_clarification" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "assessment_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depot_assessments" (
    "id" SERIAL NOT NULL,
    "depot_id" INTEGER NOT NULL,
    "cycle_id" INTEGER NOT NULL,
    "evaluator_id" INTEGER NOT NULL,
    "status" "DepotAssessmentStatus" NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_superseded" BOOLEAN NOT NULL DEFAULT false,
    "reopened_from_id" INTEGER,
    "reopen_reason" TEXT,
    "assessment_date" DATE NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "finalized_at" TIMESTAMP(3),
    "overall_score" DECIMAL(5,2),
    "objective_avg_score" DECIMAL(5,2),
    "subjective_avg_score" DECIMAL(5,2),
    "our_wins_count" INTEGER NOT NULL DEFAULT 0,
    "competitor_wins_count" INTEGER NOT NULL DEFAULT 0,
    "not_compared_count" INTEGER NOT NULL DEFAULT 0,
    "qualification_status" "QualificationStatus",
    "qualification_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "depot_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depot_assessment_items" (
    "id" SERIAL NOT NULL,
    "assessment_id" INTEGER NOT NULL,
    "criterion_id" INTEGER NOT NULL,
    "score" INTEGER,
    "result" "AssessmentItemResult" NOT NULL DEFAULT 'none',
    "remarks" TEXT,

    CONSTRAINT "depot_assessment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_audit_events" (
    "id" SERIAL NOT NULL,
    "assessment_id" INTEGER NOT NULL,
    "action" "AssessmentAuditAction" NOT NULL,
    "actor_id" INTEGER NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assessment_criteria_code_key" ON "assessment_criteria"("code");

-- CreateIndex
CREATE UNIQUE INDEX "depot_assessments_reopened_from_id_key" ON "depot_assessments"("reopened_from_id");

-- CreateIndex
CREATE INDEX "idx_depot_assessments_depot_cycle" ON "depot_assessments"("depot_id", "cycle_id");

-- CreateIndex
CREATE INDEX "idx_depot_assessments_cycle_id" ON "depot_assessments"("cycle_id");

-- CreateIndex
CREATE INDEX "idx_depot_assessments_evaluator_id" ON "depot_assessments"("evaluator_id");

-- CreateIndex
CREATE INDEX "idx_depot_assessments_status" ON "depot_assessments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "depot_assessment_items_assessment_criterion_key" ON "depot_assessment_items"("assessment_id", "criterion_id");

-- CreateIndex
CREATE INDEX "idx_depot_assessment_items_criterion_id" ON "depot_assessment_items"("criterion_id");

-- CreateIndex
CREATE INDEX "idx_assessment_audit_events_assessment_id" ON "assessment_audit_events"("assessment_id");

-- AddForeignKey
ALTER TABLE "depot_assessments" ADD CONSTRAINT "depot_assessments_depot_id_fkey" FOREIGN KEY ("depot_id") REFERENCES "depots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depot_assessments" ADD CONSTRAINT "depot_assessments_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "assessment_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depot_assessments" ADD CONSTRAINT "depot_assessments_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depot_assessments" ADD CONSTRAINT "depot_assessments_reopened_from_id_fkey" FOREIGN KEY ("reopened_from_id") REFERENCES "depot_assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depot_assessment_items" ADD CONSTRAINT "depot_assessment_items_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "depot_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depot_assessment_items" ADD CONSTRAINT "depot_assessment_items_criterion_id_fkey" FOREIGN KEY ("criterion_id") REFERENCES "assessment_criteria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_audit_events" ADD CONSTRAINT "assessment_audit_events_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "depot_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_audit_events" ADD CONSTRAINT "assessment_audit_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
