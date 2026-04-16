import { startServer } from '../src/server';
import app from '../src/app';
import * as LogUtils from '../src/common/utils/logUtils';

jest.mock('../src/db/sequelize', () => ({
  initializeDatabase: jest.fn(),
}));

jest.mock('../src/common/utils/logUtils', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
}));

describe('server.ts', () => {
  describe('startServer', () => {
    let listenSpy: jest.SpyInstance;
    let exitSpy: jest.SpyInstance;

    beforeEach(() => {
      listenSpy = jest.spyOn(app, 'listen');
      exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
      jest.clearAllMocks();
    });

    afterEach(() => {
      listenSpy.mockRestore();
      exitSpy.mockRestore();
      jest.clearAllMocks();
    });

    it('logs success when server starts', async () => {
      listenSpy.mockImplementation((_port: number, cb: (err?: unknown) => void) => {
        cb();
        return app;
      });

      await startServer();

      expect(LogUtils.logInfo).toHaveBeenCalledWith(
        'Server',
        expect.stringContaining('Server is running on port')
      );
      expect(LogUtils.logError).not.toHaveBeenCalled();
    });

    it('logs error and exits if server fails to start', async () => {
      listenSpy.mockImplementation((_port: number, cb: (err?: unknown) => void) => {
        cb(new Error('fail'));
        return app;
      });

      await expect(startServer()).rejects.toThrow('process.exit called');
      expect(LogUtils.logError).toHaveBeenCalledWith(
        'Server',
        'Failed to start server',
        expect.any(Error)
      );
    });
  });
});
