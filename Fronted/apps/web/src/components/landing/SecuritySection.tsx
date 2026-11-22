import { CheckCircle2, Database, KeyRound, Lock, Shield, Timer } from 'lucide-react';

const items = [
  {
    icon: Lock,
    title: 'Bloqueo biométrico en móvil',
    description: 'Acceso protegido mediante huella dactilar o reconocimiento facial en la app móvil.',
    iconBg: 'bg-brand-primary/15 text-brand-primary',
  },
  {
    icon: KeyRound,
    title: 'PIN de archivos y chats',
    description: 'Protección adicional con código PIN personalizado para conversaciones y documentos sensibles.',
    iconBg: 'bg-emerald-500/15 text-emerald-700',
  },
  {
    icon: Timer,
    title: 'Mensajes temporales',
    description: 'Configura auto-destrucción programada por conversación para mantener tu privacidad.',
    iconBg: 'bg-amber-500/15 text-amber-700',
  },
  {
    icon: Database,
    title: 'Sesiones y datos cifrados',
    description: 'Controla tus dispositivos conectados y revoca accesos en un toque cuando lo necesites.',
    iconBg: 'bg-sky-500/15 text-sky-700',
  },
];

const SAFEGUARDS = [
  'Revocación individual o global de dispositivos',
  'Verificación de identidad y negocios en BuddyServices',
  'Permisos granulares para acciones del Asistente IA',
];

export default function SecuritySection() {
  return (
    <section
      id="security"
      className="relative overflow-hidden border-b border-[#E1D4F4] bg-gradient-to-b from-[#EFE8FA] via-[#F4EEFC] to-[#FAF7FE] py-16 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left column: editorial summary */}
          <div className="space-y-5 text-center lg:col-span-5 lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D8C5F6] bg-white/90 px-3.5 py-1 text-xs font-semibold text-[#5E1ABF] shadow-sm">
              <Shield className="h-3.5 w-3.5" />
              <span>Privacidad garantizada</span>
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight text-[#190D33] sm:text-4xl">
              Tu información, protegida
            </h2>

            <p className="mx-auto max-w-lg text-base leading-relaxed text-[#524573] lg:mx-0">
              Diseñado bajo altos estándares de seguridad para resguardar tus chats personales, archivos en la nube y la operación comercial de tu negocio.
            </p>

            <div className="mx-auto max-w-md rounded-2xl border border-[#DFD2F2] bg-white/85 p-4 text-left shadow-sm backdrop-blur-sm lg:mx-0">
              <ul className="space-y-2.5">
                {SAFEGUARDS.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-[#392B5B]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right column: 2x2 grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-7">
            {items.map((item) => {
              const IconComponent = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-3xl border border-[#DFD2F2] bg-white/95 p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-primary/35 hover:shadow-md"
                >
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${item.iconBg}`}
                  >
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <h3 className="mb-1.5 text-lg font-bold text-[#190D33]">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#5B4E7A]">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
