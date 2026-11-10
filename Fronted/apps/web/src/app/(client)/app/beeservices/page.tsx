import { Suspense } from 'react';
import BeeServicesWorkspace from '@/components/client/beeservices/BeeServicesWorkspace';
import { AppRouteSkeleton } from '@/components/client/RouteSkeleton';

export default function BeeServicesPage() {
  return (
    <Suspense fallback={<AppRouteSkeleton />}>
      <BeeServicesWorkspace />
    </Suspense>
  );
}