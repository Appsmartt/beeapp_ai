import { MessageCircle, ShoppingBag, Bot, Mail, Shield, Users } from 'lucide-react';

const features = [
  {
    icon: MessageCircle,
    title: 'Chat inteligente',
    description: 'Chats, grupos, comunidades y asistente IA que responde por ti.',
  },
  {
    icon: ShoppingBag,
    title: 'BeeServices',
    description: 'Crea tu negocio, publica productos y servicios, conecta con clientes.',
  },
  {
    icon: Bot,
    title: 'Asistente IA',
    description: 'Voz y texto, busca productos, responde clientes automáticamente.',
  },
  {
    icon: Mail,
    title: 'Correo integrado',
    description: 'Gestiona tu correo profesional sin salir de la app.',
  },
  {
    icon: Shield,
    title: 'Seguridad total',
    description: 'Bloqueo biométrico, PIN, mensajes temporales, chats protegidos.',
  },
  {
    icon: Users,
    title: 'Red empresarial',
    description: 'Contactos, visibilidad profesional y verificación de negocios.',
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-white border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 tracking-tight">
            Todo lo que necesitas en un solo lugar
          </h2>
          <p className="text-neutral-600 font-normal text-base sm:text-lg">
            Herramientas integradas para potenciar tu presencia y eficiencia sin complicaciones.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200/60 hover:border-brand-primary/30 hover:bg-brand-primary/5 transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-xl bg-white border border-neutral-200/80 flex items-center justify-center text-brand-primary mb-5 shadow-sm">
                  <IconComponent className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-neutral-600 text-sm font-normal leading-relaxed">
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
