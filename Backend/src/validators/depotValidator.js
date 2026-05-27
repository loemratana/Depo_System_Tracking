import { body, param, query, validationResult } from "express-validator";


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

// Create Depot Validator


export const createDepotValidator = [


    // body('name')
    //     .notEmpty().withMessage('Depot name is required')
    //     .isString().withMessage('Name must be a string')
    //     .isLength({ max: 100 }).withMessage('Name max 100 characters'),
    body('code')
        .optional()
        .isString().withMessage('Code must be a string')
        .isLength({ max: 50 }).withMessage('Code max 50 characters'),
    body('address')
        .optional()
        .isString().withMessage('Address must be a string'),
    body('phone')
        .optional()
        .isString().withMessage('Phone must be a string')
        .isLength({ max: 20 }).withMessage('Phone max 20 characters'),
    body('status')
        .optional()
        .isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
    validate,

];
// Update Depot Validator
export const updateDepotValidator = [
    param('id')
        .isInt({ min: 1 }).withMessage('Depot ID must be a positive integer'),
    body('districtId')
        .optional()
        .isInt({ min: 1 }).withMessage('District ID must be a positive integer'),
    body('name')
        .optional()
        .isString().withMessage('Name must be a string')
        .isLength({ max: 100 }),
    body('code')
        .optional()
        .isString().withMessage('Code must be a string')
        .isLength({ max: 50 }),
    body('address')
        .optional()
        .isString(),
    body('phone')
        .optional()
        .isString().withMessage('Phone must be a string')
        .isLength({ max: 20 }),
    body('status')
        .optional()
        .isIn(['active', 'inactive']),
    validate,
];

// Depot ID Param Validator
export const depotIdValidator = [
    param('id')
        .isInt({ min: 1 }).withMessage('Depot ID must be a positive integer'),
    validate,
];

// Query / Pagination Validator
export const depotQueryValidator = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer')
        .toInt(),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit between 1 and 100')
        .toInt(),
    query('search')
        .optional()
        .isString().trim(),
    query('status')
        .optional()
        .isIn(['active', 'inactive']),
    query('districtId')
        .optional()
        .isInt({ min: 1 }).toInt(),
    query('sortBy')
        .optional()
        .isIn(['id', 'name', 'code', 'createdAt']),
    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc']),
    validate,
];
