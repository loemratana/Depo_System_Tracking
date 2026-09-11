-- Prevent two "current" (non-superseded) evaluations from existing for the
-- same depot + cycle at once. Without this, two users creating an
-- evaluation for the same depot+cycle at the same time both succeed,
-- silently leaving two independent draft rows behind (see
-- createAssessment concurrency review).
--
-- Scoped to `is_superseded = false` (a partial index, which Prisma's
-- schema DSL can't express — this migration is hand-written, not
-- generated from schema.prisma) because reopenAssessment's versioning is
-- a legitimate reason for multiple rows to share a (depot_id, cycle_id):
-- reopening flips the old row's is_superseded to true *before* inserting
-- the new draft, so at most one row per (depot_id, cycle_id) is ever
-- non-superseded at a time — exactly the invariant this enforces.
CREATE UNIQUE INDEX IF NOT EXISTS "idx_depot_assessments_active_unique"
ON "depot_assessments" ("depot_id", "cycle_id")
WHERE "is_superseded" = false;
