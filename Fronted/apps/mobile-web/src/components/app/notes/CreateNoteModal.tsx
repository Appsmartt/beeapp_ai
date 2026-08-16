'use client';

import { FilePlus2, LayoutTemplate, Loader2, X } from 'lucide-react';
import type { NoteTemplate } from '@beeapp/shared-types';

interface CreateNoteModalProps {
    isOpen: boolean;
    templates: NoteTemplate[];
    isCreating: boolean;
    onClose: () => void;
    onCreateBlank: () => void;
    onCreateFromTemplate: (template: NoteTemplate) => void;
}

const TEMPLATE_ICON_FALLBACK = '📝';

export default function CreateNoteModal({
    isOpen,
    templates,
    isCreating,
    onClose,
    onCreateBlank,
    onCreateFromTemplate,
    }: CreateNoteModalProps) {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <button
            type="button"
            aria-label="Cerrar modal"
            onClick={onClose}
            disabled={isCreating}
            className="absolute inset-0 bg-neutral-950/40 backdrop-blur-[1px]"
        />

        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-note-title"
            className="relative w-full max-w-4xl max-h-[88vh] overflow-hidden rounded-3xl bg-white shadow-2xl border border-neutral-200 flex flex-col"
        >
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-neutral-100">
            <div>
                <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-3">
                <FilePlus2 className="w-5 h-5" />
                </div>
                <h2
                id="create-note-title"
                className="text-lg font-semibold text-neutral-900"
                >
                Crear una nota
                </h2>
                <p className="text-sm text-neutral-500 mt-1">
                Empieza desde cero o usa una plantilla para organizar tus ideas.
                </p>
            </div>

            <button
                type="button"
                onClick={onClose}
                disabled={isCreating}
                aria-label="Cerrar"
                className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors disabled:opacity-50"
            >
                <X className="w-5 h-5" />
            </button>
            </div>

            <div className="overflow-y-auto p-6">
            <button
                type="button"
                onClick={onCreateBlank}
                disabled={isCreating}
                className="w-full text-left rounded-2xl border-2 border-dashed border-brand-primary/35 bg-brand-primary/[0.035] px-5 py-4 flex items-center gap-4 hover:border-brand-primary hover:bg-brand-primary/[0.07] transition-colors disabled:opacity-60"
            >
                <span className="w-12 h-12 rounded-2xl bg-brand-primary text-white flex items-center justify-center shrink-0">
                {isCreating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <FilePlus2 className="w-5 h-5" />
                )}
                </span>

                <span>
                <span className="block text-sm font-semibold text-neutral-900">
                    Nota en blanco
                </span>
                <span className="block text-xs text-neutral-500 mt-1">
                    Crea una nota vacía y comienza a escribir de inmediato.
                </span>
                </span>
            </button>

            <div className="flex items-center gap-3 mt-7 mb-4">
                <LayoutTemplate className="w-4 h-4 text-neutral-500" />
                <h3 className="text-sm font-semibold text-neutral-900">
                Empezar con una plantilla
                </h3>
                <span className="text-xs text-neutral-400">
                {templates.length}
                </span>
            </div>

            {templates.length === 0 ? (
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-8 text-center">
                <LayoutTemplate className="w-8 h-8 mx-auto text-neutral-300" />
                <p className="text-sm font-medium text-neutral-700 mt-3">
                    No hay plantillas disponibles
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                    Puedes crear una nota en blanco mientras se configuran las plantillas.
                </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {templates.map((template) => (
                    <button
                    key={template.id}
                    type="button"
                    onClick={() => onCreateFromTemplate(template)}
                    disabled={isCreating}
                    className="group min-h-[145px] rounded-2xl border border-neutral-200 bg-white p-4 text-left hover:border-brand-primary/50 hover:shadow-md transition-all disabled:opacity-60"
                    >
                    <span
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                        style={{
                        backgroundColor: `${template.color || '#7C3AED'}18`,
                        }}
                    >
                        {template.icon || TEMPLATE_ICON_FALLBACK}
                    </span>

                    <span className="block text-sm font-semibold text-neutral-900 mt-3 truncate">
                        {template.name}
                    </span>

                    <span className="block text-xs text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                        {template.description || 'Crea una nota a partir de esta plantilla.'}
                    </span>
                    </button>
                ))}
                </div>
            )}
            </div>
        </div>
        </div>
    );
}