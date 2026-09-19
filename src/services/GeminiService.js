import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiService {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Usando gemini-1.5-flash como fallback moderno já que os mais antigos estão descontinuados
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async generateScript(prompt, autoScenes = false) {
    const sceneInstruction = autoScenes 
      ? `Divida em 3 a 6 cenas baseadas em mudanças visuais na narrativa.` 
      : `Divida em exatamente 4 cenas.`;

    const systemPrompt = `Você é um diretor de curtas. Escreva um roteiro visual para: "${prompt}".
${sceneInstruction}
Retorne SOMENTE um JSON válido com a seguinte estrutura:
{
  "title": "Título Curto",
  "scenes": [
    {
      "scene_id": 1,
      "narration_text": "Texto que o narrador vai falar",
      "search_keywords": "keywords in english for stock video search (e.g., cooking hot pan)",
      "visual_prompt": "Descrição da cena"
    }
  ]
}`;

    try {
      const result = await this.model.generateContent(systemPrompt);
      const responseText = result.response.text();
      
      // Extract JSON from potential markdown fences
      const jsonStr = responseText.replace(/```json\n?|```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error("GeminiService Error:", error);
      throw error;
    }
  }
}
