'use client';

import {
  AtSign,
  Briefcase,
  ExternalLink,
  Globe,
  Music2,
  Video,
} from 'lucide-react';

interface SocialNetworksSectionProps {
  socialLinks?: Record<string, string>;
}

const SOCIAL_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ElementType;
  }
> = {
  instagram: {
    label: 'Instagram',
    icon: AtSign,
  },
  facebook: {
    label: 'Facebook',
    icon: Globe,
  },
  linkedin: {
    label: 'LinkedIn',
    icon: Briefcase,
  },
  tiktok: {
    label: 'TikTok',
    icon: Music2,
  },
  youtube: {
    label: 'YouTube',
    icon: Video,
  },
  threads: {
    label: 'Threads',
    icon: AtSign,
  },
  website: {
    label: 'Sitio web',
    icon: Globe,
  },
};

function canOpenUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);

    return (
      parsedUrl.protocol === 'http:'
      || parsedUrl.protocol === 'https:'
    );
  } catch {
    return false;
  }
}

export default function SocialNetworksSection({
  socialLinks,
}: SocialNetworksSectionProps) {
  if (!socialLinks) {
    return null;
  }

  const activeLinks = Object.entries(socialLinks).filter(
    ([, url]) => Boolean(url?.trim()),
  );

  if (activeLinks.length === 0) {
    return null;
  }

  const handleOpenLink = (url: string) => {
    if (!canOpenUrl(url)) {
      return;
    }

    window.open(
      url,
      '_blank',
      'noopener,noreferrer',
    );
  };

  return (
    <div className="space-y-1.5">
      <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
        Redes Sociales
      </h3>

      <div className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white p-3 shadow-xs">
        {activeLinks.map(([key, url]) => {
          const config = SOCIAL_CONFIG[key] || {
            label: key,
            icon: ExternalLink,
          };

          const IconComponent = config.icon;
          const isValidUrl = canOpenUrl(url);

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleOpenLink(url)}
              disabled={!isValidUrl}
              className="flex w-full items-center justify-between rounded-lg px-1 py-2.5 text-left transition-colors hover:bg-neutral-50 disabled:cursor-default disabled:hover:bg-transparent"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                  <IconComponent className="h-4 w-4" />
                </span>

                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-neutral-800">
                    {config.label}
                  </span>

                  <span className="block truncate text-[10px] font-normal text-neutral-500">
                    {url}
                  </span>
                </span>
              </span>

              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            </button>
          );
        })}
      </div>
    </div>
  );
}