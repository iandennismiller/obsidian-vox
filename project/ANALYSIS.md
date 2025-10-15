# Analysis of Current Transcription Implementation

## Current Implementation Overview

### Transcription Flow
1. **TranscriptionProcessor** (`src/TranscriptionProcessor/index.ts`)
   - Main entry point for transcription
   - Manages queue of files to transcribe
   - Calls `transcribe()` method which sends requests to backend

2. **Current API Endpoint**
   - Endpoint: `${host}/transcribe` (lines 186-234)
   - Method: POST with multipart/form-data
   - Headers:
     - `Content-Type: multipart/form-data`
     - `obsidian-vault-id`: App ID
     - `obsidian-api-key`: User's API key
   - Form fields:
     - `audio_file`: The audio file blob

3. **Current Response Format** (defined in `src/types.ts` lines 98-102)
   ```typescript
   export type TranscriptionResponse = {
     text: string;
     language: string;
     segments: RawTranscriptionSegment[];
   };
   ```

4. **Response Usage** (`src/MarkdownProcessor/index.ts`)
   - Uses `transcription.text` for tag extraction (line 58)
   - Uses `transcription.segments` for generating markdown content (line 68)
   - Each segment is objectified and formatted into paragraphs

## Whisper.cpp Server Differences

### New Endpoint
- URL: `${host}/inference` (instead of `/transcribe`)
- Method: POST with multipart/form-data
- Form fields:
  - `file`: The audio file (instead of `audio_file`)
  - `temperature`: "0.0"
  - `temperature_inc`: "0.2"
  - `response_format`: "json"

### New Response Format
The whisper.cpp server returns a much richer response:
```json
{
  "task": "transcribe",
  "language": "english",
  "duration": 19.93137550354004,
  "text": "blah blah",
  "segments": [
    {
      "id": 0,
      "text": "blah blah",
      "start": 0,
      "end": 9.34,
      "tokens": [...],
      "words": [...],
      "temperature": 0,
      "avg_logprob": -0.22993923723697662,
      "no_speech_prob": 0.01573946326971054
    }
  ],
  "detected_language": "tajik",
  "detected_language_probability": 0.010004529729485512,
  "language_probabilities": {...}
}
```

### Key Differences
1. **Endpoint name**: `/transcribe` → `/inference`
2. **Form field name**: `audio_file` → `file`
3. **Additional form fields**: Need to add `temperature`, `temperature_inc`, `response_format`
4. **Segment format**: Array format → Object format (segments are already objects!)
5. **Additional response fields**: 
   - `task`: Type of operation
   - `duration`: Audio duration
   - `detected_language`: Auto-detected language
   - `language_probabilities`: Probability distribution
   - Segments now include `words` array with timestamps

## Compatibility Analysis

### What Stays the Same
- `text` field exists in both formats ✓
- `language` field exists in both formats ✓
- `segments` array exists in both formats ✓
- Each segment has `id`, `text`, `start`, `end`, `tokens`, `temperature`, `avg_logprob`, `no_speech_prob` ✓

### What Changes
- Current code uses `RawTranscriptionSegment` which is an array format
- New format returns segments as objects (which is actually what the code expects in `objectifySegment()`)
- The `objectifySegment()` function already handles both formats (line 124: checks if segment has 'text' property)

### Impact on MarkdownProcessor
The MarkdownProcessor should work with minimal changes:
- The `objectifySegment()` method already checks for object format and returns it as-is
- Text extraction will work the same
- Segment processing will work the same

## Required Changes Summary

### 1. TranscriptionProcessor Changes (Minimal)
- Update endpoint URL from `/transcribe` to `/inference`
- Update form field name from `audio_file` to `file`
- Add new form fields: `temperature`, `temperature_inc`, `response_format`
- Optionally update headers (may not need API keys for self-hosted)

### 2. Type Definition Updates (Minimal)
- Update `TranscriptionResponse` type to match new format (add optional fields for backward compatibility)
- Segments are already in object format, so no change needed there

### 3. Settings Updates (Optional)
- Could add settings for `temperature` and `temperature_inc` if users want to customize
- For now, can use hardcoded defaults as shown in the example

### 4. Documentation
- Update README to reflect new backend requirements
- Document the whisper.cpp server setup process

## Backward Compatibility Considerations

To maintain backward compatibility with the existing public API:
1. Keep the old `/transcribe` endpoint support
2. Auto-detect which format is returned based on response structure
3. Use feature flags or settings to choose between old and new backends

However, since the problem statement indicates we're "replacing" the backend (not adding an option), we can simplify by just updating to the new format.
