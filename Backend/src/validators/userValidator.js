import { body, param, query, validationResult } from 'express-validator';
import { USER_ROLES, USER_STATUSES } from '../services/userService.js';

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => ({
        field: err.path || err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

export const createUserValidator = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('username')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be 3–50 characters'),
  body().custom((_, { req }) => {
    if (!req.body.email && !req.body.username) {
      throw new Error('email or username is required');
    }
    return true;
  }),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(USER_ROLES)
    .withMessage(`Role must be one of: ${USER_ROLES.join(', ')}`),
  body('status')
    .optional()
    .isIn(USER_STATUSES)
    .withMessage(`Status must be one of: ${USER_STATUSES.join(', ')}`),
  body('employeeId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('employeeId must be a positive integer')
    .toInt(),
  validate,
];

export const updateUserValidator = [
  param('id').isInt({ min: 1 }).withMessage('Valid user id is required').toInt(),
  body('email').optional().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('username').optional().isString().trim().isLength({ min: 3, max: 50 }),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(USER_ROLES)
    .withMessage(`Role must be one of: ${USER_ROLES.join(', ')}`),
  body('status')
    .optional()
    .isIn(USER_STATUSES)
    .withMessage(`Status must be one of: ${USER_STATUSES.join(', ')}`),
  body('employeeId')
    .optional({ nullable: true })
    .custom((value) => value === null || value === '' || Number.isInteger(Number(value)))
    .withMessage('employeeId must be an integer or null'),
  validate,
];

export const listUsersValidator = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('role').optional().isIn(USER_ROLES),
  query('status').optional().isIn(USER_STATUSES),
  query('search').optional().isString().trim(),
  validate,
];
