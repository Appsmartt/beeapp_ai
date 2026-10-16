'use client';

type ProfileAvatarProps = {
  initials: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
};

const SIZE_CLASSES = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-12 w-12 text-base',
  md: 'h-16 w-16 text-lg',
  lg: 'h-20 w-20 text-xl',
} as const;

export default function ProfileAvatar({
  initials,
  avatarUrl,
  size = 'md',
  className = '',
}: ProfileAvatarProps) {
  const sizeClass = SIZE_CLASSES[size];
  const trimmedUrl = avatarUrl?.trim() || null;

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-primary font-bold text-white shadow-sm ${sizeClass} ${className}`}
    >
      {trimmedUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={trimmedUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
