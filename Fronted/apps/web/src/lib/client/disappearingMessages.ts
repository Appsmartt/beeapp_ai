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

export function secondsToDisappearingInterval(seconds?: number | null): DisappearingInterval | null {
  if (!seconds || seconds <= 0) return null;
  if (seconds <= 30 * 60) return '30m';
  if (seconds <= 60 * 60) return '1h';
  if (seconds <= 6 * 60 * 60) return '6h';
  if (seconds <= 24 * 60 * 60) return '24h';
  return '7d';
}
