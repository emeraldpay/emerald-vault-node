// Default test config doesn't include tests in src/__integration-tests__
// to run them use
// $ yarn workspace @emeraldpay/emerald-vault-native run jest:all
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
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
  runner: '@jest-runner/electron/main',
  testTimeout: 60000, // one minute, because it's very slow on Github CI
};