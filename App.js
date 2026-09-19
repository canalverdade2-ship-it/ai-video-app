import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { GeminiService } from './src/services/GeminiService';
import { MediaService } from './src/services/MediaService';
import { FFmpegService } from './src/services/FFmpegService';

export default function App() {
  const [screen, setScreen] = useState('HOME');
  const [prompt, setPrompt] = useState('');
  const [statusText, setStatusText] = useState('');
  const [scriptData, setScriptData] = useState(null);
  const [videoUri, setVideoUri] = useState(null);
  const [geminiKey, setGeminiKey] = useState('');
  const [pexelsKey, setPexelsKey] = useState('');

  const ffmpegService = new FFmpegService();

  useEffect(() => {
    MediaLibrary.requestPermissionsAsync();
    const loadKeys = async () => {
      const gKey = await AsyncStorage.getItem('GEMINI_KEY');
      const pKey = await AsyncStorage.getItem('PEXELS_KEY');
      if (gKey) setGeminiKey(gKey);
      if (pKey) setPexelsKey(pKey);
    };
    loadKeys();
  }, []);

  const handleSaveKeys = async () => {
    await AsyncStorage.setItem('GEMINI_KEY', geminiKey);
    await AsyncStorage.setItem('PEXELS_KEY', pexelsKey);
    Alert.alert("Sucesso", "Chaves salvas!");
    setScreen('HOME');
  };

  const handleGenerateScript = async () => {
    if (!prompt.trim()) return Alert.alert("Ops", "Digite sobre o que será o vídeo!");
    if (!geminiKey) return Alert.alert("Ops", "Configure sua chave Gemini em Config!");

    setScreen('RENDER');
    setStatusText('Roteirizando com IA...');
    
    try {
      const gemini = new GeminiService(geminiKey);
      const script = await gemini.generateScript(prompt, true);
      setScriptData(script);
      setScreen('SCRIPT');
    } catch (e) {
      Alert.alert("Erro", "Falha ao gerar roteiro: " + e.message);
      setScreen('HOME');
    }
  };

  const handleRenderVideo = async () => {
    if (!pexelsKey) return Alert.alert("Ops", "Configure sua chave Pexels em Config!");

    setScreen('RENDER');
    try {
      const downloadedClips = [];
      const mediaService = new MediaService(pexelsKey);
      
      for (let i = 0; i < scriptData.scenes.length; i++) {
        const scene = scriptData.scenes[i];
        setStatusText(`Baixando cena ${i+1}/${scriptData.scenes.length}...`);
        
        const videoUrl = await mediaService.searchPexelsVideo(scene.search_keywords);
        if (videoUrl) {
          const localUri = await mediaService.downloadMedia(videoUrl, `scene_${i}.mp4`);
          if (localUri) downloadedClips.push(localUri);
        }
      }

      if (downloadedClips.length === 0) {
        throw new Error("Nenhum vídeo encontrado.");
      }

      setStatusText('Preparando vídeo final...');
      const finalName = `Final_${Date.now()}.mp4`;
      const resultUri = await ffmpegService.renderVideo(downloadedClips, finalName, () => {});

      // Salvar na galeria automaticamente
      await MediaLibrary.saveToLibraryAsync(resultUri);
      setVideoUri(resultUri);
      setScreen('PLAYER');

    } catch (e) {
      Alert.alert("Erro", e.message);
      setScreen('HOME');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Motor Cinematográfico</Text>
        {screen === 'HOME' && (
          <TouchableOpacity style={styles.configButton} onPress={() => setScreen('SETTINGS')}>
            <Text style={styles.configText}>⚙️ Config</Text>
          </TouchableOpacity>
        )}
      </View>

      {screen === 'SETTINGS' && (
        <ScrollView style={styles.content}>
          <Text style={styles.title}>Configurações</Text>
          <Text style={styles.subtitle}>Cole suas chaves de API.</Text>
          
          <Text style={styles.label}>Google Gemini API Key:</Text>
          <TextInput
            style={[styles.input, {minHeight: 50, marginBottom: 16}]}
            placeholder="AIzaSy..."
            placeholderTextColor="#94A3B8"
            value={geminiKey}
            onChangeText={setGeminiKey}
          />

          <Text style={styles.label}>Pexels API Key:</Text>
          <TextInput
            style={[styles.input, {minHeight: 50}]}
            placeholder="563492..."
            placeholderTextColor="#94A3B8"
            value={pexelsKey}
            onChangeText={setPexelsKey}
          />

          <View style={styles.keyStatus}>
            <Text style={styles.keyStatusText}>Gemini: {geminiKey ? '✅' : '❌'}</Text>
            <Text style={styles.keyStatusText}>Pexels: {pexelsKey ? '✅' : '❌'}</Text>
          </View>
          
          <TouchableOpacity style={styles.buttonPrimary} onPress={handleSaveKeys}>
            <Text style={styles.buttonText}>Salvar Chaves</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.buttonPrimary, styles.buttonSecondary]} onPress={() => setScreen('HOME')}>
            <Text style={[styles.buttonText, {color: '#2563EB'}]}>Voltar</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {screen === 'HOME' && (
        <View style={styles.content}>
          <Text style={styles.title}>Criar Novo Vídeo</Text>
          <Text style={styles.subtitle}>O que você quer que a IA crie hoje?</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Ex: Curiosidades sobre buracos negros..."
            placeholderTextColor="#94A3B8"
            multiline
            value={prompt}
            onChangeText={setPrompt}
          />
          
          <TouchableOpacity style={styles.buttonPrimary} onPress={handleGenerateScript}>
            <Text style={styles.buttonText}>🎬 Gerar Roteiro</Text>
          </TouchableOpacity>

          {!geminiKey && (
            <Text style={styles.warningText}>⚠️ Configure suas chaves em "Config"</Text>
          )}
        </View>
      )}

      {screen === 'SCRIPT' && scriptData && (
        <ScrollView style={styles.scrollContent}>
          <Text style={styles.title}>Roteiro Gerado</Text>
          <Text style={styles.subtitle}>{scriptData.title}</Text>
          
          {scriptData.scenes.map((s, idx) => (
            <View key={idx} style={styles.card}>
              <Text style={styles.cardTitle}>Cena {idx + 1}</Text>
              <Text style={styles.cardText}><Text style={styles.bold}>Busca:</Text> {s.search_keywords}</Text>
              <Text style={styles.cardText}><Text style={styles.bold}>Narração:</Text> {s.narration_text}</Text>
            </View>
          ))}

          <TouchableOpacity style={styles.buttonPrimary} onPress={handleRenderVideo}>
            <Text style={styles.buttonText}>🎥 Renderizar Vídeo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.buttonPrimary, styles.buttonSecondary]} onPress={() => setScreen('HOME')}>
            <Text style={[styles.buttonText, {color: '#2563EB'}]}>Cancelar</Text>
          </TouchableOpacity>
          <View style={{height: 40}} />
        </ScrollView>
      )}

      {screen === 'RENDER' && (
        <View style={[styles.content, styles.center]}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>{statusText}</Text>
        </View>
      )}

      {screen === 'PLAYER' && (
        <View style={[styles.content, styles.center]}>
          <Text style={styles.title}>✅ Vídeo Salvo!</Text>
          <Text style={styles.subtitle}>O vídeo foi salvo automaticamente na sua Galeria.</Text>
          <Text style={styles.subtitle}>Abra o app "Galeria" ou "Fotos" para assistir.</Text>
          
          <TouchableOpacity style={styles.buttonPrimary} onPress={() => { setPrompt(''); setScreen('HOME'); }}>
            <Text style={styles.buttonText}>🎬 Criar Outro Vídeo</Text>
          </TouchableOpacity>
        </View>
      )}

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 24, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  configButton: { position: 'absolute', right: 20, top: 56 },
  configText: { color: '#2563EB', fontWeight: '600', fontSize: 14 },
  content: { flex: 1, padding: 24 },
  scrollContent: { flex: 1, padding: 24 },
  center: { justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: '#1E293B', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#64748B', marginBottom: 24, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 16, fontSize: 16, color: '#334155', minHeight: 120, textAlignVertical: 'top', marginBottom: 24, elevation: 2 },
  buttonPrimary: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12, elevation: 4 },
  buttonSecondary: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', elevation: 0 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#3B82F6', marginBottom: 8 },
  cardText: { fontSize: 14, color: '#475569', marginBottom: 4 },
  bold: { fontWeight: '700', color: '#1E293B' },
  loadingText: { marginTop: 24, fontSize: 18, fontWeight: '600', color: '#1E293B', textAlign: 'center' },
  warningText: { marginTop: 12, fontSize: 14, color: '#EF4444', textAlign: 'center' },
  keyStatus: { backgroundColor: '#F1F5F9', borderRadius: 8, padding: 12, marginBottom: 24 },
  keyStatusText: { fontSize: 14, color: '#475569', marginBottom: 4 },
});
