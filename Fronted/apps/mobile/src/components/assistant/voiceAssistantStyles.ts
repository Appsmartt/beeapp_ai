import { StyleSheet, Platform } from 'react-native';
import { colors } from '@beeapp/design-system';

/** Immersive voice screen: deep brand background with light violet typography */
export const voiceStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1B0B3A',
    paddingTop: Platform.OS === 'ios' ? 60 : 36,
    paddingBottom: 28,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7C6BA8',
  },
  statusDotActive: {
    backgroundColor: colors.semantic.success,
  },
  brandText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EDE9FE',
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(237, 233, 254, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbArea: {
    alignItems: 'center',
    marginTop: 18,
  },
  stateLabel: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    color: '#C4B5FD',
    letterSpacing: 0.4,
  },
  transcript: {
    flex: 1,
    marginTop: 12,
  },
  transcriptContent: {
    paddingHorizontal: 28,
    paddingBottom: 12,
  },
  lineBlock: {
    marginBottom: 18,
  },
  speakerUser: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8B7FB8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  speakerAssistant: {
    fontSize: 10,
    fontWeight: '800',
    color: '#A78BFA',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  lineText: {
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '600',
  },
  linePast: {
    color: 'rgba(237, 233, 254, 0.55)',
  },
  lineActive: {
    color: '#FFFFFF',
  },
  caret: {
    color: '#A78BFA',
    fontWeight: '400',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    marginTop: 8,
  },
  secondaryBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(237, 233, 254, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 22,
    elevation: 12,
  },
  micBtnActive: {
    backgroundColor: '#7C3AED',
  },
  footerHint: {
    textAlign: 'center',
    marginTop: 14,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(237, 233, 254, 0.45)',
  },
});
