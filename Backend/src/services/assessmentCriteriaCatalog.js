/**
 * Seed the 10 fixed Depot Assessment criteria — Khmer label, category, and
 * structural flag — from the approved design prototype (Depot Assessment
 * Design canvas, NewAssessment/AssessmentDetail artboards).
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
    category: "objective",
    isStructural: true,
    isComparable: true,
    sortOrder: 1,
  },
  {
    code: "VISIT",
    labelKm: "ពេលវេលាចុះមើលកូនចៅឬអត់",
    category: "behavioral",
    isStructural: false,
    isComparable: true,
    sortOrder: 2,
  },
  {
    code: "VEHICLES",
    labelKm: "ចំនួនឡាន",
    category: "objective",
    isStructural: true,
    isComparable: true,
    sortOrder: 3,
  },
  {
    code: "WAREHOUSE",
    labelKm: "មានឃ្លាំងគ្រប់គ្រាន់ឬអត់?",
    category: "objective",
    isStructural: true,
    isComparable: true,
    sortOrder: 4,
  },
  {
    code: "EMPLOYEES",
    labelKm: "ចំនួនបុគ្គលិក",
    category: "objective",
    isStructural: false,
    isComparable: true,
    sortOrder: 5,
  },
  {
    code: "ADMIN",
    labelKm: "មាន Admin​​​ ឬអត់?",
    category: "objective",
    isStructural: false,
    isComparable: true,
    sortOrder: 6,
  },
  {
    code: "SKILL",
    labelKm: "ជំនាញពូកែរបស់បុគ្គលិក",
    category: "subjective",
    isStructural: false,
    isComparable: true,
    sortOrder: 7,
  },
  {
    code: "LEADERSHIP",
    labelKm: "មេពូកែឬអត់​ មានភាពជាអ្នកឈ្នះឬអត់?",
    category: "subjective",
    isStructural: false,
    isComparable: true,
    sortOrder: 8,
  },
  {
    code: "OPTIMISM",
    labelKm: "សុច្ចរិតភាពដេប៉ូ",
    category: "subjective",
    isStructural: false,
    isComparable: true,
    needsClarification: true,
    sortOrder: 9,
  },
  {
    code: "ABOVE_OPTIMISM",
    labelKm: "សុច្ចរិតភាពស៊ែលដេប៉ូ",
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
