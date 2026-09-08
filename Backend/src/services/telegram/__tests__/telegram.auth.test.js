import { jest } from '@jest/globals';

const mockGetTelegramChatContext = jest.fn();

jest.unstable_mockModule('../../telegramChatService.js', () => ({
  default: { getTelegramChatContext: mockGetTelegramChatContext },
}));
jest.unstable_mockModule('../../../config/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const { chatAuthMiddleware } = await import('../telegram.auth.js');

beforeEach(() => {
  jest.clearAllMocks();
});

function makeCommandCtx(chatId) {
  return {
    chat: { id: chatId },
    reply: jest.fn().mockResolvedValue(undefined),
  };
}

function makeCallbackCtx(chatId) {
  return {
    chat: { id: chatId },
    callbackQuery: { data: 'daily_text' },
    answerCbQuery: jest.fn().mockResolvedValue(undefined),
    reply: jest.fn().mockResolvedValue(undefined),
  };
}

describe('chatAuthMiddleware (Case 5: unknown chat is denied, no report data)', () => {
  test('unregistered chat: command is denied, next() is never called, brandId never set', async () => {
    mockGetTelegramChatContext.mockResolvedValue({
      authorized: false,
      brandId: null,
      telegramChat: null,
      reason: 'not_registered',
    });

    const middleware = chatAuthMiddleware();
    const ctx = makeCommandCtx('unknown-chat');
    const next = jest.fn();

    await middleware(ctx, next);

    expect(next).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledTimes(1);
    expect(ctx.state).toBeUndefined();
  });

  test('inactive chat is denied identically to unregistered (no leak of which reason)', async () => {
    mockGetTelegramChatContext.mockResolvedValue({
      authorized: false,
      brandId: 1,
      telegramChat: { brandId: 1, brand: { name: 'Brand A' } },
      reason: 'inactive',
    });

    const middleware = chatAuthMiddleware();
    const ctx = makeCommandCtx('chat-a');
    const next = jest.fn();

    await middleware(ctx, next);

    expect(next).not.toHaveBeenCalled();
    const deniedMessage = ctx.reply.mock.calls[0][0];
    expect(deniedMessage).not.toMatch(/brand a/i);
    expect(deniedMessage).not.toMatch(/inactive/i);
  });

  test('unregistered chat clicking a button is denied via answerCbQuery, not reply', async () => {
    mockGetTelegramChatContext.mockResolvedValue({
      authorized: false,
      brandId: null,
      telegramChat: null,
      reason: 'not_registered',
    });

    const middleware = chatAuthMiddleware();
    const ctx = makeCallbackCtx('unknown-chat');
    const next = jest.fn();

    await middleware(ctx, next);

    expect(next).not.toHaveBeenCalled();
    expect(ctx.answerCbQuery).toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
  });
});

describe('chatAuthMiddleware (authorized path)', () => {
  test('registered active chat resolves brandId onto ctx.state and calls next()', async () => {
    mockGetTelegramChatContext.mockResolvedValue({
      authorized: true,
      brandId: 1,
      telegramChat: { brandId: 1, brand: { name: 'Brand A' } },
      reason: null,
    });

    const middleware = chatAuthMiddleware();
    const ctx = makeCommandCtx('chat-a');
    const next = jest.fn();

    await middleware(ctx, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(ctx.state.brandId).toBe(1);
    expect(ctx.state.brandName).toBe('Brand A');
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  test('never derives brandId from anything other than the resolved chat context', async () => {
    // Even if the ctx carried attacker-supplied text claiming another brand,
    // the middleware must only ever trust getTelegramChatContext's result.
    mockGetTelegramChatContext.mockResolvedValue({
      authorized: true,
      brandId: 1,
      telegramChat: { brandId: 1, brand: { name: 'Brand A' } },
      reason: null,
    });

    const middleware = chatAuthMiddleware();
    const ctx = makeCommandCtx('chat-a');
    ctx.message = { text: '/kpi 42 brandId=999' };
    const next = jest.fn();

    await middleware(ctx, next);

    expect(mockGetTelegramChatContext).toHaveBeenCalledWith('chat-a');
    expect(ctx.state.brandId).toBe(1);
  });
});
