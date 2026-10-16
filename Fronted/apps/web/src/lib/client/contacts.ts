export interface ContactItem {
  id: string;
  name: string;
  profession: string;
  company?: string;
  activity: string;
  interests: string[];
  initials: string;
  color: string;
  phone?: string;
  email?: string;
  isFavorite?: boolean;
  verified?: boolean;
  category?: 'my_contacts' | 'discover' | 'calls';
  isDiscovery?: boolean;
  isConnected?: boolean;
  linkedUserId?: string | null;
}

export interface CallLogItem {
  id: string;
  contactId: string;
  name: string;
  initials: string;
  color: string;
  type: 'incoming' | 'outgoing' | 'missed';
  isVideo: boolean;
  time: string;
  duration: string;
  verified?: boolean;
}

export interface ContactDetail extends ContactItem {
  online: boolean;
  socialLinks?: Record<string, string>;
}

export interface ContactCall {
  type: 'incoming' | 'outgoing' | 'missed';
  isVideo: boolean;
  time: string;
  duration: string;
}

const COLORS = ['#EBF5FF', '#FEF3C7', '#ECFDF5', '#F3E8FF', '#FEE2E2', '#E0E7FF'];

export function contactInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'C';
}

export function contactColor(seed: string): string {
  const index = Array.from(seed).reduce((total, char) => total + char.charCodeAt(0), 0);
  return COLORS[index % COLORS.length];
}
