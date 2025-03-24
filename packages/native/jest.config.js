// Default test config doesn't include tests in src/__integration-tests__
// to run them use
// $ yarn workspace @emeraldpay/emerald-vault-native run jest:all
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testEnvironmentOptions: {},
  testPathIgnorePatterns: [
    "<rootDir>/lib/",
    "<rootDir>/node_modules/",
    "__tests__/_commons",
    "__integration-tests__"
  ],
  coverageDirectory: "./coverage/",
  collectCoverageFrom: [
    "src/**/*.ts"
  ],
  globals: {
    // needed for @ethereumjs/tx crypto, see https://github.com/jestjs/jest/issues/4422
    Uint8Array: Uint8Array,
  },
  runner: 'jest-serial-runner',
  testTimeout: 60000, // one minute, because it's very slow on Github CI
};