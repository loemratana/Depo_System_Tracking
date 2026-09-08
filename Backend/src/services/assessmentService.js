import { prisma } from "../config/db.js";
import { seedAssessmentCriteria } from "./assessmentCriteriaCatalog.js";

/**
 * Score Rank thresholds (V1: application constants, not a configurable
 * table — see "Deliberately simplified for V1" in the assessment ERD).
 * The qualification status is a straight tier lookup on the overall
 * average score (0–10 scale) — no structural/critical floor gates.
 */
export const SCORE_RANK_THRESHOLDS = {
  excellent: 8, // overallScore >= this -> excellent
  good: 6.5, // overallScore >= this -> good
  needsImprovement: 5, // overallScore >= this -> needs_improvement; below it -> weak
};

const ITEM_INCLUDE = {
  criterion: true,
};

const ASSESSMENT_INCLUDE = {
  depot: {
    select: {
      id: true,
      name: true,
      code: true,
      brand: { select: { id: true, name: true } },
      district: {
        select: {
          id: true,
          name: true,
          province: { select: { id: true, name: true } },
        },
      },
    },
  },
  cycle: true,
  evaluator: {
    select: { id: true, username: true, role: true },
  },
  items: { include: ITEM_INCLUDE, orderBy: { criterion: { sortOrder: "asc" } } },
};

function round2(n) {
  return Math.round(n * 100) / 100;
}

class AssessmentService {
  #criteriaReady = false;

