// validators/provinceValidator.js
import { body, param, query, validationResult } from 'express-validator';

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

// Create province validator
export const createProvinceValidator = [
    body('code')
        .notEmpty()
        .withMessage('Province code is required')
        .isString()
        .withMessage('Code must be a string')
        .isLength({ min: 2, max: 10 })
        .withMessage('Code must be between 2 and 10 characters')
        .matches(/^[A-Z0-9]+$/)
        .withMessage('Code must contain only uppercase letters and numbers'),

    body('name')
        .notEmpty()
        .withMessage('Province name is required')
        .isString()
        .withMessage('Name must be a string')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),



    validate
];

// Update province validator
export const updateProvinceValidator = [
    param('id')
        .notEmpty()
        .withMessage('Province ID is required')
        .isString()
        .withMessage('Invalid province ID'),

    body('code')
        .optional()
        .isString()
        .withMessage('Code must be a string')
        .isLength({ min: 2, max: 10 })
        .withMessage('Code must be between 2 and 10 characters')
        .matches(/^[A-Z0-9]+$/)
        .withMessage('Code must contain only uppercase letters and numbers'),

    body('name')
        .optional()
        .isString()
        .withMessage('Name must be a string')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),

    body('nameEn')
        .optional()
        .isString()
        .withMessage('English name must be a string'),

    body('region')
        .optional()
        .isIn(['North', 'South', 'East', 'West', 'Central'])
        .withMessage('Invalid region'),

    body('capital')
        .optional()
        .isString()
        .withMessage('Capital must be a string'),

    body('area')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Area must be a positive number'),

    body('population')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Population must be a positive integer'),

    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean'),

    validate
];

// Province ID validator
export const provinceIdValidator = [
    param('id')
        .notEmpty()
        .withMessage('Province ID is required')
        .isString()
        .withMessage('Invalid province ID'),
    validate
];

// Get provinces query validator
export const getProvincesValidator = [
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
        .trim()
        .isLength({ max: 100 })
        .withMessage('Search term too long'),



    query('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean')
        .toBoolean(),

    query('sortBy')
        .optional()
        .isIn(['code', 'name', 'population', 'area', 'createdAt'])
        .withMessage('Invalid sort field'),

    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc'),

    validate
];

// District validators
export const createDistrictValidator = [
    body('code')
        .notEmpty()
        .withMessage('District code is required')
        .isString()
        .withMessage('Code must be a string')
        .isLength({ min: 2, max: 10 })
        .withMessage('Code must be between 2 and 10 characters'),

    body('name')
        .notEmpty()
        .withMessage('District name is required')
        .isString()
        .withMessage('Name must be a string')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),

    body('provinceId')
        .notEmpty()
        .withMessage('Province ID is required')
        .isString()
        .withMessage('Invalid province ID'),

    validate
];

export const districtIdValidator = [
    param('districtId')
        .notEmpty()
        .withMessage('District ID is required')
        .isString()
        .withMessage('Invalid district ID'),
    validate
];

// Ward validators
export const createWardValidator = [
    body('code')
        .notEmpty()
        .withMessage('Ward code is required')
        .isString()
        .withMessage('Code must be a string'),

    body('name')
        .notEmpty()
        .withMessage('Ward name is required')
        .isString()
        .withMessage('Name must be a string'),

    body('districtId')
        .notEmpty()
        .withMessage('District ID is required')
        .isString()
        .withMessage('Invalid district ID'),

    validate
];