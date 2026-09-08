/**
 * Seed default permission catalog + role assignments.
 * Safe to call multiple times (upsert by code).
 *
 * `admin` is intentionally not listed under DEFAULT_ROLE_PERMISSIONS —
 * permissionService.roleHasPermission() always allows admin.
 */
export const DEFAULT_PERMISSIONS = [
  { code: 'depot:read', description: 'View depots' },
  { code: 'depot:write', description: 'Create/update/delete depots, import via Excel' },
  { code: 'employee:read', description: 'View employees' },
  { code: 'employee:write', description: 'Create/update/delete employees, import via Excel' },
  { code: 'manager:read', description: 'View depot managers' },
  { code: 'manager:write', description: 'Create/update/delete depot managers' },
  { code: 'staff:read', description: 'View depot staff' },
  { code: 'staff:write', description: 'Create/update/delete depot staff' },
  { code: 'province:read', description: 'View provinces' },
  { code: 'province:write', description: 'Create/update/delete provinces, import via Excel' },
  { code: 'district:read', description: 'View districts' },
  { code: 'district:write', description: 'Create/update/delete districts, import via Excel' },
  { code: 'brand:read', description: 'View brands' },
  { code: 'brand:write', description: 'Create/update/delete brands' },
  { code: 'kpi:read', description: 'View KPI data, definitions, and rankings' },
  { code: 'kpi:write', description: 'Enter, edit, or set KPI values and targets' },
  { code: 'kpi:import', description: 'Bulk import KPI values and targets via Excel' },
  { code: 'report:read', description: 'View/generate dashboard reports' },
  { code: 'report:export', description: 'Export/download depot and KPI reports (Excel/PDF)' },
  { code: 'telegram:read', description: 'View Telegram bot settings and brand chat routing' },
  { code: 'telegram:manage', description: 'Manage Telegram bot settings, chat routing, and test sends' },
  { code: 'user:read', description: 'View user accounts' },
  { code: 'user:manage', description: 'Manage user accounts and permissions' },
  { code: 'assessment:read', description: 'View depot assessments, cycles, and criteria' },
  { code: 'assessment:write', description: 'Create depot assessments and score/submit them' },
  { code: 'assessment:manage', description: 'Finalize, reopen depot assessments, and manage cycles' },
];

export const DEFAULT_ROLE_PERMISSIONS = {
  manager: [
    'depot:read',
    'depot:write',
    'employee:read',
    'employee:write',
    'manager:read',
    'manager:write',
    'staff:read',
    'staff:write',
    'province:read',
    'district:read',
    'brand:read',
    'kpi:read',
    'kpi:write',
    'kpi:import',
    'report:read',
    'report:export',
    'assessment:read',
    'assessment:write',
    'assessment:manage',
  ],
  staff: [
    'depot:read',
    'employee:read',
    'manager:read',
    'staff:read',
    'province:read',
    'district:read',
    'brand:read',
    'kpi:read',
    'kpi:write',
    'report:read',
    'report:export',
    'assessment:read',
    'assessment:write',
  ],
  viewer: [
    'depot:read',
    'employee:read',
    'manager:read',
    'staff:read',
    'province:read',
    'district:read',
    'brand:read',
    'kpi:read',
    'report:read',
    'assessment:read',
  ],
};

export async function seedPermissionCatalog(prisma) {
  const byCode = {};
  for (const def of DEFAULT_PERMISSIONS) {
    byCode[def.code] = await prisma.permission.upsert({
      where: { code: def.code },
      update: { description: def.description },
      create: def,
    });
  }

  for (const [role, codes] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    for (const code of codes) {
      const permission = byCode[code];
      if (!permission) continue;
      await prisma.rolePermission.upsert({
        where: { role_permissionId: { role, permissionId: permission.id } },
        update: {},
        create: { role, permissionId: permission.id },
      });
    }
  }

  return { permissions: Object.keys(byCode).length };
}
