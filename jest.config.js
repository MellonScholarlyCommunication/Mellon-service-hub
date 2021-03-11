// jest.config.js
// Sync object
module.exports = {
  preset: "@shelf/jest-mongodb",
  verbose: true,
  testMatch: ["**/tests/**/*.test.ts"],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest"
  }
};
