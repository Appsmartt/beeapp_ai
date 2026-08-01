import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, Platform } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Paperclip, Mic, Send, Image, Camera, File, MapPin, User, X } from 'lucide-react-native';

interface WriteBarProps {
  onSendMessage: (text: string) => void;
  onSendVoiceNote: (duration: string) => void;
  onSendAttachment: (type: 'photo' | 'camera' | 'file' | 'location' | 'contact') => void;
  value?: string;
  onChangeText?: (text: string) => void;
}

export default function WriteBar({ onSendMessage, onSendVoiceNote, onSendAttachment, value, onChangeText }: WriteBarProps) {
  const [internalText, setInternalText] = useState('');
  const text = value !== undefined ? value : internalText;
  const setText = onChangeText || setInternalText;
  const [attachOpen, setAttachOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const recordInterval = useRef<NodeJS.Timeout | null>(null);

  // Handle record duration increments
  useEffect(() => {
    if (isRecording) {
      recordInterval.current = setInterval(() => {
        setRecordTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordInterval.current) {
        clearInterval(recordInterval.current);
        recordInterval.current = null;
      }
      setRecordTime(0);
    }

    return () => {
      if (recordInterval.current) {
        clearInterval(recordInterval.current);
      }
    };
  }, [isRecording]);

  const handleSend = () => {
    if (!text.trim()) return;
    onSendMessage(text);
    setText('');
  };

  const handleStartRecord = () => {
    setIsRecording(true);
    setAttachOpen(false);
  };

  const handleCancelRecord = () => {
    setIsRecording(false);
  };

  const handleStopRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      const minutes = Math.floor(recordTime / 60);
      const seconds = recordTime % 60;
      const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      onSendVoiceNote(recordTime > 0 ? formattedDuration : '0:03');
    }
  };

  const handleAttachItemClick = (type: 'photo' | 'camera' | 'file' | 'location' | 'contact') => {
    onSendAttachment(type);
    setAttachOpen(false);
  };

  return (
    <View style={styles.outerContainer}>
      {/* Attachment popup panel */}
      {attachOpen && (
        <View style={styles.attachPanel}>
          <TouchableOpacity style={styles.attachPanelItem} onPress={() => handleAttachItemClick('photo')}>
            <View style={[styles.attachIconWrap, { backgroundColor: colors.neutral.gray100 }]}>
              <Image size={18} color={colors.neutral.gray600} />
            </View>
            <Text style={styles.attachText}>Fotos</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.attachPanelItem} onPress={() => handleAttachItemClick('camera')}>
            <View style={[styles.attachIconWrap, { backgroundColor: colors.neutral.gray100 }]}>
              <Camera size={18} color={colors.neutral.gray600} />
            </View>
            <Text style={styles.attachText}>Cámara</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.attachPanelItem} onPress={() => handleAttachItemClick('file')}>
            <View style={[styles.attachIconWrap, { backgroundColor: colors.neutral.gray100 }]}>
              <File size={18} color={colors.neutral.gray600} />
            </View>
            <Text style={styles.attachText}>Archivo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.attachPanelItem} onPress={() => handleAttachItemClick('location')}>
            <View style={[styles.attachIconWrap, { backgroundColor: colors.neutral.gray100 }]}>
              <MapPin size={18} color={colors.neutral.gray600} />
            </View>
            <Text style={styles.attachText}>Ubicación</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.attachPanelItem} onPress={() => handleAttachItemClick('contact')}>
            <View style={[styles.attachIconWrap, { backgroundColor: colors.neutral.gray100 }]}>
              <User size={18} color={colors.neutral.gray600} />
            </View>
            <Text style={styles.attachText}>Contacto</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.barContainer}>
        {isRecording ? (
          // Recording UI state
          <View style={styles.recordStateContainer}>
            <View style={styles.recordIndicatorWrap}>
              <View style={styles.redDot} />
              <Text style={styles.recordTimer}>
                Grabando... {Math.floor(recordTime / 60)}:{(recordTime % 60).toString().padStart(2, '0')}
              </Text>
            </View>
            <TouchableOpacity onPress={handleCancelRecord} activeOpacity={0.7} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleStopRecord} activeOpacity={0.7} style={styles.stopRecordBtn}>
              <Send size={16} color={colors.neutral.white} />
            </TouchableOpacity>
          </View>
        ) : (
          // Normal input UI state
          <View style={styles.inputContainerRow}>
            {/* Attach button */}
            <TouchableOpacity
              style={[styles.actionBtn, attachOpen && styles.actionBtnActive]}
              onPress={() => setAttachOpen(!attachOpen)}
              activeOpacity={0.7}
            >
              {attachOpen ? (
                <X size={20} color={colors.neutral.gray600} />
              ) : (
                <Paperclip size={20} color={colors.neutral.gray600} />
              )}
            </TouchableOpacity>

            {/* Expansible TextInput */}
            <TextInput
              style={styles.textInput}
              placeholder="Escribe un mensaje..."
              placeholderTextColor={colors.neutral.gray500}
              value={text}
              onChangeText={setText}
              multiline
            />

            {/* Dynamic Mic/Send Button */}
            {text.trim() ? (
              <TouchableOpacity style={styles.sendButton} onPress={handleSend} activeOpacity={0.8}>
                <Send size={18} color={colors.neutral.white} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.micButton}
                onLongPress={handleStartRecord}
                onPress={() => alert('Mantén presionado para grabar nota de voz')}
                activeOpacity={0.7}
              >
                <Mic size={20} color={colors.neutral.gray600} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  attachPanel: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    backgroundColor: colors.neutral.gray50,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  attachPanelItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  attachText: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray700,
  },
  barContainer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
  },
  inputContainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  actionBtnActive: {
    backgroundColor: colors.neutral.gray100,
  },
  textInput: {
    flex: 1,
    minHeight: 38,
    maxHeight: 100,
    backgroundColor: colors.neutral.gray50,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.neutral.text,
    marginRight: 8,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.neutral.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordStateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 38,
  },
  recordIndicatorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.semantic.error,
    marginRight: 8,
  },
  recordTimer: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  cancelBtnText: {
    fontSize: 13,
    color: colors.semantic.error,
    fontWeight: '400',
  },
  stopRecordBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
