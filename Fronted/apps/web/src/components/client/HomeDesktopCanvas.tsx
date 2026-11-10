'use client';

import { MessageCircle } from 'lucide-react';
import { QuickModuleCards, type QuickModuleKey } from './ModuleQuickMenu';

export default function HomeDesktopCanvas({
  onOpenModule,
}: {
  onOpenModule: (key: QuickModuleKey) => void;
}) {
  return (
    <section className="h-full min-h-0 overflow-y-auto overscroll-contain bg-[#F7F4FB]">
      <div className="mx-auto flex w-full max-w-2xl flex-col px-6 py-8 pb-32 lg:pl-10 lg:pr-24">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F6EAFE] text-[#7427D5]">
          <MessageCircle className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-[#261743]">Tu espacio en Buddy</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-[#786593]">
          Los chats quedan en la columna de la izquierda. Desde aquí abres correos, agenda, notas y archivos.
        </p>
        <div className="mt-6">
          <QuickModuleCards onSelect={onOpenModule} />
        </div>
      </div>
    </section>
  );
}
