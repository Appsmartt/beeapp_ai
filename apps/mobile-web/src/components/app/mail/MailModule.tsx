'use client';

import { useState } from 'react';
import {
  Mail,
  ChevronDown,
  Star,
  Paperclip,
  Plus,
  Inbox,
  Send,
  FileText,
  EyeOff,
} from 'lucide-react';
import { MOCK_EMAILS, EmailItem } from '@/mocks/emails';
import MailDetail from './MailDetail';
import MailCompose from './MailCompose';

export default function MailModule() {
  const [emails, setEmails] = useState<EmailItem[]>(MOCK_EMAILS);
  const [selectedFolder, setSelectedFolder] = useState<'inbox' | 'unread' | 'sent' | 'drafts'>('inbox');
  const [selectedAccount, setSelectedAccount] = useState('Todas las cuentas');
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  const handleToggleStar = (id: string) => {
    setEmails((prev) =>
      prev.map((item) => (item.id === id ? { ...item, starred: !item.starred } : item))
    );
    if (selectedEmail && selectedEmail.id === id) {
      setSelectedEmail((prev) => (prev ? { ...prev, starred: !prev.starred } : null));
    }
  };

  const handleDelete = (id: string) => {
    setEmails((prev) => prev.filter((item) => item.id !== id));
    if (selectedEmail && selectedEmail.id === id) {
      setSelectedEmail(null);
    }
  };

  const handleSendCompose = (to: string, subject: string, body: string) => {
    const newMail: EmailItem = {
      id: `em-${Date.now()}`,
      sender: 'Santiago Morales',
      email: to,
      subject,
      preview: body.slice(0, 60),
      body,
      timestamp: 'Ahora',
      unread: false,
      starred: false,
      hasAttachment: false,
      folder: 'sent',
    };
    setEmails((prev) => [newMail, ...prev]);
  };

  const filteredEmails = emails.filter((item) => {
    if (selectedFolder === 'unread') return item.unread;
    if (selectedFolder === 'sent') return item.folder === 'sent';
    if (selectedFolder === 'drafts') return item.folder === 'drafts';
    return true;
  });

  const unreadCount = emails.filter((e) => e.unread).length;

  return (
    <div className="bg-white min-h-full flex flex-col lg:flex-row pb-24 lg:pb-0">
      
      {/* LEFT COLUMN: Mail List (Full width on mobile/tablet if no mail selected, w-96 on desktop lg:) */}
      <div className={`flex-1 lg:w-96 lg:flex-none lg:border-r lg:border-neutral-200 flex flex-col ${
        selectedEmail ? 'hidden lg:flex' : 'flex'
      }`}>
        
        {/* Module Header & Account Selector */}
        <div className="p-4 border-b border-neutral-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900 hover:text-brand-primary transition-colors"
              >
                <span>{selectedAccount}</span>
                <ChevronDown className="w-4 h-4 text-neutral-500" />
              </button>

              {accountDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setAccountDropdownOpen(false)} />
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-neutral-200 rounded-2xl shadow-xl z-30 py-1 text-xs">
                    {['Todas las cuentas', 'santiago@beeapp.ai', 'personal@gmail.com'].map((acc) => (
                      <button
                        key={acc}
                        type="button"
                        onClick={() => {
                          setSelectedAccount(acc);
                          setAccountDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 hover:bg-neutral-50 ${
                          selectedAccount === acc ? 'font-semibold text-brand-primary' : 'text-neutral-700 font-normal'
                        }`}
                      >
                        {acc}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              className="h-9 px-3 rounded-full bg-brand-primary text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:bg-brand-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Redactar</span>
            </button>
          </div>

          {/* Folder Chips */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1">
            <button
              type="button"
              onClick={() => setSelectedFolder('inbox')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors ${
                selectedFolder === 'inbox'
                  ? 'bg-brand-primary text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Recibidos</span>
              {unreadCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedFolder === 'inbox' ? 'bg-white/20 text-white' : 'bg-brand-primary text-white'
                }`}>
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSelectedFolder('unread')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors ${
                selectedFolder === 'unread'
                  ? 'bg-brand-primary text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70'
              }`}
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>No leídos</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFolder('sent')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors ${
                selectedFolder === 'sent'
                  ? 'bg-brand-primary text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviados</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFolder('drafts')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors ${
                selectedFolder === 'drafts'
                  ? 'bg-brand-primary text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Borradores</span>
            </button>
          </div>
        </div>

        {/* Email Flat List */}
        <div className="divide-y divide-neutral-100 flex-1 overflow-y-auto">
          {filteredEmails.length === 0 ? (
            <div className="p-12 text-center text-neutral-400 space-y-2">
              <Mail className="w-10 h-10 mx-auto text-neutral-300" />
              <p className="text-xs font-normal">No hay correos en esta carpeta</p>
            </div>
          ) : (
            filteredEmails.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setEmails((prev) =>
                    prev.map((e) => (e.id === item.id ? { ...e, unread: false } : e))
                  );
                  setSelectedEmail({ ...item, unread: false });
                }}
                className={`p-4 flex items-start gap-3 cursor-pointer hover:bg-neutral-50 transition-colors relative ${
                  item.unread ? 'bg-brand-primary/5' : ''
                } ${selectedEmail?.id === item.id ? 'bg-brand-primary/10 border-l-4 border-brand-primary' : ''}`}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary font-bold text-xs flex items-center justify-center shrink-0">
                  {item.sender.slice(0, 2).toUpperCase()}
                </div>

                {/* Email Summary */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs truncate ${item.unread ? 'font-semibold text-neutral-900' : 'font-normal text-neutral-800'}`}>
                      {item.sender}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-normal shrink-0">
                      {item.timestamp}
                    </span>
                  </div>

                  <p className={`text-xs truncate mt-0.5 ${item.unread ? 'font-semibold text-neutral-900' : 'font-normal text-neutral-700'}`}>
                    {item.subject}
                  </p>

                  <p className="text-[11px] text-neutral-500 font-normal truncate mt-0.5">
                    {item.preview}
                  </p>

                  {/* Badges row */}
                  <div className="flex items-center gap-2 mt-1.5">
                    {item.hasAttachment && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-neutral-500 font-normal bg-neutral-100 px-2 py-0.5 rounded-full">
                        <Paperclip className="w-3 h-3" /> Adjunto
                      </span>
                    )}
                  </div>
                </div>

                {/* Star Icon Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleStar(item.id);
                  }}
                  className="p-1 text-neutral-300 hover:text-amber-400 transition-colors shrink-0"
                >
                  <Star className={`w-4 h-4 ${item.starred ? 'text-amber-400 fill-amber-400' : ''}`} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Mail Detail (Visible on desktop always, visible on mobile/tablet if email selected) */}
      <div className={`flex-1 flex-col ${selectedEmail ? 'flex' : 'hidden lg:flex'}`}>
        {selectedEmail ? (
          <MailDetail
            email={selectedEmail}
            onBack={() => setSelectedEmail(null)}
            onToggleStar={handleToggleStar}
            onDelete={handleDelete}
          />
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center p-12 text-center text-neutral-400 bg-neutral-50/50">
            <div className="space-y-3 max-w-xs">
              <Mail className="w-12 h-12 mx-auto text-neutral-300" />
              <h3 className="font-semibold text-sm text-neutral-700">Ningún correo seleccionado</h3>
              <p className="text-xs text-neutral-500 font-normal">
                Selecciona un correo de la lista de la izquierda para leer su contenido.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      <MailCompose
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSend={handleSendCompose}
      />

    </div>
  );
}
