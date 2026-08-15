export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export type UserStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'PENDING';

export type AuthScheme = 'Bearer' | 'Session';

export type SocialPlatform =
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'tiktok'
  | 'youtube'
  | 'threads'
  | 'website';

export interface ProfileSocialLink {
  platform: SocialPlatform;
  url: string;
}

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
  social_links: ProfileSocialLink[];
}

export interface CurrentUserProfile
  extends UserProfile {
  email: string | null;
}

export interface GetCurrentProfileResponse {
  profile: CurrentUserProfile;
}

export interface UpdateProfilePayload {
  first_name: string;
  last_name: string;
  email: string;
  phone_dial_code: string;
  phone_number: string;
  occupation?: string | null;
  location?: string | null;
  social_links: ProfileSocialLink[];
}

export interface UpdateProfileResponse {
  message: string;
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

export type StorageFileKind =
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'archive'
  | 'other';

export type StorageFileStatus =
  | 'uploading'
  | 'ready'
  | 'failed'
  | 'trashed';

export type StorageScope =
  | 'all'
  | 'recent'
  | 'documents'
  | 'media';

export type FileSharePermission =
  | 'viewer'
  | 'editor';

export interface StorageSummary {
  quota_bytes: number;
  used_bytes: number;
  reserved_bytes: number;
  available_bytes: number;
  usage_percentage: number;
  updated_at: string | null;
}

export interface StorageFolder {
  id: string;
  owner_id: string;
  parent_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface StorageFile {
  id: string;
  owner_id?: string;
  folder_id: string | null;
  bucket_id?: string;
  storage_path?: string;
  original_name: string;
  display_name: string;
  extension: string | null;
  mime_type: string;
  kind: StorageFileKind;
  size_bytes: number;
  status: StorageFileStatus;
  is_starred: boolean;
  trashed_at: string | null;
  purge_after: string | null;
  created_at: string;
  updated_at: string;
}

export interface StorageTag {
  id: string;
  owner_id: string;
  name: string;
  icon: string;
  color: string;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface StorageShareRecipient {
  id: string;
  email: string | null;
  first_name: string;
  last_name: string;
  phone_dial_code: string | null;
  phone_number: string | null;
}

export interface StorageShareProfile {
  id: string;
  first_name: string;
  last_name: string;
  phone_dial_code: string | null;
  phone_number: string | null;
}

export interface StorageFileShare {
  id: string;
  file_id: string;
  shared_by_user_id: string;
  shared_with_user_id: string;
  permission: FileSharePermission;
  accepted_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  hidden_at: string | null;
  shared_with_displayed_at: string | null;
  created_at: string;
  updated_at: string;
  file?: StorageFile;
  shared_by?: StorageShareProfile | null;
}

export interface StorageFilesQuery {
  folder_id?: string | null;
  status?: 'ready' | 'trashed';
  scope?: StorageScope;
  kind?: StorageFileKind;
  tag_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface StorageFoldersQuery {
  parent_id?: string | null;
}

export interface ReceivedSharesQuery {
  include_hidden?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateStorageFolderPayload {
  name: string;
  parent_id?: string | null;
}

export interface UpdateStorageFolderPayload {
  name: string;
}

export interface MoveStorageFolderPayload {
  parent_id: string | null;
}

export interface UpdateStorageFilePayload {
  display_name: string;
}

export interface MoveStorageFilePayload {
  folder_id: string | null;
}

export interface UpdateStorageFileResponse {
  file: StorageFile;
}

export interface CreateStorageTagPayload {
  name: string;
  icon?: string;
  color?: string;
  sort_order?: number;
}

export interface UpdateStorageTagPayload {
  name?: string;
  icon?: string;
  color?: string;
  sort_order?: number;
}

export interface ReplaceFileTagsPayload {
  tag_ids: string[];
}

export interface CreateFileSharePayload {
  recipient_id: string;
  permission?: FileSharePermission;
  expires_at?: string | null;
}

export interface GetStorageSummaryResponse {
  storage: StorageSummary;
}

export interface GetStorageFilesResponse {
  files: StorageFile[];
  count: number;
  limit: number;
  offset: number;
}

export interface GetStorageFoldersResponse {
  folders: StorageFolder[];
}

export interface GetStorageTagsResponse {
  tags: StorageTag[];
}

export interface GetStorageFileTagsResponse {
  tags: StorageTag[];
}

export interface GetStorageShareRecipientsResponse {
  recipients: StorageShareRecipient[];
}

export interface GetReceivedSharesResponse {
  shares: StorageFileShare[];
  count: number;
  limit: number;
  offset: number;
}

export interface CreateStorageFolderResponse {
  folder: StorageFolder;
}

export interface UpdateStorageFolderResponse {
  folder: StorageFolder;
}

export interface CreateStorageTagResponse {
  tag: StorageTag;
}

export interface UpdateStorageTagResponse {
  tag: StorageTag;
}

export interface ReplaceFileTagsResponse {
  tags: StorageTag[];
}

export interface CreateFileShareResponse {
  share: StorageFileShare;
}

export interface UpdateFileShareResponse {
  share: StorageFileShare;
}

export interface UploadFailedFile {
  name: string;
  detail: string;
  code: 'quota_exceeded' | 'upload_failed';
}

export interface CreateStorageUploadResponse {
  files: StorageFile[];
  failed_files: UploadFailedFile[];
  success_count: number;
  failure_count: number;
}

export interface GetStorageFileAccessResponse {
  file: StorageFile;
  url: string;
  expires_in_seconds: number;
  download: boolean;
}

export type NotificationModule = string;

export interface AppNotification {
  id: string;
  module: NotificationModule;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  read_at: string | null;
  push_sent_at: string | null;
  push_error: string | null;
  created_at: string;
  expires_at: string;
}

export interface NotificationsQuery {
  module?: NotificationModule;
  unread_only?: boolean;
  limit?: number;
  offset?: number;
}

export interface GetNotificationsResponse {
  notifications: AppNotification[];
  count: number;
  limit: number;
  offset: number;
  unread_count: number;
}

export interface MarkNotificationReadResponse {
  notification: AppNotification;
}

export interface MarkAllNotificationsReadResponse {
  message: string;
  updated_count: number;
}

export interface RegisterPushDevicePayload {
  expo_push_token: string;
  platform: 'android' | 'ios' | 'web';
  device_id?: string;
  app_version?: string;
}

export interface PushDevice {
  id: string;
  user_id: string;
  expo_push_token: string;
  platform: string;
  device_id: string | null;
  app_version: string | null;
  is_active: boolean;
  last_seen_at: string;
  created_at?: string;
  updated_at?: string;
}

export interface RegisterPushDeviceResponse {
  device: PushDevice;
}