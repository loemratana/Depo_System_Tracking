import bcrypt from 'bcryptjs';
import ExcelJS from 'exceljs';
import { prisma } from '../config/db.js';
import logger from '../config/logger.js';

export const USER_ROLES = ['admin', 'manager', 'staff', 'viewer'];
export const USER_STATUSES = ['active', 'locked'];

const PROFILE_INCLUDE = {
  employee: {
    select: {
      id: true,
      englishName: true,
      khmerName: true,
      email: true,
      phone: true,
      images: true,
      department: true,
      position: true,
      hireDate: true,
      status: true,
    },
  },
};

function formatUser(user) {
  const employee = user.employee || null;
  const fullName =
    employee?.englishName || employee?.khmerName || user.username;

  return {
    id: user.id,
    username: user.username,
    email: user.username,
    role: user.role,
    status: user.status,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    employeeId: user.employeeId,
    employee,
    fullName,
    phone: employee?.phone || '',
  };
}

function normalizeRole(role) {
  if (!role) return 'staff';
  const value = String(role).trim().toLowerCase();
  return USER_ROLES.includes(value) ? value : null;
}

function normalizeStatus(status) {
  if (!status) return 'active';
  const value = String(status).trim().toLowerCase();
  return USER_STATUSES.includes(value) ? value : null;
}

