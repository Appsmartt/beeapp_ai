import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Check, CheckCheck, FileText, Play, Pause, Bot } from 'lucide-react-native';
import VerifiedBadge from '../VerifiedBadge';
import AiCatalogCards from './AiCatalogCards';
import { AiSearchResult } from '../../mocks/aiSearchResults';

interface MessageBubbleProps {
  senderName?: string;
  senderVerified?: boolean;
  isUser: boolean;
  isAI?: boolean;
  sentByAi?: boolean;
  type: 'text' | 'image' | 'file' | 'audio';
  text?: string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
  audioDuration?: string;
  status: 'sent' | 'delivered' | 'read';
  time: string;
  replyTo?: { sender: string; text: string };
  showCatalog?: boolean;
  isEdited?: boolean;
  isDestroyed?: boolean;
  isPinned?: boolean;
  onLongPress?: () => void;
  onContactCatalogItem?: (item: AiSearchResult) => void;
}

export default function MessageBubble({
  senderName, senderVerified, isUser, isAI, sentByAi, type, text,
  mediaUrl, fileName, fileSize, audioDuration, status, time, replyTo,
  showCatalog, isEdited, isDestroyed, onLongPress, onContactCatalogItem,
}: MessageBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <View style={[styles.container, isUser ? styles.containerUser : styles.containerOther]}>
      <TouchableOpacity activeOpacity={0.9} onLongPress={onLongPress} style={styles.touchable}>
        {senderName && !isUser && (
          <View style={styles.senderRow}>
            <Text style={styles.senderName}>{senderName}</Text>
            {senderVerified && <VerifiedBadge size={12} />}
          </View>
        )}

        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleOther, !isUser && isAI && styles.bubbleAI]}>
          {sentByAi && (
            <View style={styles.sentByAiBadge}>
              <Bot size={10} color={colors.neutral.white} />
              <Text style={styles.sentByAiBadgeText}>IA</Text>
            </View>
          )}

          {replyTo && (
            <View style={[styles.replyContainer, isUser ? styles.replyUser : styles.replyOther]}>
              <View style={styles.replyBar} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.replySender, isUser ? styles.replySenderUser : styles.replySenderOther]}>{replyTo.sender}</Text>
                <Text style={[styles.replyText, { color: isUser ? '#E2D8FF' : colors.neutral.gray600 }]} numberOfLines={1}>{replyTo.text}</Text>
              </View>
            </View>
          )}

          {isDestroyed ? (
            <Text style={{ fontStyle: 'italic', fontSize: 13, color: isUser ? '#E2D8FF' : colors.neutral.gray500, marginVertical: 2 }}>
              Este mensaje fue destruido
            </Text>
          ) : (
            <>
              {type === 'text' && <Text style={[styles.messageText, isUser ? styles.textUser : styles.textOther]}>{text}</Text>}

              {type === 'image' && (
                <View style={styles.imageWrapper}>
                  {mediaUrl ? <Image source={{ uri: mediaUrl }} style={styles.image} resizeMode="cover" /> : (
                    <View style={styles.imagePlaceholder}><Text style={styles.imagePlaceholderText}>Imagen (MOCK)</Text></View>
                  )}
                  {text && <Text style={[styles.imageCaption, isUser ? styles.textUser : styles.textOther]}>{text}</Text>}
                </View>
              )}

              {type === 'file' && (
                <View style={styles.fileRow}>
                  <View style={[styles.fileIconWrap, isUser ? styles.fileIconWrapUser : styles.fileIconWrapOther]}>
                    <FileText size={20} color={isUser ? colors.brand.primary : colors.neutral.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fileName, isUser ? styles.textUser : styles.textOther]} numberOfLines={1}>{fileName || 'documento.pdf'}</Text>
                    <Text style={[styles.fileSize, { color: isUser ? '#DDD6FE' : colors.neutral.gray600 }]}>{fileSize || '0 KB'}</Text>
                  </View>
                </View>
              )}

              {type === 'audio' && (
                <View style={styles.audioRow}>
                  <TouchableOpacity onPress={() => setIsPlaying(!isPlaying)} style={[styles.audioPlayBtn, isUser ? styles.audioPlayBtnUser : styles.audioPlayBtnOther]} activeOpacity={0.7}>
                    {isPlaying ? <Pause size={16} color={isUser ? colors.brand.primary : colors.neutral.text} /> : <Play size={16} color={isUser ? colors.brand.primary : colors.neutral.text} style={{ marginLeft: 2 }} />}
                  </TouchableOpacity>
                  <View style={styles.waveformContainer}>
                    {[...Array(12)].map((_, i) => (
                      <View key={i} style={[styles.waveBar, { height: 4 + (i * 3) % 10 }, isUser ? styles.waveBarUser : styles.waveBarOther, isPlaying && { backgroundColor: isUser ? colors.neutral.white : colors.brand.primary }]} />
                    ))}
                  </View>
                  <Text style={[styles.audioDuration, { color: isUser ? '#E2D8FF' : colors.neutral.gray600 }]}>{audioDuration || '0:00'}</Text>
                </View>
              )}
            </>
          )}

          <View style={styles.metaRow}>
            {isEdited && <Text style={{ fontSize: 10, fontStyle: 'italic', color: isUser ? '#DDD6FE' : colors.neutral.gray500, marginRight: 4 }}>(editado)</Text>}
            <Text style={[styles.time, isUser ? styles.timeUser : styles.timeOther]}>{time}</Text>
            {isUser && (
              <View style={styles.statusCheck}>
                {status === 'sent' && <Check size={12} color="#DDD6FE" />}
                {status === 'delivered' && <CheckCheck size={12} color="#DDD6FE" />}
                {status === 'read' && <CheckCheck size={12} color={colors.neutral.white} />}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Render AI Catalog Cards inline when showCatalog is true */}
      {showCatalog && (
        <AiCatalogCards onContact={onContactCatalogItem} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', marginBottom: 8, flexDirection: 'column' },
  containerUser: { alignItems: 'flex-end' },
  containerOther: { alignItems: 'flex-start' },
  touchable: { maxWidth: '85%' },
  senderRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  senderName: { fontSize: 11, fontWeight: '400', color: colors.neutral.gray600, marginBottom: 2, marginLeft: 12 },
  bubble: { borderRadius: 18, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  bubbleUser: { backgroundColor: colors.brand.primary, borderBottomRightRadius: 2 },
  bubbleOther: { backgroundColor: colors.neutral.white, borderBottomLeftRadius: 2, borderWidth: 1, borderColor: colors.neutral.gray200 },
  sentByAiBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 3, backgroundColor: 'rgba(255, 255, 255, 0.22)', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1, marginBottom: 5 },
  sentByAiBadgeText: { fontSize: 9, fontWeight: '400', color: colors.neutral.white, letterSpacing: 0.3 },
  bubbleAI: { backgroundColor: colors.brand.primary + '15', borderColor: colors.brand.primary + '30' },
  messageText: { fontSize: 14, lineHeight: 20 },
  textUser: { color: colors.neutral.white },
  textOther: { color: colors.neutral.text },
  replyContainer: { flexDirection: 'row', borderRadius: 8, padding: 6, marginBottom: 8, overflow: 'hidden' },
  replyUser: { backgroundColor: '#5219C4' },
  replyOther: { backgroundColor: colors.neutral.gray50, borderWidth: 1, borderColor: colors.neutral.gray200 },
  replyBar: { width: 3, backgroundColor: colors.brand.primary, borderRadius: 1.5, marginRight: 8 },
  replySender: { fontSize: 11, fontWeight: '400', marginBottom: 2 },
  replySenderUser: { color: colors.neutral.white },
  replySenderOther: { color: colors.brand.primary },
  replyText: { fontSize: 12 },
  imageWrapper: { width: 200, overflow: 'hidden' },
  image: { width: '100%', height: 140, borderRadius: 12, marginBottom: 6 },
  imagePlaceholder: { width: '100%', height: 140, borderRadius: 12, backgroundColor: colors.neutral.gray100, alignItems: 'center', justifyContent: 'center', marginBottom: 6, borderWidth: 1, borderColor: colors.neutral.gray200 },
  imagePlaceholderText: { fontSize: 11, color: colors.neutral.gray600, fontWeight: '400' },
  imageCaption: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  fileRow: { flexDirection: 'row', alignItems: 'center', width: 200, paddingVertical: 4 },
  fileIconWrap: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  fileIconWrapUser: { backgroundColor: colors.neutral.white },
  fileIconWrapOther: { backgroundColor: colors.brand.primary },
  fileName: { fontSize: 13, fontWeight: '400' },
  fileSize: { fontSize: 11, marginTop: 2 },
  audioRow: { flexDirection: 'row', alignItems: 'center', width: 210, paddingVertical: 4 },
  audioPlayBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  audioPlayBtnUser: { backgroundColor: colors.neutral.white },
  audioPlayBtnOther: { backgroundColor: colors.neutral.gray100, borderWidth: 1, borderColor: colors.neutral.gray200 },
  waveformContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3, marginRight: 10 },
  waveBar: { flex: 1, borderRadius: 1, backgroundColor: colors.neutral.gray300 },
  waveBarUser: { backgroundColor: colors.brand.primary + '80' },
  waveBarOther: { backgroundColor: colors.neutral.gray300 },
  audioDuration: { fontSize: 11, fontWeight: '400' },
  metaRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 },
  time: { fontSize: 9, marginRight: 4 },
  timeUser: { color: colors.neutral.white + 'b3' },
  timeOther: { color: colors.neutral.gray600 },
  statusCheck: { justifyContent: 'center', alignItems: 'center' },
});
