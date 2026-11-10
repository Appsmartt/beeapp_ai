'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PublicResults } from '@/components/client/beeservices/buyer/BuyerScreens';

function ResultsPage() {
  const query = useSearchParams().get('q') || '';
  return <PublicResults query={query} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ResultsPage />
    </Suspense>
  );
}