class UserService {
  async listUsers({ page = 1, pageSize = 20, search, role, status } = {}) {
    const take = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const where = {};
    if (role) {
      const r = normalizeRole(role);
      if (r) where.role = r;
    }
    if (status) {
      const s = normalizeStatus(status);
      if (s) where.status = s;
    }
    if (search?.trim()) {
      const q = search.trim();
      where.OR = [
        { username: { contains: q, mode: 'insensitive' } },
        { employee: { englishName: { contains: q, mode: 'insensitive' } } },
        { employee: { khmerName: { contains: q, mode: 'insensitive' } } },
        { employee: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: PROFILE_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    return {
      data: rows.map(formatUser),
      pagination: {
        page: Math.max(Number(page) || 1, 1),
        pageSize: take,
        total,
        totalPages: Math.ceil(total / take) || 1,
      },
    };
  }

  async getById(id) {
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      include: PROFILE_INCLUDE,
    });
    if (!user) throw new Error('User not found');
    return formatUser(user);
  }

  /**
   * Admin creates a user account directly (no self-register / no auto-login tokens).
   */
  async createUser(payload = {}) {
    const username = String(payload.email || payload.username || '')
      .trim()
      .toLowerCase();
    const password = payload.password;
    const role = normalizeRole(payload.role);
    const status = normalizeStatus(payload.status);
    const employeeId =
      payload.employeeId != null && payload.employeeId !== ''
        ? Number(payload.employeeId)
        : null;

    if (!username) throw new Error('Email / username is required');
    if (!password || String(password).length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    if (!role) {
      throw new Error(`Role must be one of: ${USER_ROLES.join(', ')}`);
    }
    if (!status) {
      throw new Error(`Status must be one of: ${USER_STATUSES.join(', ')}`);
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) throw new Error('User already exists');

    if (employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
      });
      if (!employee) throw new Error(`Employee #${employeeId} not found`);

      const linked = await prisma.user.findUnique({ where: { employeeId } });
      if (linked) {
        throw new Error(`Employee #${employeeId} is already linked to a user`);
      }
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role,
        status,
        ...(employeeId ? { employeeId } : {}),
      },
      include: PROFILE_INCLUDE,
    });

    logger.info(`Admin created user ${username} (role=${role})`);
    return formatUser(user);
  }

  async updateUser(id, payload = {}) {
    const userId = Number(id);
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw new Error('User not found');

    const data = {};

    if (payload.email !== undefined || payload.username !== undefined) {
      const username = String(payload.email || payload.username)
        .trim()
        .toLowerCase();
      if (!username) throw new Error('Email / username is required');
      if (username !== existing.username) {
        const taken = await prisma.user.findUnique({ where: { username } });
        if (taken) throw new Error('Email is already in use');
        data.username = username;
      }
    }

    if (payload.role !== undefined) {
      const role = normalizeRole(payload.role);
      if (!role) {
        throw new Error(`Role must be one of: ${USER_ROLES.join(', ')}`);
      }
      data.role = role;
    }

    if (payload.status !== undefined) {
      const status = normalizeStatus(payload.status);
      if (!status) {
        throw new Error(`Status must be one of: ${USER_STATUSES.join(', ')}`);
      }
      data.status = status;
    }

    if (payload.password) {
      if (String(payload.password).length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      data.passwordHash = await bcrypt.hash(String(payload.password), 10);
    }

    if (payload.employeeId !== undefined) {
      if (payload.employeeId === null || payload.employeeId === '') {
        data.employeeId = null;
      } else {
        const employeeId = Number(payload.employeeId);
        const employee = await prisma.employee.findUnique({
          where: { id: employeeId },
        });
        if (!employee) throw new Error(`Employee #${employeeId} not found`);
        const linked = await prisma.user.findUnique({ where: { employeeId } });
        if (linked && linked.id !== userId) {
          throw new Error(`Employee #${employeeId} is already linked to a user`);
        }
        data.employeeId = employeeId;
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      include: PROFILE_INCLUDE,
    });

    return formatUser(user);
  }

  async deleteUser(id, actorId) {
    const userId = Number(id);
    if (userId === Number(actorId)) {
      throw new Error('You cannot delete your own account');
    }

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw new Error('User not found');

    await prisma.user.delete({ where: { id: userId } });
    return { success: true, id: userId };
  }

  async generateTemplate() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Users');

    const lists = workbook.addWorksheet('Lists');
    lists.state = 'veryHidden';
    lists.getCell('A1').value = 'role';
    USER_ROLES.forEach((role, i) => {
      lists.getCell(`A${i + 2}`).value = role;
    });
    lists.getCell('B1').value = 'status';
    USER_STATUSES.forEach((status, i) => {
      lists.getCell(`B${i + 2}`).value = status;
    });

    sheet.columns = [
      { header: 'email *', key: 'email', width: 28 },
      { header: 'password *', key: 'password', width: 18 },
      { header: 'role *', key: 'role', width: 14 },
      { header: 'status', key: 'status', width: 12 },
      { header: 'employeeId', key: 'employeeId', width: 14 },
    ];

    const header = sheet.getRow(1);
    header.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    header.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2F5597' },
    };
    header.alignment = { horizontal: 'center', vertical: 'middle' };
    header.height = 28;

    sheet.addRow({
      email: 'admin@example.com',
      password: 'Pass1234',
      role: 'admin',
      status: 'active',
      employeeId: '',
    });
    sheet.addRow({
      email: 'manager@example.com',
      password: 'Pass1234',
      role: 'manager',
      status: 'active',
      employeeId: '',
    });

    const dropdownRows = 1000;
    sheet.dataValidations.add(`C2:C${dropdownRows}`, {
      type: 'list',
      allowBlank: false,
      formulae: [`Lists!$A$2:$A$${USER_ROLES.length + 1}`],
      showErrorMessage: true,
      errorStyle: 'error',
      errorTitle: 'Invalid role',
      error: `Select: ${USER_ROLES.join(', ')}`,
      showInputMessage: true,
      promptTitle: 'Role',
      prompt: 'Select user role',
    });

    sheet.dataValidations.add(`D2:D${dropdownRows}`, {
      type: 'list',
      allowBlank: true,
      formulae: [`Lists!$B$2:$B$${USER_STATUSES.length + 1}`],
      showErrorMessage: true,
      errorStyle: 'error',
      errorTitle: 'Invalid status',
      error: `Select: ${USER_STATUSES.join(', ')}`,
      showInputMessage: true,
      promptTitle: 'Status',
      prompt: 'Select user status',
    });

    for (let r = 2; r <= 3; r++) {
      sheet.getCell(`C${r}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8F0FE' },
      };
      sheet.getCell(`D${r}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8F0FE' },
      };
    }

    const tip = sheet.addRow({
      email: '⚠️ Required: email, password, role',
      password: 'Min 6 chars',
      role: 'Use dropdown',
      status: 'active | locked (default active)',
      employeeId: 'Optional link to employees.id',
    });
    tip.font = { italic: true, size: 10, color: { argb: 'FF999999' } };

    return workbook.xlsx.writeBuffer();
  }

  async importFromExcel(buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error('Worksheet not found');

    const created = [];
    const errors = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const email = row.getCell(1).value?.toString()?.trim() || '';
      const password = row.getCell(2).value?.toString()?.trim() || '';
      const role = row.getCell(3).value?.toString()?.trim() || '';
      const status = row.getCell(4).value?.toString()?.trim() || 'active';
      const employeeIdRaw = row.getCell(5).value;
      const employeeId =
        employeeIdRaw === null || employeeIdRaw === undefined || employeeIdRaw === ''
          ? null
          : Number(employeeIdRaw);

      // Skip tip / empty rows
      if (!email || email.startsWith('⚠️')) return;

      created.push({
        rowNumber,
        payload: {
          email,
          password,
          role,
          status,
          employeeId: Number.isNaN(employeeId) ? null : employeeId,
        },
      });
    });

    const results = [];
    for (const item of created) {
      try {
        const user = await this.createUser(item.payload);
        results.push({ rowNumber: item.rowNumber, user });
      } catch (err) {
        errors.push({
          rowNumber: item.rowNumber,
          email: item.payload.email,
          message: err.message,
        });
      }
    }

    return {
      imported: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }
}

export const userService = new UserService();
export default userService;
