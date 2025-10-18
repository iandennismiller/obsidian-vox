# UI Changes Summary

## Settings UI Changes

### New: Transcription Mode Section

Located in VOX settings, above the existing "Whisper Settings" section:

```
┌─────────────────────────────────────────────────────┐
│ Transcription Mode                                  │
├─────────────────────────────────────────────────────┤
│ Choose between local (embedded WASM) or remote      │
│ transcription.                                      │
│                                                     │
│ Local: Uses embedded whisper.cpp WASM for privacy- │
│ focused transcription. Runs entirely in browser.   │
│                                                     │
│ Remote: Uses a remote server (self-hosted or       │
│ public API).                                       │
│                                                     │
│ [Transcription Mode ▼]                             │
│   • Local (Embedded WASM)                          │
│   • Remote (Server)                ← Selected      │
└─────────────────────────────────────────────────────┘
```

### When "Local (Embedded WASM)" is selected:

```
┌─────────────────────────────────────────────────────┐
│ Local Model File Path                               │
├─────────────────────────────────────────────────────┤
│ Path to your local GGML model file. Download       │
│ models from Hugging Face.                          │
│                                                     │
│ Recommended: ggml-base.bin or ggml-tiny.bin for    │
│ best performance.                                  │
│                                                     │
│ [/path/to/ggml-base.bin     ] [Browse]            │
│                                                     │
│ Note: Local transcription requires a GGML model    │
│ file downloaded to your computer.                  │
│ Model sizes: tiny (~75MB), base (~142MB),          │
│ small (~466MB).                                    │
└─────────────────────────────────────────────────────┘
```

### When "Remote (Server)" is selected:

The existing self-hosted backend settings appear:

```
┌─────────────────────────────────────────────────────┐
│ Use Self-Hosted Backend                            │
│                                            [ ] OFF  │
├─────────────────────────────────────────────────────┤
│                                                     │
│ When enabled:                                      │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Self Hosted Backend Location                    │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ The location of your self-hosted back-end;      │ │
│ │ supports IP addresses and hostnames.            │ │
│ │                                                 │ │
│ │ Please remember to include your protocol;       │ │
│ │ https:// or http:// and port; 1337.            │ │
│ │                                                 │ │
│ │ [http://10.0.0.1:1337           ]              │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## Settings Flow Diagram

```
User opens VOX Settings
        ↓
┌──────────────────────────────┐
│  Transcription Mode          │
│  [Dropdown ▼]                │
└──────────────────────────────┘
        ↓
   User selects mode
        ↓
    ┌───────┴───────┐
    ↓               ↓
┌──────────┐  ┌──────────────┐
│  Local   │  │   Remote     │
│  (WASM)  │  │  (Server)    │
└──────────┘  └──────────────┘
    ↓               ↓
    ↓         ┌─────────────┐
    ↓         │ Self-hosted?│
    ↓         │  [Toggle]   │
    ↓         └─────────────┘
    ↓               ↓
    ↓         ┌─────┴─────┐
    ↓         ↓           ↓
    ↓      [Yes]        [No]
    ↓         ↓           ↓
    ↓    Server URL   Public API
    ↓    [Input]       (no config)
    ↓
┌─────────────────────┐
│ Model File Path     │
│ [Input] [Browse]    │
└─────────────────────┘
    ↓
User downloads model
from Hugging Face
    ↓
User selects model file
    ↓
Ready to transcribe!
```

## Key UI Elements Added

### 1. Transcription Mode Dropdown
- **Location:** Top of Transcription Mode section
- **Options:** "Local (Embedded WASM)" | "Remote (Server)"
- **Default:** "Remote (Server)" (for backward compatibility)
- **Behavior:** Shows/hides relevant settings based on selection

### 2. Local Model File Path Input
- **Location:** Shown only when "Local" mode selected
- **Components:**
  - Text input for manual path entry
  - "Browse" button to open file picker
  - Helper text with download link
  - Note about model sizes
- **Validation:** None (path validated at runtime)
- **Placeholder:** "/path/to/ggml-base.bin"

### 3. Self-Hosted Backend Toggle (Modified)
- **Location:** Shown only when "Remote" mode selected
- **Behavior:** Same as before, but now conditionally displayed
- **Class:** "self-host-toggle" (used for visibility control)

## Visual Hierarchy

```
Settings Page
├── Recording Settings
├── Transcription Settings
│   ├── Watch Location
│   ├── Transcriptions Output Location
│   ├── Audio Output Format
│   └── Remove Original Audio File
├── Tag Extraction
├── Filename Categorisation
├── Transcription Mode ← NEW!
│   ├── Mode Dropdown ← NEW!
│   ├── [IF LOCAL]
│   │   └── Model Path Input ← NEW!
│   └── [IF REMOTE]
│       ├── Self-Hosted Toggle (existing)
│       └── Backend Location (existing)
├── Whisper Settings
└── File Watching Settings
```

## CSS Classes Used

- `local-mode-setting` - Applied to local mode settings
- `self-host-setting` - Applied to self-host settings
- `self-host-toggle` - Applied to self-host toggle element
- `st-hidden` - Used to hide/show conditional settings
- `st-inline-code` - Styling for inline code snippets
- `setting-item-description` - Used for helper text

## Responsive Behavior

Settings automatically show/hide based on selections:

1. **User selects "Local":**
   - Show: Model path input + browse button
   - Hide: Self-hosted toggle and endpoint input

2. **User selects "Remote":**
   - Show: Self-hosted toggle
   - Hide: Model path input
   - Conditionally show endpoint input if toggle is ON

3. **User toggles Self-hosted:**
   - Show/hide endpoint input accordingly

## Accessibility

- All form elements have proper labels
- Descriptive help text for each setting
- Clear visual hierarchy
- Keyboard navigable
- File picker accessible via button
