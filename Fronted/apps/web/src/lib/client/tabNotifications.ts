export interface TickerNotification {
  id: string;
  type: 'mail' | 'chat' | 'notes' | 'storage' | 'calendar' | 'call';
  title?: string;
  message: string;
  timestamp: string;
  read: boolean;
  sender?: string;
  initials?: string;
  chatId?: string;
}
