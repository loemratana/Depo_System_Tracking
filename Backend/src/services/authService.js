import { prisma } from '../config/db.js';
import bcrypt from 'bcryptjs';
import logger from '../config/logger.js';
import jwtConfig from '../config/jwt.js';

class AuthService {
    async register(userData) {
        try {
            const { email, password, name, position, phone, role } = userData;

            // Check if user/employee exists by email
            const existingEmployee = await prisma.employee.findFirst({
                where: { email }
            });

            if (existingEmployee) {
                const existingUser = await prisma.user.findUnique({
                    where: { employeeId: existingEmployee.id }
                });
                if (existingUser) {
                    throw new Error('User already exists');
                }
            }

            // Start transaction to create both employee and user
            const result = await prisma.$transaction(async (tx) => {
                // // 1. Create or get employee
                // let employee = existingEmployee;
                // if (!employee) {
                //     employee = await tx.employee.create({
                //         data: {
                //             name,
                //             email,
                //             position,
                //             phone,
                //             status: 'active'
                //         }
                //     });
                // }

                // 2. Create user account
                const hashedPassword = await bcrypt.hash(password, 10);
                const user = await tx.user.create({
                    data: {
                        // employeeId: employee.id,
                        username: email, // Using email as username
                        passwordHash: hashedPassword,
                        role: (role?.toLowerCase() || 'staff'),
                        status: 'active'
                    },
                    include: {
                        employee: true
                    }
                });

                return user;
            });

            // Prepare user object for token generation
            const userForToken = {
                id: result.id,
                email: result.email,
                role: result.role,
                name: result.employee.name
            };

            // Generate tokens
            const tokens = await jwtConfig.generateTokenPair(userForToken);

            // Remove password from response
            const { passwordHash: _, ...userWithoutPassword } = result;

            return {
                user: userWithoutPassword,
                tokens
            };
        } catch (error) {
            logger.error('Register service error:', error);
            throw error;
        }
    }

    async login(credentials) {
        try {
            const { email, password } = credentials;

            // Find user by username (which is email in our registration)
            const user = await prisma.user.findUnique({
                where: { username: email }
            });

            if (!user) {
                throw new Error('User not found');
            }

            if (user.status !== 'active') {
                throw new Error('Account is locked or inactive');
            }

            // Check password
            const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
            if (!isPasswordValid) {
                throw new Error('Invalid password');
            }

            // Update last login
            await prisma.user.update({
                where: { id: user.id },
                data: { lastLogin: new Date() }
            });

            // Prepare user object for token generation
            const userForToken = {
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.name
            };

            // Generate tokens
            const tokens = await jwtConfig.generateTokenPair(userForToken);
            // const createToken = await prisma.refreshToken.create({
            //     data: {
            //         token: tokens.refreshToken,
            //         userId: user.id,
            //         expiresAt: jwtConfig.getTokenExpiry(tokens.refreshToken)
            //     },
            // });

            // Remove password from response
            const { passwordHash: _, ...userWithoutPassword } = user;

            return {
                user: userWithoutPassword,
                tokens
            };
        } catch (error) {
            logger.error('Login service error:', error);
            throw error;
        }
    }

    async refreshToken(refreshToken) {
        try {
            const newTokens = await jwtConfig.refreshAccessToken(refreshToken, prisma);
            if (!newTokens) {
                throw new Error('Invalid refresh token');
            }
            return newTokens;
        } catch (error) {
            logger.error('Refresh token service error:', error);
            throw error;
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