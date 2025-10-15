# Technical Specification: Whisper.cpp Integration

## Objective
Replace the existing transcription backend with whisper.cpp server while maintaining backward compatibility and minimal code changes.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Obsidian Vox Plugin                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐         ┌──────────────────┐        │
│  │ Audio Recorder   │────────▶│ Audio Processor  │        │
│  └──────────────────┘         └──────────────────┘        │
│                                        │                    │
│                                        ▼                    │
│                          ┌──────────────────────┐          │
│                          │ Transcription        │          │
│                          │ Processor            │          │
│                          └──────────────────────┘          │
│                                        │                    │
│                                        │ HTTP POST          │
│                                        ▼                    │
│                          ┌──────────────────────┐          │
│                          │  /inference          │          │
│                          │  endpoint            │          │
│                          └──────────────────────┘          │
│                                        │                    │
│                                        ▼                    │
│                          ┌──────────────────────┐          │
│                          │ Markdown             │          │
│                          │ Processor            │          │
│                          └──────────────────────┘          │
│                                        │                    │
│                                        ▼                    │
│                          ┌──────────────────────┐          │
│                          │ Vault Storage        │          │
│                          └──────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
                                   │
                                   │ HTTP
                                   ▼
                    ┌─────────────────────────────┐
                    │  Whisper.cpp Server         │
                    │  (Self-Hosted)              │
                    │                             │
                    │  Port: 8081 (default)       │
                    │  Model: user-selected       │
                    └─────────────────────────────┘
```

## API Specification

### Endpoint Details

#### Request
- **URL**: `http(s)://host:port/inference`
- **Method**: POST
- **Content-Type**: multipart/form-data

#### Form Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| file | File | Yes | - | Audio file to transcribe |
| temperature | String | Yes | "0.0" | Sampling temperature (0.0 = deterministic) |
| temperature_inc | String | Yes | "0.2" | Temperature increment for fallback |
| response_format | String | Yes | "json" | Response format (json/text/srt/vtt) |

#### Optional Parameters (Future Enhancement)
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| language | String | "auto" | Two-letter language code |
| offset_t | Number | 0 | Time offset in milliseconds |
| duration | Number | 0 | Audio duration to process (0 = all) |

#### Headers
| Header | Required | Description |
|--------|----------|-------------|
| Content-Type | Yes | Must be "multipart/form-data" |
| obsidian-vault-id | No* | Vault identifier (public API only) |
| obsidian-vox-api-key | No* | API key (public API only) |

*Not required for self-hosted instances

### Response Format

#### Success Response (200 OK)
```json
{
  "task": "transcribe",
  "language": "english",
  "duration": 19.93137550354004,
  "text": "Full transcribed text",
  "segments": [
    {
      "id": 0,
      "text": "Segment text",
      "start": 0.0,
      "end": 9.34,
      "tokens": [314, 761, 284],
      "words": [
        {
          "word": "word",
          "start": 0.2,
          "end": 2.0,
          "t_dtw": -1,
          "probability": 0.517
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
    "es": 0.01,
    ...
  }
}
```

#### Error Responses
| Status | Description |
|--------|-------------|
| 400 | Bad Request - Invalid parameters |
| 413 | Payload Too Large - File size exceeds limit |
| 500 | Internal Server Error - Server processing error |
| 503 | Service Unavailable - Server overloaded |

## Data Types

### TypeScript Interfaces

```typescript
// Word-level timestamp information (new)
export type TranscriptionWord = {
  word: string;
  start: number;
  end: number;
  t_dtw: number;
  probability: number;
};

// Updated segment type with words
export type TranscriptionSegment = {
  id: number;
  text: string;
  start: number;
  end: number;
  tokens: number[];
  words?: TranscriptionWord[]; // New optional field
  temperature: number;
  avg_logprob: number;
  no_speech_prob: number;
  
  // Legacy fields (for backward compatibility)
  seek?: number;
  compression_ratio?: number;
};

// Updated response type
export type TranscriptionResponse = {
  // Core fields (required)
  text: string;
  language: string;
  segments: TranscriptionSegment[];
  
  // New optional fields
  task?: string;
  duration?: number;
  detected_language?: string;
  detected_language_probability?: number;
  language_probabilities?: Record<string, number>;
};
```

### Settings Interface

