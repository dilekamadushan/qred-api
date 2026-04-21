import fs from 'fs';
import path from 'path';

import { Sequelize } from 'sequelize';

import { initModels } from './models';
import { seedDatabase } from './seed';

const isTestEnvironment = process.env.NODE_ENV === 'test';
const defaultFileStorage = path.resolve(process.cwd(), '..', 'qred-data', 'qred.sqlite');

export const databaseStorage = isTestEnvironment ? ':memory:' : defaultFileStorage;
export const isInMemoryDatabase = databaseStorage === ':memory:';

if (!isInMemoryDatabase) {
  fs.mkdirSync(path.dirname(databaseStorage), { recursive: true });
}

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: databaseStorage,
  logging: false,
  pool: {
    max: 1,
    min: 0,
    idle: 10000,
    acquire: 30000,
    evict: 1000,
  },
});

initModels(sequelize);

let initialized = false;

export async function initializeDatabase(options?: { force?: boolean; seed?: boolean }) {
  if (initialized && !options?.force) {
    return sequelize;
  }

  await sequelize.sync({ force: options?.force ?? false });
  // seed data by default
  if (options?.seed !== false) {
    await seedDatabase({ force: options?.force ?? false });
  }

  initialized = true;

  return sequelize;
}
