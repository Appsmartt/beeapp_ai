'use client';

import { useParams } from 'next/navigation';
import { PublicProfile } from '@/components/client/beeservices/buyer/BuyerScreens';

export default function Page() {
  const params = useParams<{ profileId: string }>();
  return <PublicProfile profileId={params.profileId} />;
}
