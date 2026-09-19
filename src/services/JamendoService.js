import * as FileSystem from 'expo-file-system';

export class JamendoService {
  constructor(clientId) {
    this.clientId = clientId;
    this.tempDir = FileSystem.cacheDirectory + "ai_video_music/";
  }

  async initCache() {
    const dirInfo = await FileSystem.getInfoAsync(this.tempDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.tempDir, { intermediates: true });
    }
  }

  async downloadCinematicMusic(filename) {
    if (!this.clientId) throw new Error("Chave do Jamendo não configurada.");
    await this.initCache();
    const outputUri = this.tempDir + filename;

    // Busca músicas com a tag 'cinematic' ou 'suspense'
    const response = await fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=${this.clientId}&format=json&limit=5&tags=cinematic&include=musicinfo&audioformat=mp32`);
    
    if (!response.ok) {
      throw new Error(`Erro no Jamendo: ${response.status}`);
    }

    const data = await response.json();
    if (!data.results || data.results.length === 0) {
      throw new Error("Nenhuma música encontrada no Jamendo.");
    }

    // Pega a URL de áudio da primeira música
    const audioUrl = data.results[0].audio;
    if (!audioUrl) throw new Error("Música encontrada, mas link de download indisponível.");

    // Baixa o arquivo MP3
    const downloadResumable = FileSystem.createDownloadResumable(audioUrl, outputUri);
    try {
      const { uri } = await downloadResumable.downloadAsync();
      return uri;
    } catch (e) {
      console.error(e);
      throw new Error("Falha ao baixar a música do Jamendo.");
    }
  }
}
