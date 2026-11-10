'use client';

import { useParams } from 'next/navigation';
import { ManageVerification } from '@/components/client/beeservices/manage/OwnerScreens';

export default function Page() {
  const params = useParams<{ businessId: string }>();
  return <ManageVerification businessId={params.businessId} />;
}
