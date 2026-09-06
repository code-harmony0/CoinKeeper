const mockGetSmsMessages = jest.fn();
const mockRequest = jest.fn();

// The `import` below is hoisted above the const declarations, so the factory must
// defer to the mocks at call time rather than capture them at module-eval time.
jest.mock('react-native', () => ({
  NativeModules: {
    SmsModule: { getSmsMessages: (...args: unknown[]) => mockGetSmsMessages(...args) },
  },
  PermissionsAndroid: {
    request: (...args: unknown[]) => mockRequest(...args),
    PERMISSIONS: { READ_SMS: 'android.permission.READ_SMS' },
    RESULTS: { GRANTED: 'granted', DENIED: 'denied', NEVER_ASK_AGAIN: 'never_ask_again' },
  },
}));

import { fetchRecentSms } from '../../src/services/smsParserService';

describe('fetchRecentSms permission gate', () => {
  beforeEach(() => {
    mockGetSmsMessages.mockReset();
    mockRequest.mockReset();
    mockGetSmsMessages.mockResolvedValue([]);
  });

  it('requests READ_SMS before touching the inbox', async () => {
    mockRequest.mockResolvedValue('granted');

    await fetchRecentSms(10);

    expect(mockRequest).toHaveBeenCalledWith(
      'android.permission.READ_SMS',
      expect.any(Object),
    );
  });

  it('does not read the inbox when permission is denied', async () => {
    mockRequest.mockResolvedValue('denied');

    await expect(fetchRecentSms(10)).rejects.toThrow(/permission/i);
    expect(mockGetSmsMessages).not.toHaveBeenCalled();
  });

  it('reads the inbox once permission is granted', async () => {
    mockRequest.mockResolvedValue('granted');
    mockGetSmsMessages.mockResolvedValue([
      { id: '1', address: 'HDFCBK', date: '0', body: 'x', type: '1' },
    ]);

    const messages = await fetchRecentSms(10);

    expect(mockGetSmsMessages).toHaveBeenCalledWith(10);
    expect(messages).toHaveLength(1);
  });
});
