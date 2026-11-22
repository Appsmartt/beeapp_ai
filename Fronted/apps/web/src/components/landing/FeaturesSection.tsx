import { Bot, CalendarDays, Mail, MessageCircle, Shield, ShoppingBag, Users } from 'lucide-react';

const features = [
  {
    icon: MessageCircle,
    tag: 'Comunicación',
    title: 'Chat inteligente y llamadas',
    description:
      'Chats individuales, grupos, comunidades, notas de voz, reacciones reales y llamadas de voz o video HD.',
    accent: 'from-[#6025D2] to-[#8B5CF6]',
    iconBg: 'bg-brand-primary/10 text-brand-primary',
  },
  {
    icon: ShoppingBag,
    tag: 'Comercio',
    title: 'BuddyServices',
    description:
      'Crea tu negocio, publica tus productos y servicios, gestiona horarios, reservas y comprobantes.',
    accent: 'from-emerald-500 to-teal-500',
    iconBg: 'bg-emerald-500/15 text-emerald-700',
  },
  {
    icon: Bot,
    tag: 'Inteligencia Artificial',
    title: 'Asistente IA por voz y texto',
    description:
      'Dictado inteligente, búsqueda en el marketplace, confirmación de acciones y ayuda contextual en tu carrito.',
    accent: 'from-sky-500 to-indigo-500',
    iconBg: 'bg-sky-500/15 text-sky-700',
  },
  {
    icon: Mail,
    tag: 'Correo y Agenda',
    title: 'Productividad conectada',
    description:
      'Redacta correos con IA, sincroniza cuentas externas y administra citas en vistas de día, semana o mes.',
    accent: 'from-violet-600 to-fuchsia-600',
    iconBg: 'bg-fuchsia-500/15 text-fuchsia-700',
  },
  {
    icon: CalendarDays,
    tag: 'Organización',
    title: 'Notas y nube compartida',
    description:
      'Notas con bloques e imágenes, subcarpetas, archivos compartidos y papelera con respaldo seguro.',
    accent: 'from-amber-500 to-orange-500',
    iconBg: 'bg-amber-500/15 text-amber-700',
  },
  {
    icon: Users,
    tag: 'Red y Seguridad',
    title: 'Red empresarial protegida',
    description:
      'Contactos verificados, perfiles comerciales, protección con PIN en chats o archivos y mensajes temporales.',
    accent: 'from-indigo-600 to-purple-700',
    iconBg: 'bg-indigo-500/15 text-indigo-700',
  },
];

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative border-b border-[#E3D6F5] bg-[#FAF7FE] py-16 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl space-y-3 text-center sm:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#DFD2F2] bg-white px-3.5 py-1 text-xs font-semibold text-[#5E1ABF] shadow-sm">
            <Shield className="h-3.5 w-3.5" />
            <span>Ecosistema Buddy AI</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#190D33] sm:text-4xl">
            Todo lo que necesitas en un solo lugar
          </h2>
          <p className="text-base text-[#524573] sm:text-lg">
            Herramientas integradas para potenciar tu comunicación, ventas y productividad diaria sin saltar entre aplicaciones.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-3xl border border-[#E5D9F4] bg-white/95 p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand-primary/35 hover:shadow-[0_18px_38px_-14px_rgba(96,37,210,0.20)]"
              >
                <div
                  aria-hidden
                  className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${feature.accent} opacity-80 transition-opacity group-hover:opacity-100`}
                />

                <div className="mb-5 flex items-center justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${feature.iconBg} shadow-sm`}
                  >
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-[#F4EEFC] px-2.5 py-1 text-[11px] font-semibold text-[#5E1ABF]">
                    {feature.tag}
                  </span>
                </div>

                <h3 className="mb-2 text-lg font-bold text-[#190D33]">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#5B4E7A]">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
