# Tests

This directory contains unit tests and integration tests for the Obsidian Vox plugin, specifically for the whisper.cpp integration.

## Test Structure

```
tests/
├── unit/                          # Unit tests
│   ├── types.test.ts             # Type definitions tests
│   ├── settings.test.ts          # Settings tests
│   └── segment-handling.test.ts  # Segment format handling tests
├── integration/                   # Integration tests
│   ├── api-endpoint.test.ts      # API endpoint tests with mock server
│   └── user-workflow.test.ts     # End-to-end user workflow tests
└── setup.ts                      # Jest setup file
```

## Running Tests

### Run All Tests
```bash
pnpm test
```

### Run Unit Tests Only
```bash
pnpm test:unit
```

### Run Integration Tests Only
```bash
pnpm test:integration
```

### Run Tests in Watch Mode
```bash
pnpm test:watch
```

### Run Tests with Coverage
```bash
pnpm test:coverage
```

## Test Categories

### Unit Tests

Unit tests validate individual components in isolation:

- **Type Definitions** (`types.test.ts`): Validates TypeScript type definitions for whisper.cpp response format
- **Settings** (`settings.test.ts`): Tests default settings and configuration options
- **Segment Handling** (`segment-handling.test.ts`): Tests the conversion between array and object segment formats

### Integration Tests

Integration tests validate complete workflows using the mock server:

- **API Endpoint** (`api-endpoint.test.ts`): Tests the `/inference` endpoint with various parameters and validates response structure
- **User Workflows** (`user-workflow.test.ts`): Simulates real user workflows including:
  - Self-hosted transcription workflow
  - Multiple file processing
  - Markdown generation from segments
  - Word-level timestamp extraction
  - Language detection
  - Error handling

## Mock Server

The integration tests use the mock whisper.cpp server located at `project/mock-whisper-server.js`. This server:

- Simulates the whisper.cpp `/inference` endpoint
- Returns realistic mock transcription data
- Supports all whisper.cpp parameters
- Provides word-level timestamps
- No actual transcription required

The mock server is automatically started before integration tests and stopped after they complete.

## Writing New Tests

### Unit Test Example

```typescript
import { TranscriptionSegment } from "../../src/types";

describe("MyFeature", () => {
  it("should do something", () => {
    const segment: TranscriptionSegment = {
      id: 0,
      start: 0.0,
      end: 1.0,
      text: "test",
      tokens: [],
      temperature: 0,
      avg_logprob: 0,
      no_speech_prob: 0,
    };

    expect(segment.text).toBe("test");
  });
});
```

### Integration Test Example

```typescript
import axios from "axios";

describe("My Integration Test", () => {
  it("should call the API", async () => {
    const FormData = require("form-data");
    const formData = new FormData();
    formData.append("file", Buffer.from("test data"), {
      filename: "test.mp3",
    });
    formData.append("temperature", "0.0");
    formData.append("temperature_inc", "0.2");
    formData.append("response_format", "json");

    const response = await axios.post(
      "http://127.0.0.1:8085/inference",
      formData,
      {
        headers: formData.getHeaders(),
      }
    );

    expect(response.status).toBe(200);
  });
});
```

## Test Coverage

The tests cover:

- ✅ Type definitions for whisper.cpp format
- ✅ Settings defaults and validation
- ✅ Segment format conversion (array ↔ object)
- ✅ API endpoint with various parameters
- ✅ Response structure validation
- ✅ Word-level timestamp handling
- ✅ Language detection
- ✅ Self-hosted workflow (no API keys)
- ✅ Multiple file processing
- ✅ Markdown generation
- ✅ Error handling
- ✅ Backward compatibility

## Continuous Integration

These tests are designed to run in CI/CD pipelines. The mock server requires only Node.js and no external dependencies, making it perfect for automated testing.

## Troubleshooting

### Tests Fail to Start

If tests fail to start, ensure:
1. Dependencies are installed: `pnpm install`
2. Mock server port is available (8084, 8085)
3. TypeScript is properly configured

### Mock Server Issues

If the mock server doesn't start:
1. Check that `project/mock-whisper-server.js` exists
2. Verify Node.js is installed
3. Try increasing the startup delay in test setup

### Port Conflicts

If you get "address already in use" errors:
1. Change the port numbers in the test files
2. Kill any processes using the test ports
3. Use different ports for parallel test runs

## Contributing

When adding new features:
1. Write unit tests for isolated components
2. Write integration tests for workflows
3. Ensure all tests pass before submitting
4. Maintain test coverage above 80%
