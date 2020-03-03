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
  runner: 'jest-serial-runner',
};