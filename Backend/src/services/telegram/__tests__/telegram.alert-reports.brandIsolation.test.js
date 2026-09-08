import { jest } from '@jest/globals';

const mockDepotFindMany = jest.fn().mockResolvedValue([]);
const mockPrisma = {
  depot: { findMany: mockDepotFindMany },
};

jest.unstable_mockModule('../../../config/db.js', () => ({ prisma: mockPrisma }));

// brandMonthlyKpiService is not exercised by the license/vacancy paths under
// test, but telegram.alert-reports.js imports it — stub it so module load
// doesn't try to touch a real Prisma client through a different path.
jest.unstable_mockModule('../../brandMonthlyKpiService.js', () => ({
  brandMonthlyKpiService: {
    getDashboardInsights: jest.fn().mockResolvedValue({}),
    getBrandMonthlyReport: jest.fn().mockResolvedValue({ rows: [] }),
    getDashboardBrand: jest.fn().mockResolvedValue([]),
    getBrandYearlyReport: jest.fn().mockResolvedValue({ rows: [] }),
  },
}));

const { generateLicenseDailyReport, generateVacancyDailyReport, buildReportPackage } =
  await import('../telegram.alert-reports.js');

beforeEach(() => {
  jest.clearAllMocks();
  mockDepotFindMany.mockResolvedValue([]);
});

describe('Case 6: a brand report only ever queries that brand\'s depots', () => {
  test('license report filters depot.findMany by the exact brandId — not an IN/OR list', async () => {
    await generateLicenseDailyReport({ brandId: 7 });

    expect(mockDepotFindMany).toHaveBeenCalledTimes(1);
    const { where } = mockDepotFindMany.mock.calls[0][0];
    expect(where.brandId).toBe(7);
  });

  test('vacancy report filters depot.findMany by the exact brandId', async () => {
    await generateVacancyDailyReport({ brandId: 3 });

    expect(mockDepotFindMany).toHaveBeenCalledTimes(1);
    const { where } = mockDepotFindMany.mock.calls[0][0];
    expect(where.brandId).toBe(3);
  });

  test('a second brand\'s report never touches the first brand\'s id', async () => {
    await generateLicenseDailyReport({ brandId: 1 });
    await generateLicenseDailyReport({ brandId: 2 });

    const brandIdsQueried = mockDepotFindMany.mock.calls.map((call) => call[0].where.brandId);
    expect(brandIdsQueried).toEqual([1, 2]);
  });
});

describe('Case 7: unassigned depots (brandId = null) are never included', () => {
  test('the where clause uses strict equality, which Postgres never matches against NULL', async () => {
    await generateLicenseDailyReport({ brandId: 5 });

    const { where } = mockDepotFindMany.mock.calls[0][0];
    // Must be a plain equality filter (brandId: 5), never something that
    // could also match unassigned depots, e.g. { in: [5, null] } or an OR arm.
    expect(where.brandId).toBe(5);
    expect(typeof where.brandId).toBe('number');
  });

  test('buildReportPackage refuses to run without a brandId rather than silently querying everything', async () => {
    await expect(buildReportPackage('license.daily', {})).rejects.toThrow(/brandId is required/);
    expect(mockDepotFindMany).not.toHaveBeenCalled();
  });

  test('a null/undefined brandId is rejected, never coerced into a wildcard query', async () => {
    await expect(generateLicenseDailyReport({ brandId: null })).rejects.toThrow(/brandId is required/);
    await expect(generateVacancyDailyReport({ brandId: undefined })).rejects.toThrow(/brandId is required/);
  });
});
