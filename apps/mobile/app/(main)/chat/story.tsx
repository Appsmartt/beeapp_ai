import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useModuleNav, useScreenParams } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import { X, Send, Eye, Trash2 } from 'lucide-react-native';
import VerifiedBadge from '../../../src/components/VerifiedBadge';
import { MOCK_STORIES } from '../../../src/mocks/chats';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Mock stories database per contact ID
const STORIERS_DATA: Record<
  string,
  {
    name: string;
    avatarInitials: string;
    items: Array<{
      id: string;
      type: 'text' | 'image';
      content: string; // text content or image URL
      bgColor?: string; // only for text type
      time: string;
    }>;
  }
> = {
  tu: {
    name: 'Tu estado',
    avatarInitials: 'S',
    items: [
      {
        id: 'tu_1',
        type: 'text',
        content: 'Probando los nuevos estados de BeeApp. ¡Diseño futurista!',
        bgColor: '#6025d2',
        time: 'Hace 10 min',
      },
    ],
  },
  '1': {
    name: 'Carlos Mendoza',
    avatarInitials: 'C',
    items: [
      {
        id: 'c_1',
        type: 'image',
        content: 'https://picsum.photos/600/1000?random=11',
        time: 'Hace 1 hora',
      },
      {
        id: 'c_2',
        type: 'text',
        content: 'Reunión técnica completada con el equipo de diseño.',
        bgColor: '#059669',
        time: 'Hace 45 min',
      },
    ],
  },
  '2': {
    name: 'Mariana Gómez',
    avatarInitials: 'M',
    items: [
      {
        id: 'm_1',
        type: 'text',
        content: '¡Hoy iniciamos el sprint de desarrollo! Enfocados en la app.',
        bgColor: '#7C3AED',
        time: 'Hace 2 horas',
      },
      {
        id: 'm_2',
        type: 'image',
        content: 'https://picsum.photos/600/1000?random=22',
        time: 'Hace 30 min',
      },
    ],
  },
  '4': {
    name: 'Laura Restrepo',
    avatarInitials: 'L',
    items: [
      {
        id: 'l_1',
        type: 'text',
        content: 'Trabajando de forma remota hoy. Excelente clima.',
        bgColor: '#D97706',
        time: 'Hace 4 horas',
      },
    ],
  },
};

export default function StoryViewerScreen() {
  const router = useModuleNav();
  const params = useScreenParams();
  
  const storyId = (params.id as string) || '1';
  const isSelf = params.isSelf === 'true' || storyId === 'tu';

  const storyData = STORIERS_DATA[storyId] || STORIERS_DATA['1'];
  // Verified author: read-only flag from the stories mock
  const isVerified = !!MOCK_STORIES.find((st) => st.id === storyId)?.verified;
  const storyItems = storyData.items;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');

  const currentItem = storyItems[currentIndex];
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Status viewer progress timer
  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Go to next slide
          if (currentIndex < storyItems.length - 1) {
            setCurrentIndex((idx) => idx + 1);
            return 0;
          } else {
            // Close visor when finished
            clearInterval(timerRef.current!);
            router.back();
            return 100;
          }
        }
        return prev + 2; // Increments progress
      });
    }, 100);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentIndex, isPaused, storyItems.length]);

  // Restart progress when slide changes
  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

  const handleTap = (evt: any) => {
    const touchX = evt.nativeEvent.locationX;
    const midX = SCREEN_WIDTH / 2;

    if (touchX > midX) {
      // Tap right: Next status
      if (currentIndex < storyItems.length - 1) {
        setCurrentIndex((idx) => idx + 1);
      } else {
        router.back();
      }
    } else {
      // Tap left: Previous status
      if (currentIndex > 0) {
        setCurrentIndex((idx) => idx - 1);
      } else {
        // Restart current status if first
        setProgress(0);
      }
    }
  };

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    alert(`Respuesta enviada: "${replyText}"`);
    setReplyText('');
    router.back();
  };

  return (
    <ScreenSafeArea style={styles.container}>
      {/* Background status display */}
      <TouchableWithoutFeedback
        onPress={handleTap}
        onPressIn={() => setIsPaused(true)}
        onPressOut={() => setIsPaused(false)}
      >
        <View style={styles.contentContainer}>
          {currentItem.type === 'text' ? (
            <View style={[styles.textStatusBg, { backgroundColor: currentItem.bgColor }]}>
              <Text style={styles.textStatusContent}>{currentItem.content}</Text>
            </View>
          ) : (
            <Image source={{ uri: currentItem.content }} style={styles.imageStatus} resizeMode="cover" />
          )}

          {/* Overlay gradient shroud for top progress bars */}
          <View style={styles.topShroud} />
        </View>
      </TouchableWithoutFeedback>

      {/* Top Section overlays */}
      <View style={styles.topOverlayContainer}>
        {/* Segmented Progress Bars */}
        <View style={styles.progressBarsRow}>
          {storyItems.map((item, idx) => {
            let barProgress = 0;
            if (idx < currentIndex) barProgress = 100;
            if (idx === currentIndex) barProgress = progress;
            return (
              <View key={item.id} style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${barProgress}%` }]} />
              </View>
            );
          })}
        </View>

        {/* Header Details */}
        <View style={styles.header}>
          <View style={styles.userInfoCol}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{storyData.avatarInitials}</Text>
            </View>
            <View style={styles.nameTimeCol}>
              <View style={styles.userNameRow}>
                <Text style={styles.userName}>{storyData.name}</Text>
                {isVerified && <VerifiedBadge size={14} />}
              </View>
              <Text style={styles.timeLabel}>{currentItem.time}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} activeOpacity={0.7}>
            <X size={24} color={colors.neutral.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Section interaction */}
      <View style={styles.bottomSection}>
        {isSelf ? (
          // Tu estado: View count + delete option
          <View style={styles.selfMetaContainer}>
            <View style={styles.viewsRow}>
              <Eye size={18} color={colors.neutral.white} style={{ marginRight: 8 }} />
              <Text style={styles.viewsText}>14 vistas</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                alert('Estado eliminado.');
                router.back();
              }}
              style={styles.deleteBtn}
              activeOpacity={0.7}
            >
              <Trash2 size={20} color={colors.semantic.error} />
            </TouchableOpacity>
          </View>
        ) : (
          // Other contacts: Reply Input field
          <View style={styles.replyBar}>
            <TextInput
              style={styles.replyInput}
              placeholder="Responder al estado..."
              placeholderTextColor="rgba(255, 255, 255, 0.6)"
              value={replyText}
              onChangeText={setReplyText}
            />
            <TouchableOpacity onPress={handleSendReply} style={styles.sendBtn} activeOpacity={0.8}>
              <Send size={18} color={colors.brand.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0E17',
  },
  contentContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textStatusBg: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  textStatusContent: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.neutral.white,
    textAlign: 'center',
    lineHeight: 32,
  },
  imageStatus: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  topShroud: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  topOverlayContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  progressBarsRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
    marginBottom: 16,
  },
  progressBarTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.neutral.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  userInfoCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  nameTimeCol: {
    justifyContent: 'center',
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userName: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  timeLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  bottomSection: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 36 : 24,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 22,
    paddingHorizontal: 16,
    height: 48,
  },
  replyInput: {
    flex: 1,
    fontSize: 14,
    color: colors.neutral.white,
    marginRight: 10,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selfMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  viewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewsText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  deleteBtn: {
    padding: 4,
  },
});
