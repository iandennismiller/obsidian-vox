# Local Embedded Transcription

This document describes how the local embedded transcription feature works in Obsidian Vox.

## Overview

Obsidian Vox now includes embedded whisper.cpp WebAssembly (WASM) for completely private, offline transcription that runs directly in Obsidian. This is powered by the [@transcribe/transcriber](https://www.npmjs.com/package/@transcribe/transcriber) and [@transcribe/shout](https://www.npmjs.com/package/@transcribe/shout) packages.

## Architecture

### Components

1. **LocalWhisperTranscriber** (`src/LocalWhisperTranscriber/index.ts`)
   - Wraps the `@transcribe/transcriber` FileTranscriber
   - Handles initialization and transcription
   - Converts between transcribe.js format and Vox's TranscriptionResponse format

2. **TranscriptionProcessor** (`src/TranscriptionProcessor/index.ts`)
   - Updated to support both local and remote modes
   - Automatically initializes LocalWhisperTranscriber when in local mode
   - Routes transcription requests to appropriate backend

3. **Settings** (`src/settings/index.ts`)
   - New `transcriptionMode` field: "local" or "remote"
   - New `localModelPath` field: path to GGML model file
   - UI components for selecting mode and configuring model path

### WASM Asset Bundling

The WASM files from `@transcribe/shout` are automatically bundled by esbuild:

- **esbuild.config.mjs** includes a WASM plugin with `mode: "embed"`
- This embeds the WASM binary directly in the JavaScript bundle as base64
- No separate `.wasm` files need to be distributed
- Worker files are also embedded in the main JS file

The main bundle size increases from ~1.7MB to ~3.1MB with WASM embedded.

## Model Files

### Obtaining Models

Users must download GGML model files from [Hugging Face](https://huggingface.co/ggerganov/whisper.cpp/tree/main):

- **ggml-tiny.bin** (~75 MB) - Fast, good for quick notes
- **ggml-base.bin** (~142 MB) - Best balance ⭐
- **ggml-small.bin** (~466 MB) - Higher quality, slower

### Model Loading

The model file is loaded at runtime:

1. User specifies path in settings
2. LocalWhisperTranscriber attempts to fetch the model as a File object
3. For `file://` URLs or absolute paths, uses fetch API
4. Falls back to passing path directly to transcriber
5. Model is loaded into WASM memory on initialization

## Initialization Flow

```
User adds audio file
  ↓
TranscriptionProcessor.processFile()
  ↓
Check transcriptionMode
  ↓
[Local Mode]
  ↓
ensureLocalTranscriberInitialized()
  ↓
LocalWhisperTranscriber.init()
  ↓
Load model file
  ↓
Initialize WASM module
  ↓
Ready to transcribe
```

## Transcription Flow

```
processFile()
  ↓
AudioProcessor.transformAudio() → Convert to WAV
  ↓
[Local Mode]
  ↓
LocalWhisperTranscriber.transcribe()
  ↓
Convert ArrayBuffer to File
  ↓
FileTranscriber.transcribe()
  ↓
WASM processes audio
  ↓
Convert result format
  ↓
Return TranscriptionResponse
  ↓
MarkdownProcessor.generate()
  ↓
Save to vault
```

## Format Conversion

The local transcriber returns results in transcribe.js format, which differs from whisper.cpp server format:

### transcribe.js Format
```typescript
{
  result: { language: "en" },
  transcription: [{
    text: " Hello world",
    offsets: { from: 0, to: 1000 },  // milliseconds
    timestamps: { from: "00:00:00,000", to: "00:00:01,000" },
    tokens: [{ text: " Hello", id: 123, p: 0.95, ... }]
  }]
}
```

### Vox TranscriptionResponse Format
```typescript
{
  text: " Hello world",
  language: "en",
  segments: [{
    id: 0,
    start: 0.0,  // seconds
    end: 1.0,
    text: " Hello world",
    tokens: [123, ...],
    temperature: 0,
    avg_logprob: -0.5,
    no_speech_prob: 0,
    words: [{ word: " Hello", start: 0.0, end: 0.5, t_dtw: 0, probability: 0.95 }]
  }]
}
```

The LocalWhisperTranscriber handles this conversion automatically.

## Performance

Local WASM transcription performance depends on:

- CPU speed
- Model size (tiny < base < small)
- Audio length
- Browser WASM optimization

Typical performance:
- **tiny**: ~2-3x real-time
- **base**: ~3-4x real-time  
- **small**: ~5-6x real-time

## Browser Requirements

- **SharedArrayBuffer** support
- **WASM SIMD** support (for optimal performance)
- Modern browser (Chromium 90+, Firefox 89+)

The default WASM build uses SIMD. A `no-simd` fallback is available in the package but not currently used.

## Limitations

1. **Model Size**: Large models (medium, large) may not work well in browser due to memory constraints
2. **Audio Length**: Very long audio files (>60 minutes) may cause performance issues
3. **Mobile**: Performance on mobile devices may be limited
4. **Initialization Time**: Model loading can take 10-30 seconds on first use

## Error Handling

Common errors and solutions:

### "Model path is required"
- User must specify a model file path in settings
- Solution: Download model and set path

### "Failed to load model"
- Model file not found at specified path
- Solution: Check path, ensure file exists and is readable

### "Transcriber not initialized"
- Init failed or was not called
- Solution: Check model file, check browser compatibility

### Memory Errors
- Model too large or audio file too long
- Solution: Use smaller model or split audio

## Testing

The local transcription mode is covered by:

1. **Unit tests** (`tests/unit/settings.test.ts`)
   - Settings structure validation
   - Transcription mode configuration
   - Model path handling

2. **Integration tests** (future)
   - End-to-end transcription flow
   - Format conversion validation
   - Error handling scenarios

## Future Enhancements

Possible improvements:

1. **Progress Reporting**: Show WASM transcription progress in UI
2. **Model Caching**: Cache loaded models between sessions
3. **SIMD Detection**: Automatically select SIMD/no-SIMD build
4. **Streaming**: Support streaming transcription for long files
5. **Worker Offload**: Run WASM in dedicated worker for better UI responsiveness
6. **Model Management**: Built-in model downloader and manager

## References

- [@transcribe/transcriber](https://www.npmjs.com/package/@transcribe/transcriber)
- [@transcribe/shout](https://www.npmjs.com/package/@transcribe/shout)
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp)
- [transcribe.js documentation](https://transcribejs.dev)
