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
   * Limpa o caminho tirando o file:// para o FFmpeg
   */
  cleanPath(uri) {
    return uri ? uri.replace('file://', '') : '';
  }

  /**
   * Passo 1: Une 1 Vídeo com 1 Áudio (Narração)
   */
  async combineVideoAndTTS(videoUri, ttsUri, index) {
    const outputName = this.tempDir + `scene_mixed_${index}.mp4`;
    const cleanVideo = this.cleanPath(videoUri);
    const cleanTTS = this.cleanPath(ttsUri);
    const cleanOut = this.cleanPath(outputName);

    // Remove antigo se existir
    const fileInfo = await FileSystem.getInfoAsync(outputName);
    if (fileInfo.exists) await FileSystem.deleteAsync(outputName);

    // Se não tiver narração, apenas copia o vídeo
    if (!ttsUri) {
      await FileSystem.copyAsync({ from: videoUri, to: outputName });
      return outputName;
    }

    try {
      // Mistura vídeo e narração. O vídeo dita a duração.
      await execute([
        '-i', cleanVideo,
        '-i', cleanTTS,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-y', cleanOut
      ]);
      return outputName;
    } catch (e) {
      console.error("Falha ao combinar vídeo e voz:", e);
      // Fallback: copia o vídeo sem áudio
      await FileSystem.copyAsync({ from: videoUri, to: outputName });
      return outputName;
    }
  }

  /**
   * Passo 2: Renderização Cinematográfica Final
   * Concatena todas as cenas e adiciona a música de fundo
   */
  async renderCinematicVideo(sceneClips, ttsClips, musicUri, finalOutputName, onProgress) {
    await this.initCache();
    if (onProgress) onProgress(10);

    // 1. Processa cena por cena (Video + Voz)
    const mixedScenes = [];
    for (let i = 0; i < sceneClips.length; i++) {
      if (onProgress) onProgress(10 + (i * 10)); // 10% a 50%
      const mixed = await this.combineVideoAndTTS(sceneClips[i], ttsClips[i], i);
      mixedScenes.push(mixed);
    }

    // 2. Concatena todas as cenas prontas
    if (onProgress) onProgress(60);
    const listPath = this.tempDir + "concat_list.txt";
    let listContent = "";
    for (const scene of mixedScenes) {
      listContent += `file '${this.cleanPath(scene)}'\n`;
    }
    await FileSystem.writeAsStringAsync(listPath, listContent, { encoding: FileSystem.EncodingType.UTF8 });
    
    const concattedPath = this.tempDir + "concatted.mp4";
    // Remove antigo se existir
    const concatInfo = await FileSystem.getInfoAsync(concattedPath);
    if (concatInfo.exists) await FileSystem.deleteAsync(concattedPath);

    await execute([
      '-f', 'concat',
      '-safe', '0',
      '-i', this.cleanPath(listPath),
      '-c', 'copy',
      '-y', this.cleanPath(concattedPath)
    ]);

    // 3. Adiciona a Música de Fundo (Jamendo)
    if (onProgress) onProgress(80);
    const finalOutputPath = this.tempDir + finalOutputName;
    const fileInfo = await FileSystem.getInfoAsync(finalOutputPath);
    if (fileInfo.exists) await FileSystem.deleteAsync(finalOutputPath);

    if (!musicUri) {
      await FileSystem.copyAsync({ from: concattedPath, to: finalOutputPath });
      if (onProgress) onProgress(100);
      return finalOutputPath;
    }

    try {
      // Mixa a voz (do concatted) com a música de fundo. Volume da música mais baixo.
      await execute([
        '-i', this.cleanPath(concattedPath),
        '-i', this.cleanPath(musicUri),
        '-filter_complex', '[0:a][1:a]amix=inputs=2:duration=first:weights=3 1[a]',
        '-map', '0:v',
        '-map', '[a]',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-y', this.cleanPath(finalOutputPath)
      ]);
    } catch (e) {
      console.error("Falha ao adicionar música:", e);
      // Fallback sem música
      await FileSystem.copyAsync({ from: concattedPath, to: finalOutputPath });
    }

    if (onProgress) onProgress(100);
    return finalOutputPath;
  }
}
