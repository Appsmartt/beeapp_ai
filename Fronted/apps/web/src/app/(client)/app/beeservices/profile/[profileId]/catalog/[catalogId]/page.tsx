'use client';

import { useParams } from 'next/navigation';
import { PublicCatalog } from '@/components/client/beeservices/buyer/BuyerScreens';

export default function Page() {
  const params = useParams<{ profileId: string; catalogId: string }>();
  return <PublicCatalog profileId={params.profileId} catalogId={params.catalogId} />;
}
