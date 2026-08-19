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

export type NoteBlockType =
  | 'text'
  | 'heading'
  | 'field'
  | 'textarea'
  | 'checklist'
  | 'bulleted_list'
  | 'numbered_list'
  | 'date'
  | 'date_list'
  | 'number_list'
  | 'image'
  | 'file'
  | 'file_list'
  | 'divider';


export interface NoteTextBlock {
  id: string;
  type: 'text' | 'textarea';
  text: string;
}


export interface NoteHeadingBlock {
  id: string;
  type: 'heading';
  text: string;
  level?: 1 | 2;
}


export interface NoteFieldBlock {
  id: string;
  type: 'field';
  label: string;
  value: string;
}


export interface NoteChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}


export interface NoteChecklistBlock {
  id: string;
  type: 'checklist';
  items: NoteChecklistItem[];
}


export interface NoteBulletedListBlock {
  id: string;
  type: 'bulleted_list';
  items: string[];
}


export interface NoteNumberedListBlock {
  id: string;
  type: 'numbered_list';
  items: string[];
}


export interface NoteDateBlock {
  id: string;
  type: 'date';
  value: string | null;
  label?: string;
}


export interface NoteDateListItem {
  id: string;
  label: string;
  value: string | null;
}


export interface NoteDateListBlock {
  id: string;
  type: 'date_list';
  items: NoteDateListItem[];
}


export interface NoteNumberListItem {
  id: string;
  label: string;
  value: number | null;
}


export interface NoteNumberListBlock {
  id: string;
  type: 'number_list';
  items: NoteNumberListItem[];
}


export interface NoteAttachmentReference {
  attachment_id?: string;
  file_id?: string;
  caption?: string;
}


export interface NoteImageBlock
  extends NoteAttachmentReference {
  id: string;
  type: 'image';
}


export interface NoteFileBlock
  extends NoteAttachmentReference {
  id: string;
  type: 'file';
}


export interface NoteFileListBlock {
  id: string;
  type: 'file_list';
  attachments: NoteAttachmentReference[];
}


export interface NoteDividerBlock {
  id: string;
  type: 'divider';
}


export type NoteBlock =
  | NoteTextBlock
  | NoteHeadingBlock
  | NoteFieldBlock
  | NoteChecklistBlock
  | NoteBulletedListBlock
  | NoteNumberedListBlock
  | NoteDateBlock
  | NoteDateListBlock
  | NoteNumberListBlock
  | NoteImageBlock
  | NoteFileBlock
  | NoteFileListBlock
  | NoteDividerBlock;


export interface NoteContent {
  version: number;
  blocks: NoteBlock[];
}


export interface Note {
  id: string;
  owner_id: string;
  folder_id: string | null;
  template_id: string | null;
  title: string | null;
  content?: NoteContent | null;
  template_snapshot?: NoteContent | null;
  color: string | null;
  is_favorite: boolean;
  is_pinned: boolean;
  is_archived: boolean;
  position: string | number | null;
  deleted_at: string | null;
  purge_after: string | null;
  last_opened_at: string | null;
  created_at: string;
  updated_at: string;
}


export interface NoteFolder {
  id: string;
  owner_id: string;
  parent_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
}


export interface NoteTag {
  id: string;
  owner_id: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}


export interface NoteTemplate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  content: NoteContent;
  is_active: boolean;
  display_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}


export type NoteAttachmentType =
  | 'attachment'
  | 'image'
  | 'cover';


