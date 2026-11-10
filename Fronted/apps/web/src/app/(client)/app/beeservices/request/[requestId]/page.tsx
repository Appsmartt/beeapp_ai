'use client';

import { useParams } from 'next/navigation';
import { CustomerRequestDetail } from '@/components/client/beeservices/buyer/BuyerScreens';

export default function Page() {
  const params = useParams<{ requestId: string }>();
  return <CustomerRequestDetail requestId={params.requestId} />;
}