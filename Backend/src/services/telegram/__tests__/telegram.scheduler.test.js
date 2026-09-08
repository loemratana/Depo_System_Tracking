import { jest } from '@jest/globals';

const mockListActiveBrandsWithChats = jest.fn();
jest.unstable_mockModule('../../telegramChatService.js', () => ({
  default: { listActiveBrandsWithChats: mockListActiveBrandsWithChats },
}));

const mockSendReportPackageToChat = jest.fn();
jest.unstable_mockModule('../telegram.service.js', () => ({
  telegramService: {
    enabled: true,
    sendReportPackageToChat: mockSendReportPackageToChat,
  },
}));

const mockIsReportEnabled = jest.fn(() => true);
jest.unstable_mockModule('../telegram.settings.js', () => ({
  isReportEnabled: mockIsReportEnabled,
  TELEGRAM_REPORT_CATALOG: [],
}));

const mockBuildReportPackage = jest.fn();
jest.unstable_mockModule('../telegram.alert-reports.js', () => ({
  buildReportPackage: mockBuildReportPackage,
}));

jest.unstable_mockModule('../../../config/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const { runReport } = await import('../telegram.scheduler.js');

function brandEntry(brand, chatIds) {
  return {
    brand,
    chats: chatIds.map((chatId, i) => ({ id: i + 1, chatId, brandId: brand.id, isActive: true })),
  };
}

function packageFor(brandId) {
  return { buffer: Buffer.from(`report-for-brand-${brandId}`), filename: `b${brandId}.xlsx`, caption: `Brand ${brandId}` };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsReportEnabled.mockReturnValue(true);
  mockBuildReportPackage.mockImplementation(async (_reportId, { brandId }) => packageFor(brandId));
  mockSendReportPackageToChat.mockResolvedValue({ sent: true });
});

describe('runReport — brand isolation (Cases 1 & 2)', () => {
  test('Brand A report is built with brandId=A and sent only to Brand A chat', async () => {
    mockListActiveBrandsWithChats.mockResolvedValue([
      brandEntry({ id: 1, name: 'Brand A' }, ['chat-a']),
      brandEntry({ id: 2, name: 'Brand B' }, ['chat-b']),
    ]);

    await runReport('kpi.monthly.brand');

    expect(mockBuildReportPackage).toHaveBeenCalledWith('kpi.monthly.brand', { brandId: 1 });
    expect(mockBuildReportPackage).toHaveBeenCalledWith('kpi.monthly.brand', { brandId: 2 });

    // chat-a only ever receives the package built for brand 1
    const chatACalls = mockSendReportPackageToChat.mock.calls.filter(([chatId]) => chatId === 'chat-a');
    expect(chatACalls).toHaveLength(1);
    expect(chatACalls[0][1].filename).toBe('b1.xlsx');

    // chat-b only ever receives the package built for brand 2
    const chatBCalls = mockSendReportPackageToChat.mock.calls.filter(([chatId]) => chatId === 'chat-b');
    expect(chatBCalls).toHaveLength(1);
    expect(chatBCalls[0][1].filename).toBe('b2.xlsx');
  });
});

describe('runReport — multiple chats per brand (Case 3)', () => {
  test('one brand-scoped package is built once and fanned out to every active chat for that brand', async () => {
    mockListActiveBrandsWithChats.mockResolvedValue([
      brandEntry({ id: 1, name: 'Brand A' }, ['chat-a1', 'chat-a2']),
    ]);

    await runReport('license.daily');

    expect(mockBuildReportPackage).toHaveBeenCalledTimes(1); // built once per brand, not per chat
    expect(mockSendReportPackageToChat).toHaveBeenCalledTimes(2);
    expect(mockSendReportPackageToChat).toHaveBeenCalledWith('chat-a1', expect.objectContaining({ filename: 'b1.xlsx' }));
    expect(mockSendReportPackageToChat).toHaveBeenCalledWith('chat-a2', expect.objectContaining({ filename: 'b1.xlsx' }));
  });
});

describe('runReport — brand with no chat is skipped, never falls back (spec rule 4)', () => {
  test('no active brands means no package is built and nothing is sent', async () => {
    mockListActiveBrandsWithChats.mockResolvedValue([]);

    const summary = await runReport('kpi.monthly.brand');

    expect(mockBuildReportPackage).not.toHaveBeenCalled();
    expect(mockSendReportPackageToChat).not.toHaveBeenCalled();
    expect(summary.skipped).toBe(true);
  });
});

describe('runReport — delivery failure isolation (Case 8)', () => {
  test('one chat failing does not stop delivery to other chats, or other brands', async () => {
    mockListActiveBrandsWithChats.mockResolvedValue([
      brandEntry({ id: 1, name: 'Brand A' }, ['chat-a1', 'chat-a2']),
      brandEntry({ id: 2, name: 'Brand B' }, ['chat-b']),
    ]);

    mockSendReportPackageToChat.mockImplementation(async (chatId) => {
      if (chatId === 'chat-a1') return { sent: false, error: 'Telegram 403: bot kicked' };
      return { sent: true };
    });

    const summary = await runReport('kpi.yearly.brand');

    // every chat was attempted despite the chat-a1 failure
    expect(mockSendReportPackageToChat).toHaveBeenCalledTimes(3);
    expect(mockSendReportPackageToChat).toHaveBeenCalledWith('chat-a2', expect.anything());
    expect(mockSendReportPackageToChat).toHaveBeenCalledWith('chat-b', expect.anything());
    expect(summary.sent).toBe(2);
    expect(summary.failed).toBe(1);
  });

  test('one brand failing to build its report does not stop other brands', async () => {
    mockListActiveBrandsWithChats.mockResolvedValue([
      brandEntry({ id: 1, name: 'Brand A' }, ['chat-a']),
      brandEntry({ id: 2, name: 'Brand B' }, ['chat-b']),
    ]);
    mockBuildReportPackage.mockImplementation(async (_reportId, { brandId }) => {
      if (brandId === 1) throw new Error('DB timeout building Brand A report');
      return packageFor(brandId);
    });

    const summary = await runReport('kpi.monthly.depot');

    expect(mockSendReportPackageToChat).toHaveBeenCalledTimes(1);
    expect(mockSendReportPackageToChat).toHaveBeenCalledWith('chat-b', expect.objectContaining({ filename: 'b2.xlsx' }));
    expect(summary.skippedBrands).toBe(1);
    expect(summary.sent).toBe(1);
  });
});

describe('runReport — respects the enable/disable settings toggle, separate from routing', () => {
  test('disabled report never queries chats or builds a package', async () => {
    mockIsReportEnabled.mockReturnValue(false);

    const summary = await runReport('kpi.weekly.under');

    expect(mockListActiveBrandsWithChats).not.toHaveBeenCalled();
    expect(mockBuildReportPackage).not.toHaveBeenCalled();
    expect(summary.skipped).toBe(true);
  });
});
