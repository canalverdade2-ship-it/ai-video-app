import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { GeminiService } from './src/services/GeminiService';
import { MediaService } from './src/services/MediaService';
import { FishService } from './src/services/FishService';
import { JamendoService } from './src/services/JamendoService';
import { FFmpegService } from './src/services/FFmpegService';

export default function App() {
  const [screen, setScreen] = useState('HOME');
  const [prompt, setPrompt] = useState('');
  const [statusText, setStatusText] = useState('');
  const [scriptData, setScriptData] = useState(null);
  const [videoUri, setVideoUri] = useState(null);
  
  // Chaves
  const [geminiKey, setGeminiKey] = useState('');
  const [pexelsKey, setPexelsKey] = useState('');
  const [fishKey, setFishKey] = useState('');
  const [jamendoKey, setJamendoKey] = useState('');

  const ffmpegService = new FFmpegService();

  useEffect(() => {
    const loadKeys = async () => {
      const gKey = await AsyncStorage.getItem('GEMINI_KEY');
      const pKey = await AsyncStorage.getItem('PEXELS_KEY');
      const fKey = await AsyncStorage.getItem('FISH_KEY');
      const jKey = await AsyncStorage.getItem('JAMENDO_KEY');
      if (gKey) setGeminiKey(gKey);
      if (pKey) setPexelsKey(pKey);
      if (fKey) setFishKey(fKey);
      if (jKey) setJamendoKey(jKey);
    };
    loadKeys();
  }, []);

  const handleSaveKeys = async () => {
    await AsyncStorage.setItem('GEMINI_KEY', geminiKey);
    await AsyncStorage.setItem('PEXELS_KEY', pexelsKey);
    await AsyncStorage.setItem('FISH_KEY', fishKey);
    await AsyncStorage.setItem('JAMENDO_KEY', jamendoKey);
    Alert.alert("Sucesso", "Todas as chaves foram salvas!");
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

  const handleRenderCinematic = async () => {
    if (!pexelsKey) return Alert.alert("Ops", "Chave Pexels faltando!");

    setScreen('RENDER');
    try {
      const mediaService = new MediaService(pexelsKey);
      const fishService = fishKey ? new FishService(fishKey) : null;
      const jamendoService = jamendoKey ? new JamendoService(jamendoKey) : null;
      
      const downloadedClips = [];
      const downloadedVoice = [];
      let musicUri = null;

      // 1. Baixar Música de Fundo (se configurado)
      if (jamendoService) {
        setStatusText('Buscando Trilha Sonora (Jamendo)...');
        musicUri = await jamendoService.downloadCinematicMusic(`bgm_${Date.now()}.mp3`);
      }

      // 2. Baixar Cenas e Narração
      for (let i = 0; i < scriptData.scenes.length; i++) {
        const scene = scriptData.scenes[i];
        
        // Vídeo
        setStatusText(`Baixando cena ${i+1}/${scriptData.scenes.length} (Vídeo)...`);
        const videoUrl = await mediaService.searchPexelsVideo(scene.search_keywords);
        if (videoUrl) {
          const localUri = await mediaService.downloadMedia(videoUrl, `scene_${i}.mp4`);
          downloadedClips.push(localUri);
        } else {
          throw new Error(`Não achei vídeo para: ${scene.search_keywords}`);
        }

        // Voz (se configurado)
        if (fishService) {
          setStatusText(`Gerando Narração Neural (Fish) da cena ${i+1}...`);
          try {
             const voiceUri = await fishService.generateSpeech(scene.narration_text, `tts_${i}.m4a`);
             downloadedVoice.push(voiceUri);
          } catch(e) {
             console.log("Erro na voz, pulando:", e);
             downloadedVoice.push(null);
          }
        } else {
          downloadedVoice.push(null);
        }
      }

      // 3. Juntar Tudo com FFmpeg
      setStatusText('A Mágica Acontece: Mixagem Cinematográfica...');
      const finalName = `Cinematic_${Date.now()}.mp4`;
      const resultUri = await ffmpegService.renderCinematicVideo(
        downloadedClips, 
        downloadedVoice, 
        musicUri, 
        finalName, 
        (prog) => setStatusText(`Processando vídeo no seu processador... ${prog}%`)
      );

      setVideoUri(resultUri);
      setScreen('PLAYER');

    } catch (e) {
      Alert.alert("Erro", e.message);
      setScreen('HOME');
    }
  };

  const handleShare = async () => {
    try {
      await Sharing.shareAsync(videoUri);
    } catch (e) {
      Alert.alert("Erro", "Falha ao compartilhar o vídeo.");
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Motor Cinematográfico Completo</Text>
        {screen === 'HOME' && (
          <TouchableOpacity style={styles.configButton} onPress={() => setScreen('SETTINGS')}>
            <Text style={styles.configText}>⚙️ Chaves</Text>
          </TouchableOpacity>
        )}
      </View>

      {screen === 'SETTINGS' && (
        <ScrollView style={styles.content}>
          <Text style={styles.title}>Painel de APIs</Text>
          <Text style={styles.subtitle}>Seu estúdio completo no bolso.</Text>
          
          <Text style={styles.label}>Gemini API (Roteiro):</Text>
          <TextInput style={styles.input} value={geminiKey} onChangeText={setGeminiKey} secureTextEntry />

          <Text style={styles.label}>Pexels API (Vídeos):</Text>
          <TextInput style={styles.input} value={pexelsKey} onChangeText={setPexelsKey} secureTextEntry />

          <Text style={styles.label}>Fish Audio API (Opcional - Voz Neural):</Text>
          <TextInput style={styles.input} value={fishKey} onChangeText={setFishKey} secureTextEntry />

          <Text style={styles.label}>Jamendo Client ID (Opcional - Música):</Text>
          <TextInput style={styles.input} value={jamendoKey} onChangeText={setJamendoKey} secureTextEntry />
          
          <TouchableOpacity style={styles.buttonPrimary} onPress={handleSaveKeys}>
            <Text style={styles.buttonText}>Salvar Cofre</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.buttonPrimary, styles.buttonSecondary]} onPress={() => setScreen('HOME')}>
            <Text style={[styles.buttonText, {color: '#2563EB'}]}>Voltar</Text>
          </TouchableOpacity>
          <View style={{height: 40}} />
        </ScrollView>
      )}

      {screen === 'HOME' && (
        <View style={styles.content}>
          <Text style={styles.title}>Diretor de Arte IA</Text>
          <Text style={styles.subtitle}>Digite sua ideia e deixe a IA cuidar do roteiro, narração e trilha sonora.</Text>
          
          <TextInput
            style={styles.textArea}
            placeholder="Ex: Por que o céu é azul?"
            placeholderTextColor="#94A3B8"
            multiline
            value={prompt}
            onChangeText={setPrompt}
          />
          
          <TouchableOpacity style={styles.buttonPrimary} onPress={handleGenerateScript}>
            <Text style={styles.buttonText}>🎬 Dirigir Roteiro</Text>
          </TouchableOpacity>
        </View>
      )}

      {screen === 'SCRIPT' && scriptData && (
        <ScrollView style={styles.scrollContent}>
          <Text style={styles.title}>Roteiro Finalizado</Text>
          <Text style={styles.subtitle}>{scriptData.title}</Text>
          
          {scriptData.scenes.map((s, idx) => (
            <View key={idx} style={styles.card}>
              <Text style={styles.cardTitle}>Cena {idx + 1}</Text>
              <Text style={styles.cardText}><Text style={styles.bold}>Visual:</Text> {s.search_keywords}</Text>
              <Text style={styles.cardText}><Text style={styles.bold}>Fala:</Text> {s.narration_text}</Text>
            </View>
          ))}

          <TouchableOpacity style={styles.buttonPrimary} onPress={handleRenderCinematic}>
            <Text style={styles.buttonText}>🎥 Produzir Vídeo (100% Local)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.buttonPrimary, styles.buttonSecondary]} onPress={() => setScreen('HOME')}>
            <Text style={[styles.buttonText, {color: '#2563EB'}]}>Refazer Roteiro</Text>
          </TouchableOpacity>
          <View style={{height: 40}} />
        </ScrollView>
      )}

      {screen === 'RENDER' && (
        <View style={[styles.content, styles.center]}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>{statusText}</Text>
          <Text style={styles.subtitle}>Usando processamento nativo do seu Galaxy A54.</Text>
        </View>
      )}

      {screen === 'PLAYER' && (
        <View style={[styles.content, styles.center]}>
          <Text style={styles.title}>✅ Obra Prima Pronta!</Text>
          <Text style={styles.subtitle}>Sua renderização local foi um sucesso.</Text>
          
          <TouchableOpacity style={styles.buttonPrimary} onPress={handleShare}>
            <Text style={styles.buttonText}>💾 Salvar / Compartilhar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.buttonPrimary, styles.buttonSecondary]} onPress={() => { setPrompt(''); setScreen('HOME'); }}>
            <Text style={[styles.buttonText, {color: '#2563EB'}]}>Fazer outro</Text>
          </TouchableOpacity>
        </View>
      )}

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 24, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  configButton: { position: 'absolute', right: 20, top: 56 },
  configText: { color: '#2563EB', fontWeight: '600', fontSize: 14 },
  content: { flex: 1, padding: 24 },
  scrollContent: { flex: 1, padding: 24 },
  center: { justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: '#1E293B', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#64748B', marginBottom: 24, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 8 },
  input: { backgroundColor: '#F1F5F9', borderRadius: 8, padding: 14, fontSize: 16, color: '#334155', marginBottom: 16 },
  textArea: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 16, fontSize: 16, color: '#334155', minHeight: 120, textAlignVertical: 'top', marginBottom: 24, elevation: 2 },
  buttonPrimary: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12, elevation: 4 },
  buttonSecondary: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', elevation: 0 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#3B82F6', marginBottom: 8 },
  cardText: { fontSize: 14, color: '#475569', marginBottom: 4 },
  bold: { fontWeight: '700', color: '#1E293B' },
  loadingText: { marginTop: 24, fontSize: 18, fontWeight: '600', color: '#1E293B', textAlign: 'center' },
});
