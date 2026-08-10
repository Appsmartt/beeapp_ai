import { StyleProp, ViewStyle } from 'react-native';
import { BadgeCheck } from 'lucide-react-native';

/** Blue of the verified badge (Bee Verify), shared by every screen */
export const VERIFIED_COLOR = '#1D9BF0';

interface VerifiedBadgeProps {
  /** Icon size in px; pair it with the size of the name it follows */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Verified account mark shown next to the name of a verified user.
 * Render it only when the user's mock `verified` field is true.
 */
export default function VerifiedBadge({ size = 14, style }: VerifiedBadgeProps) {
  return <BadgeCheck size={size} color={VERIFIED_COLOR} style={style} />;
}
