'use client';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import type { ElementType } from 'react';
import {
  Archive,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Film,
  Folder,
  FolderOpen,
  Lock,
} from 'lucide-react';
import {
  getCurrentWebStorageFiles,
  getCurrentWebStorageSummary,
} from '@beeapp/api-client';
import type {
  StorageFile,
  StorageSummary,
} from '@beeapp/shared-types';

import OverviewCard from './OverviewCard';

interface StorageCardProps {
  onSeeMore: () => void;
}

function formatBytes(
  bytes: number,
): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;

  return `${value.toFixed(
    exponent === 0
      ? 0
      : value >= 10
        ? 1
        : 2,
  )} ${units[exponent]}`;
}

function getFileIcon(
  file: StorageFile,
): ElementType {
  if (file.kind === 'image') {
    return FileImage;
  }

  if (file.kind === 'video') {
    return Film;
  }

  if (file.kind === 'archive') {
    return Archive;
  }

  if (file.kind === 'spreadsheet') {
    return FileSpreadsheet;
  }

  if (file.mime_type === 'application/pdf') {
    return FileText;
  }

  if (file.kind === 'document') {
    return File;
  }

  return FileText;
}

export default function StorageCard({
  onSeeMore,
}: StorageCardProps) {
  const [summary, setSummary] =
    useState<StorageSummary | null>(null);

  const [files, setFiles] = useState<StorageFile[]>([]);

  const loadStorage = useCallback(async () => {
    try {
      const [
        summaryResponse,
        filesResponse,
      ] = await Promise.all([
        getCurrentWebStorageSummary(),
        getCurrentWebStorageFiles({
          status: 'ready',
          scope: 'recent',
          limit: 4,
          offset: 0,
        }),
      ]);

      setSummary(summaryResponse.storage);
      setFiles(filesResponse.files);
    } catch {
      setSummary(null);
      setFiles([]);
    }
  }, []);

  useEffect(() => {
    void loadStorage();
  }, [loadStorage]);

  const usedPercent = summary
    ? Math.min(
      100,
      Math.max(
        0,
        summary.usage_percentage,
      ),
    )
    : 0;

  return (
    <OverviewCard
      title="Almacenamiento"
      icon={FolderOpen}
      onSeeMore={onSeeMore}
    >
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-normal">
          <span className="text-neutral-500">
            {summary
              ? `${formatBytes(
                summary.used_bytes,
              )} de ${formatBytes(
                summary.quota_bytes,
              )}`
              : 'Cargando almacenamiento...'}
          </span>

          <span className="text-neutral-400">
            {summary
              ? `${Math.round(usedPercent)}%`
              : ''}
          </span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-brand-primary transition-all"
            style={{
              width: `${usedPercent}%`,
            }}
          />
        </div>
      </div>

      {files.length === 0 ? (
        <div className="rounded-xl border border-neutral-100 bg-neutral-50/60 p-4 text-center">
          <Folder className="mx-auto h-6 w-6 text-neutral-300" />
          <p className="mt-2 text-[10px] font-normal text-neutral-400">
            No tienes archivos recientes
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {files.map((file) => {
            const Icon = getFileIcon(file);

            return (
              <div
                key={file.id}
                className="flex flex-col items-center rounded-xl border border-neutral-100 bg-neutral-50/60 p-3 text-center transition-colors hover:bg-neutral-100/70"
              >
                <div className="relative">
                  <Icon className="h-6 w-6 text-brand-primary" />

                  <Lock className="absolute -bottom-1 -right-1.5 hidden h-3 w-3 rounded-full bg-white text-neutral-500" />
                </div>

                <p className="mt-2 w-full truncate text-[10px] font-normal text-neutral-800">
                  {file.display_name}
                </p>

                <p className="w-full truncate text-[10px] font-normal text-neutral-400">
                  {formatBytes(file.size_bytes)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </OverviewCard>
  );
}