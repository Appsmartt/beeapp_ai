import type { DisappearingInterval } from '@/components/client/chat/modals/DisappearingMessagesModal';

const SECONDS: Record<DisappearingInterval, number> = {
  '30m': 30 * 60,
  '1h': 60 * 60,
  '6h': 6 * 60 * 60,
  '24h': 24 * 60 * 60,
  '7d': 7 * 24 * 60 * 60,
};

export function disappearingIntervalToSeconds(interval: DisappearingInterval): number {
  return SECONDS[interval];
}
