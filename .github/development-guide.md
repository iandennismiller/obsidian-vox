# Obsidian Vox Development Guide

## Project Structure

```
obsidian-vox/
├── src/
│   ├── main.ts                    # Plugin entry point
│   ├── types.ts                   # TypeScript type definitions
│   ├── constants.ts               # Constants and regex patterns
│   ├── TranscriptionProcessor/    # Transcription queue and API
│   ├── MarkdownProcessor/         # Markdown generation
│   ├── AudioProcessor/            # Audio file handling
│   ├── AudioRecorder/             # Audio recording functionality
│   ├── settings/                  # Plugin settings UI
│   ├── utils/                     # Utility functions
│   └── view/                      # UI components
├── project/                       # Planning and documentation
│   ├── mock-whisper-server.js    # Mock server for testing
│   └── *.md                      # Planning documents
├── .github/                       # GitHub configuration
└── main.js                        # Built plugin file
```

## Development Workflow

### 1. Setting Up

```bash
# Clone repository
git clone <repo-url>
cd obsidian-vox

# Install dependencies
pnpm install

# Start development build
pnpm run dev
```

### 2. Making Changes

1. **Understand the Change**
   - Read relevant planning docs in `project/`
   - Review existing code patterns
   - Check `src/types.ts` for type definitions

2. **Implement**
   - Make minimal, focused changes
   - Follow existing code style
   - Update types as needed

3. **Test**
   - Use mock server: `node project/mock-whisper-server.js`
   - Test in Obsidian with real audio files
   - Check error scenarios

4. **Document**
   - Update planning docs if architecture changes
   - Add code comments for complex logic
   - Update README if user-facing features change

### 3. Code Style

#### TypeScript

```typescript
// ✅ Good
export class TranscriptionProcessor {
  private queue: PQueue;
  private readonly logger: Logger;

  constructor(
    private readonly app: App,
    private settings: Settings,
    logger: Logger
  ) {
    this.logger = logger;
    this.queue = new PQueue({ concurrency: 8 });
  }

  public async processFile(file: FileDetail): Promise<void> {
    try {
      const result = await this.transcribe(file);
      if (!result) {
        throw new Error("Transcription failed");
      }
    } catch (error) {
      console.error("Process file error:", error);
      new Notice("Failed to process file");
    }
  }
}

// ❌ Avoid
class processor {
  queue;
  
  constructor(app, settings) {
    this.queue = new PQueue({ concurrency: 8 });
  }
  
  processFile(file) {
    const result = this.transcribe(file);
    return result;
  }
}
```

#### Async/Await

```typescript
// ✅ Good - proper error handling
async function transcribe(file: FileDetail): Promise<TranscriptionResponse | null> {
  try {
    const response = await axios.postForm<TranscriptionResponse>(url, data);
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      console.warn("Transcription error:", error);
    }
    return null;
  }
}

// ❌ Avoid - no error handling
async function transcribe(file) {
  const response = await axios.postForm(url, data);
  return response.data;
}
```

#### Type Definitions

```typescript
// ✅ Good - explicit and clear
export type TranscriptionSegment = {
  id: number;
  text: string;
  start: number;
  end: number;
  tokens: number[];
  words?: TranscriptionWord[];
  temperature: number;
  avg_logprob: number;
  no_speech_prob: number;
};

// ❌ Avoid - using any
type Segment = {
  id: number;
  text: string;
  data: any;
};
```

## Testing

### Mock Server Testing

```bash
# Terminal 1: Start mock server
node project/mock-whisper-server.js

# Terminal 2: Run Obsidian with plugin
# Configure plugin to use http://127.0.0.1:8081
```

### Manual Testing Checklist

- [ ] Place audio file in watch directory
- [ ] Verify transcription starts
- [ ] Check progress in status panel
- [ ] Confirm markdown file created
- [ ] Validate frontmatter data
- [ ] Check audio file linked correctly
- [ ] Test error scenarios (server offline, invalid file)

## Common Tasks

### Adding a New Setting

1. **Update Settings Interface** (`src/settings/index.ts`)

```typescript
export interface Settings {
  // ... existing settings
  newSetting: string;
}

export const DEFAULT_SETTINGS: Settings = {
  // ... existing defaults
  newSetting: "default value",
};
```

2. **Add UI Control**

```typescript
addNewSetting(): void {
  new Setting(this.containerEl)
    .setName("Setting Name")
    .setDesc("Setting description")
    .addText((cb) => {
      cb.setValue(this.plugin.settings.newSetting);
      cb.onChange((value) => {
        this.plugin.settings.newSetting = value;
        this.plugin.saveSettings();
      });
    });
}
```

