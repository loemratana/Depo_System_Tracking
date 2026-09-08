import { jest } from '@jest/globals';

const mockEmployeeKPIFindMany = jest.fn().mockResolvedValue([]);
const mockKpiValueFindMany = jest.fn().mockResolvedValue([]); // forces the legacy fallback path
const mockKpiDefinitionFindMany = jest.fn().mockResolvedValue([
  { id: 1, code: 'PO_COUNT' },
  { id: 2, code: 'PO_TARGET' },
]);
const mockKpiDefinitionCount = jest.fn().mockResolvedValue(2); // catalog already seeded

const mockPrisma = {
  employeeKPI: { findMany: mockEmployeeKPIFindMany },
  kpiValue: { findMany: mockKpiValueFindMany },
  kpiDefinition: { findMany: mockKpiDefinitionFindMany, count: mockKpiDefinitionCount },
};

jest.unstable_mockModule('../../config/db.js', () => ({ prisma: mockPrisma }));

const { kpiSystemService } = await import('../kpiSystemService.js');

beforeEach(() => {
  jest.clearAllMocks();
  mockKpiValueFindMany.mockResolvedValue([]);
  mockKpiDefinitionCount.mockResolvedValue(2);
  mockKpiDefinitionFindMany.mockResolvedValue([
    { id: 1, code: 'PO_COUNT' },
    { id: 2, code: 'PO_TARGET' },
  ]);
  mockEmployeeKPIFindMany.mockResolvedValue([]);
});

describe('getRankingsFromLegacy — EmployeeKPI has no brandId column, must filter via depot relation', () => {
  test('brandId filter is applied through depot: { brandId } — not a direct (nonexistent) column', async () => {
    await kpiSystemService.getRankings({ brandId: 9 });

    expect(mockEmployeeKPIFindMany).toHaveBeenCalledTimes(1);
    const { where } = mockEmployeeKPIFindMany.mock.calls[0][0];
    expect(where.brandId).toBeUndefined(); // EmployeeKPI truly has no such column
    expect(where.depot).toEqual({ brandId: 9 });
  });

  test('no brandId means no depot filter is added (unscoped callers still work)', async () => {
    await kpiSystemService.getRankings({});

    const { where } = mockEmployeeKPIFindMany.mock.calls[0][0];
    expect(where.depot).toBeUndefined();
  });
});
