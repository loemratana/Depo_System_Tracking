-- Both indexes target the actual query shapes in
-- assessmentService.js#buildAssessmentWhere + the `orderBy: { assessmentDate: "desc" }`
-- used by every list/grouped/export call (listAssessments,
-- #listAssessmentsGrouped, exportAssessments). Not speculative — every
-- column here is a real WHERE/ORDER BY column in that code today.

-- 1. The default case: `WHERE is_superseded = false ORDER BY assessment_date
-- DESC LIMIT/OFFSET`. isSuperseded=false is applied on essentially every
-- call (includeSuperseded defaults to false), so this is the single
-- highest-value index for the endpoint — a partial index (Prisma's schema
-- DSL can't express `WHERE`, hence a hand-written migration) so it also
-- stays smaller than a full-table index as superseded rows accumulate from
-- reopenAssessment.
CREATE INDEX IF NOT EXISTS "idx_depot_assessments_active_date"
ON "depot_assessments" ("assessment_date" DESC)
WHERE "is_superseded" = false;

-- 2. The common compound filter: browsing one cycle, optionally narrowed by
-- status, sorted by date — cycleId and status are both real filters in
-- #buildAssessmentWhere, and the frontend's filter bar has both a cycle and
-- a status dropdown, so "one cycle, one status, newest first" is a
-- realistic query shape, not a hypothetical one. cycleId alone is already
-- indexed (idx_depot_assessments_cycle_id), but a composite avoids a
-- separate sort step once status narrows the cycle's rows.
CREATE INDEX IF NOT EXISTS "idx_depot_assessments_cycle_status_date"
ON "depot_assessments" ("cycle_id", "status", "assessment_date" DESC);

-- Explicitly NOT added (checked against actual usage, not assumed):
--   * depot_id alone       — already the leading column of the existing
--                            (depot_id, cycle_id) composite index; Postgres
--                            can use that composite's leading-column prefix
--                            for depot_id-only lookups.
--   * qualification_status — filterable, but a 4-value enum has poor
--                            selectivity; not worth the write overhead at
--                            the current table size. Revisit if the table
--                            grows large AND this filter is used heavily.
--   * created_at           — never used in a WHERE or ORDER BY anywhere in
--                            assessmentService.js. Only assessment_date is.
