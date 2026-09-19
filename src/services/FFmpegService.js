import * as FileSystem from 'expo-file-system';

/**
 * FFmpegService - Versão sem biblioteca nativa
 * Usa a estratégia de concatenação por cópia direta.
 * Os clipes são salvos individualmente e o "vídeo final"
 * é o primeiro clipe (demonstração funcional).
 * 
 * Para edição avançada futura, pode-se usar:
 * - Cloud FFmpeg (AWS Lambda / Google Cloud Run)
 * - ffmpeg.wasm em WebView
 */
export class FFmpegService {
  constructor() {
    this.tempDir = FileSystem.cacheDirectory + "ai_video_renders/";
  }

  async initCache() {
    const dirInfo = await FileSystem.getInfoAsync(this.tempDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.tempDir, { intermediates: true });
    }
  }

  /**
   * "Renderiza" o vídeo final.
   * Sem FFmpeg nativo, copia o melhor clipe como resultado.
   * Os demais clipes ficam disponíveis para salvar na galeria.
   */
  async renderVideo(clips, finalOutputName, onProgress) {
    await this.initCache();
    
    if (!clips || clips.length === 0) {
      throw new Error("Nenhum clipe disponível para renderizar.");
    }

    const finalOutputPath = this.tempDir + finalOutputName;

    // Remove arquivo antigo se existir
    const fileInfo = await FileSystem.getInfoAsync(finalOutputPath);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(finalOutputPath);
    }

    if (onProgress) onProgress(50);

    // Copia o primeiro clipe como "vídeo final"
    await FileSystem.copyAsync({
      from: clips[0],
      to: finalOutputPath,
    });

    if (onProgress) onProgress(100);

    console.log("Vídeo preparado com sucesso!");
    return finalOutputPath;
  }
}
