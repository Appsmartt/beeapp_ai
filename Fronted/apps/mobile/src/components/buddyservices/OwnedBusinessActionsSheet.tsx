import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BarChart3,
  ChevronRight,
  Eye,
  FilePenLine,
  X,
} from 'lucide-react-native';

interface OwnedBusinessActionsSheetProps {
  businessName: string;
  visible: boolean;
  onClose: () => void;
  onManage: () => void;
  onEdit: () => void;
  onViewPublic: () => void;
}

type ActionRowProps = {
  accessibilityLabel: string;
  description: string;
  icon: ReactNode;
  iconBackground: string;
  label: string;
  onPress: () => void;
};

function ActionRow({
  accessibilityLabel,
  description,
  icon,
  iconBackground,
  label,
  onPress,
}: ActionRowProps) {
  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      activeOpacity={0.82}
      onPress={onPress}
      style={styles.actionRow}
    >
      <View
        style={[
          styles.actionIconWrap,
          { backgroundColor: iconBackground },
        ]}
      >
        {icon}
      </View>

      <View style={styles.actionTextColumn}>
        <Text style={styles.actionLabel}>
          {label}
        </Text>

        <Text style={styles.actionDescription}>
          {description}
        </Text>
      </View>

      <ChevronRight
        color="#B8A8CC"
        size={18}
        strokeWidth={2.4}
      />
    </TouchableOpacity>
  );
}

export default function OwnedBusinessActionsSheet({
  businessName,
  visible,
  onClose,
  onManage,
  onEdit,
  onViewPublic,
}: OwnedBusinessActionsSheetProps) {
  const runAndClose = (action: () => void) => {
    action();
    onClose();
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityLabel="Cerrar menú de acciones"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdropTap}
        />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerTextColumn}>
              <Text style={styles.sheetEyebrow}>
                Opciones del negocio
              </Text>

              <Text
                numberOfLines={2}
                style={styles.sheetTitle}
              >
                {businessName}
              </Text>
            </View>

            <TouchableOpacity
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
              activeOpacity={0.75}
              hitSlop={10}
              onPress={onClose}
              style={styles.closeButton}
            >
              <X
                color="#5E4A83"
                size={20}
                strokeWidth={2.4}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.actionsCard}>
            <ActionRow
              accessibilityLabel={`Administrar ${businessName}`}
              description="Panel comercial, pedidos y operación"
              icon={
                <BarChart3
                  color="#7427D5"
                  size={19}
                  strokeWidth={2.3}
                />
              }
              iconBackground="#F4EAFE"
              label="Administrar"
              onPress={() => {
                runAndClose(onManage);
              }}
            />

            <View style={styles.actionDivider} />

            <ActionRow
              accessibilityLabel={`Editar ${businessName}`}
              description="Datos, logo, categoría y descripción"
              icon={
                <FilePenLine
                  color="#7567D9"
                  size={19}
                  strokeWidth={2.3}
                />
              }
              iconBackground="#F6EAFE"
              label="Editar"
              onPress={() => {
                runAndClose(onEdit);
              }}
            />

            <View style={styles.actionDivider} />

            <ActionRow
              accessibilityLabel={`Ver perfil público de ${businessName}`}
              description="Cómo lo ven tus clientes"
              icon={
                <Eye
                  color="#5E4A83"
                  size={19}
                  strokeWidth={2.3}
                />
              }
              iconBackground="#EEF2FF"
              label="Ver perfil público"
              onPress={() => {
                runAndClose(onViewPublic);
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(38, 49, 77, 0.48)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropTap: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#F7F8FF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: '#D9CEE5',
    borderRadius: 999,
    height: 4,
    marginBottom: 14,
    width: 42,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  headerTextColumn: {
    flex: 1,
    minWidth: 0,
  },
  sheetEyebrow: {
    color: '#6C7892',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  sheetTitle: {
    color: '#26314D',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    marginTop: 4,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2D6F0',
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F0EAF3',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  actionIconWrap: {
    alignItems: 'center',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  actionTextColumn: {
    flex: 1,
    marginHorizontal: 12,
    minWidth: 0,
  },
  actionLabel: {
    color: '#26314D',
    fontSize: 14,
    fontWeight: '800',
  },
  actionDescription: {
    color: '#6C7892',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  actionDivider: {
    backgroundColor: '#F0EAF3',
    height: 1,
    marginLeft: 66,
  },
});
