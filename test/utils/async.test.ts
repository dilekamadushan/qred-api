import * as LogUtils from '../../src/common/utils/logUtils';
import { withSlaTimeout } from '../../src/common/utils/async';

describe('withSlaTimeout', () => {
  describe('core behavior', () => {
    it('resolves if the promise completes before the timeout', async () => {
      const result = await withSlaTimeout(Promise.resolve('ok'), 'operation1', 100);
      expect(result).toBe('ok');
    });

    it('rejects if the promise does not complete before the timeout', async () => {
      await expect(
        withSlaTimeout(new Promise((resolve) => setTimeout(resolve, 200)), 'operation1', 50)
      ).rejects.toThrow('operation1 exceeded SLA timeout of 50ms');
    });

    it('clears the timeout if the promise resolves', async () => {
      await expect(withSlaTimeout(Promise.resolve('done'), 'operation1', 100)).resolves.toBe(
        'done'
      );
    });

    it('propagates the original promise rejection', async () => {
      await expect(
        withSlaTimeout(Promise.reject(new Error('fail')), 'operation1', 100)
      ).rejects.toThrow('fail');
    });
  });

  describe('logging', () => {
    let logWarnSpy: jest.SpyInstance;

    beforeEach(() => {
      jest.useFakeTimers();
      logWarnSpy = jest.spyOn(LogUtils, 'logWarn').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it('logs a warning when an operation gets slow without timing out', async () => {
      const promise = withSlaTimeout(
        new Promise((resolve) => setTimeout(() => resolve('ok'), 90)),
        'card dependency',
        100
      );

      await jest.advanceTimersByTimeAsync(90);

      await expect(promise).resolves.toBe('ok');
      expect(logWarnSpy).toHaveBeenCalledWith(
        'AsyncUtils',
        expect.stringContaining('card dependency'),
        expect.objectContaining({ timeoutMs: 100 })
      );
    });

    it('logs a warning when an operation times out', async () => {
      const promise = withSlaTimeout(
        new Promise((resolve) => setTimeout(resolve, 200)),
        'spend dependency',
        100
      );
      const expectation = expect(promise).rejects.toThrow(
        'spend dependency exceeded SLA timeout of 100ms'
      );

      await jest.advanceTimersByTimeAsync(100);

      await expectation;
      expect(logWarnSpy).toHaveBeenCalledWith(
        'AsyncUtils',
        expect.stringContaining('spend dependency'),
        expect.objectContaining({ timeoutMs: 100 })
      );
    });
  });
});
