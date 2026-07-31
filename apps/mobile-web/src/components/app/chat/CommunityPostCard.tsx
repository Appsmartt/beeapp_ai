'use client';

import { ThumbsUp, Heart, Laugh } from 'lucide-react';
import { CommunityPost, ReactionType } from '@/mocks/communities';

const REACTIONS: { type: ReactionType; icon: typeof ThumbsUp; label: string }[] = [
  { type: 'like', icon: ThumbsUp, label: 'Me gusta' },
  { type: 'love', icon: Heart, label: 'Me encanta' },
  { type: 'laugh', icon: Laugh, label: 'Me divierte' },
];

interface CommunityPostCardProps {
  post: CommunityPost;
  onToggleReaction: (type: ReactionType) => void;
}

export default function CommunityPostCard({ post, onToggleReaction }: CommunityPostCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-4 mb-3 shadow-xs">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs text-brand-primary shrink-0"
          style={{ backgroundColor: post.authorColor }}
        >
          {post.authorInitials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-neutral-900 truncate">{post.authorName}</p>
          <p className="text-[11px] font-normal text-neutral-500">{post.timestamp}</p>
        </div>
      </div>

      <p className="text-sm text-neutral-900 font-normal leading-relaxed whitespace-pre-wrap">
        {post.text}
      </p>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-100">
        {REACTIONS.map(({ type, icon: Icon, label }) => {
          const isMine = post.myReactions.includes(type);
          const count = post.reactions[type] || 0;
          return (
            <button
              key={type}
              type="button"
              onClick={() => onToggleReaction(type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-normal transition-colors ${
                isMine
                  ? 'bg-brand-primary/15 text-brand-primary font-semibold'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
              title={label}
            >
              <Icon className="w-4 h-4" />
              {count > 0 && <span>{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
