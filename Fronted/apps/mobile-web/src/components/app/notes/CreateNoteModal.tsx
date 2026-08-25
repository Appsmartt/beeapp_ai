'use client';

import {
    ArrowRight,
    FilePlus2,
    LayoutTemplate,
    Loader2,
    Sparkles,
    X,
    } from 'lucide-react';
import type { NoteTemplate } from '@beeapp/shared-types';
import { getNoteTemplateIcon } from './noteTemplateIcons';

interface CreateNoteModalProps {
    isOpen: boolean;
    templates: NoteTemplate[];
    isCreating: boolean;
    onClose: () => void;
    onCreateBlank: () => void;
    onCreateFromTemplate: (template: NoteTemplate) => void;
}

const DEFAULT_TEMPLATE_COLOR = '#7C3AED';

function withOpacity(
    color: string,
    opacityHex: string,
    ): string {
    const normalizedColor = color.trim();

    if (/^#[0-9A-Fa-f]{6}$/.test(normalizedColor)) {
        return `${normalizedColor}${opacityHex}`;
    }

    return `${DEFAULT_TEMPLATE_COLOR}${opacityHex}`;
}

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
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6">
        <button
            type="button"
            aria-label="Cerrar modal"
            onClick={onClose}
            disabled={isCreating}
            className="absolute inset-0 cursor-default bg-neutral-950/45 backdrop-blur-[2px]"
        />

        <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-note-title"
            className="relative flex w-full max-w-5xl max-h-[88vh] flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-2xl"
        >
            <header className="relative overflow-hidden border-b border-neutral-100 bg-gradient-to-br from-violet-50 via-white to-white px-6 py-5 sm:px-8 sm:py-6">
            <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 left-1/3 h-32 w-32 rounded-full bg-violet-300/20 blur-3xl" />

            <div className="relative flex items-start justify-between gap-5">
                <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-primary text-white shadow-lg shadow-brand-primary/25">
                    <FilePlus2 className="h-6 w-6" />
                </div>

                <div className="min-w-0 pt-0.5">
                    <div className="mb-1 flex items-center gap-2">
                    <h2
                        id="create-note-title"
                        className="text-lg font-semibold tracking-tight text-neutral-900 sm:text-xl"
                    >
                        Crear una nota
                    </h2>

                    <span className="hidden items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-primary sm:inline-flex">
                        <Sparkles className="h-3 w-3" />
                        Buddy
                    </span>
                    </div>

                    <p className="max-w-xl text-sm leading-relaxed text-neutral-500">
                    Empieza desde cero o usa una plantilla para organizar tus
                    ideas, tareas y proyectos.
                    </p>
                </div>
                </div>

                <button
                type="button"
                onClick={onClose}
                disabled={isCreating}
                aria-label="Cerrar"
                title="Cerrar"
                className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-white hover:text-neutral-700 hover:shadow-sm disabled:opacity-50"
                >
                <X className="h-5 w-5" />
                </button>
            </div>
            </header>

            <div className="overflow-y-auto px-6 py-6 sm:px-8 sm:py-7">
            <button
                type="button"
                onClick={onCreateBlank}
                disabled={isCreating}
                className="group flex w-full items-center gap-4 rounded-2xl border border-brand-primary/20 bg-gradient-to-r from-brand-primary/[0.09] via-violet-50/60 to-white px-5 py-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-primary/45 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-primary text-white shadow-md shadow-brand-primary/20">
                {isCreating ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <FilePlus2 className="h-5 w-5" />
                )}
                </span>

                <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-neutral-900">
                    Nota en blanco
                </span>

                <span className="mt-1 block text-xs leading-relaxed text-neutral-500">
                    Crea una nota vacía y comienza a escribir de inmediato.
                </span>
                </span>

                <ArrowRight className="h-5 w-5 shrink-0 text-brand-primary transition-transform group-hover:translate-x-1" />
            </button>

            <div className="mt-8 mb-4 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
                <LayoutTemplate className="h-4 w-4" />
                </span>

                <div className="min-w-0">
                <h3 className="text-sm font-semibold text-neutral-900">
                    Empezar con una plantilla
                </h3>

                <p className="mt-0.5 text-xs text-neutral-500">
                    Elige una estructura inicial y personalízala después.
                </p>
                </div>

                <span className="ml-auto rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-500">
                {templates.length}
                </span>
            </div>

            {templates.length === 0 ? (
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-6 py-10 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-neutral-300 shadow-sm">
                    <LayoutTemplate className="h-6 w-6" />
                </span>

                <p className="mt-4 text-sm font-medium text-neutral-700">
                    No hay plantillas disponibles
                </p>

                <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                    Puedes crear una nota en blanco mientras se configuran las
                    plantillas.
                </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => {
                    const Icon = getNoteTemplateIcon(template.icon);
                    const templateColor =
                    template.color || DEFAULT_TEMPLATE_COLOR;

                    return (
                    <button
                        key={template.id}
                        type="button"
                        onClick={() => onCreateFromTemplate(template)}
                        disabled={isCreating}
                        className="group relative flex min-h-[174px] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-transparent hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                        style={{
                        boxShadow: `0 0 0 0 ${templateColor}`,
                        }}
                    >
                        <span
                        className="pointer-events-none absolute inset-x-0 top-0 h-1 opacity-0 transition-opacity group-hover:opacity-100"
                        style={{
                            backgroundColor: templateColor,
                        }}
                        />

                        <span
                        className="flex h-11 w-11 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-105"
                        style={{
                            color: templateColor,
                            backgroundColor: withOpacity(templateColor, '1A'),
                        }}
                        >
                        <Icon className="h-5 w-5" strokeWidth={2} />
                        </span>

                        <span className="mt-4 block truncate text-sm font-semibold text-neutral-900">
                        {template.name}
                        </span>

                        <span className="mt-1.5 block min-h-[38px] text-xs leading-relaxed text-neutral-500 line-clamp-2">
                        {template.description ||
                            'Crea una nota a partir de esta plantilla.'}
                        </span>

                        <span
                        className="mt-auto inline-flex items-center gap-1 pt-3 text-[11px] font-semibold transition-colors"
                        style={{
                            color: templateColor,
                        }}
                        >
                        Usar plantilla
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                    </button>
                    );
                })}
                </div>
            )}
            </div>
        </section>
        </div>
    );
}