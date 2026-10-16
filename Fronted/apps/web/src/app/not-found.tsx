import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0c071a] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-8 text-center backdrop-blur-xl space-y-4">
        <span className="inline-block rounded-full bg-fuchsia-500/20 border border-fuchsia-400/30 px-3 py-1 text-xs font-semibold text-fuchsia-200">
          404
        </span>
        <h1 className="text-2xl font-bold">Página no encontrada</h1>
        <p className="text-xs text-violet-200/80">
          La ruta que buscas no existe o fue movida.
        </p>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center px-6 rounded-xl bg-gradient-to-r from-[#6025d2] to-fuchsia-600 text-xs font-semibold text-white shadow-lg"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
