# Quick Reference Guide

## Code Changes Summary

### 1. Type Definitions (`src/types.ts`)

#### Add New Type
```typescript
export type TranscriptionWord = {
  word: string;
  start: number;
  end: number;
  t_dtw: number;
  probability: number;
};
```

#### Update Existing Types
```typescript
export type TranscriptionSegment = {
  id: number;
  seek?: number;              // Make optional
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio?: number; // Make optional
  no_speech_prob: number;
  words?: TranscriptionWord[]; // Add new field
};

export type TranscriptionResponse = {
  text: string;
  language: string;
  segments: TranscriptionSegment[]; // Change from RawTranscriptionSegment[]
  
  // Add new optional fields
  task?: string;
  duration?: number;
  detected_language?: string;
  detected_language_probability?: number;
  language_probabilities?: Record<string, number>;
};
```

#### Remove Obsolete Type
```typescript
// Delete RawTranscriptionSegment type - no longer needed
// export type RawTranscriptionSegment = [...];
```

### 2. Transcription Processor (`src/TranscriptionProcessor/index.ts`)

#### Update Endpoint (Line ~189)
```typescript
// OLD:
const url = `${host}/transcribe`;

// NEW:
const url = `${host}/inference`;
```

#### Update Request (Lines ~200-214)
```typescript
// OLD:
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

// NEW:
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

### 3. Settings (`src/settings/index.ts`)

#### Update Interface (Line ~13)
```typescript
export interface Settings {
  // ... existing fields ...
  
  // Add new whisper.cpp settings
  temperature: string;
  temperatureInc: string;
}
```

#### Update Defaults (Line ~41)
```typescript
export const DEFAULT_SETTINGS: Settings = {
  // ... existing defaults ...
  
  temperature: "0.0",
  temperatureInc: "0.2",
};
```

#### Add Settings UI (In `VoxSettingTab.display()`)
```typescript
async display(): Promise<void> {
  this.containerEl.empty();

  this.addCategoryHeading("Recording Settings");
  await this.addRecordingDevice();

  this.addCategoryHeading("Transcription Settings");

  this.addWatchDirectory();
  this.addTranscriptionsDirectory();

  this.addAudioExtension();
  this.addDeleteOriginalFile();

  this.addTags();
  this.addCategorisation();

  // Add this new section
  this.addWhisperSettings();

  this.addSelfHostToggle();
}

// Add this new method
addWhisperSettings(): void {
  this.addCategoryHeading("Whisper Settings", true);
  
  new Setting(this.containerEl)
    .setName("Temperature")
    .setDesc("Controls randomness in transcription. Lower values (0.0) are more deterministic.")
    .addText((cb) => {
      cb.setPlaceholder("0.0");
      cb.setValue(this.plugin.settings.temperature);
      cb.onChange((value) => {
        this.plugin.settings.temperature = value;
        this.plugin.saveSettings();
      });
    });
    
  new Setting(this.containerEl)
    .setName("Temperature Increment")
    .setDesc("Increment for temperature fallback if initial transcription fails.")
    .addText((cb) => {
      cb.setPlaceholder("0.2");
      cb.setValue(this.plugin.settings.temperatureInc);
      cb.onChange((value) => {
        this.plugin.settings.temperatureInc = value;
        this.plugin.saveSettings();
      });
    });
}
```

### 4. Markdown Processor (`src/MarkdownProcessor/index.ts`)

**No changes needed!** The existing code already handles object-format segments correctly.

#### Update Import (Line ~11)
```typescript
// OLD:
import {
  FileDetail,
  MarkdownOutput,
  RawTranscriptionSegment,
  TranscriptionResponse,
  TranscriptionSegment,
} from "types";

