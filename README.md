# Obsidian Vox - Smart Voice Transcription

VOX automatically transcribes the audio notes in your Obsidian vault - extracting metadata, categories and tag information. The transcribed text is then placed into its final directory with its accompanying metadata (frontmatter) and tags.

![readme_visual_1800](https://github.com/vincentbavitz/obsidian-vox/assets/58160433/10528b09-ab04-49e3-8b24-06457d7abb57)

The *unprocessed* directory is watched for new files; upon discovering a new file it will trigger the transcription and save the file to your vault.

## Transcription Options

**Self-Hosted (Recommended)**: Use [whisper.cpp](https://github.com/ggerganov/whisper.cpp) for completely private, unlimited, and free transcription on your own machine. See [Self-Hosting with Whisper.cpp](#self-hosting-with-whisper.cpp) for setup instructions.

**Public API**: For quick setup, use the public transcription service (limited to 100 transcriptions per day). Files are only held in memory as buffers and are not saved to disk on the server. No personal information is collected or processed.

***Please note** that at this moment, the transcription model is fine-tuned for English and may struggle with other languages.*

#### Status View

Open the status panel to see the current status of your transcription queue.

![obsidian-vox-sidebar-example](https://github.com/user-attachments/assets/1291c3c0-7e4e-4c4e-900e-59ad7b8e3c17)




## Motivation

Voice memos are a very convenient and efficient medium to formulate and explicate your ideas. However they suffer from the major drawback that they are not plaintext and cannot be indexed, searched, sorted or categorized.

As your collection of raw voice notes grows, your ability to search through them for important information shrinks. An enormous directory of thousands of audio files is no way to organise our notes. VOX solves this problem by pulling out the important information from your voice notes and intelligently categorizing them (see #Categorization below).


## Instructions

<!-- ### Setting Up The Backend

See [obsidian-vox-backend](https://github.com/vincentbavitz/obsidian-vox-backend) for detailed setup instructions - then simply update the Obsidian plugin setting "*Self Hosted Backend Location*" to your backend's domain or IP and port. You may also run the backend locally and point your backend to `127.0.0.1:1337`.

> @note - Systems with less than 8GB of memory may struggle when transcribing audio files over 50MB. -->

### In Obsidian

1. Enable VOX in Obsidian plugins
2. Update the plugin settings to suit your input/output folders for your voice notes.
3. Move a voice note over to your watch directory (eg `<Vault>/Voice/unprocessed`) as a test file

#### Example Setup - Mobile Only

> - Phone records voice memos using a voice recorder app, saving the files to `<mobile>/path/to/obsidian/your/watch/folder`
> - Mobile Obsidian app transcribes the voice notes

#### Example Setup - Mobile First Desktop Sync

> - Phone records voice memos using voice recorder app saving to a location on the phone
> - Using RSync or Syncthing or another synchronisation tool, phone syncs voice notes to `<desktop>/path/to/obsidian/your/watch/folder`
> - Desktop Obsidian app transcribes the voice notes

#### Example Setup - Desktop First

> - Desktop/Laptop records voice memo and saves the file directly into Obsidian vault's VOX watch folder
> - Desktop Obsidian app transcribes the voice notes


## Categorization
When saving your voice notes, you may prefix the filename with a special categorization token. This allows VOX to organise your voice notes into distinct categories and importance ratings.

For example, you might find that a voice note of your wedding is an importance of 5/5 while a ramble about your work might be a 1/5 in importance. We could categorize these by setting their filenames like so:

- `R5LN Wedding Night With Charlotte.mp3` -> Importance rating of *5/5* in the category of *Life Note*
- `R1RM Ramble about work issues.mp3` -> Importance rating of *1/5* in the category of *Ramble*

See below for a more detailed explanation.

### Importance Rankings

The convention is to prefix your voice memo filename with R{digit} from R1 -> R5 where the digit
is an importance rating between 1 and 5.

Thusly a standard filename is of the following format: `R{importance}{category} {title}.{extension}`

### Voice Memo Categories

Voice memo filenames should be prefixed with their category in order to organise them appropriately.
Here is a list of example categories along with their prefixes...

- LN - Life Note
- IN - Insight
- DR - Dream
- RE - Relationships
- RM - Ramble
- RN - Rant
- PH - Philosophising
- PO - Political

You may set your own categorization map in the settings - the sky's the limit!

## Roadmap

#### Templates

Allowing users to build their own templates using shortcodes such as `{{ tags }}`, `{{ transcript }}`, `{{ category }}`.

#### AI Summaries & Extras

In the near-future, VOX will add the open-source Llama model to its backend to fascilitate...

- even smarter tag extraction
- optionally outputting summaries in the transcribed text to get an overview of the topic matter


#### Built In Audio Recorder

A built in audio recorder would prompt users for the voice note category and importance rating after a voice note is made, then automatically transcribe it and place it in the right place in their Vault.

## Self-Hosting with Whisper.cpp

VOX now supports self-hosted transcription using [whisper.cpp](https://github.com/ggerganov/whisper.cpp), giving you complete privacy and control over your voice transcriptions. With self-hosting, your audio files never leave your computer, and you have unlimited transcriptions at no cost.

### Benefits of Self-Hosting

- 🔒 **Privacy**: Audio stays on your machine
- 💰 **No Cost**: No subscription or API fees
- 🚀 **Unlimited**: No daily transcription limits
- 🎛️ **Control**: Choose your model and parameters
- ⭐ **Features**: Word-level timestamps and language detection

### Quick Start with Whisper.cpp

#### 1. Install Whisper.cpp Server

```bash
# Clone whisper.cpp
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp

# Build the server
make server

# Download a model (base.en recommended for English)
./models/download-ggml-model.sh base.en
```

#### 2. Start the Server

```bash
# Start on default port 8080
./server -m models/ggml-base.en.bin

# Or specify a custom port
./server -m models/ggml-base.en.bin --port 8081
```

#### 3. Configure VOX

1. Open Obsidian Settings → VOX
2. Enable **"Use Self-Hosted Backend"**
3. Set **"Self Hosted Backend Location"** to: `http://127.0.0.1:8080`
4. Adjust **Whisper Settings** (optional):
   - **Temperature**: Controls randomness (0.0 = deterministic)
   - **Temperature Increment**: Fallback increment for retries

#### 4. Start Transcribing

Place audio files in your watch directory, and VOX will automatically transcribe them using your local whisper.cpp server!

### Model Selection

Choose a model based on your needs:

| Model | Speed | Quality | RAM Required | Best For |
|-------|-------|---------|--------------|----------|
| tiny  | Fastest | Basic | ~390 MB | Quick notes |
| base  | Fast | Good | ~440 MB | General use ⭐ |
| small | Medium | Better | ~860 MB | Higher quality |
| medium | Slow | Great | ~2.9 GB | Professional |
| large | Slowest | Best | ~6.9 GB | Maximum quality |

### Testing with Mock Server

For development and testing without installing whisper.cpp:

```bash
# Start the mock server
node project/mock-whisper-server.js

# Configure VOX to use: http://127.0.0.1:8081
```

The mock server returns realistic test data instantly, perfect for plugin development.

### Troubleshooting

**Connection Issues**
- Ensure whisper.cpp server is running
- Verify the URL and port in VOX settings
- Check firewall settings for localhost connections

**Slow Transcription**
- Try a smaller model (base or tiny)
- Ensure sufficient RAM is available
- Close other memory-intensive applications

**Quality Issues**
- Use a larger model (small, medium, or large)
- Ensure audio files are clear and well-recorded
- Try adjusting the temperature setting

### Advanced Configuration

**Custom Models**: Point to any GGML model file with the `-m` flag

**Language Support**: Use multilingual models for non-English transcription

**Performance Tuning**: Adjust `--threads` parameter based on your CPU

For more details, see the [whisper.cpp documentation](https://github.com/ggerganov/whisper.cpp).

---

### Legacy Public API

The original cloud transcription service is still available with a limit of 100 transcriptions per day. Simply leave "Use Self-Hosted Backend" disabled to use the public API.

*Note: The transcription model is fine-tuned for English and may struggle with other languages.*
