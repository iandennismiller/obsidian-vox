import { MPEGDecoder } from "mpg123-decoder";
import { OggVorbisDecoder } from "@wasm-audio-decoders/ogg-vorbis";
import { FLACDecoder } from "@wasm-audio-decoders/flac";
import * as WavEncoder from "wav-encoder";
import { Logger } from "utils/log";

/**
 * LocalAudioConverter handles client-side audio transcoding using WASM decoders.
 * This replaces the server-side audio conversion API, allowing for privacy-focused
 * audio processing that runs entirely in the Electron environment.
 */
export class LocalAudioConverter {
  constructor(private readonly logger: Logger) {}

  /**
   * Convert an audio file to WAV format required by whisper.cpp server.
   * Supports MP3, OGG, FLAC, and WAV (pass-through) formats.
   * 
   * @param audioBinary - The input audio file as an ArrayBuffer
   * @param extension - The file extension (e.g., ".mp3", ".ogg")
   * @returns ArrayBuffer containing the WAV file data
   */
  async convertToWav(audioBinary: ArrayBuffer, extension: string): Promise<ArrayBuffer> {
    const normalizedExt = extension.toLowerCase().replace(".", "");

    // If already WAV, return as-is
    if (normalizedExt === "wav") {
      this.logger.log("Audio is already in WAV format, skipping conversion");
      return audioBinary;
    }

    this.logger.log(`Converting ${normalizedExt.toUpperCase()} to WAV format`);

    let audioData: AudioData;

    try {
      switch (normalizedExt) {
        case "mp3":
        case "mp2":
        case "mp1":
          audioData = await this.decodeMp3(audioBinary);
          break;
        case "ogg":
          audioData = await this.decodeOgg(audioBinary);
          break;
        case "flac":
          audioData = await this.decodeFlac(audioBinary);
          break;
        case "m4a":
        case "aac":
          // For M4A/AAC, we'll need to handle these differently
          // For now, throw an error to indicate unsupported format
          throw new Error(
            `${normalizedExt.toUpperCase()} format is not yet supported for local conversion. ` +
            "Please convert to MP3, OGG, FLAC, or WAV format first."
          );
        default:
          throw new Error(`Unsupported audio format: ${normalizedExt}`);
      }

      // Encode to WAV
      const wavData = await this.encodeToWav(audioData);
      this.logger.log(`Successfully converted ${normalizedExt.toUpperCase()} to WAV`);
      
      return wavData;
    } catch (error) {
      this.logger.log(`Error converting audio: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Decode MP3 audio to PCM data using mpg123-decoder
   */
  private async decodeMp3(audioBinary: ArrayBuffer): Promise<AudioData> {
    const decoder = new MPEGDecoder();
    await decoder.ready;

    const uint8Array = new Uint8Array(audioBinary);
    const decoded = await decoder.decode(uint8Array);

    if (!decoded || !decoded.channelData || decoded.channelData.length === 0) {
      throw new Error("Failed to decode MP3: no audio data returned");
    }

    return {
      sampleRate: decoded.sampleRate,
      channelData: decoded.channelData,
    };
  }

  /**
   * Decode OGG Vorbis audio to PCM data using ogg-vorbis decoder
   */
  private async decodeOgg(audioBinary: ArrayBuffer): Promise<AudioData> {
    const decoder = new OggVorbisDecoder();
    await decoder.ready;

    const uint8Array = new Uint8Array(audioBinary);
    const decoded = await decoder.decode(uint8Array);

    if (!decoded || !decoded.channelData || decoded.channelData.length === 0) {
      throw new Error("Failed to decode OGG: no audio data returned");
    }

    return {
      sampleRate: decoded.sampleRate,
      channelData: decoded.channelData,
    };
  }

  /**
   * Decode FLAC audio to PCM data using FLAC decoder
   */
  private async decodeFlac(audioBinary: ArrayBuffer): Promise<AudioData> {
    const decoder = new FLACDecoder();
    await decoder.ready;

    const uint8Array = new Uint8Array(audioBinary);
    const decoded = await decoder.decode(uint8Array);

    if (!decoded || !decoded.channelData || decoded.channelData.length === 0) {
      throw new Error("Failed to decode FLAC: no audio data returned");
    }

    return {
      sampleRate: decoded.sampleRate,
      channelData: decoded.channelData,
    };
  }

  /**
   * Encode PCM audio data to WAV format
   */
  private async encodeToWav(audioData: AudioData): Promise<ArrayBuffer> {
    const wavData = await WavEncoder.encode({
      sampleRate: audioData.sampleRate,
      channelData: audioData.channelData,
    });

    return wavData;
  }
}

/**
 * Internal type for decoded audio data
 */
interface AudioData {
  sampleRate: number;
  channelData: Float32Array[];
}