  async ensureCriteriaCatalog() {
    if (this.#criteriaReady) return;
    const existing = await prisma.assessmentCriterion.count();
    if (existing === 0) {
      await seedAssessmentCriteria(prisma);
    }
    this.#criteriaReady = true;
  }

  // ── Cycles ─────────────────────────────────────────────

  async listCycles() {
    return prisma.assessmentCycle.findMany({ orderBy: { periodStart: "desc" } });
  }

  async createCycle({ type, label, periodStart, periodEnd }) {
    return prisma.assessmentCycle.create({
      data: {
        type,
        label,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
      },
    });
  }

  // ── Criteria ───────────────────────────────────────────

  async listCriteria({ includeInactive = false } = {}) {
    await this.ensureCriteriaCatalog();
    return prisma.assessmentCriterion.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  // ── Assessments ────────────────────────────────────────

  async listAssessments({
    depotId,
    cycleId,
    status,
    qualificationStatus,
    evaluatorId,
    brandId,
    provinceId,
    districtId,
    includeSuperseded = false,
    search,
    dateFrom,
    dateTo,
    page = 1,
    pageSize = 20,
  } = {}) {
    const where = {};
    if (depotId) where.depotId = Number(depotId);
    if (cycleId) where.cycleId = Number(cycleId);
    if (status) where.status = status;
    if (qualificationStatus) where.qualificationStatus = qualificationStatus;
    if (evaluatorId) where.evaluatorId = Number(evaluatorId);
    if (!includeSuperseded) where.isSuperseded = false;
    if (brandId || provinceId || districtId) {
      where.depot = {
        ...(brandId && { brandId: Number(brandId) }),
        ...(districtId && { districtId: Number(districtId) }),
        ...(provinceId && { district: { provinceId: Number(provinceId) } }),
      };
    }
    if (dateFrom || dateTo) {
      where.assessmentDate = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      };
    }

    const trimmedSearch = search?.trim();
    if (trimmedSearch) {
      const asId = Number(trimmedSearch);
      where.OR = [
        ...(Number.isInteger(asId) && asId > 0 ? [{ id: asId }] : []),
        { depot: { name: { contains: trimmedSearch, mode: "insensitive" } } },
      ];
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, Number(pageSize) || 20));

    const [data, total] = await prisma.$transaction([
      prisma.depotAssessment.findMany({
        where,
        include: ASSESSMENT_INCLUDE,
        orderBy: { assessmentDate: "desc" },
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
      }),
      prisma.depotAssessment.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSizeNum)),
      },
    };
  }

  async getAssessmentById(id) {
    const assessment = await prisma.depotAssessment.findUnique({
      where: { id: Number(id) },
      include: {
        ...ASSESSMENT_INCLUDE,
        auditEvents: {
          include: { actor: { select: { id: true, username: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!assessment) {
      const error = new Error("Assessment not found");
      error.statusCode = 404;
      throw error;
    }
    return assessment;
  }

  /** Latest non-superseded assessment for the same depot, dated before this one. */
  async getPreviousAssessment(assessment) {
    return prisma.depotAssessment.findFirst({
      where: {
        depotId: assessment.depotId,
        isSuperseded: false,
        id: { not: assessment.id },
        assessmentDate: { lt: assessment.assessmentDate },
      },
      include: ASSESSMENT_INCLUDE,
      orderBy: { assessmentDate: "desc" },
    });
  }

  async createAssessment({ depotId, cycleId, evaluatorId, assessmentDate }) {
    await this.ensureCriteriaCatalog();
    const criteria = await prisma.assessmentCriterion.findMany({
      where: { isActive: true },
    });

    const assessment = await prisma.$transaction(async (tx) => {
      const created = await tx.depotAssessment.create({
        data: {
          depotId: Number(depotId),
          cycleId: Number(cycleId),
          evaluatorId: Number(evaluatorId),
          assessmentDate: new Date(assessmentDate),
          status: "draft",
          items: {
            create: criteria.map((c) => ({
              criterionId: c.id,
              score: null,
              result: "none",
            })),
          },
        },
        include: ASSESSMENT_INCLUDE,
      });

      await tx.assessmentAuditEvent.create({
        data: {
          assessmentId: created.id,
          action: "created",
          actorId: Number(evaluatorId),
        },
      });

      return created;
    });

    return assessment;
  }

  /** Bulk upsert of item scores/results/remarks — only while the assessment is a draft. */
  async updateItems(assessmentId, items, actorId) {
    const assessment = await prisma.depotAssessment.findUnique({
      where: { id: Number(assessmentId) },
    });
    if (!assessment) {
      const error = new Error("Assessment not found");
      error.statusCode = 404;
      throw error;
    }
    if (assessment.status !== "draft") {
      const error = new Error(
        "Only a draft assessment can have its items edited",
      );
      error.statusCode = 409;
      throw error;
    }

    await prisma.$transaction(
      items.map((item) =>
        prisma.depotAssessmentItem.updateMany({
          where: {
            assessmentId: Number(assessmentId),
            criterionId: Number(item.criterionId),
          },
          data: {
            score: item.score === undefined ? undefined : item.score,
            result: item.result === undefined ? undefined : item.result,
            remarks: item.remarks === undefined ? undefined : item.remarks,
          },
        }),
      ),
    );

    await prisma.assessmentAuditEvent.create({
      data: {
        assessmentId: Number(assessmentId),
        action: "edited",
        actorId: Number(actorId),
      },
    });

    return this.getAssessmentById(assessmentId);
  }

  /** Compute cached scores + score-rank tier from the current items. */
  scoreAssessment(items) {
    const scored = items.filter((i) => i.score != null);

    const average = (rows) =>
      rows.length ? rows.reduce((sum, r) => sum + r.score, 0) / rows.length : null;

    const overallScore = average(scored);
    const avg = overallScore; // alias to mirror the design prototype's naming

    const ourWinsCount = items.filter((i) => i.result === "our_side").length;
    const competitorWinsCount = items.filter((i) => i.result === "competitor").length;
    const notComparedCount = items.filter(
      (i) => i.result === "none" && i.criterion.isComparable,
    ).length;

    const { excellent, good, needsImprovement } = SCORE_RANK_THRESHOLDS;

    let qualificationStatus = null;
    let qualificationReason = "Score at least one criterion to see a result.";
    if (avg != null) {
      if (avg >= excellent) {
        qualificationStatus = "excellent";
        qualificationReason = `Excellent — overall average (${round2(avg)}) is ${excellent} or above.`;
      } else if (avg >= good) {
        qualificationStatus = "good";
        qualificationReason = `Good — overall average (${round2(avg)}) is in the ${good}–${excellent} range.`;
      } else if (avg >= needsImprovement) {
        qualificationStatus = "needs_improvement";
        qualificationReason = `Needs Improvement — overall average (${round2(avg)}) is in the ${needsImprovement}–${good} range.`;
      } else {
        qualificationStatus = "weak";
        qualificationReason = `Weak (Need to Review) — overall average (${round2(avg)}) is below ${needsImprovement}.`;
      }
    }

    return {
      overallScore: overallScore != null ? round2(overallScore) : null,
      ourWinsCount,
      competitorWinsCount,
      notComparedCount,
      qualificationStatus,
      qualificationReason,
    };
  }

  async submitAssessment(id, actorId) {
    const assessment = await this.getAssessmentById(id);
    if (assessment.status !== "draft") {
      const error = new Error("Only a draft assessment can be submitted");
      error.statusCode = 409;
      throw error;
    }
    const missing = assessment.items.filter((i) => i.score == null);
    if (missing.length > 0) {
      const error = new Error(
        `All ${assessment.items.length} criteria must be scored before submitting (${missing.length} missing)`,
      );
      error.statusCode = 422;
      throw error;
    }

    const scores = this.scoreAssessment(assessment.items);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.depotAssessment.update({
        where: { id: Number(id) },
        data: {
          status: "submitted",
          submittedAt: new Date(),
          ...scores,
        },
        include: ASSESSMENT_INCLUDE,
      });
      await tx.assessmentAuditEvent.create({
        data: { assessmentId: Number(id), action: "submitted", actorId: Number(actorId) },
      });
      return updated;
    });
  }

  async finalizeAssessment(id, actorId) {
    const assessment = await this.getAssessmentById(id);
    if (assessment.status !== "submitted") {
      const error = new Error("Only a submitted assessment can be finalized");
      error.statusCode = 409;
      throw error;
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.depotAssessment.update({
        where: { id: Number(id) },
        data: { status: "finalized", finalizedAt: new Date() },
        include: ASSESSMENT_INCLUDE,
      });
      await tx.assessmentAuditEvent.create({
        data: { assessmentId: Number(id), action: "finalized", actorId: Number(actorId) },
      });
      return updated;
    });
  }

  /**
   * Reopen a finalized assessment: supersede it and create a new draft
   * version (with copied items) that replaces it. Who is allowed to do
   * this is an authorization rule, not a schema concern — every reopen is
   * logged on both rows either way.
   */
  async reopenAssessment(id, { reason, actorId }) {
    const assessment = await this.getAssessmentById(id);
    if (assessment.status !== "finalized") {
      const error = new Error("Only a finalized assessment can be reopened");
      error.statusCode = 409;
      throw error;
    }
    if (!reason?.trim()) {
      const error = new Error("reopenReason is required to reopen an assessment");
      error.statusCode = 422;
      throw error;
    }

    return prisma.$transaction(async (tx) => {
      await tx.depotAssessment.update({
        where: { id: Number(id) },
        data: { isSuperseded: true },
      });

      const reopened = await tx.depotAssessment.create({
        data: {
          depotId: assessment.depotId,
          cycleId: assessment.cycleId,
          evaluatorId: Number(actorId),
          assessmentDate: assessment.assessmentDate,
          status: "draft",
          version: assessment.version + 1,
          reopenedFromId: assessment.id,
          reopenReason: reason.trim(),
          items: {
            create: assessment.items.map((item) => ({
              criterionId: item.criterionId,
              score: item.score,
              result: item.result,
              remarks: item.remarks,
            })),
          },
        },
        include: ASSESSMENT_INCLUDE,
      });

      await tx.assessmentAuditEvent.createMany({
        data: [
          {
            assessmentId: assessment.id,
            action: "reopened",
            actorId: Number(actorId),
            note: reason.trim(),
          },
          {
            assessmentId: reopened.id,
            action: "created",
            actorId: Number(actorId),
            note: `Reopened from assessment #${assessment.id}`,
          },
        ],
      });

      return reopened;
    });
  }

  /**
   * Hard-delete an evaluation regardless of status. Items and audit events
   * cascade with it; a reopened-from reference on a newer version is
   * nulled out by the FK (ON DELETE SET NULL), never blocked.
   */
  async deleteAssessment(id) {
    const assessment = await prisma.depotAssessment.findUnique({
      where: { id: Number(id) },
    });
    if (!assessment) {
      const error = new Error("Assessment not found");
      error.statusCode = 404;
      throw error;
    }
    await prisma.depotAssessment.delete({ where: { id: Number(id) } });
    return { id: Number(id) };
  }
}

export const assessmentService = new AssessmentService();
