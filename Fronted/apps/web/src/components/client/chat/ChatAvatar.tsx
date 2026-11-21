'use client';

import { useEffect, useState } from 'react';
import { Bot, Users } from 'lucide-react';

interface ChatAvatarProps {
  name: string;
  avatarUrl?: string | null;
  isGroup?: boolean;
  isAI?: boolean;
  isPinned?: boolean;
  size?: 'sm' | 'md' | 'lg';
  initials?: string;
}

const SIZE_MAP = {
  sm: { box: 'h-9 w-9', text: 'text-sm', icon: 'h-4 w-4' },
  md: { box: 'h-10 w-10', text: 'text-sm', icon: 'h-5 w-5' },
  lg: { box: 'h-20 w-20', text: 'text-xl', icon: 'h-8 w-8' },
} as const;

export function ChatAvatar({
  name,
  avatarUrl,
  isGroup = false,
  isAI = false,
  isPinned = false,
  size = 'sm',
  initials,
}: ChatAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const trimmedUrl = avatarUrl?.trim() || null;

  useEffect(() => {
    setImgFailed(false);
  }, [trimmedUrl]);

  const metrics = SIZE_MAP[size];
  const fallbackLabel = initials || name.trim().charAt(0).toUpperCase() || 'C';

  if (isAI) {
    return (
      <div
        className={`flex ${metrics.box} items-center justify-center rounded-full bg-brand-primary text-white shadow-xs`}
      >
        <Bot className={metrics.icon} />
      </div>
    );
  }

  if (trimmedUrl && !imgFailed) {
    const borderClass = isGroup
      ? 'rounded-xl border border-neutral-200'
      : isPinned
        ? 'rounded-full border-2 border-brand-primary'
        : 'rounded-full border border-brand-primary/30';

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={trimmedUrl}
        alt={name}
        onError={() => setImgFailed(true)}
        className={`${metrics.box} ${borderClass} bg-neutral-100 object-cover`}
      />
    );
  }

  if (isGroup) {
    return (
      <div
        className={`flex ${metrics.box} items-center justify-center rounded-xl border border-neutral-200 bg-neutral-100 text-neutral-600`}
      >
        <Users className={metrics.icon} />
      </div>
    );
  }

  return (
    <div
      className={`flex ${metrics.box} items-center justify-center rounded-full border bg-brand-primary/10 font-normal text-brand-primary ${metrics.text} ${
        isPinned ? 'border-2 border-brand-primary' : 'border-brand-primary/30'
      }`}
    >
      <span>{fallbackLabel}</span>
    </div>
  );
}
