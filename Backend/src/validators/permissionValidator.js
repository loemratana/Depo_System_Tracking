import { body, param, validationResult } from 'express-validator';
import { USER_ROLES } from '../services/userService.js';

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

export const createPermissionValidator = [
  body('code')
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('code must be 2–100 characters'),
  body('description').optional().isString().trim(),
  validate,
];

export const roleParamValidator = [
  param('role')
    .isIn(USER_ROLES)
    .withMessage(`role must be one of: ${USER_ROLES.join(', ')}`),
  validate,
];

export const setRolePermissionsValidator = [
  param('role')
    .isIn(USER_ROLES)
    .withMessage(`role must be one of: ${USER_ROLES.join(', ')}`),
  body('permissionIds')
    .isArray()
    .withMessage('permissionIds must be an array of integers'),
  body('permissionIds.*').isInt({ min: 1 }).toInt(),
  validate,
];
