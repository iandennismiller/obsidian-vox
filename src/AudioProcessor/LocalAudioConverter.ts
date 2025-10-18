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
   * Supports MP3, OGG, FLAC, M4A, AAC, and WAV (pass-through) formats.
   *
   * @param audioBinary - The input audio file as an ArrayBuffer
   * @param extension - The file extension (e.g., ".mp3", ".ogg", ".m4a")
   * @returns ArrayBuffer containing the WAV file data
   */
  async convertToWav(audioBinary: ArrayBuffer, extension: string): Promise<ArrayBuffer> {
    const normalizedExt = extension.toLowerCase().replace(".", "");

    // If already WAV, return as-is
    if (normalizedExt === "wav") {
      this.logger.log("Audio is already in WAV format, skipping conversion");
      return audioBinary;
    }

    this.logger.log(
      `Starting local conversion: ${normalizedExt.toUpperCase()} -> WAV (${(audioBinary.byteLength / 1024 / 1024).toFixed(2)} MB)`,
    );

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
        case "mp4":
          // Use Web Audio API for M4A/AAC decoding (native browser support)
          audioData = await this.decodeWithWebAudio(audioBinary);
          break;
        default:
          throw new Error(`Unsupported audio format: ${normalizedExt}`);
      }

      this.logger.log(
        `Decoded ${normalizedExt.toUpperCase()}: ${audioData.channelData.length} channels, ${audioData.sampleRate} Hz`,
      );

      // Encode to WAV
      const wavData = await this.encodeToWav(audioData);
      this.logger.log(`Successfully converted to WAV (${(wavData.byteLength / 1024 / 1024).toFixed(2)} MB)`);

      return wavData;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.log(`Error converting audio: ${errorMsg}`);
      throw new Error(`Audio conversion failed: ${errorMsg}`);
    }
  }

  /**
   * Decode MP3 audio to PCM data using mpg123-decoder
   */
  private async decodeMp3(audioBinary: ArrayBuffer): Promise<AudioData> {
    const decoder = new MPEGDecoder();
    await decoder.ready;

    const uint8Array = new Uint8Array(audioBinary);
    const result = await decoder.decode(uint8Array);

    if (!result || !result.channelData || result.channelData.length === 0) {
      throw new Error("Failed to decode MP3: no audio data returned");
    }

    // Free decoder resources
    decoder.free();

    return {
      sampleRate: result.sampleRate,
      channelData: result.channelData,
    };
  }

  /**
   * Decode OGG Vorbis audio to PCM data using ogg-vorbis decoder
   */
  private async decodeOgg(audioBinary: ArrayBuffer): Promise<AudioData> {
    const decoder = new OggVorbisDecoder();
    await decoder.ready;

    const uint8Array = new Uint8Array(audioBinary);
    const result = await decoder.decode(uint8Array);

    if (!result || !result.channelData || result.channelData.length === 0) {
      throw new Error("Failed to decode OGG: no audio data returned");
    }

    // Free decoder resources
    decoder.free();

    return {
      sampleRate: result.sampleRate,
      channelData: result.channelData,
    };
  }

  /**
   * Decode FLAC audio to PCM data using FLAC decoder
   */
  private async decodeFlac(audioBinary: ArrayBuffer): Promise<AudioData> {
    const decoder = new FLACDecoder();
    await decoder.ready;

    const uint8Array = new Uint8Array(audioBinary);
    const result = await decoder.decode(uint8Array);

    if (!result || !result.channelData || result.channelData.length === 0) {
      throw new Error("Failed to decode FLAC: no audio data returned");
    }

    // Free decoder resources
    decoder.free();

    return {
      sampleRate: result.sampleRate,
      channelData: result.channelData,
    };
  }

  /**
   * Decode M4A/AAC audio using Web Audio API (native browser support)
   * This leverages the browser's built-in audio codecs, avoiding the need for additional WASM libraries.
   */
  private async decodeWithWebAudio(audioBinary: ArrayBuffer): Promise<AudioData> {
    // Create an offline audio context for decoding
    // We use a dummy sample rate as it will be overridden by the actual audio data
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    try {
      // Decode the audio data using the browser's native decoder
      const audioBuffer = await audioContext.decodeAudioData(audioBinary.slice(0));

      // Extract channel data
      const channelData: Float32Array[] = [];
      for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
        channelData.push(audioBuffer.getChannelData(i));
      }

      // Close the audio context to free resources
      await audioContext.close();

      return {
        sampleRate: audioBuffer.sampleRate,
        channelData: channelData,
      };
    } catch (error) {
      // Close the audio context even on error
      await audioContext.close();
      throw new Error(
        `Failed to decode audio with Web Audio API: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
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
