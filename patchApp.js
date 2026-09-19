const fs = require('fs');

let code = fs.readFileSync('App.js', 'utf8');

// Add AsyncStorage import
if (!code.includes('AsyncStorage')) {
  code = code.replace(
    "import * as MediaLibrary from 'expo-media-library';",
    "import * as MediaLibrary from 'expo-media-library';\nimport AsyncStorage from '@react-native-async-storage/async-storage';"
  );
}

// Add state for keys
if (!code.includes('geminiKey')) {
  code = code.replace(
    "const [videoUri, setVideoUri] = useState(null);",
    "const [videoUri, setVideoUri] = useState(null);\n  const [geminiKey, setGeminiKey] = useState('');\n  const [pexelsKey, setPexelsKey] = useState('');"
  );
}

// Change services init inside functions to get latest state
// Remove global initialization and put it inside the functions!
code = code.replace("const gemini = new GeminiService(CONFIG.GEMINI_API_KEY);", "");
code = code.replace("const mediaService = new MediaService(CONFIG.PEXELS_API_KEY);", "");
code = code.replace("const ffmpegService = new FFmpegService();", "const ffmpegService = new FFmpegService();"); // keep this one

// Load keys on boot
if (!code.includes('loadKeys')) {
  code = code.replace(
    "MediaLibrary.requestPermissionsAsync();",
    "MediaLibrary.requestPermissionsAsync();\n    const loadKeys = async () => {\n      const gKey = await AsyncStorage.getItem('GEMINI_KEY');\n      const pKey = await AsyncStorage.getItem('PEXELS_KEY');\n      if (gKey) setGeminiKey(gKey);\n      if (pKey) setPexelsKey(pKey);\n    };\n    loadKeys();"
  );
}

// Save keys fn
const saveKeysFn = `
  const handleSaveKeys = async () => {
    await AsyncStorage.setItem('GEMINI_KEY', geminiKey);
    await AsyncStorage.setItem('PEXELS_KEY', pexelsKey);
    Alert.alert("Sucesso", "Chaves salvas na memória!");
    setScreen('HOME');
  };
`;
if (!code.includes('handleSaveKeys')) {
  code = code.replace("const handleGenerateScript = async () => {", saveKeysFn + "\n  const handleGenerateScript = async () => {");
}

// Fix handleGenerateScript and handleRenderVideo to instantiate locally
code = code.replace(
  "const script = await gemini.generateScript(prompt, true);",
  "const gemini = new GeminiService(geminiKey || CONFIG.GEMINI_API_KEY);\n      const script = await gemini.generateScript(prompt, true);"
);
code = code.replace(
  "const videoUrl = await mediaService.searchPexelsVideo(scene.search_keywords);",
  "const mediaService = new MediaService(pexelsKey || CONFIG.PEXELS_API_KEY);\n        const videoUrl = await mediaService.searchPexelsVideo(scene.search_keywords);"
);

// Add settings button
const headerCode = `      {/* CABEÇALHO */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Motor Cinematográfico</Text>
        {screen === 'HOME' && (
          <TouchableOpacity style={{position: 'absolute', right: 20, top: 60}} onPress={() => setScreen('SETTINGS')}>
            <Text style={{color: '#2563EB', fontWeight: 'bold'}}>Config</Text>
          </TouchableOpacity>
        )}
      </View>`;
code = code.replace(/\{\/\* CABEÇALHO \*\/\}[\s\S]*?<\/View>/m, headerCode);

// Add settings screen
const settingsScreen = `
      {/* TELA: SETTINGS */}
      {screen === 'SETTINGS' && (
        <ScrollView style={styles.content}>
          <Text style={styles.title}>Configurações</Text>
          <Text style={styles.subtitle}>Cole suas chaves de API para gerar os vídeos.</Text>
          
          <Text style={styles.cardTitle}>Google Gemini API Key:</Text>
          <TextInput
            style={[styles.input, {minHeight: 50, marginBottom: 16}]}
            placeholder="AIzaSy..."
            value={geminiKey}
            onChangeText={setGeminiKey}
            secureTextEntry={true}
          />

          <Text style={styles.cardTitle}>Pexels API Key:</Text>
          <TextInput
            style={[styles.input, {minHeight: 50}]}
            placeholder="563492..."
            value={pexelsKey}
            onChangeText={setPexelsKey}
            secureTextEntry={true}
          />
          
          <TouchableOpacity style={styles.buttonPrimary} onPress={handleSaveKeys}>
            <Text style={styles.buttonText}>Salvar Chaves</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.buttonPrimary, styles.buttonSecondary]} onPress={() => setScreen('HOME')}>
            <Text style={[styles.buttonText, {color: '#2563EB'}]}>Voltar</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
`;
if (!code.includes("screen === 'SETTINGS'")) {
  code = code.replace("{/* TELA: SCRIPT */}", settingsScreen + "\n      {/* TELA: SCRIPT */}");
}

fs.writeFileSync('App.js', code, 'utf8');
console.log("App.js patched successfully.");
