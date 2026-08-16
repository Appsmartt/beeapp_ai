'use client';

import {
  useEffect,
  useState,
} from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Download,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  LoaderCircle,
  Play,
  Share2,
  Trash2,
} from 'lucide-react';
import {
  getCurrentWebStorageFileAccess,
} from '@beeapp/api-client';
import type {
  WebStorageItem,
} from './StorageModals';

interface StoragePreviewProps {
  item: WebStorageItem;
  onBack: () => void;
  onDownload: (item: WebStorageItem) => void;
  onShare: (item: WebStorageItem) => void;
  onDelete: (item: WebStorageItem) => void;
}

export default function StoragePreview({
  item,
  onBack,
  onDownload,
  onShare,
  onDelete,
}: StoragePreviewProps) {
  const [accessUrl, setAccessUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(item.type !== 'folder');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (item.type === 'folder') {
      setAccessUrl(null);
      setLoading(false);
      setErrorMessage(null);

      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setErrorMessage(null);
    setAccessUrl(null);

    void getCurrentWebStorageFileAccess(item.id, false)
      .then((response) => {
        if (!cancelled) {
          setAccessUrl(response.url);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No fue posible cargar la vista previa.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [item.id, item.type]);

  const renderPreviewContent = () => {
    if (item.type === 'folder') {
      return (
        <div className="max-w-sm space-y-3 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-primary/10 text-brand-primary shadow-sm">
            <FolderOpen className="h-10 w-10" />
          </div>

          <h2 className="text-base font-semibold text-neutral-900">
            {item.name}
          </h2>

          <p className="text-xs font-normal text-neutral-500">
            Carpeta de almacenamiento · {item.itemCount || 0} elementos guardados
          </p>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="flex flex-col items-center gap-3 text-neutral-500">
          <LoaderCircle className="h-8 w-8 animate-spin text-brand-primary" />
          <p className="text-xs font-normal">
            Cargando vista previa...
          </p>
        </div>
      );
    }

    if (errorMessage || !accessUrl) {
      return (
        <div className="max-w-sm space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <AlertCircle className="h-8 w-8" />
          </div>

          <h2 className="text-sm font-semibold text-neutral-900">
            No fue posible mostrar la vista previa
          </h2>

          <p className="text-xs font-normal text-neutral-500">
            {errorMessage || 'Puedes descargar el archivo para verlo.'}
          </p>

          <button
            type="button"
            onClick={() => onDownload(item)}
            className="rounded-full bg-brand-primary px-4 py-2 text-xs font-semibold text-white hover:bg-brand-dark"
          >
            Descargar archivo
          </button>
        </div>
      );
    }

    if (item.type === 'image') {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <img
            src={accessUrl}
            alt={item.name}
            className="max-h-full max-w-full rounded-xl object-contain shadow-sm"
          />
        </div>
      );
    }

    if (item.type === 'video') {
      return (
        <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-neutral-950 shadow-lg">
          <video
            src={accessUrl}
            controls
            className="max-h-[70vh] w-full"
          >
            Tu navegador no puede reproducir este video.
          </video>
        </div>
      );
    }

    if (item.type === 'pdf') {
      return (
        <iframe
          src={accessUrl}
          title={item.name}
          className="h-[70vh] w-full max-w-5xl rounded-xl border border-neutral-200 bg-white shadow-sm"
        />
      );
    }

    return (
      <div className="max-w-md space-y-4 rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary">
          <FileText className="h-8 w-8" />
        </div>

        <div>
          <h2 className="break-all text-sm font-semibold text-neutral-900">
            {item.name}
          </h2>

          <p className="mt-2 text-xs font-normal text-neutral-500">
            {item.size || 'Archivo'}
          </p>
        </div>

        <p className="text-xs font-normal leading-relaxed text-neutral-600">
          Este formato no tiene una vista previa integrada en el navegador.
          Puedes descargarlo para abrirlo con la aplicación correspondiente.
        </p>

        <button
          type="button"
          onClick={() => onDownload(item)}
          className="rounded-full bg-brand-primary px-4 py-2 text-xs font-semibold text-white hover:bg-brand-dark"
        >
          Descargar archivo
        </button>
      </div>
    );
  };

  return (
    <div className="flex min-h-full flex-col bg-white select-none">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 pr-2">
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 rounded-full p-1.5 text-neutral-600 transition-colors hover:bg-neutral-100"
            title="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-neutral-900">
              {item.name}
            </h1>

            {item.type !== 'folder' && (
              <p className="truncate text-[11px] font-normal text-neutral-500">
                {item.size || 'Archivo'}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {item.type !== 'folder' && (
            <>
              <button
                type="button"
                onClick={() => onShare(item)}
                className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                title="Compartir"
              >
                <Share2 className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => onDownload(item)}
                className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                title="Descargar"
              >
                <Download className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => onDelete(item)}
                className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
                title="Mover a papelera"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-auto bg-neutral-50/50 p-6">
        {renderPreviewContent()}
      </div>
    </div>
  );
}