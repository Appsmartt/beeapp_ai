import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Plus } from 'lucide-react-native';
import { StatusItem } from '../../mocks/statuses';
import { CURRENT_USER } from '../../mocks/currentUser';

interface StatusCirclesRowProps {
  statuses: StatusItem[];
  onCreate: () => void;
  onOpen: (index: number) => void;
}

/**
 * Statuses above the chat list: horizontal row of circular avatars.
 * The first circle is the current user, with a + badge to publish a new one.
 */
export default function StatusCirclesRow({ statuses, onCreate, onOpen }: StatusCirclesRowProps) {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.itemWrap}>
          <TouchableOpacity activeOpacity={0.8} onPress={onCreate}>
            <View style={styles.userCircle}>
              <Text style={styles.userText}>{CURRENT_USER.initials}</Text>
              <View style={styles.addBadge}>
                <Plus size={10} color={colors.neutral.white} strokeWidth={3} />
              </View>
            </View>
          </TouchableOpacity>
          <Text style={styles.name} numberOfLines={1}>
            Tu estado
          </Text>
        </View>

        {statuses.map((status, index) => (
          <View key={status.id} style={styles.itemWrap}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => onOpen(index)}>
              {/* Purple ring while the status has not been seen */}
              <View style={[styles.circle, status.viewed ? styles.circleViewed : styles.circleUnseen]}>
                <View style={[styles.innerCircle, { backgroundColor: status.authorColor }]}>
                  <Text style={styles.initials}>{status.authorInitials}</Text>
                </View>
              </View>
            </TouchableOpacity>
            <Text style={styles.name} numberOfLines={1}>
              {status.authorName.split(' ')[0]}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  scroll: { paddingHorizontal: 20, gap: 16 },
  itemWrap: { alignItems: 'center', width: 60 },
  userCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.neutral.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
  },
  userText: { fontSize: 12, fontWeight: '400', color: colors.neutral.gray700 },
  addBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.brand.primary,
    borderWidth: 2,
    borderColor: colors.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    padding: 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleUnseen: { borderColor: colors.brand.primary },
  circleViewed: { borderColor: colors.neutral.gray300 },
  innerCircle: {
    flex: 1,
    width: '100%',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontSize: 14, fontWeight: '400', color: colors.brand.primary },
  name: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray600,
    textAlign: 'center',
  },
});
