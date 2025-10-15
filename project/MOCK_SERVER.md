# Mock Whisper.cpp Server

A simple Node.js HTTP server that simulates the whisper.cpp server `/inference` endpoint for testing purposes. This eliminates the need to install and run an actual whisper.cpp server during development and testing.

## Features

- ✅ Simulates whisper.cpp `/inference` endpoint
- ✅ Returns realistic mock transcription data
- ✅ Includes word-level timestamps and probabilities
- ✅ Supports multipart/form-data file uploads
- ✅ Logs requests for debugging
- ✅ Simulates processing delay
- ✅ No dependencies (uses only Node.js built-in modules)

## Quick Start

### 1. Start the Mock Server

```bash
# Start on default port 8081
node project/mock-whisper-server.js

# Or specify a custom port
node project/mock-whisper-server.js 8082
```

You should see:

```
╔════════════════════════════════════════════════════════════╗
║         Mock Whisper.cpp Server for Testing               ║
╚════════════════════════════════════════════════════════════╝

🚀 Server running at: http://127.0.0.1:8081
📡 Endpoint: http://127.0.0.1:8081/inference

Configuration for Obsidian Vox:
  1. Enable "Use Self-Hosted Backend"
  2. Set backend location to: http://127.0.0.1:8081

Test with curl:
  curl http://127.0.0.1:8081/inference \
    -F file="@test.mp3" \
    -F temperature="0.0" \
    -F temperature_inc="0.2" \
    -F response_format="json"

Press Ctrl+C to stop the server
════════════════════════════════════════════════════════════
```

### 2. Configure Obsidian Vox

1. Open Obsidian Settings
2. Navigate to Vox plugin settings
3. Enable **"Use Self-Hosted Backend"**
4. Set **"Self Hosted Backend Location"** to: `http://127.0.0.1:8081`

### 3. Test Transcription

Place an audio file in your watch directory, and the plugin will send it to the mock server. The server will return a mock transcription.

## Testing with curl

You can test the server directly with curl:

```bash
curl http://127.0.0.1:8081/inference \
  -F file="@test.mp3" \
  -F temperature="0.0" \
  -F temperature_inc="0.2" \
  -F response_format="json"
```

## Mock Response Format

The mock server returns a response matching the whisper.cpp format:

```json
{
  "task": "transcribe",
  "language": "english",
  "duration": 19.93137550354004,
  "text": "Full transcription text...",
  "segments": [
    {
      "id": 0,
      "text": "Segment text",
      "start": 0.0,
      "end": 4.5,
      "tokens": [314, 761, 284, ...],
      "words": [
        {
          "word": "This",
          "start": 0.2,
          "end": 0.5,
          "t_dtw": -1,
          "probability": 0.95
        }
      ],
      "temperature": 0,
      "avg_logprob": -0.229,
      "no_speech_prob": 0.015
    }
  ],
  "detected_language": "english",
  "detected_language_probability": 0.98,
  "language_probabilities": {
    "en": 0.98,
    "es": 0.005,
    ...
  }
}
```

## Server Logs

The server logs each request:

```
[2025-10-15T21:22:43.123Z] POST /inference
  File: my-audio-recording.mp3
  Size: 524288 bytes
  Status: 200 OK (234ms)
```

## Customization

You can modify the mock response by editing `mockTranscription` in `mock-whisper-server.js`:

```javascript
const mockTranscription = {
  task: "transcribe",
  language: "english",
  // ... customize the response data
};
```

## Stopping the Server

Press `Ctrl+C` to gracefully shut down the server.

## Troubleshooting

### Port Already in Use

If you get an error that the port is already in use:

1. Use a different port: `node project/mock-whisper-server.js 8082`
2. Update Obsidian Vox settings to match the new port

### Connection Refused

Make sure:
- The server is running
- The URL in Obsidian Vox settings is correct
- No firewall is blocking localhost connections

### Server Not Responding

Check the terminal where the server is running for error messages.

## Comparison with Real whisper.cpp

| Feature | Mock Server | Real whisper.cpp |
|---------|-------------|------------------|
| Setup time | Instant | 10-30 minutes |
| Dependencies | Node.js only | Build tools, models |
| Response time | 100-500ms | Varies by model |
| Transcription quality | Fixed mock text | Actual transcription |
| Use case | Testing, development | Production |

## When to Use Each

### Use Mock Server For:
- ✅ Development and testing
- ✅ CI/CD pipelines
- ✅ Quick plugin setup
- ✅ Learning the API
- ✅ UI/UX testing

### Use Real whisper.cpp For:
- ✅ Production use
- ✅ Actual transcription needs
- ✅ Quality testing
- ✅ Performance benchmarking

## Integration Tests

The mock server can be used in automated tests:

```javascript
// Example test setup
beforeAll(async () => {
  // Start mock server
  mockServer = spawn('node', ['project/mock-whisper-server.js', '8081']);
  await wait(1000); // Wait for server to start
});

afterAll(() => {
  // Stop mock server
  mockServer.kill();
});
```

## Advanced Usage

### Custom Responses

You can modify the server to return different responses based on the filename:

```javascript
// In mock-whisper-server.js
if (filename.includes('error')) {
  res.writeHead(500);
  res.end(JSON.stringify({ error: 'Transcription failed' }));
  return;
}
```

### Simulate Errors

Test error handling by modifying the server to return error responses:

```javascript
// Simulate 429 Too Many Requests
res.writeHead(429);
res.end(JSON.stringify({ error: 'Rate limit exceeded' }));
```

### Multiple Languages

Add support for different languages based on request parameters.

## Benefits

1. **No Setup Required** - Works with just Node.js (already required by the project)
2. **Fast** - Instant responses, no actual transcription processing
3. **Deterministic** - Same response every time, perfect for testing
4. **Portable** - Works on any platform with Node.js
5. **Simple** - Single file, no external dependencies

## License

Same as the main project (AGPL-3.0-only)
