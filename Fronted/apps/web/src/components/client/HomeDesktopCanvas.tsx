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
      <div className="mx-auto flex w-full max-w-xl flex-col px-6 py-7 pb-28 lg:pl-10 lg:pr-20">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#F6EAFE] text-[#7427D5]">
          <MessageCircle className="h-5 w-5" />
        </span>
        <h2 className="mt-3.5 text-xl font-extrabold tracking-tight text-[#261743]">Tu espacio en Buddy</h2>
        <p className="mt-1.5 max-w-md text-[13px] leading-5 text-[#786593]">
          Los chats quedan en la columna de la izquierda. Desde aquí abres correos, agenda, notas y archivos.
        </p>
        <div className="mt-5">
          <QuickModuleCards onSelect={onOpenModule} />
        </div>
      </div>
    </section>
  );
}
