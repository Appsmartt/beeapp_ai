import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from 'lucide-react-native';
import {
  colors,
  radii,
  spacing,
} from '@beeapp/design-system';

import type {
  AppDialogRequest,
  AppDialogTone,
} from './appDialogTypes';

type AppDialogModalProps = {
  request: AppDialogRequest | null;
  busy: boolean;
  busyIndex: number | null;
  onClose: () => void;
  onPressButton: (index: number) => void;
};

const toneStyles: Record<AppDialogTone, {
  iconBg: string;
  iconBorder: string;
  iconColor: string;
}> = {
  info: {
    iconBg: '#F4F1FA',
    iconBorder: '#E7E1F4',
    iconColor: colors.brand.primary,
  },
  success: {
    iconBg: '#ECFDF5',
    iconBorder: '#A7F3D0',
    iconColor: '#059669',
  },
  warning: {
    iconBg: '#FFF7ED',
    iconBorder: '#FED7AA',
    iconColor: '#B45309',
  },
  error: {
    iconBg: '#FEF2F2',
    iconBorder: '#FECACA',
    iconColor: '#B91C1C',
  },
};

function ToneIcon({
  tone,
}: {
  tone: AppDialogTone;
}) {
  const palette = toneStyles[tone];
  const color = palette.iconColor;

  if (tone === 'success') {
    return <CheckCircle2 size={28} color={color} />;
  }

  if (tone === 'warning') {
    return <AlertTriangle size={26} color={color} />;
  }

  if (tone === 'error') {
    return <XCircle size={28} color={color} />;
  }

  return <Info size={26} color={color} />;
}

export default function AppDialogModal({
  request,
  busy,
  busyIndex,
  onClose,
  onPressButton,
}: AppDialogModalProps) {
  const tone = request?.tone || 'info';
  const palette = toneStyles[tone];
  const message = request?.message?.trim() || '';

  return (
    <Modal
      visible={request !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
          disabled={busy}
        />

        {request ? (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              disabled={busy}
              activeOpacity={0.7}
              accessibilityLabel="Cerrar"
            >
              <X
                size={18}
                color={colors.neutral.gray600}
              />
            </TouchableOpacity>

            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: palette.iconBg,
                  borderColor: palette.iconBorder,
                },
              ]}
            >
              <ToneIcon tone={tone} />
            </View>

            <Text style={styles.title}>
              {request.title}
            </Text>

            {message ? (
              <ScrollView
                style={styles.messageScroll}
                contentContainerStyle={styles.messageContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.message}>
                  {message}
                </Text>
              </ScrollView>
            ) : null}

            <View style={styles.actions}>
              {request.buttons.map((button, index) => {
                const style = button.style || 'default';
                const loading = busy && busyIndex === index;

                return (
                  <TouchableOpacity
                    key={`${request.id}-${index}`}
                    style={[
                      styles.button,
                      style === 'cancel' && styles.cancelButton,
                      style === 'default' && styles.defaultButton,
                      style === 'destructive' && styles.destructiveButton,
                      busy && !loading && styles.buttonDisabled,
                    ]}
                    onPress={() => onPressButton(index)}
                    disabled={busy}
                    activeOpacity={0.85}
                  >
                    {loading ? (
                      <ActivityIndicator
                        size="small"
                        color={
                          style === 'default'
                            ? colors.neutral.white
                            : style === 'destructive'
                              ? '#B91C1C'
                              : colors.brand.primary
                        }
                      />
                    ) : (
                      <Text
                        style={[
                          styles.buttonText,
                          style === 'cancel' && styles.cancelButtonText,
                          style === 'default' && styles.defaultButtonText,
                          style === 'destructive' && styles.destructiveButtonText,
                        ]}
                      >
                        {button.text || 'Aceptar'}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: colors.neutral.white,
    borderColor: '#E7E1F4',
    borderRadius: radii.xl,
    borderWidth: 1,
    maxHeight: '80%',
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    width: '100%',
  },
  closeButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: '#F4F1FA',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  iconWrap: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 28,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
    width: 56,
  },
  title: {
    color: colors.neutral.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  messageScroll: {
    flexGrow: 0,
    marginBottom: spacing.lg,
    maxHeight: 180,
  },
  messageContent: {
    flexGrow: 0,
  },
  message: {
    color: colors.neutral.gray600,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.sm,
  },
  button: {
    alignItems: 'center',
    borderRadius: radii.lg,
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 14,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  cancelButton: {
    backgroundColor: '#F4F1FA',
  },
  defaultButton: {
    backgroundColor: colors.brand.primary,
  },
  destructiveButton: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  cancelButtonText: {
    color: colors.brand.primary,
  },
  defaultButtonText: {
    color: colors.neutral.white,
  },
  destructiveButtonText: {
    color: '#B91C1C',
  },
});
