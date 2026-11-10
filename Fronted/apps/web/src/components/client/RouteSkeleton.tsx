export function PulseBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-[#F3EAF8] ${className}`} />;
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-2xl border border-[#F0EAF3] bg-white p-4">
          <PulseBlock className="h-11 w-11 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <PulseBlock className="h-3 w-1/3" />
            <PulseBlock className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AppRouteSkeleton() {
  return (
    <div className="flex h-full min-h-[240px] flex-col gap-4 bg-[#FFFCF9] p-6" aria-busy="true" aria-label="Cargando">
      <PulseBlock className="h-8 w-48" />
      <PulseBlock className="h-4 w-72" />
      <ListSkeleton />
    </div>
  );
}
