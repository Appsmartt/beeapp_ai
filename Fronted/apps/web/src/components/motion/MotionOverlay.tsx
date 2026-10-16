'use client';

type MotionOverlayProps = {
  visible: boolean;
  onClick: () => void;
  label?: string;
  className?: string;
};

export default function MotionOverlay({
  visible,
  onClick,
  label = 'Cerrar',
  className = '',
}: MotionOverlayProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`motion-overlay fixed inset-0 bg-black/60 backdrop-blur-xl ${
        visible ? 'is-visible' : ''
      } ${className}`}
    />
  );
}
