'use client';

import { useParams } from 'next/navigation';
import { PublicOffer } from '@/components/client/beeservices/buyer/BuyerScreens';

export default function Page() {
  const params = useParams<{ offerId: string }>();
  return <PublicOffer offerId={params.offerId} />;
}
