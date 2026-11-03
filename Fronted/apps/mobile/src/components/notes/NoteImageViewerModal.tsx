import { useState } from 'react';
import {
  Image,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Minimize2 } from 'lucide-react-native';
import {
  colors,
  radii,
} from '@beeapp/design-system';

type NoteImageViewerModalProps = {
  visible: boolean;
  url: string | null;
  caption?: string;
  onClose: () => void;
};

export default function NoteImageViewerModal({
  visible,
  url,
  caption,
  onClose,
}: NoteImageViewerModalProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const close = () => {
    setImageFailed(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={close}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>NOTA · IMAGEN</Text>
            <Text style={styles.title}>Vista ampliada</Text>
          </View>

          <TouchableOpacity
            style={styles.minimizeButton}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Cerrar vista ampliada"
          >
            <Minimize2
              size={19}
              color={colors.brand.primary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.imageFrame}>
          {url && !imageFailed ? (
            <Image
              key={url}
              source={{ uri: url }}
              style={styles.image}
              resizeMode="contain"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <Text style={styles.errorText}>
              No se pudo mostrar esta imagen.
            </Text>
          )}
        </View>

        {caption ? (
          <Text
            style={styles.caption}
            numberOfLines={4}
          >
            {caption}
          </Text>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F7F5FF',
    flex: 1,
    paddingBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 34,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 18,
  },
  heading: {
    flex: 1,
  },
  eyebrow: {
    color: '#8C80B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 5,
  },
  title: {
    color: '#302B4D',
    fontSize: 20,
    fontWeight: '700',
  },
  minimizeButton: {
    alignItems: 'center',
    backgroundColor: '#EAE5FB',
    borderColor: '#DDD4F7',
    borderRadius: 16,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  imageFrame: {
    alignItems: 'center',
    backgroundColor: '#EBE7FA',
    borderColor: '#DED8F3',
    borderRadius: radii.xl,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 10,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  errorText: {
    color: '#625A7D',
    fontSize: 14,
  },
  caption: {
    color: '#443C63',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 16,
    textAlign: 'center',
  },
});
