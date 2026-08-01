import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { colors } from '@beeapp/design-system';
import { PenTool, RotateCcw, ImagePlus, Check, X } from 'lucide-react-native';

export type SignatureMode = 'draw' | 'saved' | 'upload';

interface SignatureCreatorCardProps {
  mode: SignatureMode;
  onModeChange: (mode: SignatureMode) => void;
  isDrawn: boolean;
  onSimulateDraw: () => void;
  onClearDraw: () => void;
  uploadedImage: string | null;
  onSimulateUpload: () => void;
  onClearUpload: () => void;
}

export default function SignatureCreatorCard({
  mode,
  onModeChange,
  isDrawn,
  onSimulateDraw,
  onClearDraw,
  uploadedImage,
  onSimulateUpload,
  onClearUpload,
}: SignatureCreatorCardProps) {
  return (
    <View style={styles.signatureCard}>
      {/* Mode selection tabs */}
      <View style={styles.modeTabs}>
        <TouchableOpacity
          style={[styles.modeTabBtn, mode === 'draw' && styles.modeTabBtnActive]}
          onPress={() => onModeChange('draw')}
        >
          <Text style={[styles.modeTabText, mode === 'draw' && styles.modeTabTextActive]}>
            Dibuja tu firma
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeTabBtn, mode === 'saved' && styles.modeTabBtnActive]}
          onPress={() => onModeChange('saved')}
        >
          <Text style={[styles.modeTabText, mode === 'saved' && styles.modeTabTextActive]}>
            Firma guardada
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeTabBtn, mode === 'upload' && styles.modeTabBtnActive]}
          onPress={() => onModeChange('upload')}
        >
          <Text style={[styles.modeTabText, mode === 'upload' && styles.modeTabTextActive]}>
            Subir imagen
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content based on tab */}
      {mode === 'draw' && (
        <View style={styles.drawViewport}>
          {isDrawn ? (
            <View style={styles.drawnSignature}>
              <Text style={styles.sigDrawingText}>Santiago V.</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.drawPrompt} onPress={onSimulateDraw} activeOpacity={0.8}>
              <PenTool size={32} color={colors.neutral.gray500} style={{ marginBottom: 8 }} />
              <Text style={styles.drawPromptText}>Presiona aquí para simular trazo de firma</Text>
              <Text style={styles.drawPromptSub}>Simula el trazo con el dedo sobre la pantalla</Text>
            </TouchableOpacity>
          )}

          {isDrawn && (
            <TouchableOpacity style={styles.clearBtn} onPress={onClearDraw} activeOpacity={0.7}>
              <RotateCcw size={14} color={colors.neutral.gray600} />
              <Text style={styles.clearBtnText}>Borrar trazo</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {mode === 'saved' && (
        <View style={styles.savedSignatureContainer}>
          <View style={styles.savedSigCard}>
            <Text style={styles.savedSigTitle}>Firma Corporativa Registrada</Text>
            <Text style={styles.sigDrawingText}>Santiago V.</Text>
            <Text style={styles.savedSigMeta}>Sincronizada • Modificado 12 May</Text>
          </View>
        </View>
      )}

      {mode === 'upload' && (
        <View style={styles.drawViewport}>
          {uploadedImage ? (
            <View style={styles.uploadedContainer}>
              <View style={styles.uploadedBadgeRow}>
                <View style={styles.checkCircle}>
                  <Check size={14} color={colors.semantic.success} />
                </View>
                <Text style={styles.uploadedFileName}>{uploadedImage}</Text>
              </View>
              <Text style={styles.uploadedSub}>Imagen de firma cargada con éxito</Text>
              <TouchableOpacity style={styles.removeUploadBtn} onPress={onClearUpload} activeOpacity={0.7}>
                <X size={14} color={colors.neutral.gray600} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadPrompt} onPress={onSimulateUpload} activeOpacity={0.8}>
              <ImagePlus size={40} color={colors.neutral.gray400} style={{ marginBottom: 6 }} />
              <Text style={styles.uploadPromptText}>Toca para subir la imagen de tu firma</Text>
              <Text style={styles.uploadPromptSub}>Formatos: PNG, JPG. Máximo 2 MB</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  signatureCard: { backgroundColor: colors.neutral.white, borderRadius: 20, borderWidth: 1, borderColor: colors.neutral.gray200, overflow: 'hidden' },
  modeTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.neutral.gray200 },
  modeTabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.neutral.gray50 },
  modeTabBtnActive: { backgroundColor: colors.neutral.white, borderBottomWidth: 2, borderBottomColor: colors.brand.primary },
  modeTabText: { fontSize: 11, fontWeight: '400', color: colors.neutral.gray600 },
  modeTabTextActive: { color: colors.brand.primary, fontWeight: '600' },
  drawViewport: { height: 160, padding: 16, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  drawPrompt: { width: '100%', height: '100%', borderWidth: 1.5, borderColor: colors.neutral.gray300, borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFBFD' },
  drawPromptText: { fontSize: 12, fontWeight: '400', color: colors.brand.primary },
  drawPromptSub: { fontSize: 10, color: colors.neutral.gray600, marginTop: 4, fontWeight: '400' },
  drawnSignature: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sigDrawingText: { fontFamily: Platform.OS === 'ios' ? 'Zapfino' : 'cursive', fontSize: 28, color: '#1D4ED8', transform: [{ rotate: '-3deg' }] },
  clearBtn: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral.gray50, borderWidth: 1, borderColor: colors.neutral.gray300, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, gap: 4 },
  clearBtnText: { fontSize: 10, fontWeight: '400', color: colors.neutral.gray700 },
  savedSignatureContainer: { height: 160, padding: 16, justifyContent: 'center', alignItems: 'center' },
  savedSigCard: { width: '100%', height: '100%', borderRadius: 12, backgroundColor: '#FAF5FF', borderWidth: 1, borderColor: '#E9D5FF', justifyContent: 'center', alignItems: 'center' },
  savedSigTitle: { fontSize: 10, fontWeight: '600', color: '#7C3AED', marginBottom: 8 },
  savedSigMeta: { fontSize: 9, color: colors.neutral.gray600, fontWeight: '400', marginTop: 8 },
  uploadPrompt: { width: '100%', height: '100%', borderWidth: 1.5, borderColor: colors.neutral.gray300, borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFBFD' },
  uploadPromptText: { fontSize: 12, fontWeight: '400', color: colors.neutral.gray500 },
  uploadPromptSub: { fontSize: 10, color: colors.neutral.gray400, marginTop: 2, fontWeight: '400' },
  uploadedContainer: { width: '100%', height: '100%', borderRadius: 12, backgroundColor: colors.neutral.gray100, borderWidth: 1, borderColor: colors.neutral.gray200, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  uploadedBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', alignItems: 'center', justifyContent: 'center' },
  uploadedFileName: { fontSize: 13, fontWeight: '400', color: colors.neutral.text },
  uploadedSub: { fontSize: 10, color: colors.semantic.success, fontWeight: '400', marginTop: 4 },
  removeUploadBtn: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.neutral.gray200, alignItems: 'center', justifyContent: 'center' },
});
