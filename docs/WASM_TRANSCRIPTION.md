# Embedded WASM Transcription Guide

This guide provides detailed instructions for using Obsidian VOX with embedded WebAssembly transcription powered by whisper.cpp.

## Overview

Embedded WASM transcription allows you to transcribe audio files completely offline, with no network requests and maximum privacy. The transcription runs entirely in your browser using WebAssembly, powered by [transcribe.js](https://github.com/transcribejs/transcribe.js).

## Prerequisites

- Obsidian installed on your device
- VOX plugin installed and enabled
- At least 500MB of free disk space for model files
- Sufficient RAM for the model size you choose (2GB minimum recommended)

## Step-by-Step Setup

### 1. Download a Whisper Model

Visit the [Hugging Face whisper.cpp models repository](https://huggingface.co/ggerganov/whisper.cpp/tree/main) and download a GGML model file.

**Recommended Models:**

For English transcription:
- `ggml-base.en.bin` - Best balance of speed and quality (~140 MB)
- `ggml-tiny.en.bin` - Fastest option for quick notes (~75 MB)
- `ggml-small.en.bin` - Better quality for important recordings (~460 MB)

For multilingual support:
- `ggml-base.bin` - Supports multiple languages (~140 MB)
- `ggml-small.bin` - Better multilingual quality (~460 MB)

### 2. Create Models Directory

In your Obsidian vault, create a directory to store your model files:

```
Your Vault/
├── .obsidian/
│   └── models/          ← Create this folder
└── Voice/
    └── unprocessed/
```

### 3. Move Model to Vault

1. Open your vault's folder in your file system
2. Navigate to `.obsidian/models/`
3. Copy or move the downloaded GGML model file here
4. The final path should look like: `.obsidian/models/ggml-base.en.bin`

### 4. Configure VOX Settings

1. Open Obsidian
2. Go to Settings (gear icon) → VOX
3. Scroll to the **"Transcription Backend"** section
4. Enable **"Use Embedded WASM Transcription"**
5. Set **"WASM Model File Path"** to: `.obsidian/models/ggml-base.en.bin`
6. Select the appropriate **"Model Size"** (e.g., "Base" for base model)

### 5. Test Transcription

1. Place a short audio file in your watch directory
2. VOX will automatically process it using WASM transcription
3. Check the output directory for the transcribed markdown file

## Usage Tips

### Model Selection

- **Tiny** (~75 MB): Fastest, good for quick notes
- **Base** (~140 MB): Recommended for general use
- **Small** (~460 MB): Better accuracy
- **Medium** (~1.5 GB): Professional quality
- **Large** (~2.9 GB): Maximum quality

### Performance

WASM transcription runs in your browser and is slower than GPU-accelerated transcription but offers:
- Complete privacy (no network requests)
- Offline operation
- Unlimited transcriptions

## Troubleshooting

**Model not found**: Verify the model path in settings matches the actual file location

**Slow transcription**: Use a smaller model or consider self-hosted whisper.cpp for GPU acceleration

**Quality issues**: Use a larger model or ensure clear audio recordings

## FAQ

**Q: Does WASM work offline?**
A: Yes, once the model is downloaded, transcription works completely offline.

**Q: Can I use WASM on mobile?**
A: Yes, though performance varies by device.

**Q: How does WASM compare to self-hosted?**
A: WASM is easier to set up but slower. Self-hosted with GPU is much faster.

For more details, see the main [README.md](../README.md).
