// validators/authValidator.js
import { body, param, query, validationResult } from 'express-validator';

// Validation rules
export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({
                field: err.param,
                message: err.msg
            }))
        });
    }
    next();
};

// Register validator
export const registerValidator = [
    body('email')
        .isEmail()
        .withMessage('Valid email is required')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters')
        .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
        .withMessage('Password must contain at least one letter and one number'),
    body('name')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('role')
        .optional()
        .isIn(['USER', 'ADMIN', 'MODERATOR'])
        .withMessage('Invalid role'),
    validate
];

// Login validator
export const loginValidator = [
    body('email')
        .isEmail()
        .withMessage('Valid email is required')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    validate
];

// Refresh token validator
export const refreshTokenValidator = [
    body('refreshToken')
        .notEmpty()
        .withMessage('Refresh token is required')
        .isString()
        .withMessage('Refresh token must be a string'),
    validate
];

// Change password validator
export const changePasswordValidator = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters')
        .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
        .withMessage('Password must contain at least one letter and one number'),
    validate
];

// Forgot password validator
export const forgotPasswordValidator = [
    body('email')
        .isEmail()
        .withMessage('Valid email is required')
        .normalizeEmail(),
    validate
];

// Reset password validator
export const resetPasswordValidator = [
    body('token')
        .notEmpty()
        .withMessage('Token is required'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters')
        .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
        .withMessage('Password must contain at least one letter and one number'),
    validate
];

// Update profile validator
export const updateProfileValidator = [
    body('fullName')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2 and 100 characters'),
    body('name')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Valid email is required')
        .normalizeEmail(),
    body('phone')
        .optional({ nullable: true, checkFalsy: true })
        .isString()
        .trim()
        .isLength({ max: 20 })
        .withMessage('Phone must be at most 20 characters'),
    body('avatar')
        .optional({ nullable: true, checkFalsy: true })
        .isString()
        .withMessage('Avatar must be a string URL'),
    body('department')
        .optional({ nullable: true, checkFalsy: true })
        .isString()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Department must be at most 100 characters'),
    validate
];

// User ID param validator
export const userIdValidator = [
    param('id')
        .isString()
        .notEmpty()
        .withMessage('User ID is required'),
    validate
];

// Pagination validator
export const paginationValidator = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer')
        .toInt(),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
        .toInt(),
    query('search')
        .optional()
        .isString()
        .trim(),
    validate
];