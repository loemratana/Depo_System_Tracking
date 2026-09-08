/**
 * Seed the 10 fixed Depot Assessment criteria — taken verbatim (Khmer +
 * English + category + structural flag) from the approved design prototype
 * (Depot Assessment Design canvas, NewAssessment/AssessmentDetail artboards).
 * Safe to call multiple times (upsert by code).
 *
 * Criteria 9 & 10 (Depot Optimism / Above-Depot Optimism) are flagged
 * `needsClarification` — their exact distinction is still pending sign-off
 * from the paper-form owner (see the assessment ERD's "still open" list).
 */
export const DEFAULT_ASSESSMENT_CRITERIA = [
  {
    code: "CAPITAL",
    labelKm: "ចំនួនដើមទុន",
    labelEn: "Capital",
    category: "objective",
    isStructural: true,
    isComparable: true,
    sortOrder: 1,
  },
  {
    code: "VISIT",
    labelKm: "ពេលវេលាចុះមើលកូនចៅ",
    labelEn: "Time Visiting / Overseeing Staff",
    category: "behavioral",
    isStructural: false,
    isComparable: true,
    sortOrder: 2,
  },
  {
    code: "VEHICLES",
    labelKm: "ចំនួនឡាន",
    labelEn: "Vehicles",
    category: "objective",
    isStructural: true,
    isComparable: true,
    sortOrder: 3,
  },
  {
    code: "WAREHOUSE",
    labelKm: "ភាពគ្រប់គ្រាន់នៃឃ្លាំង",
    labelEn: "Warehouse Sufficiency",
    category: "objective",
    isStructural: true,
    isComparable: true,
    sortOrder: 4,
  },
  {
    code: "EMPLOYEES",
    labelKm: "ចំនួនបុគ្គលិក",
    labelEn: "Employee Count",
    category: "objective",
    isStructural: false,
    isComparable: true,
    sortOrder: 5,
  },
  {
    code: "ADMIN",
    labelKm: "មាន Admin",
    labelEn: "Has Admin Staff",
    category: "objective",
    isStructural: false,
    isComparable: true,
    sortOrder: 6,
  },
  {
    code: "SKILL",
    labelKm: "ជំនាញកែច្នៃរបស់បុគ្គលិក",
    labelEn: "Staff Processing Skill",
    category: "subjective",
    isStructural: false,
    isComparable: true,
    sortOrder: 7,
  },
  {
    code: "LEADERSHIP",
    labelKm: "ភាពជាអ្នកឈ្នះរបស់មេឃ្លាំង",
    labelEn: "Warehouse Head Leadership",
    category: "subjective",
    isStructural: false,
    isComparable: true,
    sortOrder: 8,
  },
  {
    code: "OPTIMISM",
    labelKm: "សុទិដ្ឋិនិយមដេប៉ូ",
    labelEn: "Depot Optimism",
    category: "subjective",
    isStructural: false,
    isComparable: true,
    needsClarification: true,
    sortOrder: 9,
  },
  {
    code: "ABOVE_OPTIMISM",
    labelKm: "សុទិដ្ឋិនិយមលើសដេប៉ូ",
    labelEn: "Above-Depot Optimism",
    category: "subjective",
    isStructural: false,
    isComparable: true,
    needsClarification: true,
    sortOrder: 10,
  },
];

export async function seedAssessmentCriteria(prisma) {
  const byCode = {};
  for (const def of DEFAULT_ASSESSMENT_CRITERIA) {
    byCode[def.code] = await prisma.assessmentCriterion.upsert({
      where: { code: def.code },
      update: {
        labelKm: def.labelKm,
        labelEn: def.labelEn,
        category: def.category,
        isStructural: def.isStructural,
        isComparable: def.isComparable,
        needsClarification: def.needsClarification || false,
        sortOrder: def.sortOrder,
      },
      create: {
        ...def,
        needsClarification: def.needsClarification || false,
      },
    });
  }
  return { criteria: Object.keys(byCode).length };
}
