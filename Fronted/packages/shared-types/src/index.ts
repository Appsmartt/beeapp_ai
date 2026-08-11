

export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';

export interface BaseUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface RegisterUserPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone_dial_code: string;
  phone_number: string;
}

export interface RegisteredUser {
  id: string;
  email: string;
  phone: string | null;
  first_name: string;
  last_name: string;
  phone_dial_code: string;
  phone_number: string;
  role: UserRole;
}

export interface RegisterUserResponse {
  message: string;
  user: RegisteredUser;
}