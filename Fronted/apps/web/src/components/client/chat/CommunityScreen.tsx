'use client';

import { useState } from 'react';
import { ChevronLeft, Shield } from 'lucide-react';
import { createCommunityPost, toggleMessageReaction } from '@beeapp/api-client';
import { CommunityItem, CommunityPost, ReactionType } from '@/lib/client/communities';
import { contactColor, contactInitials } from '@/lib/client/contacts';
import { useAuth } from '@/lib/auth/AuthProvider';
import CommunityPostCard from './CommunityPostCard';
import WriteBar from './WriteBar';

interface CommunityScreenProps {
  community: CommunityItem;
  onBack: () => void;
  onOpenProfile: () => void;
}

export default function CommunityScreen({
  community,
  onBack,
  onOpenProfile,
}: CommunityScreenProps) {
  const { profile } = useAuth();
  const authorName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Tú';
  const [posts, setPosts] = useState<CommunityPost[]>(community.posts);

  const isAdmin = community.isAdmin;

  const toggleReaction = (postId: string, type: ReactionType) => {
    void toggleMessageReaction(postId, type)
      .then(({ active }) => {
        setPosts((list) =>
          list.map((post) => {
            if (post.id !== postId) return post;
            const had = post.myReactions.includes(type);
            const nowActive = active;
            if (had === nowActive) return post;
            return {
              ...post,
              myReactions: nowActive
                ? [...post.myReactions.filter((r) => r !== type), type]
                : post.myReactions.filter((r) => r !== type),
              reactions: {
                ...post.reactions,
                [type]: Math.max(0, (post.reactions[type] || 0) + (nowActive ? 1 : -1)),
              },
            };
          }),
        );
      })
      .catch(() => undefined);
  };

  const handlePublish = (text: string) => {
    const body = text.trim();
    if (!body) return;
    void createCommunityPost(community.id, body).then((saved) => {
      const newPost: CommunityPost = {
        id: saved.id,
        authorId: saved.author_id,
        authorName,
        authorInitials: contactInitials(authorName),
        authorColor: contactColor(saved.author_id),
        text: saved.body,
        timestamp: 'Ahora',
        reactions: { like: 0, love: 0, laugh: 0 },
        myReactions: [],
      };
      setPosts((current) => [newPost, ...current]);
    }).catch(() => undefined);
  };

  const handleSendVoiceNote = () => undefined;

  const handleSendAttachment = () => undefined;

  return (
    <div className="bg-neutral-50 h-full min-h-0 flex flex-col relative select-none">
      {/* Top Header without Phone/Video call buttons */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-white border-b border-neutral-200 sticky top-0 z-20">
        <button
          type="button"
          onClick={onBack}
          className="p-1 rounded-lg text-neutral-700 hover:bg-neutral-100"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div
          onClick={onOpenProfile}
          className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
        >
          <div
            className="w-9.5 h-9.5 rounded-full flex items-center justify-center font-bold text-sm text-brand-primary shrink-0"
            style={{ backgroundColor: community.color }}
          >
            {community.initials}
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm text-neutral-900 truncate leading-tight">
              {community.name}
            </h1>
            <p className="text-[11px] text-neutral-500 truncate font-normal leading-tight">
              {community.members?.length || community.membersCount}{' '}
              {community.membersCount === 1 ? 'miembro' : 'miembros'}
            </p>
          </div>
        </div>
      </div>

      {/* Feed area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 pb-3">
        {posts.length === 0 ? (
          <p className="text-xs text-neutral-500 text-center py-12 font-normal">
            Todavía no hay publicaciones en esta comunidad.
          </p>
        ) : (
          posts.map((post) => (
            <CommunityPostCard
              key={post.id}
              post={post}
              onToggleReaction={(type) => toggleReaction(post.id, type)}
            />
          ))
        )}
      </div>

      {/* Bottom bar: Admin WriteBar vs Member notice (positioned sticky bottom-14 directly above AppBottomBar) */}
      <div className="shrink-0 mt-auto z-20 bg-white border-t border-neutral-200">
        {isAdmin ? (
          <WriteBar
            onSendMessage={handlePublish}
            onSendVoiceNote={handleSendVoiceNote}
            onSendAttachment={handleSendAttachment}
          />
        ) : (
          <div className="py-3 bg-white border-t border-neutral-200 text-center text-xs text-neutral-500 font-normal flex items-center justify-center gap-1.5">
            <Shield className="w-4 h-4 text-neutral-400" />
            <span>Solo el administrador puede publicar</span>
          </div>
        )}
      </div>
    </div>
  );
}
