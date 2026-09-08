import { jest } from '@jest/globals';

const mockPrisma = {
  telegramChat: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  brand: {
    findUnique: jest.fn(),
  },
};

jest.unstable_mockModule('../../config/db.js', () => ({ prisma: mockPrisma }));
jest.unstable_mockModule('../../config/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const { default: telegramChatService } = await import('../telegramChatService.js');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getTelegramChatContext (inbound authorization)', () => {
  test('unknown chat is denied', async () => {
    mockPrisma.telegramChat.findUnique.mockResolvedValue(null);

    const ctx = await telegramChatService.getTelegramChatContext('unknown-chat');

    expect(ctx).toEqual({
      authorized: false,
      brandId: null,
      telegramChat: null,
      reason: 'not_registered',
    });
  });

  test('inactive chat is denied but brandId is still resolvable for logging', async () => {
    mockPrisma.telegramChat.findUnique.mockResolvedValue({
      id: 1,
      chatId: 'chat-a',
      brandId: 1,
      isActive: false,
      brand: { id: 1, name: 'Brand A' },
    });

    const ctx = await telegramChatService.getTelegramChatContext('chat-a');

    expect(ctx.authorized).toBe(false);
    expect(ctx.reason).toBe('inactive');
    expect(ctx.brandId).toBe(1);
  });

  test('active registered chat is authorized and resolves brandId', async () => {
    mockPrisma.telegramChat.findUnique.mockResolvedValue({
      id: 1,
      chatId: 'chat-a',
      brandId: 1,
      isActive: true,
      brand: { id: 1, name: 'Brand A' },
    });

    const ctx = await telegramChatService.getTelegramChatContext('chat-a');

    expect(ctx.authorized).toBe(true);
    expect(ctx.brandId).toBe(1);
    expect(ctx.telegramChat.brand.name).toBe('Brand A');
  });
});

describe('getActiveChatsForBrand / listActiveBrandsWithChats (Case 4: inactive chats excluded)', () => {
  test('getActiveChatsForBrand queries isActive: true only', async () => {
    mockPrisma.telegramChat.findMany.mockResolvedValue([]);

    await telegramChatService.getActiveChatsForBrand(1);

    expect(mockPrisma.telegramChat.findMany).toHaveBeenCalledWith({
      where: { brandId: 1, isActive: true },
    });
  });

  test('listActiveBrandsWithChats groups chats by brand and skips brands with none', async () => {
    mockPrisma.telegramChat.findMany.mockResolvedValue([
      { id: 1, chatId: 'a1', brandId: 1, isActive: true, brand: { id: 1, name: 'Brand A' } },
      { id: 2, chatId: 'a2', brandId: 1, isActive: true, brand: { id: 1, name: 'Brand A' } },
      { id: 3, chatId: 'b1', brandId: 2, isActive: true, brand: { id: 2, name: 'Brand B' } },
    ]);

    const result = await telegramChatService.listActiveBrandsWithChats();

    expect(mockPrisma.telegramChat.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } }),
    );
    expect(result).toHaveLength(2);
    const brandA = result.find((r) => r.brand.id === 1);
    expect(brandA.chats).toHaveLength(2); // Case 3: brand with 2 active chats
    const brandB = result.find((r) => r.brand.id === 2);
    expect(brandB.chats).toHaveLength(1);
  });
});

describe('create (Case 9: admin assigns a chat to a brand)', () => {
  test('registers a chat against an existing brand', async () => {
    mockPrisma.brand.findUnique.mockResolvedValue({ id: 1, name: 'Brand A' });
    mockPrisma.telegramChat.findUnique.mockResolvedValue(null); // no duplicate
    mockPrisma.telegramChat.create.mockResolvedValue({
      id: 10,
      chatId: '-1001',
      brandId: 1,
      isActive: true,
      brand: { id: 1, name: 'Brand A' },
    });

    const chat = await telegramChatService.create({ chatId: '-1001', brandId: 1 });

    expect(mockPrisma.telegramChat.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { chatId: '-1001', brandId: 1, isActive: true } }),
    );
    expect(chat.brandId).toBe(1);
  });

  test('rejects a brand that does not exist', async () => {
    mockPrisma.brand.findUnique.mockResolvedValue(null);

    await expect(
      telegramChatService.create({ chatId: '-1001', brandId: 999 }),
    ).rejects.toThrow('Brand not found');
    expect(mockPrisma.telegramChat.create).not.toHaveBeenCalled();
  });

  test('rejects a chatId that is already registered', async () => {
    mockPrisma.brand.findUnique.mockResolvedValue({ id: 1, name: 'Brand A' });
    mockPrisma.telegramChat.findUnique.mockResolvedValue({ id: 5, chatId: '-1001' });

    await expect(
      telegramChatService.create({ chatId: '-1001', brandId: 1 }),
    ).rejects.toThrow('already registered');
    expect(mockPrisma.telegramChat.create).not.toHaveBeenCalled();
  });
});

describe('update (Case 10: admin re-assigns a chat from Brand A to Brand B)', () => {
  test('moving brandId updates the row so future routing targets the new brand', async () => {
    mockPrisma.telegramChat.findUnique.mockResolvedValue({
      id: 10,
      chatId: '-1001',
      brandId: 1,
      isActive: true,
    });
    mockPrisma.brand.findUnique.mockResolvedValue({ id: 2, name: 'Brand B' });
    mockPrisma.telegramChat.update.mockResolvedValue({
      id: 10,
      chatId: '-1001',
      brandId: 2,
      isActive: true,
      brand: { id: 2, name: 'Brand B' },
    });

    const updated = await telegramChatService.update(10, { brandId: 2 });

    expect(mockPrisma.telegramChat.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { brandId: 2 },
      include: expect.anything(),
    });
    expect(updated.brandId).toBe(2);
  });
});
