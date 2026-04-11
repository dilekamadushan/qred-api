import fs from 'fs';
import path from 'path';

import { Sequelize } from 'sequelize';

import { initModels } from './models';
import { seedDatabase } from './seed';

const isTestEnvironment = process.env.NODE_ENV === 'test';
const configuredStorage = process.env.DB_STORAGE;
const defaultFileStorage = path.resolve(process.cwd(), '..', 'qred-data', 'qred.sqlite');

export const databaseStorage =
  configuredStorage ?? (isTestEnvironment ? ':memory:' : defaultFileStorage);
export const isInMemoryDatabase = databaseStorage === ':memory:';

if (!isInMemoryDatabase) {
  fs.mkdirSync(path.dirname(databaseStorage), { recursive: true });
}

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: databaseStorage,
  logging: false,
});

initModels(sequelize);

let initialized = false;

export async function initializeDatabase(options?: { force?: boolean; seed?: boolean }) {
  if (initialized && !options?.force) {
    return sequelize;
  }

  await sequelize.sync({ force: options?.force ?? false });

  if (options?.seed !== false) {
    await seedDatabase({ force: options?.force ?? false });
  }

  initialized = true;

  return sequelize;
}

export default sequelize;
