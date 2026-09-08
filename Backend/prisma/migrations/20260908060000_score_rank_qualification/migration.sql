-- Replace the structural/critical-floor qualification gate with a simple
-- score-rank tier derived only from the overall average score:
--   >= 8    excellent
--   >= 6.5  good
--   >= 5    needs_improvement
--   < 5     weak

ALTER TABLE "depot_assessments" ALTER COLUMN "qualification_status" TYPE TEXT USING ("qualification_status"::TEXT);

DROP TYPE "QualificationStatus";

CREATE TYPE "QualificationStatus" AS ENUM ('excellent', 'good', 'needs_improvement', 'weak');

-- Recompute existing rows from their already-stored overall_score so history
-- keeps a value consistent with the new tiers instead of being wiped.
UPDATE "depot_assessments"
SET "qualification_status" = CASE
  WHEN "overall_score" IS NULL THEN NULL
  WHEN "overall_score" >= 8 THEN 'excellent'
  WHEN "overall_score" >= 6.5 THEN 'good'
  WHEN "overall_score" >= 5 THEN 'needs_improvement'
  ELSE 'weak'
END
WHERE "qualification_status" IS NOT NULL;

ALTER TABLE "depot_assessments"
  ALTER COLUMN "qualification_status" TYPE "QualificationStatus" USING ("qualification_status"::"QualificationStatus");
