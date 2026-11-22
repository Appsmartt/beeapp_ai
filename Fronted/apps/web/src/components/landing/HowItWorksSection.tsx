import { ArrowRight, CheckCircle2, Sparkles, Store, UserPlus } from 'lucide-react';

const steps = [
  {
    step: '01',
    icon: UserPlus,
    tag: 'Acceso rápido',
    title: 'Crea tu cuenta',
    description:
      'Regístrate con tu correo y contraseña o ingresa con OTP y vincula tus dispositivos al instante.',
  },
  {
    step: '02',
    icon: Store,
    tag: 'Todo sincronizado',
    title: 'Configura tu espacio o negocio',
    description:
      'Personaliza tu asistente IA, conecta correo y agenda, o publica tus productos y servicios en BuddyServices.',
  },
  {
    step: '03',
    icon: Sparkles,
    tag: 'Automatización real',
    title: 'Conecta y vende más rápido',
    description:
      'Atiende clientes por chat y voz, gestiona reservas y comprobantes, y controla tu operación desde web o móvil.',
  },
];

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#190D35] via-[#23124A] to-[#120829] py-16 text-white sm:py-20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-brand-primary/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-[#7C3AED]/25 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl space-y-3 text-center sm:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1 text-xs font-semibold text-[#DCCBFF] backdrop-blur-sm">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#C4B5FD]" />
            <span>Flujo simple de inicio a fin</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Empieza en 3 pasos
          </h2>
          <p className="text-base text-[#D3C4F2] sm:text-lg">
            Un proceso claro e intuitivo para integrar la inteligencia artificial en tu día a día y tu negocio.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="group relative flex flex-col rounded-3xl border border-white/15 bg-white/[0.06] p-7 backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:border-[#A78BFA]/50 hover:bg-white/[0.10]"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6025D2] to-[#8B5CF6] text-white shadow-lg shadow-brand-primary/30">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-sm font-bold tracking-widest text-[#C4B5FD]/80">
                    PASO {item.step}
                  </span>
                </div>

                <span className="mb-2 inline-block w-fit rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-[#E2D6FF]">
                  {item.tag}
                </span>

                <h3 className="mb-2.5 text-xl font-bold text-white">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#CFC0EF]">
                  {item.description}
                </p>

                {idx < steps.length - 1 ? (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-5 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-[#23124A] p-1.5 text-[#C4B5FD] md:flex lg:-right-5"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
