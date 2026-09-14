-- Drop the English label — the app is Khmer-only for assessment criteria now
-- (see assessmentCriteriaCatalog.js). labelKm remains the only label.
ALTER TABLE "assessment_criteria" DROP COLUMN "label_en";