export interface NoteAttachmentFile {
  id: string;
  owner_id: string;
  folder_id: string | null;
  bucket_id: string;
  storage_path: string;
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


export interface NoteAttachment {
  id: string;
  note_id: string;
  file_id: string;
  attachment_type: NoteAttachmentType;
  display_order: number;
  created_at: string;
  file: NoteAttachmentFile;
}


export interface NoteAttachmentUploadFailure {
  name: string;
  detail: string;
  code: 'quota_exceeded' | 'upload_failed';
}


export interface NoteAttachmentAccessResponse {
  attachment: NoteAttachment;
  url: string;
  expires_in_seconds: number;
  download: boolean;
}


export interface NoteShareRecipient {
  id: string;
  email: string | null;
  first_name: string;
  last_name: string;
  phone_dial_code: string | null;
  phone_number: string | null;
}


export interface NoteShareProfile {
  id: string;
  first_name: string;
  last_name: string;
  phone_dial_code: string | null;
  phone_number: string | null;
}


export interface NoteShare {
  id: string;
  note_id: string;
  shared_by_user_id: string;
  shared_with_user_id: string;
  permission: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  hidden_at: string | null;
  shared_with_displayed_at: string | null;
  created_at: string;
  updated_at: string;
  note?: Note;
  shared_by?: NoteShareProfile | null;
}


export interface NotesQuery {
  folder_id?: string | null;
  template_id?: string;
  search?: string;
  is_favorite?: boolean;
  is_pinned?: boolean;
  is_archived?: boolean;
  deleted?: boolean;
  limit?: number;
  offset?: number;
}


export interface NoteFoldersQuery {
  parent_id?: string | null;
}


export interface ReceivedNoteSharesQuery {
  include_hidden?: boolean;
  limit?: number;
  offset?: number;
}


export interface CreateNotePayload {
  title?: string;
  template_id?: string | null;
  folder_id?: string | null;
}


export interface UpdateNotePayload {
  title?: string;
  content?: NoteContent;
  color?: string;
  folder_id?: string | null;
  is_favorite?: boolean;
  is_pinned?: boolean;
  is_archived?: boolean;
  position?: string | number;
  last_opened_at?: string | null;
}


export interface CreateNoteFolderPayload {
  name: string;
  parent_id?: string | null;
}


export interface RenameNoteFolderPayload {
  name: string;
}


export interface MoveNoteFolderPayload {
  parent_id: string | null;
}


export interface CreateNoteTagPayload {
  name: string;
  icon?: string;
  color?: string;
  sort_order?: number;
}


export interface UpdateNoteTagPayload {
  name?: string;
  icon?: string;
  color?: string;
  sort_order?: number;
}


export interface ReplaceNoteTagsPayload {
  tag_ids: string[];
}


export interface CreateNoteAttachmentPayload {
  file_id: string;
  attachment_type?: NoteAttachmentType;
  display_order?: number;
}


export interface UpdateNoteAttachmentPayload {
  attachment_type?: NoteAttachmentType;
  display_order?: number;
}


export interface CreateNoteSharePayload {
  recipient_id: string;
  expires_at?: string | null;
}


export interface GetNotesResponse {
  notes: Note[];
  count: number;
  limit: number;
  offset: number;
}


export interface GetNoteResponse {
  note: Note;
}


export interface CreateNoteResponse {
  note: Note;
}


export interface UpdateNoteResponse {
  note: Note;
}


export interface GetNoteFoldersResponse {
  folders: NoteFolder[];
}


export interface CreateNoteFolderResponse {
  folder: NoteFolder;
}


export interface UpdateNoteFolderResponse {
  folder: NoteFolder;
}


export interface GetNoteTagsResponse {
  tags: NoteTag[];
}


export interface CreateNoteTagResponse {
  tag: NoteTag;
}


export interface UpdateNoteTagResponse {
  tag: NoteTag;
}


export interface GetNoteTemplatesResponse {
  templates: NoteTemplate[];
}


export interface GetNoteAttachmentsResponse {
  attachments: NoteAttachment[];
}


export interface CreateNoteAttachmentResponse {
  attachment: NoteAttachment;
}


export interface UpdateNoteAttachmentResponse {
  attachment: NoteAttachment;
}


export interface UploadNoteAttachmentsResponse {
  attachments: NoteAttachment[];
  failed_files: NoteAttachmentUploadFailure[];
  success_count: number;
  failure_count: number;
}


export interface GetNoteShareRecipientsResponse {
  recipients: NoteShareRecipient[];
}


export interface CreateNoteShareResponse {
  share: NoteShare;
}


export interface UpdateNoteShareResponse {
  share: NoteShare;
}


export interface GetReceivedNoteSharesResponse {
  shares: NoteShare[];
  count: number;
  limit: number;
  offset: number;
}


export interface GetSharedNoteResponse {
  note: Note;
  share: NoteShare;
}


export type CalendarEventKind =
  | 'virtual'
  | 'in_person'
  | 'hybrid';


export type CalendarEventSource =
  | 'beeapp'
  | 'google'
  | 'microsoft'
  | 'detached';


export type CalendarEventStatus =
  | 'confirmed'
  | 'cancelled';


export type CalendarSharePermission =
  | 'owner'
  | 'viewer'
  | 'editor';


export type CalendarAttendeeResponseStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'removed';


export type CalendarReminderChannel =
  | 'push'
  | 'in_app';


export type CalendarRecurrenceFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'custom';


export type CalendarDefaultView =
  | 'day'
  | 'week'
  | 'month'
  | 'agenda';


export interface Calendar {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  color: string;
  visibility: string;
  is_default: boolean;
  is_archived: boolean;
  timezone: string;
  created_at: string;
  updated_at: string;
  share_permission: CalendarSharePermission;
}


export interface CalendarTag {
  id: string;
  owner_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}


export interface CalendarConference {
  id?: string;
  event_id?: string;
  provider:
    | 'agora'
    | 'external'
    | 'google_meet'
    | 'microsoft_teams';
  label: string | null;
  join_url: string;
  external_conference_id?: string | null;
  status?: string;
  is_primary: boolean;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}


export interface CalendarReminder {
  id?: string;
  event_id?: string;
  recipient_id?: string;
  channel: CalendarReminderChannel;
  offset_minutes: number;
  all_day_reminder_time?: string | null;
  status?: string;
  scheduled_for?: string | null;
  sent_at?: string | null;
  cancelled_at?: string | null;
  failure_reason?: string | null;
  created_at?: string;
  updated_at?: string;
}


export interface CalendarRecurrence {
  id?: string;
  event_id?: string;
  rrule: string;
  frequency: CalendarRecurrenceFrequency;
  interval_count: number;
  week_days?: number[] | null;
  month_day?: number | null;
  nth_weekday?: number | null;
  until_at?: string | null;
  occurrence_count?: number | null;
  timezone?: string;
  created_at?: string;
  updated_at?: string;
}


export interface CalendarEventAttendee {
  id: string;
  event_id: string;
  attendee_kind: string;
  attendee_user_id: string | null;
  external_email: string | null;
  external_display_name: string | null;
  is_organizer: boolean;
  response_status: CalendarAttendeeResponseStatus;
  responded_at: string | null;
  invitation_sent_at: string | null;
  invitation_read_at: string | null;
  hidden_at: string | null;
  external_attendee_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}


export interface CalendarEvent {
  id: string;
  calendar_id: string;
  organizer_id: string;
  source: CalendarEventSource;
  status: CalendarEventStatus;
  event_kind: CalendarEventKind;
  custom_type_name: string | null;
  title: string;
  description: string | null;
  color: string;
  is_all_day: boolean;
  starts_at: string | null;
  ends_at: string | null;
  starts_on: string | null;
  ends_on: string | null;
  timezone: string;
  location_name: string | null;
  location_address: string | null;
  location_maps_url: string | null;
  is_private: boolean;
  notifications_enabled: boolean;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  attendees?: CalendarEventAttendee[];
  conferences?: CalendarConference[];
  reminders?: CalendarReminder[];
  tags?: CalendarTag[];
  recurrence?: CalendarRecurrence | null;
}


export interface CalendarPreferences {
  user_id: string;
  timezone: string;
  week_starts_on: 0 | 1;
  show_weekends: boolean;
  default_view: CalendarDefaultView;
  default_event_color: string;
  default_event_kind: CalendarEventKind;
  default_reminders: CalendarReminder[];
  show_declined_events: boolean;
  notify_invitations: boolean;
  notify_rsvp_updates: boolean;
  notify_event_changes: boolean;
  notify_reminders: boolean;
  notify_sync_errors: boolean;
  notify_conflicts: boolean;
  created_at: string;
  updated_at: string;
}


export interface CalendarUserSearchResult {
  user_id: string;
  email: string | null;
  first_name: string;
  last_name: string;
  phone_dial_code?: string | null;
  phone_number?: string | null;
}


export interface CalendarEventsQuery {
  range_start: string;
  range_end: string;
  calendar_ids?: string[];
  source?: CalendarEventSource;
  event_kind?: CalendarEventKind;
  tag_ids?: string[];
  include_cancelled?: boolean;
  include_declined?: boolean;
  search?: string;
  limit?: number;
}


export interface CreateCalendarPayload {
  name: string;
  description?: string | null;
  color?: string;
  timezone?: string;
}


export interface CreateCalendarEventPayload {
  calendar_id: string;
  title: string;
  description?: string | null;
  event_kind?: CalendarEventKind;
  custom_type_name?: string | null;
  color?: string;
  is_all_day?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  starts_on?: string | null;
  ends_on?: string | null;
  timezone?: string;
  location_name?: string | null;
  location_address?: string | null;
  location_maps_url?: string | null;
  is_private?: boolean;
  notifications_enabled?: boolean;
  tag_ids?: string[];
  conferences?: CalendarConference[];
  attendee_ids?: string[];
  reminders?: CalendarReminder[];
  recurrence?: CalendarRecurrence | null;
}


export interface UpdateCalendarEventPayload {
  calendar_id?: string;
  title?: string;
  description?: string | null;
  event_kind?: CalendarEventKind;
  custom_type_name?: string | null;
  color?: string;
  is_all_day?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  starts_on?: string | null;
  ends_on?: string | null;
  timezone?: string;
  location_name?: string | null;
  location_address?: string | null;
  location_maps_url?: string | null;
  is_private?: boolean;
  notifications_enabled?: boolean;
  tag_ids?: string[];
  conferences?: CalendarConference[];
  attendee_ids?: string[];
  reminders?: CalendarReminder[];
  recurrence?: CalendarRecurrence | null;
}


export interface DuplicateCalendarEventPayload {
  calendar_id?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  starts_on?: string | null;
  ends_on?: string | null;
  include_attendees?: boolean;
  include_reminders?: boolean;
  include_recurrence?: boolean;
}


export interface CalendarConflictQuery {
  is_all_day: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  starts_on?: string | null;
  ends_on?: string | null;
  exclude_event_id?: string;
}


export interface CalendarConflict {
  event_id: string;
  calendar_id: string;
  calendar_name: string;
  calendar_color: string;
  source: CalendarEventSource;
  event_kind: CalendarEventKind;
  is_all_day: boolean;
  starts_at: string | null;
  ends_at: string | null;
  starts_on: string | null;
  ends_on: string | null;
  details_hidden: boolean;
}


export interface GetCalendarBootstrapResponse {
  preferences: CalendarPreferences;
  calendars: Calendar[];
  tags: CalendarTag[];
  events: CalendarEvent[];
  count: number;
  range_start: string;
  range_end: string;
}


export interface GetCalendarEventsResponse {
  events: CalendarEvent[];
  count: number;
  range_start: string;
  range_end: string;
}


export interface GetCalendarEventResponse {
  event: CalendarEvent;
}


export interface CreateCalendarResponse {
  calendar: Calendar;
}


export interface CreateCalendarEventResponse {
  event: CalendarEvent;
}


export interface UpdateCalendarEventResponse {
  event: CalendarEvent;
}


export interface SearchCalendarUsersResponse {
  users: CalendarUserSearchResult[];
}


export interface RespondToCalendarEventResponse {
  attendee: CalendarEventAttendee;
}


export interface GetCalendarConflictsResponse {
  has_conflicts: boolean;
  conflicts: CalendarConflict[];
  count: number;
}

export type IntegrationProvider =
  | 'google'
  | 'microsoft'
  | 'slack'
  | 'meta'
  | 'dropbox'
  | 'notion'
  | 'other';

export type IntegrationConnectionStatus =
  | 'pending'
  | 'connected'
  | 'reauth_required'
  | 'revoked'
  | 'error'
  | 'disconnected';

export type IntegrationCapability =
  | 'calendar'
  | 'mail'
  | 'contacts'
  | 'storage'
  | 'messaging'
  | 'tasks'
  | 'crm'
  | 'analytics'
  | 'other';

export interface IntegrationConnection {
  id: string;
  user_id: string;
  provider: IntegrationProvider;
  provider_account_id: string;
  provider_tenant_id: string | null;
  provider_email: string | null;
  provider_display_name: string | null;
  provider_avatar_url: string | null;
  status: IntegrationConnectionStatus;
  granted_scopes: string[];
  capabilities: IntegrationCapability[];
  token_expires_at: string | null;
  last_token_refresh_at: string | null;
  last_successful_auth_at: string | null;
  reauth_required_at: string | null;
  disconnected_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface IntegrationProviderCatalogItem {
  id: IntegrationProvider;
  name: string;
  status: 'available' | 'coming_soon';
  capabilities: IntegrationCapability[];
}

export interface GetIntegrationCatalogResponse {
  providers: IntegrationProviderCatalogItem[];
}

export interface GetIntegrationConnectionsResponse {
  connections: IntegrationConnection[];
}

export interface GetIntegrationConnectionResponse {
  connection: IntegrationConnection;
}

export type IntegrationOAuthClientChannel =
  | 'mobile'
  | 'web';

export interface StartIntegrationAuthorizationPayload {
  capabilities?: IntegrationCapability[];
  client_channel?: IntegrationOAuthClientChannel;
}

export interface StartIntegrationAuthorizationResponse {
  request_id: string;
  authorization_url: string;
  expires_at: string;
}