import { prisma } from '../config/db.js';
import bcrypt from 'bcryptjs';
import logger from '../config/logger.js';
import jwtConfig from '../config/jwt.js';

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

function formatProfile(user) {
    const employee = user.employee || null;
    const fullName =
        employee?.englishName ||
        employee?.khmerName ||
        user.username;

    return {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        employeeId: user.employeeId,
        employee,
        // Flattened fields for the profile UI
        fullName,
        email: user.username,
        phone: employee?.phone || '',
        avatar: employee?.images || null,
        department: employee?.department || null,
        position: employee?.position || null,
        joinDate: employee?.hireDate || user.createdAt,
    };
}

class AuthService {
    async register(userData) {
        try {
            const { email, password, role } = userData;

            const existingUser = await prisma.user.findUnique({
                where: { username: email },
            });

            if (existingUser) {
                throw new Error('User already exists');
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const user = await prisma.user.create({
                data: {
                    username: email,
                    passwordHash: hashedPassword,
                    role: role?.toLowerCase() || 'staff',
                    status: 'active',
                },
                include: PROFILE_INCLUDE,
            });

            const userForToken = {
                id: user.id,
                email: user.username,
                role: user.role,
                name: formatProfile(user).fullName,
            };

            const tokens = await jwtConfig.generateTokenPair(userForToken);

            return {
                user: formatProfile(user),
                tokens,
            };
        } catch (error) {
            logger.error('Register service error:', error);
            throw error;
        }
    }

    async login(credentials) {
        try {
            const { email, password } = credentials;

            const user = await prisma.user.findUnique({
                where: { username: email },
                include: PROFILE_INCLUDE,
            });

            if (!user) {
                throw new Error('User not found');
            }

            if (user.status !== 'active') {
                throw new Error('Account is locked or inactive');
            }

            const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
            if (!isPasswordValid) {
                throw new Error('Invalid password');
            }

            const updated = await prisma.user.update({
                where: { id: user.id },
                data: { lastLogin: new Date() },
                include: PROFILE_INCLUDE,
            });

            const profile = formatProfile(updated);
            const userForToken = {
                id: updated.id,
                email: updated.username,
                role: updated.role,
                name: profile.fullName,
            };

            const tokens = await jwtConfig.generateTokenPair(userForToken);

            return {
                user: profile,
                tokens,
            };
        } catch (error) {
            logger.error('Login service error:', error);
            throw error;
        }
    }

    async getProfile(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: PROFILE_INCLUDE,
        });

        if (!user) {
            throw new Error('User not found');
        }

        return formatProfile(user);
    }

    async updateProfile(userId, payload = {}) {
        const {
            fullName,
            name,
            email,
            phone,
            avatar,
            department,
        } = payload;

        const displayName = (fullName ?? name)?.trim();
        const nextEmail = email?.trim().toLowerCase();
        const nextPhone = phone !== undefined ? String(phone).trim() : undefined;
        const nextAvatar = avatar !== undefined ? (avatar || null) : undefined;
        const nextDepartment =
            department !== undefined ? (department?.trim() || null) : undefined;

        const existing = await prisma.user.findUnique({
            where: { id: userId },
            include: PROFILE_INCLUDE,
        });

        if (!existing) {
            throw new Error('User not found');
        }

        if (nextEmail && nextEmail !== existing.username) {
            const taken = await prisma.user.findUnique({
                where: { username: nextEmail },
            });
            if (taken && taken.id !== userId) {
                throw new Error('Email is already in use');
            }
        }

        await prisma.$transaction(async (tx) => {
            if (nextEmail && nextEmail !== existing.username) {
                await tx.user.update({
                    where: { id: userId },
                    data: { username: nextEmail },
                });
            }

            const employeeData = {};
            if (displayName !== undefined) {
                employeeData.englishName = displayName || null;
            }
            if (nextEmail !== undefined) {
                employeeData.email = nextEmail;
            }
            if (nextPhone !== undefined) {
                employeeData.phone = nextPhone || null;
            }
            if (nextAvatar !== undefined) {
                employeeData.images = nextAvatar;
            }
            if (nextDepartment !== undefined) {
                employeeData.department = nextDepartment;
            }

            if (Object.keys(employeeData).length === 0) {
                return;
            }

            if (existing.employeeId) {
                await tx.employee.update({
                    where: { id: existing.employeeId },
                    data: employeeData,
                });
                return;
            }

            const created = await tx.employee.create({
                data: {
                    englishName: displayName || existing.username,
                    email: nextEmail || existing.username,
                    phone: nextPhone || null,
                    images: nextAvatar || null,
                    department: nextDepartment || null,
                    status: 'active',
                },
            });

            await tx.user.update({
                where: { id: userId },
                data: { employeeId: created.id },
            });
        });

        return this.getProfile(userId);
    }

    async changePassword(userId, { currentPassword, newPassword }) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new Error('User not found');
        }

        const valid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!valid) {
            throw new Error('Current password is incorrect');
        }

        if (!newPassword || newPassword.length < 6) {
            throw new Error('New password must be at least 6 characters');
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { passwordHash },
        });

        return { success: true };
    }

    async refreshToken(refreshToken) {
        try {
            const decoded = jwtConfig.verifyRefreshToken(refreshToken);
            const userId = decoded.userId || decoded.id;

            if (!userId) {
                throw new Error('Invalid refresh token');
            }

            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: PROFILE_INCLUDE,
            });

            if (!user || user.status !== 'active') {
                throw new Error('Invalid refresh token');
            }

            const profile = formatProfile(user);
            return jwtConfig.generateTokenPair({
                id: user.id,
                email: user.username,
                role: user.role,
                name: profile.fullName,
            });
        } catch (error) {
            logger.error('Refresh token service error:', error);
            throw new Error('Invalid refresh token');
        }
    }

    async logout(accessToken, refreshToken) {
        try {
            const result = await jwtConfig.logout(accessToken, refreshToken, prisma);
            return result;
        } catch (error) {
            logger.error('Logout service error:', error);
            throw error;
        }
    }
}

export default new AuthService();