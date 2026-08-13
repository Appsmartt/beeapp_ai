export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export type UserStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'PENDING';

export type AuthScheme = 'Bearer' | 'Session';

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

export interface LoginUserPayload {
  email: string;
  password: string;
}

export interface SupabaseAuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number | null;
  expires_in: number | null;
  token_type: string;
}

export interface MobileAuthSession {
  token: string;
  expires_at: string;
}

export type AuthSession =
  | SupabaseAuthSession
  | MobileAuthSession;

export interface RefreshSessionPayload {
  refresh_token?: string;
  session_token?: string;
}

export interface RefreshSessionResponse {
  session: AuthSession;
}

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  phone: string | null;
}

export interface LoginUserResponse {
  message: string;
  session: SupabaseAuthSession;
  user: AuthenticatedUser;
}

export interface RequestPhoneOtpPayload {
  phone: string;
}

export interface RequestPhoneOtpResponse {
  message: string;
}

export interface VerifyPhoneOtpPayload {
  phone: string;
  code: string;
}

export interface MobileAuthenticatedUser
  extends AuthenticatedUser {
  first_name: string;
  last_name: string;
  role: UserRole;
}

export interface VerifyPhoneOtpMobileResponse {
  message: string;
  session: MobileAuthSession;
  user: MobileAuthenticatedUser;
}

export interface AuthCredentials {
  token: string;
  scheme: AuthScheme;
}

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  phone_dial_code: string | null;
  phone_number: string | null;
  role: UserRole;
  occupation: string | null;
  location: string | null;
  assistant_name: string | null;
  assistant_tone: string | null;
}

export interface CurrentUserProfile extends UserProfile {
  email: string | null;
}

export interface GetCurrentProfileResponse {
  profile: CurrentUserProfile;
}

export type DeviceType = 'WEB' | 'MOBILE' | 'DESKTOP';

export interface DeviceSession {
  id: string;
  device_name: string;
  device_type: DeviceType;
  platform: string | null;
  browser: string | null;
  last_seen_at: string;
  created_at: string;
}

export interface GetDeviceSessionsResponse {
  devices: DeviceSession[];
}

export interface QrLoginChallengeResponse {
  challenge_token: string;
  expires_at: string;
}

export interface QrLoginChallengeStatusResponse {
  status:
    | 'PENDING'
    | 'APPROVED'
    | 'CONSUMED'
    | 'EXPIRED'
    | 'CANCELLED';
  expires_at: string;
}

export interface ScanQrLoginPayload {
  challenge_token: string;
}

export interface ScanQrLoginResponse {
  message: string;
  device: DeviceSession;
}

export interface WebSessionProfileResponse {
  user: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface UpdateOnboardingProfilePayload {
  occupation: string;
  location: string;
}

export interface UpdateOnboardingProfileResponse {
  message: string;
  profile: UserProfile;
}

export interface UpdateAssistantSettingsPayload {
  assistant_name: string;
  assistant_tone: string;
}

export interface UpdateAssistantSettingsResponse {
  message: string;
  profile: UserProfile;
}


export interface PasswordResetRequestPayload {
  phone: string;
}


export interface PasswordResetRequestResponse {
  message: string;
}


export interface PasswordResetVerifyPayload {
  phone: string;
  code: string;
}


export interface PasswordResetVerifyResponse {
  message: string;
  reset_token: string;
}


export interface PasswordResetConfirmPayload {
  reset_token: string;
  new_password: string;
  confirm_password: string;
}


export interface PasswordResetConfirmResponse {
  message: string;
}