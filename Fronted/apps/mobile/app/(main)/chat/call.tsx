import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useModuleNav, useScreenParams } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Video as VideoIcon,
  VideoOff,
  Camera,
  RotateCw,
} from 'lucide-react-native';
import VerifiedBadge from '../../../src/components/VerifiedBadge';
import { MOCK_CHATS } from '../../../src/mocks/chats';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CallScreen() {
  const router = useModuleNav();
  const params = useScreenParams();
  
  const callerName = params.name as string || 'Contacto';
  const isVideo = params.isVideo === 'true';
  const isGroup = params.isGroup === 'true';
  // Verified caller: read from the chat mock by id
  const isVerified = !!MOCK_CHATS.find((c) => c.id === (params.id as string))?.verified;

  // Call States
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(isVideo);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // Timer counter
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const handleHangUp = () => {
    router.back();
  };

  // Group participants list mock
  const groupParticipants = [
    { id: '1', name: 'Carlos Mendoza', initials: 'C', verified: true },
    { id: '2', name: 'Mariana Gómez', initials: 'M', verified: true },
    { id: '3', name: 'Laura Restrepo', initials: 'L', verified: true },
    { id: 'self', name: 'Tú (Santiago)', initials: 'S', isSelf: true, verified: false },
  ];

  return (
    <ScreenSafeArea style={[styles.container, isVideo ? styles.darkContainer : styles.brandContainer]}>
      {/* Top Meta info */}
      <View style={styles.topMeta}>
        <Text style={[styles.statusText, isVideo && styles.darkText]}>
          {seconds === 0 ? 'Conectando...' : `En llamada • ${formatTime(seconds)}`}
        </Text>
        {isGroup && (
          <Text style={[styles.groupTitle, isVideo && styles.darkText]}>
            Llamada Grupal ({callerName})
          </Text>
        )}
      </View>

      {/* Main content grid or voice call layout */}
      {isVideo ? (
        // VIDEO CALL INTERFACE
        <View style={styles.videoContent}>
          {isGroup ? (
            // Group Video Call Grid (2x2)
            <View style={styles.gridContainer}>
              {groupParticipants.map((part) => (
                <View key={part.id} style={styles.gridCell}>
                  {/* Simulate video stream */}
                  <View style={styles.videoStreamMock}>
                    <View style={styles.avatarCircleBig}>
                      <Text style={styles.avatarCircleBigText}>{part.initials}</Text>
                    </View>
                    <View style={styles.partLabel}>
                      <Text style={styles.partLabelText}>{part.name}</Text>
                      {part.verified && <VerifiedBadge size={12} />}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            // Individual Video Call layout
            <View style={styles.individualVideoContainer}>
              {/* Other caller stream simulation */}
              {isVideoOff ? (
                <View style={styles.videoPlaceholderFull}>
                  <View style={styles.avatarCircleBig}>
                    <Text style={styles.avatarCircleBigText}>{callerName[0].toUpperCase()}</Text>
                  </View>
                  <View style={styles.bigNameRow}>
                    <Text style={[styles.nameLabelBig, styles.darkText]}>{callerName}</Text>
                    {isVerified && <VerifiedBadge size={20} />}
                  </View>
                </View>
              ) : (
                <View style={styles.videoStreamFull}>
                  <Text style={styles.individualStreamLabel}>{callerName} (Cámara activa)</Text>
                  <View style={styles.avatarCircleBig}>
                    <Text style={styles.avatarCircleBigText}>{callerName[0].toUpperCase()}</Text>
                  </View>
                </View>
              )}

              {/* PiP Self Preview camera */}
              <View style={styles.pipSelfContainer}>
                <Text style={styles.pipSelfLabel}>Tú</Text>
              </View>
            </View>
          )}
        </View>
      ) : (
        // VOICE CALL INTERFACE
        <View style={styles.voiceContent}>
          {isGroup ? (
            // Group Voice Grid (Circular Avatars listing)
            <View style={styles.voiceGroupList}>
              {groupParticipants.map((part) => (
                <View key={part.id} style={styles.voiceGroupItem}>
                  <View style={[styles.avatarCircleVoice, part.isSelf && styles.avatarCircleVoiceSelf]}>
                    <Text style={[styles.avatarTextVoice, part.isSelf && styles.avatarTextVoiceSelf]}>
                      {part.initials}
                    </Text>
                  </View>
                  <View style={styles.voiceGroupNameRow}>
                    <Text style={styles.voiceGroupName} numberOfLines={1}>
                      {part.name}
                    </Text>
                    {part.verified && <VerifiedBadge size={11} />}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            // Individual Voice Layout
            <View style={styles.individualVoice}>
              <View style={styles.avatarVoiceCircleBig}>
                <Text style={styles.avatarVoiceCircleBigText}>{callerName[0].toUpperCase()}</Text>
              </View>
              <View style={styles.bigNameRow}>
                <Text style={styles.callerNameText}>{callerName}</Text>
                {isVerified && <VerifiedBadge size={20} />}
              </View>
              <Text style={styles.callLabelText}>BeeApp Voice</Text>
            </View>
          )}
        </View>
      )}

      {/* Control Buttons Bar */}
      <View style={styles.controlsBar}>
        {/* Mute Button */}
        <TouchableOpacity
          style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
          onPress={() => setIsMuted(!isMuted)}
          activeOpacity={0.7}
        >
          {isMuted ? (
            <MicOff size={22} color={colors.neutral.text} />
          ) : (
            <Mic size={22} color={isVideo ? colors.neutral.white : colors.neutral.text} />
          )}
        </TouchableOpacity>

        {/* Video Toggle (on videocall) or Speaker toggle (on voice call) */}
        {isVideo ? (
          <TouchableOpacity
            style={[styles.controlBtn, isVideoOff && styles.controlBtnActive]}
            onPress={() => setIsVideoOff(!isVideoOff)}
            activeOpacity={0.7}
          >
            {isVideoOff ? (
              <VideoOff size={22} color={colors.neutral.text} />
            ) : (
              <VideoIcon size={22} color={colors.neutral.white} />
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.controlBtn, isSpeakerOn && styles.controlBtnActive]}
            onPress={() => setIsSpeakerOn(!isSpeakerOn)}
            activeOpacity={0.7}
          >
            <Volume2 size={22} color={isSpeakerOn ? colors.neutral.text : colors.neutral.gray600} />
          </TouchableOpacity>
        )}

        {/* Camera rotation switcher (on videocall) */}
        {isVideo && (
          <TouchableOpacity style={styles.controlBtn} activeOpacity={0.7} onPress={() => alert('Cámara rotada (Mock)')}>
            <RotateCw size={22} color={colors.neutral.white} />
          </TouchableOpacity>
        )}

        {/* Hang Up Button (Red) */}
        <TouchableOpacity
          style={styles.hangUpBtn}
          onPress={handleHangUp}
          activeOpacity={0.8}
        >
          <PhoneOff size={24} color={colors.neutral.white} />
        </TouchableOpacity>
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  brandContainer: {
    backgroundColor: '#F3E8FF', // Soft light brand color
  },
  darkContainer: {
    backgroundColor: '#11101E', // Very dark for video stream backdrop
  },
  darkText: {
    color: colors.neutral.white,
  },
  topMeta: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 24 : 32,
    paddingHorizontal: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brand.primary,
    letterSpacing: 0.5,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral.text,
    marginTop: 6,
    textAlign: 'center',
  },
  videoContent: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 20,
    paddingHorizontal: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    height: SCREEN_HEIGHT * 0.55,
  },
  gridCell: {
    width: (SCREEN_WIDTH - 44) / 2,
    height: '48%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  videoStreamMock: {
    flex: 1,
    backgroundColor: '#1F1E2E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3F3E4E',
  },
  avatarCircleBig: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6025d2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleBigText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  partLabel: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  partLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.white,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  individualVideoContainer: {
    flex: 1,
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
  },
  videoStreamFull: {
    flex: 1,
    backgroundColor: '#1A192A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholderFull: {
    flex: 1,
    backgroundColor: '#1E1D2D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  individualStreamLabel: {
    position: 'absolute',
    top: 20,
    left: 20,
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.white,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 2,
  },
  nameLabelBig: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 16,
  },
  pipSelfContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 90,
    height: 130,
    borderRadius: 12,
    backgroundColor: '#2F2E3E',
    borderWidth: 2,
    borderColor: colors.neutral.white,
    justifyContent: 'flex-end',
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  pipSelfLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.neutral.white,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  voiceContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceGroupList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 32,
  },
  voiceGroupItem: {
    alignItems: 'center',
    width: 80,
  },
  avatarCircleVoice: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.neutral.white,
    borderWidth: 2,
    borderColor: '#DDD6FE',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarCircleVoiceSelf: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  avatarTextVoice: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  avatarTextVoiceSelf: {
    color: colors.neutral.white,
  },
  voiceGroupNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginTop: 6,
  },
  bigNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  voiceGroupName: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.text,
    textAlign: 'center',
  },
  individualVoice: {
    alignItems: 'center',
  },
  avatarVoiceCircleBig: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.neutral.white,
    borderWidth: 4,
    borderColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  avatarVoiceCircleBigText: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  callerNameText: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.neutral.text,
    marginTop: 24,
  },
  callLabelText: {
    fontSize: 13,
    color: colors.neutral.gray600,
    fontWeight: '600',
    marginTop: 6,
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 32,
    paddingTop: 16,
  },
  controlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnActive: {
    backgroundColor: colors.neutral.white,
    borderColor: colors.neutral.white,
  },
  hangUpBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.semantic.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
    shadowColor: colors.semantic.error,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
});
