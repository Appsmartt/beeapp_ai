'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ManageOffers } from '@/components/client/beeservices/manage/OwnerScreens';

function OffersPage() {
  const params = useParams<{ businessId: string }>();
  const catalogId = useSearchParams().get('catalog') || undefined;
  return <ManageOffers businessId={params.businessId} catalogId={catalogId} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <OffersPage />
    </Suspense>
  );
}
