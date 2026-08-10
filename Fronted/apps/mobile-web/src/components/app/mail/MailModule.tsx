'use client';

import { useState } from 'react';
import { Mail, ChevronDown, SquarePen, Settings } from 'lucide-react';
import { MOCK_EMAILS, MAIL_ACCOUNTS, type EmailItem, type MailFolder } from '@/mocks/emails';
import MailFolderRail from './MailFolderRail';
import MailListItem from './MailListItem';
import MailDetail from './MailDetail';
import MailCompose, { type ComposeDraft } from './MailCompose';
import { MAIL_FOLDERS, matchesFolder } from './mailFolders';

export default function MailModule() {
  const [emails, setEmails] = useState<EmailItem[]>(MOCK_EMAILS);
  const [folder, setFolder] = useState<MailFolder>('inbox');
  /** null = todas las cuentas */
  const [account, setAccount] = useState<string | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [draft, setDraft] = useState<ComposeDraft | null>(null);

  const patch = (id: string, changes: Partial<EmailItem>) =>
    setEmails((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));

  const moveTo = (id: string, target: MailFolder) => {
    patch(id, { folder: target });
    if (selectedId === id) setSelectedId(null);
  };

  const openCompose = (next: ComposeDraft | null) => {
    setDraft(next);
    setComposeOpen(true);
  };

  const handleSend = (to: string, subject: string, body: string, from: string) => {
    setEmails((prev) => [
      {
        id: `em-${Date.now()}`,
        sender: 'Santiago Morales',
        email: to,
        subject,
        preview: body.slice(0, 80),
        body,
        timestamp: 'Ahora',
        date: 'Ahora',
        unread: false,
        starred: false,
        hasAttachment: false,
        folder: 'sent',
        account: from,
        initialsColor: '#6025d2',
      },
      ...prev,
    ]);
  };

  const visible = emails.filter(
    (item) => (!account || item.account === account) && matchesFolder(item, folder)
  );
  const selected = visible.find((item) => item.id === selectedId) ?? null;
  const folderLabel = MAIL_FOLDERS.find((item) => item.key === folder)?.label ?? 'Correo';

  return (
    <div className="bg-white min-h-full flex flex-row relative">
      <MailFolderRail
        folder={folder}
        onSelectFolder={(next) => {
          setFolder(next);
          setSelectedId(null);
        }}
        emails={emails}
        account={account}
      />

      {/* LISTA: 40 % del ancho, entre 380 y 450 px */}
      <div className="w-[40%] min-w-[380px] max-w-[450px] shrink-0 border-r border-neutral-200 flex flex-col">
        <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between gap-2">
          <div className="relative min-w-0">
            <button
              type="button"
              onClick={() => setAccountMenuOpen(!accountMenuOpen)}
              className="flex items-center gap-1.5 min-w-0 text-sm font-semibold text-neutral-900 hover:text-brand-primary transition-colors"
            >
              <span className="truncate">{account ?? 'Todas las cuentas'}</span>
              <ChevronDown className="w-4 h-4 text-neutral-500 shrink-0" />
            </button>

            {accountMenuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setAccountMenuOpen(false)} />
                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-neutral-200 rounded-xl shadow-xl z-30 py-1">
                  {[null, ...MAIL_ACCOUNTS].map((option) => (
                    <button
                      key={option ?? 'all'}
                      type="button"
                      onClick={() => {
                        setAccount(option);
                        setAccountMenuOpen(false);
                        setSelectedId(null);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-neutral-50 transition-colors truncate ${
                        option === account
                          ? 'text-brand-primary font-semibold'
                          : 'text-neutral-700 font-normal'
                      }`}
                    >
                      {option ?? 'Todas las cuentas'}
                    </button>
                  ))}

                  <div className="h-px bg-neutral-100 my-1" />
                  <span className="flex items-center gap-2 px-3 py-2 text-[11px] font-normal text-neutral-400">
                    <Settings className="w-3.5 h-3.5" />
                    Conectar otra cuenta
                  </span>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => openCompose(null)}
            className="h-9 px-3 rounded-full bg-brand-primary text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-brand-dark transition-colors shrink-0"
          >
            <SquarePen className="w-4 h-4" />
            Redactar
          </button>
        </div>

        <div className="divide-y divide-neutral-100 flex-1 overflow-y-auto">
          {visible.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Mail className="w-10 h-10 mx-auto text-neutral-300" />
              <p className="text-xs font-normal text-neutral-500">
                No hay correos en {folderLabel.toLowerCase()}.
              </p>
            </div>
          ) : (
            visible.map((item) => (
              <MailListItem
                key={item.id}
                email={item}
                isSelected={selectedId === item.id}
                onOpen={() => {
                  patch(item.id, { unread: false });
                  setSelectedId(item.id);
                }}
                onToggleStar={() => patch(item.id, { starred: !item.starred })}
                onToggleRead={() => patch(item.id, { unread: !item.unread })}
                onArchive={() => moveTo(item.id, 'archive')}
                onDelete={() => moveTo(item.id, 'trash')}
              />
            ))
          )}
        </div>
      </div>

      {/* DETALLE */}
      <div className="flex-1 min-w-0 flex flex-col">
        {selected ? (
          <MailDetail
            email={selected}
            onBack={() => setSelectedId(null)}
            onToggleStar={(id) => patch(id, { starred: !selected.starred })}
            onArchive={(id) => moveTo(id, 'archive')}
            onDelete={(id) => moveTo(id, 'trash')}
            onReply={(mail) => openCompose({ to: mail.email, subject: `Re: ${mail.subject}` })}
            onForward={(mail) => openCompose({ to: '', subject: `Fwd: ${mail.subject}` })}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-12 text-center bg-neutral-50/50">
            <div className="space-y-3 max-w-xs">
              <Mail className="w-12 h-12 mx-auto text-neutral-300" />
              <h3 className="text-sm font-semibold text-neutral-700">Ningún correo seleccionado</h3>
              <p className="text-xs font-normal text-neutral-500">
                Selecciona un correo de la lista para leer su contenido.
              </p>
            </div>
          </div>
        )}
      </div>

      <MailCompose
        isOpen={composeOpen}
        draft={draft}
        onClose={() => setComposeOpen(false)}
        onSend={handleSend}
      />
    </div>
  );
}
