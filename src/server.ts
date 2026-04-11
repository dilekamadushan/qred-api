import app from './app';
import { initializeDatabase } from './db/sequelize';

const port = process.env.PORT || 3000;

async function startServer() {
  await initializeDatabase();

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

void startServer().catch((error: unknown) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
