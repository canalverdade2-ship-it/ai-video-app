import { execute, FFmpegError } from 'ffmpeg-expo';
import * as FileSystem from 'expo-file-system';

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
   * Concatena os clipes baixados em um único arquivo usando a CPU do celular
   */
  async renderVideo(clips, finalOutputName, onProgress) {
    await this.initCache();
    const finalOutputPath = this.tempDir + finalOutputName;

    // Remove arquivo antigo se existir
    const fileInfo = await FileSystem.getInfoAsync(finalOutputPath);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(finalOutputPath);
    }

    if (!clips || clips.length === 0) {
      throw new Error("Nenhum clipe para renderizar.");
    }

    if (onProgress) onProgress(10);

    // Cria o arquivo de lista para concatenação (concat list)
    const listPath = this.tempDir + "concat_list.txt";
    let listContent = "";
    for (const clip of clips) {
      // O ffmpeg espera o caminho limpo sem "file://"
      const cleanPath = clip.replace('file://', '');
      listContent += `file '${cleanPath}'\n`;
    }
    
    await FileSystem.writeAsStringAsync(listPath, listContent, { encoding: FileSystem.EncodingType.UTF8 });
    const cleanListPath = listPath.replace('file://', '');
    const cleanOutputPath = finalOutputPath.replace('file://', '');

    console.log("Executando FFmpeg Nativo (ffmpeg-expo)...");
    if (onProgress) onProgress(40);
    
    try {
      // Usando -c copy para colar os vídeos sem recodificar (super rápido e 100% nativo)
      const result = await execute([
        '-f', 'concat',
        '-safe', '0',
        '-i', cleanListPath,
        '-c', 'copy',
        '-y', cleanOutputPath
      ]);
      
      console.log("Renderização concluída com sucesso. Código:", result.returnCode);
      if (onProgress) onProgress(100);
      return finalOutputPath;

    } catch (error) {
      if (error instanceof FFmpegError) {
        console.error("FFmpeg falhou no hardware:", error.returnCode, error.output);
        throw new Error("Falha nativa no motor de vídeo: " + error.output);
      } else {
        console.error("Erro inesperado no FFmpeg:", error);
        throw new Error("Falha na renderização do vídeo.");
      }
    }
  }
}