3. **Call in display()**

```typescript
async display(): Promise<void> {
  this.containerEl.empty();
  // ... other settings
  this.addNewSetting();
}
```

### Modifying Transcription Response

1. **Update Types** (`src/types.ts`)

```typescript
export type TranscriptionResponse = {
  text: string;
  language: string;
  segments: TranscriptionSegment[];
  newField?: string; // Add as optional for compatibility
};
```

2. **Update Processing** (`src/TranscriptionProcessor/index.ts`)

```typescript
private async transcribe(file: FileDetail): Promise<TranscriptionResponse | null> {
  const response = await axios.postForm<TranscriptionResponse>(url, formData);
  
  // Use new field if available
  if (response.data.newField) {
    console.log("New field:", response.data.newField);
  }
  
  return response.data;
}
```

3. **Update Mock Server** (`project/mock-whisper-server.js`)

```javascript
const mockTranscription = {
  text: "...",
  language: "english",
  segments: [...],
  newField: "mock value" // Add to mock data
};
```

### Adding Logging

```typescript
// Use the logger instance
this.logger.log("Information message");
console.log("Debug information");
console.warn("Warning message");
console.error("Error message");

// User notifications
new Notice("User-visible message");
new Notice("Error occurred", 5000); // Show for 5 seconds
```

## Debugging

### Common Issues

**Issue**: TypeScript compilation errors
```bash
# Check for type errors
pnpm run build

# Look for specific error messages
# Fix types in src/types.ts
```

**Issue**: Plugin not loading in Obsidian
```bash
# Check console for errors (Cmd/Ctrl+Shift+I)
# Verify main.js was built
# Check manifest.json is valid
```

**Issue**: Transcription not working
```bash
# Check mock server is running
# Verify endpoint in settings is correct
# Check browser/app network tab
# Look for errors in console
```

### Debug Mode

Enable verbose logging:

```typescript
// In TranscriptionProcessor
console.log("Processing file:", audioFile.filename);
console.log("Queue size:", this.queue.size);
console.log("Queue pending:", this.queue.pending);
```

## API Reference

### Obsidian Vault API

```typescript
// Read file
const content = await this.app.vault.adapter.readBinary(filepath);
const text = await this.app.vault.adapter.read(filepath);

// Write file
await this.app.vault.adapter.write(filepath, content);

// Check if exists
const exists = await this.app.vault.adapter.exists(filepath);

// Delete file
await this.app.vault.adapter.remove(filepath);

// Create directory
await this.app.vault.adapter.mkdir(dirpath);

// Rename/move
await this.app.vault.adapter.rename(oldPath, newPath);
```

### Queue API (p-queue)

```typescript
import PQueue from "p-queue";

const queue = new PQueue({ concurrency: 8 });

// Add single task
queue.add(() => this.processFile(file));

// Add multiple tasks
queue.addAll(files.map(file => () => this.processFile(file)));

// Listen to events
queue.on("idle", () => console.log("Queue is idle"));

// Pause/resume
queue.pause();
queue.start();

// Clear queue
queue.clear();
```

### Settings API

```typescript
// Load settings
await this.loadSettings();

// Save settings
await this.saveSettings();

// Access setting
this.plugin.settings.settingName;

// Update setting
this.plugin.settings.settingName = newValue;
await this.plugin.saveSettings();
```

## Performance Tips

1. **Batch Operations**: Process multiple files at once
2. **Lazy Loading**: Don't load all files into memory
3. **Caching**: Cache computed values when possible
4. **Queue Management**: Limit concurrency to avoid overwhelming system
5. **Cleanup**: Remove temporary files and clear caches

## Security Best Practices

1. **Input Validation**: Validate all file paths and user inputs
2. **Sanitization**: Sanitize filenames and paths
3. **Secrets**: Never commit API keys or tokens
4. **HTTPS**: Use HTTPS for remote backends
5. **Permissions**: Request minimal necessary permissions

## Release Process

1. Update version in `manifest.json` and `package.json`
2. Run `pnpm run build`
3. Test thoroughly in Obsidian
4. Create release notes
5. Tag release in Git
6. Upload `main.js`, `manifest.json`, `styles.css` to release

## Resources

- [Obsidian Plugin Developer Docs](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [Obsidian API Reference](https://github.com/obsidianmd/obsidian-api)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [whisper.cpp Documentation](https://github.com/ggerganov/whisper.cpp)

## Getting Help

1. Check `project/` documentation
2. Review existing code patterns
3. Check console for error messages
4. Test with mock server
5. Read Obsidian plugin documentation
