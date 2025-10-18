# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [Unreleased]

### Added
- **Local Audio Conversion**: Audio format conversion now happens entirely locally using WebAssembly decoders
  - Added support for MP3/MP2/MP1 decoding via `mpg123-decoder`
  - Added support for OGG Vorbis decoding via `@wasm-audio-decoders/ogg-vorbis`
  - Added support for FLAC decoding via `@wasm-audio-decoders/flac`
  - **Added support for M4A/AAC decoding via Web Audio API** (native browser support)
  - Audio files are automatically converted to WAV format for whisper.cpp transcription
  - No server-side conversion needed - all processing happens on your device
  - Improved privacy: audio files never leave your device during conversion

### Changed
- Audio output format is now fixed to WAV (required by whisper.cpp)
- Audio Output Extension setting is now informational only (WAV is required)
- Removed dependency on server-side `/convert/audio` API endpoint

### Technical Details
- New `LocalAudioConverter` class handles all audio format conversion
- M4A/AAC support uses Web Audio API's `decodeAudioData` for native decoding
- Proper memory management with `decoder.free()` after each conversion
- Enhanced logging with file size information and conversion details
- Comprehensive unit tests for audio conversion logic
- CodeQL security analysis passed with no vulnerabilities

### [1.1.1](https://github.com/vincentbavitz/obsidian-vox/compare/1.1.0...1.1.1) (2024-09-18)

## [1.1.0](https://github.com/vincentbavitz/obsidian-vox/compare/1.0.19...1.1.0) (2024-09-18)

### [1.0.19](https://github.com/vincentbavitz/obsidian-vox/compare/1.0.18...1.0.19) (2024-09-17)

### [1.0.18](https://github.com/vincentbavitz/obsidian-vox/compare/1.0.16...1.0.18) (2024-09-17)

### [1.0.17](https://github.com/vincentbavitz/obsidian-vox/compare/1.0.16...1.0.17) (2024-09-17)

### [1.0.16](https://github.com/vincentbavitz/obsidian-vox/compare/1.0.15...1.0.16) (2024-09-15)

### [1.0.15](https://github.com/vincentbavitz/obsidian-vox/compare/1.0.14...1.0.15) (2024-09-15)

### [1.0.14](https://github.com/vincentbavitz/obsidian-vox/compare/1.0.13...1.0.14) (2024-09-15)

### [1.0.13](https://github.com/vincentbavitz/obsidian-vox/compare/1.0.12...1.0.13) (2024-09-14)

### [1.0.12](https://github.com/vincentbavitz/obsidian-vox/compare/1.0.11...1.0.12) (2024-09-13)

### [1.0.11](https://github.com/vincentbavitz/obsidian-vox/compare/1.0.10...1.0.11) (2023-11-20)

### [1.0.10](https://github.com/vincentbavitz/obsidian-vox/compare/1.0.9...1.0.10) (2023-10-16)

### [1.0.9](https://github.com/vincentbavitz/obsidian-vox/compare/1.0.8...1.0.9) (2023-10-07)

### [1.0.8](https://github.com/vincentbavitz/obsidian-vox/compare/1.0.7...1.0.8) (2023-10-07)

### [1.0.7](https://github.com/vincentbavitz/obsidian-vox/compare/1.0.6...1.0.7) (2023-10-07)

### [1.0.6](https://github.com/vincentbavitz/obsidian-vox/compare/1.0.5...1.0.6) (2023-09-12)

### [1.0.5](https://github.com/vincentbavitz/obsidian-vox/compare/1.0.4...1.0.5) (2023-06-24)

### [1.0.4](https://github.com/vincentbavitz/obsidian-vox/compare/1.0.3...1.0.4) (2023-06-17)

### [1.0.3](https://github.com/vincentbavitz/obsidian-vox/compare/1.0.2...1.0.3) (2023-06-17)

### 1.0.2 (2023-06-16)
