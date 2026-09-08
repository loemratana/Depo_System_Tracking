import { jest } from '@jest/globals';

const mockQueryRaw = jest.fn();
const mockPrisma = { $queryRaw: mockQueryRaw };

jest.unstable_mockModule('../../../config/db.js', () => ({ prisma: mockPrisma }));
jest.unstable_mockModule('../../../config/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.unstable_mockModule('../../kpiSystemService.js', () => ({
  kpiSystemService: { getSummary: jest.fn() },
}));

const { default: dashboardKpi } = await import('../dashboardKpi.js');

beforeEach(() => {
  jest.clearAllMocks();
});

/** Row shape returned by the mocked $queryRaw for one aggregated month. */
function row(monthIso, totalTarget, totalActual) {
  return { month: monthIso, total_target: totalTarget, total_actual: totalActual };
}

/** Pull the composed WHERE-conditions Sql fragment out of a $queryRaw call. */
function conditionsFragment(callIndex = 0) {
  // prisma.$queryRaw`...${joinClause}...${Prisma.join(conditions, ' AND ')}`
  // -> mock receives (strings, joinClauseFragment, conditionsFragment)
  return mockQueryRaw.mock.calls[callIndex][2];
}

function joinFragment(callIndex = 0) {
  return mockQueryRaw.mock.calls[callIndex][1];
}

describe('getPoPerformanceTrend — business calculation', () => {
  test('normal case: target=100, actual=80 -> achievement=80%, variance=-20', async () => {
    mockQueryRaw.mockResolvedValue([row('2026-03-01T00:00:00.000Z', 100, 80)]);

    const result = await dashboardKpi.getPoPerformanceTrend({
      from: '2026-03',
      to: '2026-03',
    });

    expect(result).toEqual([
      { month: '2026-03', target: 100, actual: 80, achievementPercent: 80, variance: -20 },
    ]);
  });

  test('above target: target=100, actual=120 -> achievement=120%, variance=+20', async () => {
    mockQueryRaw.mockResolvedValue([row('2026-03-01T00:00:00.000Z', 100, 120)]);

    const result = await dashboardKpi.getPoPerformanceTrend({
      from: '2026-03',
      to: '2026-03',
    });

    expect(result[0]).toEqual({
      month: '2026-03',
      target: 100,
      actual: 120,
      achievementPercent: 120,
      variance: 20,
    });
  });

  test('target=0 never divides by zero — achievementPercent is null, variance still computed', async () => {
    mockQueryRaw.mockResolvedValue([row('2026-03-01T00:00:00.000Z', 0, 50)]);

    const result = await dashboardKpi.getPoPerformanceTrend({
      from: '2026-03',
      to: '2026-03',
    });

    expect(result[0]).toEqual({
      month: '2026-03',
      target: 0,
      actual: 50,
      achievementPercent: null,
      variance: 50,
    });
  });

  test('target=0 and actual=0 -> achievementPercent null, variance 0 (not an error)', async () => {
    mockQueryRaw.mockResolvedValue([]);

    const result = await dashboardKpi.getPoPerformanceTrend({
      from: '2026-03',
      to: '2026-03',
    });

    expect(result[0]).toEqual({
      month: '2026-03',
      target: 0,
      actual: 0,
      achievementPercent: null,
      variance: 0,
    });
  });
});

