# Obsidian Vox - GitHub Copilot Instructions

## Project Overview

Obsidian Vox is an Obsidian plugin that intelligently transcribes voice memos, extracting metadata, categories, and tag information. The plugin is currently being migrated from a proprietary transcription backend to whisper.cpp server for self-hosted, privacy-focused transcription.

## Key Technologies

- **Language**: TypeScript
- **Framework**: Obsidian Plugin API
- **Build Tool**: esbuild
- **Package Manager**: pnpm
- **Transcription**: whisper.cpp server (migrating)
- **Audio Processing**: Node.js built-in modules
- **Markdown Processing**: gray-matter

## Architecture

### Main Components

1. **TranscriptionProcessor** (`src/TranscriptionProcessor/index.ts`)
   - Manages transcription queue
   - Communicates with whisper.cpp server
   - Handles file processing workflow

2. **MarkdownProcessor** (`src/MarkdownProcessor/index.ts`)
   - Generates markdown from transcription
   - Extracts tags and categories
   - Creates frontmatter metadata

3. **AudioProcessor** (`src/AudioProcessor/index.ts`)
   - Handles audio file transformations
   - Converts to compatible formats

4. **Settings** (`src/settings/index.ts`)
   - Plugin configuration
   - UI for user preferences

## Coding Conventions

### TypeScript Style

- Use **strict mode** TypeScript
- Prefer `const` over `let`, avoid `var`
- Use type inference when obvious, explicit types otherwise
- Follow existing naming conventions:
  - Classes: `PascalCase`
  - Functions/methods: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`
  - Private members: prefix with `private`

### File Organization

- One class per file
- Index files (`index.ts`) export main classes
- Utility functions in `src/utils/`
- Types in `src/types.ts`

### Error Handling

- Use try-catch for async operations
- Display user-friendly errors with Obsidian's `Notice` API
- Log detailed errors to console
- Pause queue on errors to prevent cascading failures

### API Integration

- Current endpoint: `POST ${host}/transcribe`
- **NEW (whisper.cpp)**: `POST ${host}/inference`
- Always handle timeouts (default: 20 minutes)
- Support both public API and self-hosted backends

## Whisper.cpp Integration

### Current Migration Status

We are migrating from a proprietary transcription backend to whisper.cpp server:

**Changes Required:**
1. Update endpoint from `/transcribe` to `/inference`
2. Change form field from `audio_file` to `file`
3. Add parameters: `temperature`, `temperature_inc`, `response_format`
4. Update type definitions for enhanced response format

**Response Format:**
- Whisper.cpp returns segments as **objects** (not arrays)
- Code already handles this via `objectifySegment()` method
- Additional fields: `duration`, `detected_language`, `language_probabilities`

### Testing

Use the mock server for development:
```bash
node project/mock-whisper-server.js
```

Configure plugin to use: `http://127.0.0.1:8081`

## Common Patterns

### Queue Processing

```typescript
// Add to queue
this.queue.add(() => this.processFile(audioFile));

// Queue events
this.queue.on("idle", () => this.queueFiles());
```

### Obsidian API

```typescript
// File operations
await this.app.vault.adapter.readBinary(filepath);
await this.app.vault.adapter.write(filepath, content);

// User notifications
new Notice("Message to user");

// Settings
this.plugin.settings.propertyName
```

### Frontmatter

```typescript
import matter from "gray-matter";

const frontmatter = { title, type: "transcribed", ... };
const markdown = matter.stringify(content, frontmatter);
```

## Important Files

- `src/main.ts` - Plugin entry point
- `src/types.ts` - All TypeScript interfaces
- `src/constants.ts` - Constants and regex patterns
- `project/` - Planning and documentation
- `project/mock-whisper-server.js` - Mock server for testing

## Build & Development

```bash
# Install dependencies
pnpm install

# Development build (watch mode)
pnpm run dev

# Production build
pnpm run build

# Format code
pnpm run format
```

## Testing Strategy

1. **Mock Server**: Use for quick testing without whisper.cpp
2. **Manual Testing**: Test in Obsidian with real audio files
3. **No Unit Tests**: Project doesn't have test infrastructure (yet)

## Documentation Standards

- Update planning docs in `project/` when making architectural changes
- Keep README.md current with setup instructions
- Document new settings in both code and UI
- Include examples for complex features

## Common Gotchas

1. **Audio File Paths**: Always use absolute paths with Vault adapter
2. **Queue State**: Remember to notify subscribers after state changes
3. **Settings**: Save settings after every change
4. **File Extensions**: Handle both with and without leading dot
5. **Segments Format**: Code supports both array and object formats

## Security Considerations

- Never commit API keys
- Validate all user inputs
- Sanitize file paths
- Use HTTPS for remote backends when possible
- Audio files should be deleted or moved after processing (user configurable)

## When Suggesting Code

1. **Match Existing Style**: Follow the patterns in existing code
2. **Minimize Changes**: Make smallest possible changes to achieve goals
3. **Type Safety**: Ensure all types are correct and compile
4. **Error Handling**: Always include proper error handling
5. **User Experience**: Consider how changes affect users
6. **Documentation**: Update docs if changing public APIs

## Helpful Context

- Plugin works in both desktop and mobile Obsidian
- Users may have thousands of voice notes
- Transcription can take minutes for long files
- Users care about privacy (hence self-hosted option)
- Tag extraction uses fuzzy matching against vault tags

## Current Focus

We are currently implementing the whisper.cpp integration. Key files being modified:

- `src/types.ts` - Update TranscriptionResponse type
- `src/TranscriptionProcessor/index.ts` - Update API endpoint and request format
- `src/settings/index.ts` - Add whisper.cpp settings (temperature, etc.)

See `project/IMPLEMENTATION_PLAN.md` for detailed implementation steps.

## Questions?

Refer to:
- `project/TECHNICAL_SPEC.md` - Complete technical specification
- `project/QUICK_REFERENCE.md` - Code examples and commands
- `project/ANALYSIS.md` - Current vs. new implementation comparison
