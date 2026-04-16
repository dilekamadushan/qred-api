import * as LogUtils from '../../../src/common/utils/logUtils';
import * as Context from '../../../src/common/requestContext';

describe('logUtils', () => {
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    jest.clearAllMocks();

    process.env.NODE_ENV = '';
  });

  describe('logInfo', () => {
    it('logInfo does not log in test mode', () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';
      LogUtils.logInfo('TestContext', 'Should not log');
      expect(infoSpy).not.toHaveBeenCalled();
      process.env.NODE_ENV = origEnv;
    });

    it('logInfo logs with context and requestId if present', () => {
      jest.spyOn(Context, 'getRequestContext').mockReturnValue({ requestId: 'req-123' });
      LogUtils.logInfo('TestContext', 'Test message', { foo: 'bar' });
      expect(infoSpy).toHaveBeenCalledWith(
        '[INFO] [TestContext] requestId=req-123',
        'Test message',
        { foo: 'bar' }
      );
    });
  });

  describe('logWarn', () => {
    it('logWarn does not log in test mode', () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';
      LogUtils.logWarn('WarnContext', 'Should not log');
      expect(warnSpy).not.toHaveBeenCalled();
      process.env.NODE_ENV = origEnv;
    });
    it('logWarn logs with context and requestId if present', () => {
      jest.spyOn(Context, 'getRequestContext').mockReturnValue({ requestId: 'req-456' });
      LogUtils.logWarn('WarnContext', 'Warn message');
      expect(warnSpy).toHaveBeenCalledWith(
        '[WARN] [WarnContext] requestId=req-456',
        'Warn message'
      );
    });
  });

  describe('logError', () => {
    it('logError logs with context and requestId if present', () => {
      jest.spyOn(Context, 'getRequestContext').mockReturnValue({ requestId: 'req-789' });
      LogUtils.logError('ErrorContext', 'Error message', new Error('fail'));
      expect(errorSpy).toHaveBeenCalledWith(
        '[ERROR] [ErrorContext] requestId=req-789',
        'Error message',
        expect.any(Error)
      );
    });
  });
});
