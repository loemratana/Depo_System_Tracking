import { body, param, query, validationResult } from 'express-validator';


export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({
                field: err.param,
                message: err.msg,
            })),
        });
    }
    next();
}
export const createEmployeeValidator = [
    body('khmerName')
        .notEmpty().withMessage('Khmer name is required')
        .isString().withMessage('Khmer name must be a string')
        .isLength({ max: 100 }).withMessage('Khmer name max 100 characters'),
    body('englishName')
        .optional()
        .isString().withMessage('English name must be a string')
        .isLength({ max: 100 }).withMessage('English name max 100 characters'),
    body('employeeCode')
        .optional()
        .isString().withMessage('Employee code must be a string')
        .isLength({ max: 50 }).withMessage('Employee code max 50 characters'),
    body('dateOfBirth')
        .optional()
        .isISO8601().withMessage('Invalid date format (YYYY-MM-DD)'),
    body('gender')
        .optional()
        .isString().withMessage('Gender must be a string'),
    body('address')
        .optional()
        .isString().withMessage('Address must be a string'),
    body('department')
        .optional()
        .isString().withMessage('Department must be a string')
        .isLength({ max: 100 }).withMessage('Department max 100 characters'),
    body('position')
        .optional()
        .isString().withMessage('Position must be a string')
        .isLength({ max: 100 }).withMessage('Position max 100 characters'),
    body('phone')
        .optional()
        .isString().withMessage('Phone must be a string')
        .isLength({ max: 20 }).withMessage('Phone max 20 characters'),
    body('email')
        .optional()
        .isEmail().withMessage('Invalid email format')
        .isLength({ max: 100 }).withMessage('Email max 100 characters'),
    body('hireDate')
        .optional()
        .isISO8601().withMessage('Invalid hire date format'),
    body('salary')
        .optional()
        .isDecimal({ decimal_digits: '0,2' }).withMessage('Salary must be a valid decimal (max 2 decimals)'),
    body('status')
        .optional()
        .isIn(['active', 'inactive', 'on_leave']).withMessage('Status must be active, inactive, or on_leave'),
    body('depotId')
        .optional()
        .isInt({ min: 1 }).withMessage('Depot ID must be a positive integer'),
    validate,

];

// Update Employee Validator
export const updateEmployeeValidator = [
    param('id')
        .isInt({ min: 1 }).withMessage('Employee ID must be a positive integer'),
    body('khmerName')
        .optional()
        .isString().withMessage('Khmer name must be a string')
        .isLength({ max: 100 }).withMessage('Khmer name max 100 characters'),
    body('englishName')
        .optional()
        .isString().withMessage('English name must be a string')
        .isLength({ max: 100 }).withMessage('English name max 100 characters'),
    body('employeeCode')
        .optional()
        .isString().withMessage('Employee code must be a string')
        .isLength({ max: 50 }).withMessage('Employee code max 50 characters'),
    body('dateOfBirth')
        .optional()
        .isISO8601().withMessage('Invalid date format'),
    body('gender')
        .optional()
        .isString().withMessage('Gender must be a string'),
    body('address')
        .optional()
        .isString(),
    body('department')
        .optional()
        .isString().withMessage('Department must be a string')
        .isLength({ max: 100 }),
    body('position')
        .optional()
        .isString().withMessage('Position must be a string')
        .isLength({ max: 100 }),
    body('phone')
        .optional()
        .isString().withMessage('Phone must be a string')
        .isLength({ max: 20 }),
    body('email')
        .optional()
        .isEmail().withMessage('Invalid email format')
        .isLength({ max: 100 }),
    body('hireDate')
        .optional()
        .isISO8601().withMessage('Invalid hire date format'),
    body('salary')
        .optional()
        .isDecimal({ decimal_digits: '0,2' }),
    body('status')
        .optional()
        .isIn(['active', 'inactive', 'on_leave']),
    body('depotId')
        .optional()
        .isInt({ min: 1 }),
    validate,
];
