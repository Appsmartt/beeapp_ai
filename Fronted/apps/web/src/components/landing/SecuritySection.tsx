import { Shield, Lock, KeyRound, Timer, Database } from 'lucide-react';

const items = [
  {
    icon: Lock,
    title: 'Bloqueo biométrico',
    description: 'Acceso seguro mediante huella o reconocimiento facial en tu dispositivo.',
  },
  {
    icon: KeyRound,
    title: 'PIN de archivos y chats',
    description: 'Protección adicional con código PIN personalizado para datos sensibles.',
  },
  {
    icon: Timer,
    title: 'Mensajes temporales',
    description: 'Auto-destrucción programada de mensajes para privacidad absoluta.',
  },
  {
    icon: Database,
    title: 'Cifrado de datos',
    description: 'Tus conversaciones e información comercial viajan completamente cifradas.',
  },
];

export default function SecuritySection() {
  return (
    <section id="security" className="py-20 bg-neutral-50 border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-medium">
            <Shield className="w-3.5 h-3.5" />
            <span>Privacidad garantizada</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 tracking-tight">
            Tu información, protegida
          </h2>
          <p className="text-neutral-600 font-normal text-base sm:text-lg">
            Diseñado bajo los más altos estándares de seguridad y privacidad digital.
          </p>
        </div>

        {/* 2x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {items.map((item, idx) => {
            const IconComponent = item.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0">
                  <IconComponent className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-neutral-900">
                    {item.title}
                  </h3>
                  <p className="text-neutral-600 text-sm font-normal leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
