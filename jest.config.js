module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000, // timeout in milliseconds
  testMatch: [
    '**/test/**/*.test.ts', // unit tests
    '**/test/**/*.integration.test.ts', // integration tests
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  roots: ['<rootDir>/test'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/test/tsconfig.json' }],
  },
};