// NEW:
import {
  FileDetail,
  MarkdownOutput,
  TranscriptionResponse,
  TranscriptionSegment,
} from "types";
```

#### Update Method Signature (Line ~122)
```typescript
// OLD:
private objectifySegment(segment: RawTranscriptionSegment): TranscriptionSegment {

// NEW:
private objectifySegment(segment: TranscriptionSegment): TranscriptionSegment {
```

The method body stays the same - it already handles object-format segments!

## Testing Checklist

### Option 1: Mock Server (Recommended for Testing)
- [ ] Start mock server: `node project/mock-whisper-server.js`
- [ ] Configure Vox to use: `http://127.0.0.1:8081`
- [ ] No installation required - works immediately!

### Option 2: Real whisper.cpp (For Production)
- [ ] Install whisper.cpp: `git clone https://github.com/ggerganov/whisper.cpp.git`
- [ ] Build server: `cd whisper.cpp && make server`
- [ ] Download model: `./models/download-ggml-model.sh base.en`
- [ ] Start server: `./server -m models/ggml-base.en.bin --port 8081`

### Configuration
- [ ] Enable "Use Self-Hosted Backend" in Vox settings
- [ ] Set backend location to `http://127.0.0.1:8081`
- [ ] Verify temperature settings are visible
- [ ] Confirm default values are correct

### Testing
- [ ] Place test audio file in watch directory
- [ ] Verify transcription starts
- [ ] Check status panel shows progress
- [ ] Confirm markdown file is created
- [ ] Validate frontmatter is correct
- [ ] Check audio file is linked properly
- [ ] Test with various audio formats (mp3, wav, m4a)

### Error Scenarios
- [ ] Test with server offline (should show clear error)
- [ ] Test with invalid audio file (should handle gracefully)
- [ ] Test with very large file (should timeout appropriately)
- [ ] Test with corrupted file (should fail gracefully)

## Curl Test Commands

### Test Mock Server or whisper.cpp Server
```bash
# Basic test (works with both mock and real server)
curl -X POST http://127.0.0.1:8081/inference \
  -H "Content-Type: multipart/form-data" \
  -F file="@test.mp3" \
  -F temperature="0.0" \
  -F temperature_inc="0.2" \
  -F response_format="json"
```

### Start Mock Server for Testing
```bash
# Quick and easy - no whisper.cpp installation needed!
node project/mock-whisper-server.js

# Or with custom port
node project/mock-whisper-server.js 8082
```

### Expected Response
```json
{
  "task": "transcribe",
  "language": "english",
  "duration": 19.93,
  "text": "Transcribed text here...",
  "segments": [
    {
      "id": 0,
      "text": "Segment text",
      "start": 0.0,
      "end": 9.34,
      "tokens": [...],
      "words": [...],
      "temperature": 0,
      "avg_logprob": -0.229,
      "no_speech_prob": 0.015
    }
  ],
  "detected_language": "english",
  "detected_language_probability": 0.98
}
```

## Common Issues & Solutions

### Issue: Server won't start
**Solution**: Check if port 8081 is available, try different port

### Issue: Connection refused
**Solution**: Verify server is running, check firewall, confirm URL is correct

### Issue: Poor transcription quality
**Solution**: Try larger model (medium or large), check audio quality

### Issue: Timeout errors
**Solution**: Increase timeout in TranscriptionProcessor, use smaller model

### Issue: Settings not saving
**Solution**: Check plugin settings file, restart Obsidian

## Build & Deploy

### Development
```bash
cd /home/runner/work/obsidian-vox/obsidian-vox
pnpm install
pnpm run dev
```

### Production Build
```bash
pnpm run build
```

### Format Code
```bash
pnpm run format
```

## File Locations

- **Main plugin code**: `src/main.ts`
- **Transcription logic**: `src/TranscriptionProcessor/index.ts`
- **Type definitions**: `src/types.ts`
- **Settings**: `src/settings/index.ts`
- **Markdown generation**: `src/MarkdownProcessor/index.ts`
- **Constants**: `src/constants.ts`
- **Build output**: `main.js`

## Important Constants

```typescript
CACHE_DIRECTORY = ".obsidian/.vox-cache"
PUBLIC_API_ENDPOINT = "https://api.obsidian-vox.org:1337"
OBSIDIAN_VAULT_ID_HEADER_KEY = "obsidian-vault-id"
OBSIDIAN_API_KEY_HEADER_KEY = "obsidian-vox-api-key"
```

## Git Workflow

```bash
# Check status
git status

# Create feature branch
git checkout -b feature/whisper-cpp-integration

# Stage changes
git add src/types.ts src/TranscriptionProcessor/index.ts src/settings/index.ts

# Commit
git commit -m "Integrate whisper.cpp server backend"

# Push
git push origin feature/whisper-cpp-integration
```

## Notes

- Keep changes minimal and focused
- Test after each file modification
- Update documentation as you go
- Maintain backward compatibility where possible
- Use sensible defaults for new settings
