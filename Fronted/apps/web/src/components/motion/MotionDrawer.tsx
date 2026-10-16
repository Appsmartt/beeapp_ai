'use client';

import type { ReactNode } from 'react';

type MotionDrawerProps = {
  visible: boolean;
  side?: 'left' | 'right';
  className?: string;
  children: ReactNode;
};

export default function MotionDrawer({
  visible,
  side = 'right',
  className = '',
  children,
}: MotionDrawerProps) {
  const motionClass = side === 'right' ? 'motion-drawer-right' : 'motion-drawer-left';

  return (
    <div className={`${motionClass} ${visible ? 'is-visible' : ''} ${className}`}>
      {children}
    </div>
  );
}
