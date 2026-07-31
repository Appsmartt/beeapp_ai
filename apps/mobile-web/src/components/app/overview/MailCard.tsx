'use client';

import { Mail, Paperclip } from 'lucide-react';
import { MOCK_EMAILS } from '@/mocks/emails';
import OverviewCard from './OverviewCard';

interface MailCardProps {
  onSeeMore: () => void;
}

/** Correos: filas compactas con remitente, asunto y preview */
export default function MailCard({ onSeeMore }: MailCardProps) {
  return (
    <OverviewCard title="Correos" icon={Mail} onSeeMore={onSeeMore}>
      <div className="space-y-1">
        {MOCK_EMAILS.slice(0, 5).map((email) => (
          <div
            key={email.id}
            className="flex items-start gap-3 rounded-xl -mx-2 px-2 py-2 hover:bg-neutral-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-brand-primary/10 text-brand-primary text-[11px] font-semibold flex items-center justify-center shrink-0">
              {email.sender.slice(0, 2).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-xs text-neutral-900 truncate">{email.sender}</span>
                <span className="text-[10px] text-neutral-400 font-normal shrink-0">{email.timestamp}</span>
              </div>

              <p className="text-[11px] text-neutral-800 font-normal truncate mt-0.5">{email.subject}</p>
              <p className="text-[11px] text-neutral-500 font-normal truncate">{email.preview}</p>
            </div>

            <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
              {email.unread && <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />}
              {email.hasAttachment && <Paperclip className="w-3 h-3 text-neutral-400" />}
            </div>
          </div>
        ))}
      </div>
    </OverviewCard>
  );
}
