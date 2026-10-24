import { BadgeCheck } from 'lucide-react';

interface VerifiedBadgeProps {
  /** Icon size in px; pair it with the size of the name it follows */
  size?: number;
}

/**
 * Verified account mark (Bee Verify) shown next to the name of a user whose
 * `verificacionRed` is 'verificado'.
 */
export default function VerifiedBadge({ size = 14 }: VerifiedBadgeProps) {
  return (
    <span className="verified-badge" title="Cuenta verificada">
      <BadgeCheck size={size} />
    </span>
  );
}