describe('getPoPerformanceTrend — missing months are filled, not omitted', () => {
  test('a month with no rows in the DB still appears in the series as zeros', async () => {
    // Only February has data; January and March have none.
    mockQueryRaw.mockResolvedValue([row('2026-02-01T00:00:00.000Z', 100, 91)]);

    const result = await dashboardKpi.getPoPerformanceTrend({
      from: '2026-01',
      to: '2026-03',
    });

    expect(result.map((r) => r.month)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(result[0]).toEqual({
      month: '2026-01',
      target: 0,
      actual: 0,
      achievementPercent: null,
      variance: 0,
    });
    expect(result[1]).toEqual({
      month: '2026-02',
      target: 100,
      actual: 91,
      achievementPercent: 91,
      variance: -9,
    });
    expect(result[2]).toEqual({
      month: '2026-03',
      target: 0,
      actual: 0,
      achievementPercent: null,
      variance: 0,
    });
  });
});

describe('getPoPerformanceTrend — date boundaries', () => {
  test('from=Jan 31 truncates to January, to=Mar 1 stays March — span is exactly Jan/Feb/Mar', async () => {
    mockQueryRaw.mockResolvedValue([]);

    const result = await dashboardKpi.getPoPerformanceTrend({
      from: '2026-01-31',
      to: '2026-03-01',
    });

    expect(result.map((r) => r.month)).toEqual(['2026-01', '2026-02', '2026-03']);

    const conditions = conditionsFragment();
    // First two interpolated values are the >= from and <= to boundaries.
    expect(conditions.values[0]).toEqual(new Date(Date.UTC(2026, 0, 1)));
    expect(conditions.values[1]).toEqual(new Date(Date.UTC(2026, 2, 1)));
  });

  test('Feb 28 (non-leap year) stays in February, not bumped to March', async () => {
    mockQueryRaw.mockResolvedValue([]);

    const result = await dashboardKpi.getPoPerformanceTrend({
      from: '2026-02-28',
      to: '2026-02-28',
    });

    expect(result).toHaveLength(1);
    expect(result[0].month).toBe('2026-02');
  });

  test('Feb 1 stays in February, not pulled back into January', async () => {
    mockQueryRaw.mockResolvedValue([]);

    const result = await dashboardKpi.getPoPerformanceTrend({
      from: '2026-02-01',
      to: '2026-02-01',
    });

    expect(result).toHaveLength(1);
    expect(result[0].month).toBe('2026-02');
  });
});

describe('getPoPerformanceTrend — filter isolation (brand/depot/owner never bleed together)', () => {
  test('brandId filter is passed through to the query and no depot join is added', async () => {
    mockQueryRaw.mockResolvedValue([]);
    await dashboardKpi.getPoPerformanceTrend({ from: '2026-03', to: '2026-03', brandId: 7 });

    expect(conditionsFragment().values).toEqual([
      new Date(Date.UTC(2026, 2, 1)),
      new Date(Date.UTC(2026, 2, 1)),
      7,
    ]);
    // No owner/province filter -> no need to join depots at all.
    expect(joinFragment().strings[0]).toBe('');
  });

  test('depotId filter is passed through and still needs no depot join (depot_id lives on the fact table)', async () => {
    mockQueryRaw.mockResolvedValue([]);
    await dashboardKpi.getPoPerformanceTrend({ from: '2026-03', to: '2026-03', depotId: 42 });

    expect(conditionsFragment().values).toContain(42);
    expect(joinFragment().strings[0]).toBe('');
  });

  test('ownerId filter joins depots and filters by employee_id — two different owners never share a query', async () => {
    mockQueryRaw.mockResolvedValue([]);
    await dashboardKpi.getPoPerformanceTrend({ from: '2026-03', to: '2026-03', ownerId: 5 });
    expect(conditionsFragment(0).values).toContain(5);
    expect(joinFragment(0).strings[0]).toContain('INNER JOIN depots');

    mockQueryRaw.mockClear();
    mockQueryRaw.mockResolvedValue([]);
    await dashboardKpi.getPoPerformanceTrend({ from: '2026-03', to: '2026-03', ownerId: 9 });
    expect(conditionsFragment(0).values).toContain(9);
    expect(conditionsFragment(0).values).not.toContain(5);
  });

  test('brandId + depotId together narrow the same query rather than being combined incorrectly', async () => {
    mockQueryRaw.mockResolvedValue([]);
    await dashboardKpi.getPoPerformanceTrend({
      from: '2026-03',
      to: '2026-03',
      brandId: 3,
      depotId: 11,
    });

    expect(conditionsFragment().values).toEqual([
      new Date(Date.UTC(2026, 2, 1)),
      new Date(Date.UTC(2026, 2, 1)),
      3,
      11,
    ]);
  });
});

describe('getPoPerformanceTrend — input validation', () => {
  test('rejects an invalid `from` format', async () => {
    await expect(
      dashboardKpi.getPoPerformanceTrend({ from: 'not-a-date', to: '2026-03' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects from > to', async () => {
    await expect(
      dashboardKpi.getPoPerformanceTrend({ from: '2026-05', to: '2026-01' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects a non-numeric brandId', async () => {
    await expect(
      dashboardKpi.getPoPerformanceTrend({ brandId: 'abc' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects a zero/negative ownerId', async () => {
    await expect(
      dashboardKpi.getPoPerformanceTrend({ ownerId: 0 }),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      dashboardKpi.getPoPerformanceTrend({ ownerId: -3 }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects a range spanning more than 36 months', async () => {
    await expect(
      dashboardKpi.getPoPerformanceTrend({ from: '2020-01', to: '2026-03' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('getPoPerformanceTrend — defaults', () => {
  test('with no from/to, defaults to a trailing 6-month window ending this month', async () => {
    mockQueryRaw.mockResolvedValue([]);
    const result = await dashboardKpi.getPoPerformanceTrend({});
    expect(result).toHaveLength(6);
  });
});
