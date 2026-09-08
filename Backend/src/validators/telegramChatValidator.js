import { body, param, query, validationResult } from 'express-validator';

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

export const listTelegramChatsValidator = [
  query('brandId').optional().isInt({ min: 1 }).toInt(),
  query('isActive').optional().isBoolean().toBoolean(),
  validate,
];

export const chatIdParamValidator = [
  param('id').isInt({ min: 1 }).withMessage('Valid telegram chat id is required').toInt(),
  validate,
];

export const createTelegramChatValidator = [
  body('chatId')
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('chatId is required (max 50 chars)'),
  body('brandId').isInt({ min: 1 }).withMessage('brandId is required').toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
  validate,
];

export const updateTelegramChatValidator = [
  param('id').isInt({ min: 1 }).withMessage('Valid telegram chat id is required').toInt(),
  body('chatId').optional().isString().trim().isLength({ min: 1, max: 50 }),
  body('brandId').optional().isInt({ min: 1 }).toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
  validate,
];

export const testSendValidator = [
  body('telegramChatId')
    .isInt({ min: 1 })
    .withMessage('telegramChatId is required')
    .toInt(),
  validate,
];
