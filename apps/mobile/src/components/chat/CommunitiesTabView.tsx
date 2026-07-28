import { View, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing } from '@beeapp/design-system';
import CommunityListItem from './CommunityListItem';
import { Community, isCommunityAdmin } from '../../mocks/communities';

interface CommunitiesTabViewProps {
  communities: Community[];
  onOpenCommunity: (community: Community) => void;
}

/**
 * Communities tab: the flat list of the communities the user belongs to.
 * Communities are private, so there is nothing to discover or search here —
 * new ones are created from the menu of the module header.
 */
export default function CommunitiesTabView({ communities, onOpenCommunity }: CommunitiesTabViewProps) {
  return (
    <View style={styles.wrap}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {communities.map((community) => (
          <CommunityListItem
            key={community.id}
            avatar={community.initials}
            avatarColor={community.color}
            name={community.name}
            memberCount={community.members.length}
            role={isCommunityAdmin(community) ? 'admin' : 'member'}
            unreadCount={community.unreadCount}
            onPress={() => onOpenCommunity(community)}
          />
        ))}

        <View style={styles.bottomGap} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.neutral.white },
  bottomGap: { height: 140 },
});
