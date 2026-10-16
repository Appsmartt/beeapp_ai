import { Suspense } from 'react';
import BeeServicesWorkspace from '@/components/client/beeservices/BeeServicesWorkspace';

export default function BeeServicesPage() {
  return (
    <Suspense fallback={null}>
      <BeeServicesWorkspace />
    </Suspense>
  );
}