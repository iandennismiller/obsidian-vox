import createModule from "@transcribe/shout";
import { FileTranscriber } from "@transcribe/transcriber";
import { readFile } from "fs/promises";
import { Notice } from "obsidian";
import { FileDetail, TranscriptionResponse } from "types";
import { Logger } from "utils/log";

/**
 * Local whisper.cpp transcription using WASM.
 * This runs entirely in the browser without sending data to any server.
 */
export class LocalWhisperTranscriber {
  private transcriber: FileTranscriber | null = null;
  private isInitialized = false;

  constructor(
    private modelPath: string,
    private logger: Logger,
  ) {}

  /**
   * Check if the transcriber is initialized and ready to use.
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Initialize the WASM transcriber.
   * This needs to be called before transcribing.
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (!this.modelPath) {
      throw new Error("Model path is required for local transcription");
    }

    try {
      this.logger.log("Initializing local whisper.cpp transcriber...");

      // Load model file from filesystem using Node.js fs module
      // This works for files outside the vault in Obsidian/Electron
      let modelData: File | string = this.modelPath;

      // Read the model file from the filesystem
      try {
        console.log(`[LocalWhisperTranscriber] Loading model from: ${this.modelPath}`);
        
        // Use Node.js fs to read the file (works in Electron/Obsidian)
        const buffer = await readFile(this.modelPath);
        
        // Convert Node.js Buffer to Blob and then to File
        const blob = new Blob([buffer], { type: "application/octet-stream" });
        modelData = new File([blob], "model.bin", { type: "application/octet-stream" });
        
        console.log(`[LocalWhisperTranscriber] Model file loaded successfully, size: ${buffer.length} bytes`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error(`[LocalWhisperTranscriber] Failed to read model file:`, error);
        throw new Error(`Failed to read model file from ${this.modelPath}: ${errorMsg}`);
      }

      // Create a custom module configuration for Emscripten
      // This handles worker file location in Obsidian's bundled environment
      const customCreateModule = async (moduleArg: any = {}) => {
        console.log("[LocalWhisperTranscriber] ===== Creating WASM module with custom config =====");
        
        // Embed the worker code as a Blob URL to avoid file:// sandboxing issues
        // The worker file is extremely small and can be embedded inline
        const workerCode = `"use strict";var Module={};var initializedJS=false;function threadPrintErr(...args){var text=args.join(" ");console.error(text)}function threadAlert(...args){var text=args.join(" ");postMessage({cmd:"alert",text:text,threadId:Module["_pthread_self"]()})}var err=threadPrintErr;self.alert=threadAlert;Module["instantiateWasm"]=(info,receiveInstance)=>{var module=Module["wasmModule"];Module["wasmModule"]=null;var instance=new WebAssembly.Instance(module,info);return receiveInstance(instance)};self.onunhandledrejection=e=>{throw e.reason||e};function handleMessage(e){try{if(e.data.cmd==="load"){let messageQueue=[];self.onmessage=e=>messageQueue.push(e);self.startWorker=instance=>{Module=instance;postMessage({"cmd":"loaded"});for(let msg of messageQueue){handleMessage(msg)}self.onmessage=handleMessage};Module["wasmModule"]=e.data.wasmModule;for(const handler of e.data.handlers){Module[handler]=(...args)=>{postMessage({cmd:"callHandler",handler:handler,args:args})}}Module["wasmMemory"]=e.data.wasmMemory;Module["buffer"]=Module["wasmMemory"].buffer;Module["ENVIRONMENT_IS_PTHREAD"]=true;(e.data.urlOrBlob?import(e.data.urlOrBlob):import("./shout.wasm.js")).then(exports=>exports.default(Module))}else if(e.data.cmd==="run"){Module["__emscripten_thread_init"](e.data.pthread_ptr);Module["__emscripten_thread_mailbox_await"](e.data.pthread_ptr);Module["establishStackSpace"]();Module["PThread"].threadInitTLS();if(!initializedJS){Module["__embind_initialize_bindings"]();initializedJS=true}try{Module["invokeEntryPoint"](e.data.start_routine,e.data.arg)}catch(ex){if(ex!="unwind"){throw ex}}}else if(e.data.cmd==="cancel"){if(Module["_pthread_self"]()){Module["__emscripten_thread_exit"](e.data.exitCode)}}else if(e.data.target==="setimmediate"){}else if(e.data.cmd==="checkMailbox"){if(initializedJS){Module["checkMailbox"]()}}else if(e.data.cmd){err(\`worker.js received unknown command \${e.data.cmd}\`);err(e.data)}}catch(ex){Module["__emscripten_thread_crashed"]?.();throw ex}}self.onmessage=handleMessage;`;
        
        // Create a Blob URL from the worker code
        const workerBlob = new Blob([workerCode], { type: "application/javascript" });
        const workerUrl = URL.createObjectURL(workerBlob);
        
        console.log(`[LocalWhisperTranscriber] Created worker Blob URL: ${workerUrl}`);
        console.log(`[LocalWhisperTranscriber] Worker code size: ${workerCode.length} bytes`);
        
        try {
          console.log(`[LocalWhisperTranscriber] *** SETTING pthreadMainJs to Blob URL ***`);
          moduleArg.pthreadMainJs = workerUrl;
          console.log(`[LocalWhisperTranscriber] Verification - moduleArg.pthreadMainJs = ${moduleArg.pthreadMainJs}`);
        } catch (error) {
          console.error(`[LocalWhisperTranscriber] Error setting worker URL:`, error);
        }
        
        // Provide locateFile to help Emscripten find other files if needed
        moduleArg.locateFile = (path: string, scriptDirectory: string) => {
          console.log(`[LocalWhisperTranscriber] locateFile called:`);
          console.log(`  - path: "${path}"`);
          console.log(`  - scriptDirectory: "${scriptDirectory}"`);
          
          const resolvedPath = scriptDirectory + path;
          console.log(`  - Resolved path: "${resolvedPath}"`);
          return resolvedPath;
        };
        
        console.log("[LocalWhisperTranscriber] Calling original createModule with moduleArg:", Object.keys(moduleArg));
        const module = await createModule(moduleArg);
        console.log("[LocalWhisperTranscriber] createModule completed");
        console.log("[LocalWhisperTranscriber] module.pthreadMainJs:", module.pthreadMainJs);
        return module;
      };

      this.transcriber = new FileTranscriber({
        createModule: customCreateModule,
        model: modelData,
        print: (message: string) => {
          console.debug("[Whisper WASM]", message);
        },
        printErr: (message: string) => {
          console.error("[Whisper WASM Error]", message);
        },
        onReady: () => {
          this.logger.log("Local whisper.cpp transcriber ready");
        },
        onProgress: (progress: number) => {
          console.debug(`[Whisper WASM] Progress: ${progress}%`);
        },
      });

      await this.transcriber.init();
      this.isInitialized = true;

      new Notice("Local whisper.cpp transcriber initialized successfully");
      this.logger.log("Local whisper.cpp transcriber initialized successfully");
    } catch (error) {
      this.isInitialized = false;
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      this.logger.log(`Failed to initialize local transcriber: ${errorMsg}`);
      console.error("[LocalWhisperTranscriber] Initialization failed:", error);
      throw new Error(`Failed to initialize local transcriber: ${errorMsg}`);
    }
  }

  /**
   * Transcribe an audio file using the local WASM transcriber.
   */
  async transcribe(audioFile: FileDetail, audioData: ArrayBuffer): Promise<TranscriptionResponse> {
    if (!this.isInitialized || !this.transcriber) {
      throw new Error("Transcriber not initialized. Call init() first.");
    }

    try {
      console.log(`[LocalWhisperTranscriber] ===== Starting transcription =====`);
      console.log(`[LocalWhisperTranscriber] Audio file: ${audioFile.filename}`);
      console.log(`[LocalWhisperTranscriber] Audio data size: ${audioData.byteLength} bytes`);
      console.log(`[LocalWhisperTranscriber] Transcriber initialized: ${this.isInitialized}`);
      
      // Check if the module still has pthreadMainJs set
      if (this.transcriber && (this.transcriber as any).Module) {
        const module = (this.transcriber as any).Module;
        console.log(`[LocalWhisperTranscriber] Module.pthreadMainJs: ${module.pthreadMainJs || 'NOT SET'}`);
      }

      // Convert ArrayBuffer to File object for the transcriber
      const blob = new Blob([audioData], { type: `audio/${audioFile.extension.replace(".", "")}` });
      const file = new File([blob], audioFile.filename, { type: blob.type });
      
      console.log(`[LocalWhisperTranscriber] Created audio file: ${file.name}, size: ${file.size}, type: ${file.type}`);

      // Transcribe using the FileTranscriber
      // Note: Setting threads: 1 may not prevent worker creation during module init
      console.log(`[LocalWhisperTranscriber] About to call transcriber.transcribe() with threads: 1`);
      const result = await this.transcriber.transcribe(file, {
        threads: 1,
      });
      
      console.log(`[LocalWhisperTranscriber] Transcribe call completed successfully`);

      console.log(`[LocalWhisperTranscriber] Transcription complete`);
      console.log(`[LocalWhisperTranscriber] Language: ${result.result.language}`);
      console.log(`[LocalWhisperTranscriber] Segments: ${result.transcription.length}`);

      // Convert the transcribe.js result format to our TranscriptionResponse format
      const transcriptionResponse: TranscriptionResponse = {
        text: result.transcription.map((seg) => seg.text).join(""),
        language: result.result.language,
        segments: result.transcription.map((seg, index) => ({
          id: index,
          start: seg.offsets.from / 1000, // Convert ms to seconds
          end: seg.offsets.to / 1000,
          text: seg.text,
          tokens: seg.tokens.map((t) => t.id),
          temperature: 0,
          avg_logprob: seg.tokens.reduce((sum, t) => sum + Math.log(t.p), 0) / seg.tokens.length,
          no_speech_prob: 0,
          words: seg.tokens.map((t) => ({
            word: t.text,
            start: (t.offsets?.from ?? 0) / 1000,
            end: (t.offsets?.to ?? 0) / 1000,
            t_dtw: t.dtw?.offset ?? 0,
            probability: t.p,
          })),
        })),
      };

      return transcriptionResponse;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("[LocalWhisperTranscriber] Transcription failed:", error);
      throw new Error(`Local transcription failed: ${errorMsg}`);
    }
  }

  /**
   * Clean up resources when done.
   */
  async cleanup(): Promise<void> {
    // The FileTranscriber doesn't provide a cleanup method in the current version
    // but we should reset our state
    this.transcriber = null;
    this.isInitialized = false;
  }
}
