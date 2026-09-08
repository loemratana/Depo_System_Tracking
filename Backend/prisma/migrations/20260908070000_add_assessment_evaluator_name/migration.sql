-- Free-typed evaluator name (not tied to a User row) shown in place of the
-- account username, for evaluators who don't have a login. evaluator_id
-- keeps being the logged-in user who owns the record for permissions/audit.

ALTER TABLE "depot_assessments" ADD COLUMN "evaluator_name" VARCHAR(150);
