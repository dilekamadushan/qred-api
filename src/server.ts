import app from './app';
import { logError, logInfo } from './common/utils/logUtils';
import { initializeDatabase } from './db/sequelize';

const port = process.env.PORT || 3000;

export async function startServer() {
  try {
    await initializeDatabase();

    await new Promise<void>((resolve, reject) => {
      app.listen(port, (error?: unknown) => {
        if (error) return reject(error);

        resolve();
      });
    });

    logInfo('Server', `Server is running on port ${port}`);
  } catch (error) {
    logError('Server', 'Failed to start server', error);
    process.exit(1);
  }
}
