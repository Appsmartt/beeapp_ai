import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing } from '@beeapp/design-system';
import { ChevronLeft } from 'lucide-react-native';
import ScreenSafeArea from '../layout/ScreenSafeArea';
import { useModuleNav, useScreenParams } from '../embedded/EmbeddedNavContext';
import CommunityPostCard from './CommunityPostCard';
import WriteBar from './WriteBar';
import {
  getCommunity,
  isCommunityAdmin,
  CommunityPost,
  ReactionType,
  CURRENT_USER_ID,
} from '../../mocks/communities';

/**
 * A community reads like a feed, not like a chat: the admin publishes and
 * everyone else can only react. Members never see the write bar.
 */
export default function CommunityScreen() {
  const router = useModuleNav();
  const params = useScreenParams();
  const community = getCommunity(params.id as string);

  const [posts, setPosts] = useState<CommunityPost[]>(community?.posts ?? []);

  if (!community) return null;

  const isAdmin = isCommunityAdmin(community);

  const toggleReaction = (postId: string, type: ReactionType) =>
    setPosts((list) =>
      list.map((post) => {
        if (post.id !== postId) return post;
        const isMine = post.myReactions.includes(type);
        return {
          ...post,
          myReactions: isMine
            ? post.myReactions.filter((r) => r !== type)
            : [...post.myReactions, type],
          reactions: { ...post.reactions, [type]: post.reactions[type] + (isMine ? -1 : 1) },
        };
      })
    );

  const publish = (text: string) => {
    const newPost: CommunityPost = {
      id: 'p_' + Date.now().toString(36),
      authorId: CURRENT_USER_ID,
      authorName: 'Santiago Valencia',
      authorInitials: 'SV',
      authorColor: '#F3E8FF',
      text,
      timestamp: 'Ahora',
      reactions: { like: 0, love: 0, laugh: 0 },
      myReactions: [],
    };
    community.posts = [newPost, ...community.posts];
    setPosts(community.posts);
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={24} color={colors.neutral.text} />
        </TouchableOpacity>

        {/* Tapping the header opens the community profile */}
        <TouchableOpacity
          style={styles.identity}
          onPress={() =>
            router.push({ pathname: '/(main)/chat/community-profile', params: { id: community.id } })
          }
          activeOpacity={0.7}
        >
          <View style={[styles.avatar, { backgroundColor: community.color }]}>
            <Text style={styles.avatarText}>{community.initials}</Text>
          </View>
          <View style={styles.headerTexts}>
            <Text style={styles.name} numberOfLines={1}>
              {community.name}
            </Text>
            <Text style={styles.meta}>
              {community.members.length} {community.members.length === 1 ? 'miembro' : 'miembros'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.feed} showsVerticalScrollIndicator={false}>
        {posts.length === 0 ? (
          <Text style={styles.emptyText}>Todavía no hay publicaciones en esta comunidad.</Text>
        ) : (
          posts.map((post) => (
            <CommunityPostCard
              key={post.id}
              post={post}
              onToggleReaction={(type) => toggleReaction(post.id, type)}
            />
          ))
        )}
        <View style={styles.bottomGap} />
      </ScrollView>

      {isAdmin ? (
        <WriteBar onSendMessage={publish} onSendVoiceNote={() => {}} onSendAttachment={() => {}} />
      ) : (
        <Text style={styles.readOnlyNote}>Solo el administrador puede publicar</Text>
      )}
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.neutral.gray50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  backBtn: { padding: 4 },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '600', color: colors.brand.primary },
  headerTexts: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: colors.neutral.text },
  meta: { fontSize: 12, fontWeight: '400', color: colors.neutral.gray600, marginTop: 1 },
  feed: { flex: 1, paddingTop: spacing.sm },
  emptyText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral.gray600,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  bottomGap: { height: 40 },
  readOnlyNote: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray500,
    textAlign: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray100,
  },
});
