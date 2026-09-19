import * as FileSystem from 'expo-file-system';

export class MediaService {
  constructor(pexelsApiKey) {
    this.pexelsKey = pexelsApiKey;
    this.tempDir = FileSystem.cacheDirectory + "ai_video_media/";
  }

  async initCache() {
    const dirInfo = await FileSystem.getInfoAsync(this.tempDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.tempDir, { intermediates: true });
    }
  }

  async searchPexelsVideo(query) {
    if (!this.pexelsKey) throw new Error("Pexels API Key is missing");

    const response = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=portrait&size=hd&per_page=5`, {
      headers: { Authorization: this.pexelsKey }
    });
    
    const data = await response.json();
    if (data && data.videos && data.videos.length > 0) {
      const video = data.videos[0];
      const videoFile = video.video_files.find(f => f.quality === 'hd') || video.video_files[0];
      return videoFile.link;
    }
    return null;
  }

  async downloadMedia(url, filename) {
    await this.initCache();
    const fileUri = this.tempDir + filename;
    
    const downloadResumable = FileSystem.createDownloadResumable(url, fileUri);
    try {
      const { uri } = await downloadResumable.downloadAsync();
      return uri;
    } catch (e) {
      console.error(e);
      return null;
    }
  }
}
