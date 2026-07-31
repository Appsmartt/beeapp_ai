'use client';

import IconRailButton from '../IconRailButton';
import { CHAT_SECTIONS, ChatSection } from './chatSections';

interface ChatOptionsBarProps {
  section: ChatSection;
  onSelectSection: (section: ChatSection) => void;
}

/**
 * Barra vertical de 56px pegada al borde izquierdo del módulo de Chat.
 * Solo en desktop: en móvil y tablet estas opciones viven en las pestañas
 * del panel de la lista.
 */
export default function ChatOptionsBar({ section, onSelectSection }: ChatOptionsBarProps) {
  return (
    <nav className="hidden lg:flex w-14 shrink-0 bg-white border-r border-neutral-200 flex-col items-center py-3 gap-1">
      {CHAT_SECTIONS.map((option) => (
        <IconRailButton
          key={option.key}
          label={option.label}
          icon={option.icon}
          tooltipSide="right"
          isActive={section === option.key}
          onClick={() => onSelectSection(option.key)}
        />
      ))}
    </nav>
  );
}
