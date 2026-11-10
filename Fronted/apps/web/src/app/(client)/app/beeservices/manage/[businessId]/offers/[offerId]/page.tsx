'use client';

import { useParams } from 'next/navigation';
import { ManageOfferEditor } from '@/components/client/beeservices/manage/OwnerScreens';

export default function Page() {
  const params = useParams<{ businessId: string; offerId: string }>();
  return <ManageOfferEditor businessId={params.businessId} offerId={params.offerId} />;
}
