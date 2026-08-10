const steps = [
  {
    step: '1',
    title: 'Crea tu cuenta',
    description: 'Regístrate rápidamente ingresando únicamente tu número de teléfono.',
  },
  {
    step: '2',
    title: 'Configura tu negocio',
    description: 'Agrega tu información, productos y servicios dentro de BeeServices.',
  },
  {
    step: '3',
    title: 'Conecta con clientes',
    description: 'La IA te ayuda a promocionar tu negocio y atender clientes automáticamente.',
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 bg-white border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 tracking-tight">
            Empieza en 3 pasos
          </h2>
          <p className="text-neutral-600 font-normal text-base sm:text-lg">
            Un proceso simple e intuitivo para integrar la tecnología en tu día a día.
          </p>
        </div>

        {/* 3 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center text-center p-8 rounded-2xl bg-neutral-50/50 border border-neutral-200/60 relative"
            >
              <div className="w-14 h-14 rounded-2xl bg-brand-primary text-white font-bold text-2xl flex items-center justify-center mb-6 shadow-md shadow-brand-primary/20">
                {item.step}
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">
                {item.title}
              </h3>
              <p className="text-neutral-600 text-sm font-normal leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
