'use client';

import { useParams } from 'next/navigation';
import { OfferRequestForm } from '@/components/client/beeservices/buyer/BuyerScreens';

export default function Page() {
  const params = useParams<{ offerId: string }>();
  return <OfferRequestForm offerId={params.offerId} booking={false} />;
}
