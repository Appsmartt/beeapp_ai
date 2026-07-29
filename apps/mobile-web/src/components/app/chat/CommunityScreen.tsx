'use client';

import { useState } from 'react';
import { ArrowLeft, ThumbsUp, Heart, SmilePlus, Send, Shield } from 'lucide-react';
import { CommunityItem } from '@/mocks/communities';

interface CommunityScreenProps {
  community: CommunityItem;
  onBack: () => void;
  onOpenProfile: () => void;
}

export default function CommunityScreen({ community, onBack, onOpenProfile }: CommunityScreenProps) {
  const [posts, setPosts] = useState(community.posts);
  const [newPostText, setNewPostText] = useState('');

  const toggleReaction = (postId: string, type: 'thumbsUp' | 'heart' | 'smile') => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const currentActive = p.userReactions[type];
        const newCount = currentActive ? p.reactions[type] - 1 : p.reactions[type] + 1;
        return {
          ...p,
          reactions: { ...p.reactions, [type]: newCount },
          userReactions: { ...p.userReactions, [type]: !currentActive },
        };
      })
    );
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim()) return;
    const newP = {
      id: `p-${Date.now()}`,
      author: 'Santiago Morales (Admin)',
      time: 'Ahora',
      text: newPostText,
      reactions: { thumbsUp: 0, heart: 0, smile: 0 },
      userReactions: {},
    };
    setPosts([newP, ...posts]);
    setNewPostText('');
  };

  return (
    <div className="bg-neutral-50 min-h-full flex flex-col">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200/80 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div onClick={onOpenProfile} className="cursor-pointer">
            <h1 className="font-semibold text-sm text-neutral-900 leading-none">{community.name}</h1>
            <p className="text-[10px] text-neutral-500 font-normal mt-0.5">{community.membersCount} miembros</p>
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto pb-24">
        {posts.map((post) => (
          <div key={post.id} className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-neutral-900">{post.author}</span>
              <span className="text-[10px] text-neutral-400 font-normal">{post.time}</span>
            </div>

            <p className="text-xs text-neutral-800 font-normal leading-relaxed whitespace-pre-line">
              {post.text}
            </p>

            {/* Reactions Row */}
            <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => toggleReaction(post.id, 'thumbsUp')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                  post.userReactions.thumbsUp ? 'bg-brand-primary/10 text-brand-primary' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/60'
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>{post.reactions.thumbsUp}</span>
              </button>

              <button
                type="button"
                onClick={() => toggleReaction(post.id, 'heart')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                  post.userReactions.heart ? 'bg-red-50 text-red-600' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/60'
                }`}
              >
                <Heart className="w-3.5 h-3.5" />
                <span>{post.reactions.heart}</span>
              </button>

              <button
                type="button"
                onClick={() => toggleReaction(post.id, 'smile')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                  post.userReactions.smile ? 'bg-amber-50 text-amber-600' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/60'
                }`}
              >
                <SmilePlus className="w-3.5 h-3.5" />
                <span>{post.reactions.smile}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Admin Post Input Bar vs Member Notice */}
      <div className="p-3 bg-white border-t border-neutral-200/80 sticky bottom-0 z-10">
        {community.isAdmin ? (
          <form onSubmit={handleCreatePost} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Escribir aviso oficial en la comunidad..."
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
              className="flex-1 h-10 px-3.5 bg-neutral-100 border border-neutral-200/60 rounded-full text-xs outline-none focus:border-brand-primary"
            />
            <button type="submit" className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="text-center py-1.5 text-xs text-neutral-500 font-normal flex items-center justify-center gap-1.5">
            <Shield className="w-4 h-4 text-neutral-400" />
            <span>Solo el administrador puede publicar</span>
          </div>
        )}
      </div>
    </div>
  );
}
