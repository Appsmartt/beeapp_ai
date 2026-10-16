export type MailFolder =
  | 'inbox'
  | 'unread'
  | 'sent'
  | 'drafts'
  | 'starred'
  | 'trash'
  | 'archive';

export interface MailAttachment {
  name: string;
  size: string;
  kind: string;
}

export interface EmailItem {
  id: string;
  sender: string;
  senderVerified?: boolean;
  email: string;
  subject: string;
  preview: string;
  body?: string;
  timestamp: string;
  date?: string;
  unread: boolean;
  starred: boolean;
  hasAttachment: boolean;
  folder: MailFolder;
  account: string;
  initialsColor: string;
  attachments?: MailAttachment[];
}
