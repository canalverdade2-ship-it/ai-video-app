import * as FileSystem from 'expo-file-system';

export class FishService {
  constructor(apiKey, voiceId) {
    this.apiKey = apiKey;
    this.voiceId = voiceId || 'ebcae0266dd1423ca39e3ec8b4e7e43f'; // Padrão se não informado
    this.tempDir = FileSystem.cacheDirectory + "ai_video_tts/";
  }

  async initCache() {
    const dirInfo = await FileSystem.getInfoAsync(this.tempDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.tempDir, { intermediates: true });
    }
  }

  async generateSpeech(text, filename) {
    if (!this.apiKey) throw new Error("Chave do Fish Audio não configurada.");
    await this.initCache();

    const outputUri = this.tempDir + filename;
    
    // Configura a requisição para a API do Fish Audio
    const response = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: text,
        reference_id: this.voiceId
      })
    });

    if (!response.ok) {
      throw new Error(`Erro no Fish Audio: ${response.status}`);
    }

    // Como é um blob (arquivo binário), vamos ler como base64 e salvar no arquivo
    const blob = await response.blob();
    const reader = new FileReader();
    
    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          const base64Data = reader.result.split(',')[1];
          await FileSystem.writeAsStringAsync(outputUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          resolve(outputUri);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
