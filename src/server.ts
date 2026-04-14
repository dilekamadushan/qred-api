import app from './app';
import { logError, logInfo } from './common/utils/logUtils';
import { initializeDatabase } from './db/sequelize';

const port = process.env.PORT || 3000;

async function startServer() {
  await initializeDatabase();

  app.listen(port, () => {
    logInfo('Server', `Server is running on port ${port}`);
  });
}

startServer().catch((error: unknown) => {
  logError('Server', 'Failed to start server', error);

  process.exit(1);
});
