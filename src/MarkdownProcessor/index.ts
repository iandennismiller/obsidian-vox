import matter from "gray-matter";
import startCase from "lodash/startCase";
import { DateTime } from "luxon";
import VoxPlugin from "main";
import { Vault } from "obsidian";
import { Settings } from "settings";
import {
  FileDetail,
  MarkdownOutput,
  RawTranscriptionSegment,
  TranscriptionResponse,
  TranscriptionSegment,
} from "types";
import { categorizeVoiceMemo } from "utils/categorize";
import { getFileCreationDateTime } from "utils/format";
import { Logger } from "utils/log";
import { extractTags } from "utils/tags";
import {
  CATEGORY_REGEX_LEGACY,
  MARKDOWN_DATE_FORMAT,
  RELATIVE_AUDIO_FILE_LOCATION,
  generateCategoryRegex,
} from "../constants";

export class MarkdownProcessor {
  constructor(
    private readonly vault: Vault,
    private settings: Settings,
    private readonly logger: Logger,
    private readonly plugin: VoxPlugin,
  ) {}

  /**
   * Generate markdown content, given a transcription.
   */
  public async generate(
    originalFile: FileDetail,
    processedAudio: FileDetail,
    originalAudioFileHash: string,
    transcription: TranscriptionResponse,
  ): Promise<MarkdownOutput> {
    this.logger.log(`Generating markdown content: ${originalFile.filename}`);

    const fileCreationTime = await getFileCreationDateTime(originalFile, this.vault.adapter);

    const title = this.generateMarkdownTitle(originalFile, fileCreationTime, this.settings);

    const transcribedAtDate = DateTime.now().toFormat(MARKDOWN_DATE_FORMAT);
    const recordedAtDate = fileCreationTime.toFormat(MARKDOWN_DATE_FORMAT);

    const markdownContent = [];

    // Add our title & tags
    markdownContent.push(`\n# ${title}\n\n`);

    // Pull out tags
    if (this.settings.shouldExtractTags) {
      const extractedTags = await extractTags(transcription.text, this.settings);

      const tags = ["#transcribed", ...extractedTags];
      markdownContent.push(`${tags.join(" ")}\n\n`);
    }

    // Embed a link to the transcription as it will be in Obsidian:
    // `<obsidian>/voice/audio/<audio-file>
    markdownContent.push(`![](${RELATIVE_AUDIO_FILE_LOCATION}/${processedAudio.filename})\n\n`);

    const segments = transcription.segments.map(this.objectifySegment);

    // Every four segments, create a new paragraph.
    segments.forEach((segment, i) => {
      markdownContent.push(`${segment.text.trim()} `);

      // Sensible new paragraph spacing
      if (segment.text.trim().endsWith(".") && i % 8 === 0) {
        markdownContent.push("\n\n");
      }
    });

    const frontmatter: Record<string, string | number> = {
      title,
      type: "transcribed",
      recorded_at: recordedAtDate,
      transcribed_at: transcribedAtDate,
      transcribed_vox_version: this.plugin.manifest.version,
      original_file_name: originalFile.filename,
      original_file_hash: originalAudioFileHash,
    };

    // Get categorization and importance ranking
    if (this.settings.shouldUseCategoryMaps) {
      const categorization = categorizeVoiceMemo(originalFile.name, this.settings);

      frontmatter.importance = categorization.importance;
      frontmatter.voice_memo_category = categorization.category?.label ?? "none";
    }

    const markdown = matter.stringify(markdownContent.join(""), frontmatter);

    return {
      title,
      content: markdown,
    };
  }

  public generateMarkdownTitle(file: FileDetail, fileCreationTime: DateTime, settings: Settings) {
    const categoryRegex = generateCategoryRegex(settings);

    // Remove categorization prefix from title
    const tidyTitle = file.name
      .replace(categoryRegex, "")
      .replace(CATEGORY_REGEX_LEGACY, "")
      .replace(/[-]g/, "")
      .trim();

    const titlePrefix = `TXC - ${fileCreationTime.toFormat("yyyy-MM-dd")}`;
    const title = `${titlePrefix} ${startCase(tidyTitle)}`;

    return title;
  }

  private objectifySegment(segment: RawTranscriptionSegment | TranscriptionSegment): TranscriptionSegment {
    // Small snippets can be returned as TranscriptionSegment from the API.
    if (segment.hasOwnProperty("text")) {
      return segment as TranscriptionSegment;
    }

    // Handle legacy array format
    const rawSegment = segment as RawTranscriptionSegment;
    return {
      id: rawSegment[0],
      seek: rawSegment[1],
      start: rawSegment[2],
      end: rawSegment[3],
      text: rawSegment[4],
      tokens: rawSegment[5],
      temperature: rawSegment[6],
      avg_logprob: rawSegment[7],
      compression_ratio: rawSegment[8],
      no_speech_prob: rawSegment[9],
    };
  }
}
