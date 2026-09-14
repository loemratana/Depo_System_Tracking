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
--
-- TEMPORARY EXCEPTION (added before this migration's first deploy to
-- production — never applied without it): depot_id=2534, cycle_id=1
-- (depot "THO SOPHEA", assessments #164 and #266) currently has two
-- non-superseded rows that a pending business decision must resolve —
-- see conversation/ticket on which of #164/#266 is authoritative. Every
-- other production duplicate found during that review was already
-- resolved by superseding the older row before this migration ran.
--
-- This carve-out is scoped to exactly that one (depot_id, cycle_id) pair
-- and must NOT be treated as a general escape hatch. Once #164/#266 are
-- resolved (one marked is_superseded = true), remove it with a follow-up
-- migration that runs only:
--   DROP INDEX "idx_depot_assessments_active_unique";
--   CREATE UNIQUE INDEX "idx_depot_assessments_active_unique"
--   ON "depot_assessments" ("depot_id", "cycle_id")
--   WHERE "is_superseded" = false;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_depot_assessments_active_unique"
ON "depot_assessments" ("depot_id", "cycle_id")
WHERE "is_superseded" = false
  AND NOT (depot_id = 2534 AND cycle_id = 1);
