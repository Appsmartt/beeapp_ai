'use client';

import React from 'react';
import { Instagram, Facebook, Linkedin, Music2, Youtube, AtSign, ExternalLink, Globe, Camera, Briefcase, Video } from 'lucide-react';

interface SocialNetworksSectionProps {
  socialLinks?: Record<string, string>;
}

const SOCIAL_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  instagram: { label: 'Instagram', icon: Instagram || Camera },
  facebook: { label: 'Facebook', icon: Facebook || Globe },
  linkedin: { label: 'LinkedIn', icon: Linkedin || Briefcase },
  tiktok: { label: 'TikTok', icon: Music2 || Camera },
  youtube: { label: 'YouTube', icon: Youtube || Video },
  threads: { label: 'Threads', icon: AtSign || Globe },
};

export default function SocialNetworksSection({ socialLinks }: SocialNetworksSectionProps) {
  if (!socialLinks) return null;
  const activeLinks = Object.entries(socialLinks).filter(([, url]) => !!url?.trim());
  if (activeLinks.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <h3 className="text-[11px] uppercase tracking-wider font-semibold text-neutral-500 px-1">
        Redes Sociales
      </h3>
      <div className="bg-white rounded-2xl border border-neutral-200 p-3 divide-y divide-neutral-100 shadow-xs">
        {activeLinks.map(([key, url]) => {
          const config = SOCIAL_CONFIG[key] || { label: key, icon: ExternalLink };
          const IconComponent = config.icon || Globe;

          return (
            <div
              key={key}
              onClick={() => alert(`Abriendo enlace: ${url}`)}
              className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 rounded-lg px-1 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0">
                  <IconComponent className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-neutral-800">{config.label}</p>
                  <p className="text-[10px] text-neutral-500 font-normal truncate">{url}</p>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
