import { prisma } from '../config/db.js';
import { USER_ROLES } from './userService.js';

let cache = null;
let cacheAt = 0;
const CACHE_TTL_MS = 60_000;

function invalidateCache() {
  cache = null;
}

async function loadRolePermissionMap() {
  if (cache && Date.now() - cacheAt < CACHE_TTL_MS) {
    return cache;
  }

  const rows = await prisma.rolePermission.findMany({
    include: { permission: true },
  });

  const map = {};
  for (const role of USER_ROLES) map[role] = new Set();
  for (const row of rows) {
    if (!map[row.role]) map[row.role] = new Set();
    map[row.role].add(row.permission.code);
  }

  cache = map;
  cacheAt = Date.now();
  return cache;
}

async function roleHasPermission(role, code) {
  if (role === 'admin') return true;
  const map = await loadRolePermissionMap();
  return map[role]?.has(code) ?? false;
}

async function listPermissions() {
  return prisma.permission.findMany({ orderBy: { code: 'asc' } });
}

async function createPermission({ code, description }) {
  const permission = await prisma.permission.create({
    data: { code, description: description || null },
  });
  invalidateCache();
  return permission;
}

async function deletePermission(id) {
  await prisma.permission.delete({ where: { id } });
  invalidateCache();
}

async function listRolePermissions(role) {
  if (!USER_ROLES.includes(role)) {
    throw new Error(`Role must be one of: ${USER_ROLES.join(', ')}`);
  }
  const rows = await prisma.rolePermission.findMany({
    where: { role },
    include: { permission: true },
    orderBy: { permission: { code: 'asc' } },
  });
  return rows.map((r) => r.permission);
}

async function setRolePermissions(role, permissionIds) {
  if (!USER_ROLES.includes(role)) {
    throw new Error(`Role must be one of: ${USER_ROLES.join(', ')}`);
  }

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { role } }),
    prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ role, permissionId })),
      skipDuplicates: true,
    }),
  ]);

  invalidateCache();
  return listRolePermissions(role);
}

export default {
  roleHasPermission,
  listPermissions,
  createPermission,
  deletePermission,
  listRolePermissions,
  setRolePermissions,
  invalidateCache,
};
