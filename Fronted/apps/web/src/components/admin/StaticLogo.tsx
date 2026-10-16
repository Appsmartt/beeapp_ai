import Image from 'next/image';

type StaticLogoProps = {
  variant?: 'mark' | 'wordmark';
  width?: number;
  priority?: boolean;
};

const ASSETS = {
  mark: {
    src: '/logo.png',
    naturalWidth: 1024,
    naturalHeight: 1024,
  },
  wordmark: {
    src: '/logoletras.png',
    naturalWidth: 1600,
    naturalHeight: 600,
  },
} as const;

export default function StaticLogo({
  variant = 'wordmark',
  width,
  priority = false,
}: StaticLogoProps) {
  const asset = ASSETS[variant];
  const resolvedWidth = width ?? (variant === 'mark' ? 80 : 240);
  const resolvedHeight = Math.round(
    resolvedWidth * (asset.naturalHeight / asset.naturalWidth)
  );

  return (
    <Image
      src={asset.src}
      alt="Buddy"
      width={resolvedWidth}
      height={resolvedHeight}
      priority={priority}
      style={{
        display: 'block',
        width: `${resolvedWidth}px`,
        height: 'auto',
        maxWidth: '100%',
        objectFit: 'contain',
      }}
    />
  );
}
