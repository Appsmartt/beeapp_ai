'use client';

import { useState } from 'react';
import { ChevronLeft, Shield } from 'lucide-react';
import { CommunityItem, CommunityPost, ReactionType, CURRENT_USER_ID } from '@/mocks/communities';
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
  const [posts, setPosts] = useState<CommunityPost[]>(community.posts);

  const isAdmin = community.creatorId === CURRENT_USER_ID || community.isAdmin;

  const toggleReaction = (postId: string, type: ReactionType) => {
    setPosts((list) =>
      list.map((post) => {
        if (post.id !== postId) return post;
        const isMine = post.myReactions.includes(type);
        return {
          ...post,
          myReactions: isMine
            ? post.myReactions.filter((r) => r !== type)
            : [...post.myReactions, type],
          reactions: { ...post.reactions, [type]: (post.reactions[type] || 0) + (isMine ? -1 : 1) },
        };
      })
    );
  };

  const handlePublish = (text: string) => {
    const newPost: CommunityPost = {
      id: 'p_' + Date.now().toString(36),
      authorId: CURRENT_USER_ID,
      authorName: 'Santiago Valencia',
      authorInitials: 'SV',
      authorColor: '#F3E8FF',
      text: text.trim(),
      timestamp: 'Ahora',
      reactions: { like: 0, love: 0, laugh: 0 },
      myReactions: [],
    };
    setPosts([newPost, ...posts]);
  };

  const handleSendVoiceNote = () => {
    handlePublish('📢 Anuncio grabado por nota de voz (Mock)');
  };

  const handleSendAttachment = (type: string) => {
    handlePublish(`📍 Adjunto o ubicación compartida en la comunidad (Mock de ${type})`);
  };

  return (
    <div className="bg-neutral-50 min-h-full flex flex-col relative select-none">
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
      <div className="flex-1 overflow-y-auto p-4 pb-36">
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
      <div className="sticky bottom-14 left-0 right-0 z-20 bg-white">
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
