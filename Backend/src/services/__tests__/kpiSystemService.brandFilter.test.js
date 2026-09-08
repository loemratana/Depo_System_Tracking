import { kpiSystemService } from '../kpiSystemService.js';

describe('kpiSystemService.buildValueWhere — brand scoping for kpi_values (dynamic path)', () => {
  test('includes brandId in the where clause when provided', () => {
    const where = kpiSystemService.buildValueWhere({
      brandId: 7,
      definitionIds: [1, 2],
    });
    expect(where.brandId).toBe(7);
  });

  test('omits brandId entirely when not provided (unscoped internal callers keep working)', () => {
    const where = kpiSystemService.buildValueWhere({ definitionIds: [1, 2] });
    expect(where.brandId).toBeUndefined();
  });

  test('brandId filter combines with, not replaces, other filters (depotId, period)', () => {
    const where = kpiSystemService.buildValueWhere({
      brandId: 7,
      depotId: 42,
      fromDate: '2026-01-01',
      toDate: '2026-01-31',
      definitionIds: [1, 2],
    });
    expect(where.brandId).toBe(7);
    expect(where.depotId).toBe(42);
    expect(where.periodMonth).toBeDefined();
  });
});
