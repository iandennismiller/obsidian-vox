# Implementation Plan for Whisper.cpp Server Integration

## Overview
Replace the current transcription backend with whisper.cpp server. The changes are minimal because:
1. The response formats are very similar
2. The MarkdownProcessor already handles object-format segments
3. Only the API endpoint and request format need updating

## Implementation Checklist

### Phase 1: Type Definitions
- [ ] Update `TranscriptionResponse` type in `src/types.ts` to include new fields
  - Add optional fields: `task`, `duration`, `detected_language`, etc.
  - Keep existing fields for compatibility
  - Update `TranscriptionSegment` if needed (already matches!)

### Phase 2: API Integration
- [ ] Update `transcribe()` method in `src/TranscriptionProcessor/index.ts`
  - Change endpoint from `/transcribe` to `/inference`
  - Change form field from `audio_file` to `file`
  - Add new form fields: `temperature`, `temperature_inc`, `response_format`
  - Consider making these configurable in settings

### Phase 3: Settings (Optional but Recommended)
- [ ] Add settings for whisper.cpp parameters in `src/settings/index.ts`
  - `temperature`: Default "0.0"
  - `temperature_inc`: Default "0.2"
  - `response_format`: Default "json"
  - Add UI controls in settings tab

### Phase 4: Testing & Validation
- [ ] Test with sample audio files
- [ ] Verify segments are properly formatted
- [ ] Check that markdown generation works correctly
- [ ] Validate error handling

### Phase 5: Documentation
- [ ] Update README.md with whisper.cpp server setup instructions
- [ ] Document the new API format
- [ ] Add migration notes if needed

## Detailed Changes

### File: `src/types.ts`
**Current:**
```typescript
export type TranscriptionResponse = {
  text: string;
  language: string;
  segments: RawTranscriptionSegment[];
};
```

**Updated:**
```typescript
export type TranscriptionResponse = {
  text: string;
  language: string;
  segments: TranscriptionSegment[]; // Changed from Raw to object format
  
  // New optional fields from whisper.cpp
  task?: string;
  duration?: number;
  detected_language?: string;
  detected_language_probability?: number;
  language_probabilities?: Record<string, number>;
};
```

### File: `src/TranscriptionProcessor/index.ts`
**Current (line 189):**
```typescript
const url = `${host}/transcribe`;
```

**Updated:**
```typescript
const url = `${host}/inference`;
```

**Current (lines 200-214):**
```typescript
const response = await axios.postForm<TranscriptionResponse>(
  url,
  {
    audio_file: audioBlobFile,
  },
  {
    headers: {
      "Content-Type": "multipart/form-data",
      [OBSIDIAN_VAULT_ID_HEADER_KEY]: this.app.appId,
      [OBSIDIAN_API_KEY_HEADER_KEY]: this.settings.apiKey,
    },
    timeout: 20 * ONE_MINUTE_IN_MS,
    responseType: "json",
  }
);
```

**Updated:**
```typescript
const formData = {
  file: audioBlobFile,
  temperature: this.settings.temperature ?? "0.0",
  temperature_inc: this.settings.temperatureInc ?? "0.2",
  response_format: "json",
};

const headers: Record<string, string> = {
  "Content-Type": "multipart/form-data",
};

// Only add API keys if using the public endpoint
if (!this.settings.isSelfHosted) {
  headers[OBSIDIAN_VAULT_ID_HEADER_KEY] = this.app.appId;
  headers[OBSIDIAN_API_KEY_HEADER_KEY] = this.settings.apiKey;
}

const response = await axios.postForm<TranscriptionResponse>(
  url,
  formData,
  {
    headers,
    timeout: 20 * ONE_MINUTE_IN_MS,
    responseType: "json",
  }
);
```

### File: `src/settings/index.ts`
**Add to Settings interface (line 13):**
```typescript
export interface Settings {
  // ... existing fields ...
  
  // Whisper.cpp specific settings
  temperature: string;
  temperatureInc: string;
}
```

**Add to DEFAULT_SETTINGS (line 41):**
```typescript
export const DEFAULT_SETTINGS: Settings = {
  // ... existing defaults ...
  
  temperature: "0.0",
  temperatureInc: "0.2",
};
```

**Add to VoxSettingTab class:**
```typescript
addWhisperSettings(): void {
  this.addCategoryHeading("Whisper Settings", true);
  
  new Setting(this.containerEl)
    .setName("Temperature")
    .setDesc("Controls randomness in transcription. 0.0 is deterministic.")
    .addText((cb) => {
      cb.setValue(this.plugin.settings.temperature);
      cb.onChange((value) => {
        this.plugin.settings.temperature = value;
        this.plugin.saveSettings();
      });
    });
    
  new Setting(this.containerEl)
    .setName("Temperature Increment")
    .setDesc("Increment for temperature fallback.")
    .addText((cb) => {
      cb.setValue(this.plugin.settings.temperatureInc);
      cb.onChange((value) => {
        this.plugin.settings.temperatureInc = value;
        this.plugin.saveSettings();
      });
    });
}
```

### File: `src/MarkdownProcessor/index.ts`
**Good news:** No changes needed! The `objectifySegment()` method already handles both formats:
```typescript
private objectifySegment(segment: RawTranscriptionSegment): TranscriptionSegment {
  // Small snippets can be returned as TranscriptionSegment from the API.
  if (segment.hasOwnProperty("text")) {
    return segment as never as TranscriptionSegment;
  }
  // ... handle array format ...
}
```

Since whisper.cpp returns segments as objects with a `text` property, this code will automatically use them as-is.

## Testing Strategy

1. **Manual Testing**
   - Set up a local whisper.cpp server
   - Configure the plugin to use the self-hosted endpoint
   - Test with various audio files
   - Verify output markdown is correct

2. **Error Handling**
   - Test with server offline
   - Test with invalid audio files
   - Test with timeout scenarios

3. **Backwards Compatibility** (if needed)
   - Test with the old API format
   - Ensure the code handles both response types

## Risk Assessment

**Low Risk Changes:**
- Endpoint URL change
- Form field name change
- Adding optional type fields

**Medium Risk Changes:**
- Removing API key headers for self-hosted (need to ensure public API still works)
- Adding new settings (need to ensure defaults work)

**Mitigation:**
- Keep changes minimal and focused
- Test with both public and self-hosted endpoints
- Maintain backward compatibility where possible

## Rollback Plan

If issues arise:
1. The changes are isolated to a few files
2. Git history allows easy revert
3. Old backend can be restored by reverting TranscriptionProcessor changes

## Success Criteria

✓ Plugin can transcribe audio using whisper.cpp server
✓ Segments are properly formatted in markdown
✓ Settings allow customization of whisper parameters
✓ Error handling works correctly
✓ Documentation is updated
