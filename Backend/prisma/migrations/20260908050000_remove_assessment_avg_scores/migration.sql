-- Remove the objective/subjective average score columns from depot_assessments.
ALTER TABLE "depot_assessments" DROP COLUMN "objective_avg_score";
ALTER TABLE "depot_assessments" DROP COLUMN "subjective_avg_score";
