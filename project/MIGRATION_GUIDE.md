# Migration Guide: Switching to Whisper.cpp Server

## For Users

### What's Changing
- The transcription backend is switching from the current API to whisper.cpp server
- You'll need to set up your own whisper.cpp server instance
- The quality and features of transcription will improve with access to the full whisper.cpp capabilities

### Setup Instructions

#### 1. Install whisper.cpp Server
```bash
# Clone the whisper.cpp repository
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp

# Build the server
make server

# Download a model (e.g., base.en)
./models/download-ggml-model.sh base.en
```

#### 2. Start the Server
```bash
# Start the server on port 8081
./server -m models/ggml-base.en.bin --port 8081
```

#### 3. Configure Obsidian Vox
1. Open Obsidian Settings
2. Navigate to Vox plugin settings
3. Enable "Use Self-Hosted Backend"
4. Set "Self Hosted Backend Location" to `http://127.0.0.1:8081`
5. (Optional) Adjust temperature settings if desired

### Default Settings
- **Temperature**: 0.0 (deterministic transcription)
- **Temperature Increment**: 0.2 (fallback if initial transcription fails)
- **Response Format**: JSON

## For Developers

### API Changes

#### Old Endpoint
```bash
POST ${host}/transcribe
Content-Type: multipart/form-data

Form Fields:
- audio_file: <file>

Headers:
- obsidian-vault-id: <app-id>
- obsidian-vox-api-key: <api-key>
```

#### New Endpoint
```bash
POST ${host}/inference
Content-Type: multipart/form-data

Form Fields:
- file: <file>
- temperature: "0.0"
- temperature_inc: "0.2"
- response_format: "json"

Headers: (optional for self-hosted)
- obsidian-vault-id: <app-id>
- obsidian-vox-api-key: <api-key>
```

### Response Format Changes

#### Old Format
```json
{
  "text": "transcribed text",
  "language": "english",
  "segments": [
    [0, 0, 0, 9.34, "text", [tokens], 0, -0.229, 1.5, 0.015]
  ]
}
```

#### New Format
```json
{
  "text": "transcribed text",
  "language": "english",
  "task": "transcribe",
  "duration": 19.93,
  "segments": [
    {
      "id": 0,
      "text": "text",
      "start": 0,
      "end": 9.34,
      "tokens": [...],
      "words": [...],
      "temperature": 0,
      "avg_logprob": -0.229,
      "no_speech_prob": 0.015
    }
  ],
  "detected_language": "english",
  "detected_language_probability": 0.98,
  "language_probabilities": {...}
}
```

### Code Changes

#### Type Definitions
The `TranscriptionResponse` type now includes additional optional fields:
- `task`: Operation type
- `duration`: Audio duration
- `detected_language`: Auto-detected language
- `detected_language_probability`: Confidence score
- `language_probabilities`: Full probability distribution

Segments are now objects instead of arrays, which the code already supported.

#### Backward Compatibility
The `objectifySegment()` method in MarkdownProcessor already handles both formats:
- If segment is an object (new format), it's used directly
- If segment is an array (old format), it's converted to an object

### Testing Your Changes

1. **Local Testing**
   ```bash
   # Start whisper.cpp server
   cd whisper.cpp
   ./server -m models/ggml-base.en.bin --port 8081
   
   # Test with curl
   curl 127.0.0.1:8081/inference \
     -H "Content-Type: multipart/form-data" \
     -F file="@test.mp3" \
     -F temperature="0.0" \
     -F temperature_inc="0.2" \
     -F response_format="json"
   ```

2. **Plugin Testing**
   - Place audio file in watch directory
   - Verify transcription completes
   - Check markdown output format
   - Validate frontmatter fields

## Troubleshooting

### Server Not Starting
- Check if port 8081 is available
- Verify model files are downloaded
- Check whisper.cpp build completed successfully

### Connection Errors
- Verify server is running
- Check firewall settings
- Confirm endpoint URL in settings is correct

### Transcription Errors
- Check audio file format is supported
- Verify model is appropriate for audio language
- Review server logs for errors

### Poor Quality Transcriptions
- Try a larger model (e.g., `medium` or `large`)
- Adjust temperature settings
- Ensure audio quality is good

## Benefits of New Backend

1. **Self-Hosted**: Full control over your data
2. **No API Limits**: Unlimited transcriptions
3. **Better Features**: Word-level timestamps, language detection
4. **Customizable**: Adjust models and parameters
5. **Privacy**: Audio files never leave your machine
6. **Cost**: No subscription fees

## Support

For issues with:
- **whisper.cpp server**: See https://github.com/ggerganov/whisper.cpp
- **Obsidian Vox plugin**: Open an issue on the plugin repository
