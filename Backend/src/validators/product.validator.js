// validators/product.validator.js
import Joi from "joi";

export const createProductSchema = Joi.object({
    name: Joi.string().required().max(100),
    sku: Joi.string().max(50),
    brandId: Joi.number().integer().required(),
    depotId: Joi.number().integer().required(),
    price: Joi.number().positive().required(),
    quantity: Joi.number().integer().min(0).default(0),
    minStock: Joi.number().integer().min(0).default(0),
    description: Joi.string().max(500)
});

export const updateStockSchema = Joi.object({
    quantity: Joi.number().integer().min(0).required(),
    reason: Joi.string().valid('sale', 'restock', 'damage', 'adjustment', 'manual').default('manual'),
    employeeId: Joi.number().integer()
});

export const updatePriceSchema = Joi.object({
    price: Joi.number().positive().required()
});

export const updateMinStockSchema = Joi.object({
    minStock: Joi.number().integer().min(0).required()
});