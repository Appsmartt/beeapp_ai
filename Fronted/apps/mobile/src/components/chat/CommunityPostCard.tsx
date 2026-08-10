import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radii } from '@beeapp/design-system';
import { ThumbsUp, Heart, Laugh } from 'lucide-react-native';
import { CommunityPost, ReactionType } from '../../mocks/communities';

/** The three reactions a member can leave on a post */
const REACTIONS: { type: ReactionType; icon: typeof ThumbsUp; label: string }[] = [
  { type: 'like', icon: ThumbsUp, label: 'Me gusta' },
  { type: 'love', icon: Heart, label: 'Me encanta' },
  { type: 'laugh', icon: Laugh, label: 'Me divierte' },
];

interface CommunityPostCardProps {
  post: CommunityPost;
  onToggleReaction: (type: ReactionType) => void;
}

/** A community post: author, text and the reaction row (never a chat bubble) */
export default function CommunityPostCard({ post, onToggleReaction }: CommunityPostCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.authorRow}>
        <View style={[styles.avatar, { backgroundColor: post.authorColor }]}>
          <Text style={styles.avatarText}>{post.authorInitials}</Text>
        </View>
        <View style={styles.authorTexts}>
          <Text style={styles.authorName} numberOfLines={1}>
            {post.authorName}
          </Text>
          <Text style={styles.timestamp}>{post.timestamp}</Text>
        </View>
      </View>

      <Text style={styles.text}>{post.text}</Text>

      <View style={styles.reactionRow}>
        {REACTIONS.map(({ type, icon: Icon, label }) => {
          const isMine = post.myReactions.includes(type);
          const count = post.reactions[type];
          return (
            <TouchableOpacity
              key={type}
              style={[styles.reaction, isMine && styles.reactionActive]}
              onPress={() => onToggleReaction(type)}
              activeOpacity={0.7}
              accessibilityLabel={label}
            >
              <Icon size={15} color={isMine ? colors.brand.primary : colors.neutral.gray600} />
              {count > 0 && (
                <Text style={[styles.reactionCount, isMine && styles.reactionCountActive]}>{count}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 14,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '600', color: colors.brand.primary },
  authorTexts: { flex: 1 },
  authorName: { fontSize: 14, fontWeight: '600', color: colors.neutral.text },
  timestamp: { fontSize: 11, fontWeight: '400', color: colors.neutral.gray500, marginTop: 1 },
  text: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.text,
    lineHeight: 20,
    marginTop: 10,
  },
  reactionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 12 },
  reaction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.lg,
    backgroundColor: colors.neutral.gray100,
  },
  reactionActive: { backgroundColor: `${colors.brand.primary}1A` },
  reactionCount: { fontSize: 12, fontWeight: '400', color: colors.neutral.gray600 },
  reactionCountActive: { color: colors.brand.primary, fontWeight: '600' },
});
