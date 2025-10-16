module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests", "<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  moduleNameMapper: {
    "^main$": "<rootDir>/src/main.ts",
    "^AudioRecorder$": "<rootDir>/src/AudioRecorder",
    "^AudioProcessor$": "<rootDir>/src/AudioProcessor",
    "^MarkdownProcessor$": "<rootDir>/src/MarkdownProcessor",
    "^TranscriptionProcessor$": "<rootDir>/src/TranscriptionProcessor",
    "^types$": "<rootDir>/src/types.ts",
    "^settings$": "<rootDir>/src/settings",
    "^utils/(.*)$": "<rootDir>/src/utils/$1",
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/main.ts",
    "!src/view/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testTimeout: 10000,
  globals: {
    "ts-jest": {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },
};
