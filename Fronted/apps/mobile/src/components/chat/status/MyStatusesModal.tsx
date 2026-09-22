import {
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useMemo,
} from 'react';
import {
  Camera,
  ChevronLeft,
  FileText,
  Play,
} from 'lucide-react-native';
import {
  colors,
  spacing,
} from '@beeapp/design-system';

import ScreenSafeArea from '../../layout/ScreenSafeArea';
import type {
  StatusItem,
} from '../../../mocks/statuses';

interface MyStatusesModalProps {
  visible: boolean;
  statuses: StatusItem[];
  onOpenStatus: (status: StatusItem) => void;
  onCreateText: () => void;
  onOpenCamera: () => void;
  onClose: () => void;
}

function formatPublishedAt(createdAt?: string): string {
  if (!createdAt) {
    return 'Justo ahora';
  }

  const createdAtTime = new Date(createdAt).getTime();

  if (Number.isNaN(createdAtTime)) {
    return 'Justo ahora';
  }

  const elapsedMilliseconds = Math.max(
    0,
    Date.now() - createdAtTime,
  );
  const elapsedMinutes = Math.floor(
    elapsedMilliseconds / 60_000,
  );

  if (elapsedMinutes < 1) {
    return 'Justo ahora';
  }

  if (elapsedMinutes < 60) {
    return `Hace ${elapsedMinutes} min`;
  }

  const hours = Math.floor(elapsedMinutes / 60);
  const remainingMinutes = elapsedMinutes % 60;

  if (hours < 24) {
    if (remainingMinutes === 0) {
      return `Hace ${hours} h`;
    }

    return `Hace ${hours} h ${remainingMinutes} min`;
  }

  const days = Math.floor(hours / 24);

  return days === 1
    ? 'Hace 1 día'
    : `Hace ${days} días`;
}

export default function MyStatusesModal({
  visible,
  statuses,
  onOpenStatus,
  onCreateText,
  onOpenCamera,
  onClose,
}: MyStatusesModalProps) {
  const sortedStatuses = useMemo(
    () => [...statuses].sort((first, second) => (
      new Date(second.createdAt || 0).getTime()
      - new Date(first.createdAt || 0).getTime()
    )),
    [statuses],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <ScreenSafeArea style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onClose}
            activeOpacity={0.7}
            accessibilityLabel="Volver a chats"
          >
            <ChevronLeft
              size={30}
              color={colors.neutral.text}
            />
          </TouchableOpacity>

          <Text style={styles.title}>
            Mi estado
          </Text>
        </View>

        <FlatList
          data={sortedStatuses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isMedia = Boolean(item.photoUrl);

            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => onOpenStatus(item)}
                activeOpacity={0.78}
                accessibilityLabel={`Abrir estado publicado ${formatPublishedAt(item.createdAt)}`}
              >
                <View style={styles.previewWrap}>
                  {item.type === 'video' ? (
                    <View style={styles.videoPreview}>
                      <Play
                        size={22}
                        color={colors.neutral.white}
                        fill={colors.neutral.white}
                      />
                    </View>
                  ) : isMedia ? (
                    <Image
                      source={{
                        uri: item.photoUrl || '',
                      }}
                      style={styles.previewImage}
                    />
                  ) : (
                    <View
                      style={[
                        styles.textPreview,
                        {
                          backgroundColor: (
                            item.bgColor
                            || colors.brand.primary
                          ),
                        },
                      ]}
                    >
                      <Text
                        style={styles.textPreviewCopy}
                        numberOfLines={3}
                      >
                        {item.text || 'Estado de texto'}
                      </Text>
                    </View>
                  )}

                </View>

                <View style={styles.copy}>
                  <Text style={styles.publishedAt}>
                    {formatPublishedAt(item.createdAt)}
                  </Text>
                  <Text
                    style={styles.statusPreview}
                    numberOfLines={2}
                  >
                    {item.text || (
                      item.type === 'video'
                        ? 'Video'
                        : 'Foto'
                    )}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={<View style={styles.footerSpace} />}
        />

        <View style={styles.floatingActions}>
          <TouchableOpacity
            style={styles.floatingTextButton}
            onPress={onCreateText}
            activeOpacity={0.8}
            accessibilityLabel="Crear nuevo estado de texto"
          >
            <FileText
              size={24}
              color={colors.neutral.white}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.floatingCameraButton}
            onPress={onOpenCamera}
            activeOpacity={0.8}
            accessibilityLabel="Abrir cámara para un nuevo estado"
          >
            <Camera
              size={28}
              color={colors.neutral.white}
            />
          </TouchableOpacity>
        </View>
      </ScreenSafeArea>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.neutral.white,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 68,
    paddingHorizontal: spacing.sm,
  },
  backButton: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    marginRight: spacing.xs,
    width: 48,
  },
  title: {
    color: colors.neutral.text,
    fontSize: 26,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 88,
    paddingVertical: spacing.sm,
  },
  previewWrap: {
    backgroundColor: colors.neutral.gray100,
    borderRadius: 30,
    height: 60,
    overflow: 'hidden',
    width: 60,
  },
  previewImage: {
    height: '100%',
    width: '100%',
  },
  videoPreview: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray800,
    flex: 1,
    justifyContent: 'center',
  },
  textPreview: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 6,
  },
  textPreviewCopy: {
    color: colors.neutral.white,
    fontSize: 8,
    fontWeight: '700',
    textAlign: 'center',
  },
  copy: {
    flex: 1,
    marginLeft: spacing.md,
  },
  publishedAt: {
    color: colors.neutral.text,
    fontSize: 16,
    fontWeight: '700',
  },
  statusPreview: {
    color: colors.neutral.gray600,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  footerSpace: {
    height: 112,
  },
  floatingActions: {
    alignItems: 'flex-end',
    bottom: spacing.xl,
    gap: spacing.md,
    position: 'absolute',
    right: spacing.lg,
  },
  floatingTextButton: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray700,
    borderRadius: 26,
    elevation: 3,
    height: 52,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    width: 52,
  },
  floatingCameraButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 32,
    elevation: 3,
    height: 64,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    width: 64,
  },
});
