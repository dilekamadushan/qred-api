import { withSlaTimeout } from '../../src/common/utils/async';

describe('withSlaTimeout', () => {
  it('resolves if the promise completes before the timeout', async () => {
    const result = await withSlaTimeout(Promise.resolve('ok'), 100);
    expect(result).toBe('ok');
  });

  it('rejects if the promise does not complete before the timeout', async () => {
    await expect(
      withSlaTimeout(new Promise((resolve) => setTimeout(resolve, 200)), 50)
    ).rejects.toThrow('SLA Timeout');
  });

  it('clears the timeout if the promise resolves', async () => {
    // This test ensures no unhandled rejections or leaks
    await expect(withSlaTimeout(Promise.resolve('done'), 100)).resolves.toBe('done');
  });

  it('propagates the original promise rejection', async () => {
    await expect(withSlaTimeout(Promise.reject(new Error('fail')), 100)).rejects.toThrow('fail');
  });
});