```typescript
export interface Settings {
  // Existing fields...
  apiKey: string;
  isSelfHosted: boolean;
  selfHostedEndpoint: string;
  // ... other existing fields ...
  
  // New whisper.cpp specific settings
  temperature: string;
  temperatureInc: string;
  responseFormat?: "json" | "text" | "srt" | "vtt";
}
```

## Implementation Details

### File Changes

#### 1. `src/types.ts`
- Update `TranscriptionResponse` interface
- Add `TranscriptionWord` interface
- Update `TranscriptionSegment` to include optional `words` field
- Mark legacy fields as optional

#### 2. `src/TranscriptionProcessor/index.ts`
- Update `transcribe()` method:
  - Change endpoint from `/transcribe` to `/inference`
  - Change form field from `audio_file` to `file`
  - Add `temperature`, `temperature_inc`, `response_format` fields
  - Conditionally include API key headers only for public endpoint

#### 3. `src/settings/index.ts`
- Add `temperature` and `temperatureInc` to Settings interface
- Add defaults to DEFAULT_SETTINGS
- Create settings UI in VoxSettingTab

#### 4. `src/MarkdownProcessor/index.ts`
- No changes required (already handles object-format segments)
- Could optionally use word-level timestamps in future enhancement

#### 5. `src/constants.ts`
- Update `PUBLIC_API_ENDPOINT` if the public API also migrates
- Or add `WHISPER_CPP_DEFAULT_PORT` constant

## Migration Strategy

### Phase 1: Core Integration (Required)
1. Update type definitions
2. Update API call in TranscriptionProcessor
3. Add basic settings
4. Test with self-hosted server

### Phase 2: Enhanced Settings (Optional)
1. Add UI controls for temperature
2. Add response format selector
3. Add language override option
4. Add advanced options panel

### Phase 3: Advanced Features (Future)
1. Word-level timestamp visualization
2. Language detection display
3. Confidence scores in UI
4. Multi-language support improvements

## Testing Requirements

### Unit Tests (Future)
- Test segment format conversion
- Test API request construction
- Test error handling

### Integration Tests
- Test with whisper.cpp server
- Test various audio formats
- Test error scenarios
- Test timeout handling

### Manual Testing
1. Set up local whisper.cpp server
2. Transcribe test audio files
3. Verify markdown output
4. Check error handling
5. Validate settings persistence

## Performance Considerations

### Request Timeout
- Current: 20 minutes
- Recommendation: Keep same timeout
- Whisper.cpp may be faster than previous backend

### File Size Limits
- Depends on whisper.cpp server configuration
- Should handle files up to 100MB
- Consider chunking for very large files (future enhancement)

### Model Selection Impact
| Model | Speed | Quality | RAM |
|-------|-------|---------|-----|
| tiny | Fastest | Low | ~390 MB |
| base | Fast | Good | ~440 MB |
| small | Medium | Better | ~860 MB |
| medium | Slow | Great | ~2.9 GB |
| large | Slowest | Best | ~6.9 GB |

## Security Considerations

### Self-Hosted Advantages
- Audio never leaves user's machine
- No API key required
- Full control over data

### Public API Considerations
- Keep API key authentication
- Validate endpoint URLs
- Use HTTPS when possible

### Input Validation
- Validate audio file types
- Check file size limits
- Sanitize form inputs

## Error Handling

### Connection Errors
- Display clear error message
- Pause queue automatically
- Suggest checking server status

### Transcription Errors
- Log error details
- Mark item as FAILED
- Provide retry option

### Timeout Handling
- Use existing 20-minute timeout
- Show progress indicator
- Allow cancellation

## Documentation Updates

### README.md
- Add whisper.cpp setup section
- Update backend configuration instructions
- Add troubleshooting guide

### In-App Help
- Add tooltip for temperature setting
- Link to whisper.cpp documentation
- Provide example configurations

## Success Metrics

- ✓ All existing features work with new backend
- ✓ Self-hosted transcription works
- ✓ Settings are configurable
- ✓ Error handling is robust
- ✓ Documentation is clear and complete
- ✓ Code changes are minimal and focused

## Future Enhancements

1. **Word-Level Timestamps**
   - Display in markdown
   - Interactive playback
   - Click to seek

2. **Language Detection UI**
   - Show detected language
   - Display confidence
   - Allow override

3. **Multiple Backend Support**
   - Support both old and new backends
   - User selectable backend type
   - Automatic fallback

4. **Advanced Features**
   - Speaker diarization
   - Custom vocabulary
   - Fine-tuned models
