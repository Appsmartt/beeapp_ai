'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#0c071a] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-8 text-center space-y-4">
          <h2 className="text-xl font-bold">Error de aplicación</h2>
          <p className="text-xs text-violet-200/80">
            {error?.message || 'Se produjo un error crítico al renderizar la página.'}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="h-11 px-6 rounded-xl bg-[#6025d2] text-xs font-semibold text-white"
          >
            Recargar
          </button>
        </div>
      </body>
    </html>
  );
}
