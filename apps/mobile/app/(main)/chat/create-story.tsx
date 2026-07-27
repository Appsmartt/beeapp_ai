import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useModuleNav } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, Camera, Type, Palette, Sparkles } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLOR_PALETTES = [
  '#6025d2', // Brand Purple
  '#7C3AED', // Light Purple
  '#059669', // Green
  '#D97706', // Orange
  '#DC2626', // Red
  '#1E88E5', // Blue
];

export default function CreateStoryScreen() {
  const router = useModuleNav();
  
  const [activeTab, setActiveTab] = useState<'text' | 'camera'>('text');
  const [textContent, setTextContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTES[0]);

  const handlePublish = () => {
    if (activeTab === 'text' && !textContent.trim()) {
      alert('Por favor escribe algo para publicar.');
      return;
    }
    alert('¡Estado publicado con éxito!');
    router.back();
  };

  const handlePaletteChange = () => {
    const currentIndex = COLOR_PALETTES.indexOf(selectedColor);
    const nextIndex = (currentIndex + 1) % COLOR_PALETTES.length;
    setSelectedColor(COLOR_PALETTES[nextIndex]);
  };

  return (
    <ScreenSafeArea style={[styles.safeArea, { backgroundColor: activeTab === 'text' ? selectedColor : '#0F0E17' }]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Crear Estado</Text>
          
          {/* Style toggler (only for Text tab) */}
          {activeTab === 'text' ? (
            <TouchableOpacity onPress={handlePaletteChange} style={styles.paletteBtn} activeOpacity={0.7}>
              <Palette size={20} color={colors.neutral.white} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>

        {/* Workspace Area */}
        <View style={styles.workspace}>
          {activeTab === 'text' ? (
            // TEXT WRITING WORKSPACE
            <TextInput
              style={styles.textEditorInput}
              placeholder="¿Qué estás pensando?"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              multiline
              value={textContent}
              onChangeText={setTextContent}
              maxLength={120}
              autoFocus
            />
          ) : (
            // CAMERA PREVIEW MOCK WORKSPACE
            <View style={styles.cameraMockContainer}>
              <View style={styles.cameraViewfinder}>
                <Camera size={44} color="rgba(255, 255, 255, 0.4)" />
                <Text style={styles.cameraPlaceholderText}>Cámara activa (MOCK)</Text>
              </View>
              <Text style={styles.cameraTip}>Presiona el botón inferior para capturar</Text>
            </View>
          )}
        </View>

        {/* Navigation / Switch Tabs Bar */}
        <View style={styles.bottomControlArea}>
          <View style={styles.tabsRow}>
            <TouchableOpacity
              onPress={() => setActiveTab('text')}
              style={[styles.tabBtn, activeTab === 'text' && styles.tabBtnActive]}
              activeOpacity={0.7}
            >
              <Type size={18} color={colors.neutral.white} style={{ marginRight: 6 }} />
              <Text style={styles.tabBtnText}>Texto</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('camera')}
              style={[styles.tabBtn, activeTab === 'camera' && styles.tabBtnActive]}
              activeOpacity={0.7}
            >
              <Camera size={18} color={colors.neutral.white} style={{ marginRight: 6 }} />
              <Text style={styles.tabBtnText}>Foto</Text>
            </TouchableOpacity>
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity style={styles.publishBtn} onPress={handlePublish} activeOpacity={0.8}>
            <Sparkles size={16} color={colors.brand.primary} style={{ marginRight: 6 }} />
            <Text style={styles.publishBtnText}>Compartir Estado</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral.white,
  },
  paletteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workspace: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  textEditorInput: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.neutral.white,
    textAlign: 'center',
    width: '100%',
    lineHeight: 36,
  },
  cameraMockContainer: {
    width: '100%',
    alignItems: 'center',
  },
  cameraViewfinder: {
    width: SCREEN_WIDTH - 64,
    height: SCREEN_WIDTH,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cameraPlaceholderText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
  },
  cameraTip: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '600',
  },
  bottomControlArea: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 16,
    gap: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    padding: 4,
    alignSelf: 'center',
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  publishBtn: {
    backgroundColor: colors.neutral.white,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  publishBtnText: {
    color: colors.brand.primary,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
