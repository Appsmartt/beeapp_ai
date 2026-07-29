export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  verified: boolean;
  networkVisibility: boolean;
}

export const CURRENT_USER: CurrentUser = {
  id: 'usr-001',
  name: 'Santiago Morales',
  email: 'santiago@beeapp.ai',
  phone: '+57 300 123 4567',
  avatar: '',
  verified: true,
  networkVisibility: true,
};
