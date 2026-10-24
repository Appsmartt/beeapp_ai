'use client';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#0c071a] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-8 text-center backdrop-blur-xl space-y-4">
        <h2 className="text-xl font-bold">Ocurrió un problema inesperado</h2>
        <p className="text-xs text-violet-200/80">
          {error?.message || 'No fue posible cargar esta sección.'}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="h-11 px-6 rounded-xl bg-gradient-to-r from-[#6025d2] to-fuchsia-600 text-xs font-semibold text-white shadow-lg"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
