// Generated from Supabase project buddyai. Do not edit by hand.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      account_security_pins: {
        Row: {
          created_at: string
          failed_attempts: number
          locked_until: string | null
          pin_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          failed_attempts?: number
          locked_until?: string | null
          pin_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          failed_attempts?: number
          locked_until?: string | null
          pin_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_notification_campaigns: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          recipient_count: number
          recipient_mode: string
          scheduled_for: string | null
          segment: Json
          sent_at: string | null
          status: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          recipient_count?: number
          recipient_mode: string
          scheduled_for?: string | null
          segment?: Json
          sent_at?: string | null
          status?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          recipient_count?: number
          recipient_mode?: string
          scheduled_for?: string | null
          segment?: Json
          sent_at?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notification_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notification_recipients: {
        Row: {
          campaign_id: string
          notification_id: string | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          notification_id?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          notification_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notification_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "admin_notification_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notification_recipients_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notification_recipients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      calendar_event_attendees: {
        Row: {
          attendee_kind: Database["public"]["Enums"]["calendar_attendee_kind"]
          attendee_user_id: string | null
          created_at: string
          event_id: string
          external_attendee_id: string | null
          external_display_name: string | null
          external_email: string | null
          hidden_at: string | null
          id: string
          invitation_read_at: string | null
          invitation_sent_at: string | null
          is_organizer: boolean
          metadata: Json
          responded_at: string | null
          response_status: Database["public"]["Enums"]["calendar_attendee_status"]
          updated_at: string
        }
        Insert: {
          attendee_kind?: Database["public"]["Enums"]["calendar_attendee_kind"]
          attendee_user_id?: string | null
          created_at?: string
          event_id: string
          external_attendee_id?: string | null
          external_display_name?: string | null
          external_email?: string | null
          hidden_at?: string | null
          id?: string
          invitation_read_at?: string | null
          invitation_sent_at?: string | null
          is_organizer?: boolean
          metadata?: Json
          responded_at?: string | null
          response_status?: Database["public"]["Enums"]["calendar_attendee_status"]
          updated_at?: string
        }
        Update: {
          attendee_kind?: Database["public"]["Enums"]["calendar_attendee_kind"]
          attendee_user_id?: string | null
          created_at?: string
          event_id?: string
          external_attendee_id?: string | null
          external_display_name?: string | null
          external_email?: string | null
          hidden_at?: string | null
          id?: string
          invitation_read_at?: string | null
          invitation_sent_at?: string | null
          is_organizer?: boolean
          metadata?: Json
          responded_at?: string | null
          response_status?: Database["public"]["Enums"]["calendar_attendee_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event_conferences: {
        Row: {
          created_at: string
          event_id: string
          external_conference_id: string | null
          id: string
          is_primary: boolean
          join_url: string
          label: string | null
          metadata: Json
          provider: Database["public"]["Enums"]["calendar_conference_provider"]
          status: Database["public"]["Enums"]["calendar_conference_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          external_conference_id?: string | null
          id?: string
          is_primary?: boolean
          join_url: string
          label?: string | null
          metadata?: Json
          provider?: Database["public"]["Enums"]["calendar_conference_provider"]
          status?: Database["public"]["Enums"]["calendar_conference_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          external_conference_id?: string | null
          id?: string
          is_primary?: boolean
          join_url?: string
          label?: string | null
          metadata?: Json
          provider?: Database["public"]["Enums"]["calendar_conference_provider"]
          status?: Database["public"]["Enums"]["calendar_conference_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_conferences_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event_external_mappings: {
        Row: {
          beeapp_last_pushed_at: string | null
          created_at: string
          detached_at: string | null
          event_id: string
          external_calendar_id: string
          id: string
          is_detached: boolean
          last_error_code: string | null
          last_error_message: string | null
          last_synced_at: string | null
          metadata: Json
          pending_action:
            | Database["public"]["Enums"]["calendar_sync_job_type"]
            | null
          provider_change_key: string | null
          provider_etag: string | null
          provider_event_id: string
          provider_payload: Json
          provider_updated_at: string | null
          provider_web_link: string | null
          updated_at: string
        }
        Insert: {
          beeapp_last_pushed_at?: string | null
          created_at?: string
          detached_at?: string | null
          event_id: string
          external_calendar_id: string
          id?: string
          is_detached?: boolean
          last_error_code?: string | null
          last_error_message?: string | null
          last_synced_at?: string | null
          metadata?: Json
          pending_action?:
            | Database["public"]["Enums"]["calendar_sync_job_type"]
            | null
          provider_change_key?: string | null
          provider_etag?: string | null
          provider_event_id: string
          provider_payload?: Json
          provider_updated_at?: string | null
          provider_web_link?: string | null
          updated_at?: string
        }
        Update: {
          beeapp_last_pushed_at?: string | null
          created_at?: string
          detached_at?: string | null
          event_id?: string
          external_calendar_id?: string
          id?: string
          is_detached?: boolean
          last_error_code?: string | null
          last_error_message?: string | null
          last_synced_at?: string | null
          metadata?: Json
          pending_action?:
            | Database["public"]["Enums"]["calendar_sync_job_type"]
            | null
          provider_change_key?: string | null
          provider_etag?: string | null
          provider_event_id?: string
          provider_payload?: Json
          provider_updated_at?: string | null
          provider_web_link?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_external_mappings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_event_external_mappings_external_calendar_id_fkey"
            columns: ["external_calendar_id"]
            isOneToOne: false
            referencedRelation: "calendar_external_calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event_invitee_requests: {
        Row: {
          created_at: string
          event_id: string
          id: string
          note: string | null
          requested_by_user_id: string
          requested_user_id: string
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: Database["public"]["Enums"]["calendar_invitee_request_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          note?: string | null
          requested_by_user_id: string
          requested_user_id: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: Database["public"]["Enums"]["calendar_invitee_request_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          note?: string | null
          requested_by_user_id?: string
          requested_user_id?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: Database["public"]["Enums"]["calendar_invitee_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_invitee_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event_recurrence_exceptions: {
        Row: {
          created_at: string
          exception_kind: Database["public"]["Enums"]["calendar_recurrence_exception_kind"]
          id: string
          original_starts_at: string | null
          original_starts_on: string | null
          recurrence_id: string
          replacement_event_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          exception_kind: Database["public"]["Enums"]["calendar_recurrence_exception_kind"]
          id?: string
          original_starts_at?: string | null
          original_starts_on?: string | null
          recurrence_id: string
          replacement_event_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          exception_kind?: Database["public"]["Enums"]["calendar_recurrence_exception_kind"]
          id?: string
          original_starts_at?: string | null
          original_starts_on?: string | null
          recurrence_id?: string
          replacement_event_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_recurrence_exceptions_recurrence_id_fkey"
            columns: ["recurrence_id"]
            isOneToOne: false
            referencedRelation: "calendar_event_recurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_event_recurrence_exceptions_replacement_event_id_fkey"
            columns: ["replacement_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event_recurrences: {
        Row: {
          created_at: string
          event_id: string
          frequency: string
          id: string
          interval_count: number
          month_day: number | null
          nth_weekday: number | null
          occurrence_count: number | null
          rrule: string
          timezone: string
          until_at: string | null
          updated_at: string
          week_days: number[] | null
        }
        Insert: {
          created_at?: string
          event_id: string
          frequency: string
          id?: string
          interval_count?: number
          month_day?: number | null
          nth_weekday?: number | null
          occurrence_count?: number | null
          rrule: string
          timezone?: string
          until_at?: string | null
          updated_at?: string
          week_days?: number[] | null
        }
        Update: {
          created_at?: string
          event_id?: string
          frequency?: string
          id?: string
          interval_count?: number
          month_day?: number | null
          nth_weekday?: number | null
          occurrence_count?: number | null
          rrule?: string
          timezone?: string
          until_at?: string | null
          updated_at?: string
          week_days?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_recurrences_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event_reminders: {
        Row: {
          all_day_reminder_time: string | null
          cancelled_at: string | null
          channel: Database["public"]["Enums"]["calendar_reminder_channel"]
          created_at: string
          event_id: string
          failure_reason: string | null
          id: string
          offset_minutes: number
          recipient_id: string
          scheduled_for: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["calendar_reminder_status"]
          updated_at: string
        }
        Insert: {
          all_day_reminder_time?: string | null
          cancelled_at?: string | null
          channel: Database["public"]["Enums"]["calendar_reminder_channel"]
          created_at?: string
          event_id: string
          failure_reason?: string | null
          id?: string
          offset_minutes: number
          recipient_id: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["calendar_reminder_status"]
          updated_at?: string
        }
        Update: {
          all_day_reminder_time?: string | null
          cancelled_at?: string | null
          channel?: Database["public"]["Enums"]["calendar_reminder_channel"]
          created_at?: string
          event_id?: string
          failure_reason?: string | null
          id?: string
          offset_minutes?: number
          recipient_id?: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["calendar_reminder_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_reminders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event_tag_assignments: {
        Row: {
          assigned_by_user_id: string | null
          created_at: string
          event_id: string
          tag_id: string
        }
        Insert: {
          assigned_by_user_id?: string | null
          created_at?: string
          event_id: string
          tag_id: string
        }
        Update: {
          assigned_by_user_id?: string | null
          created_at?: string
          event_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_tag_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_event_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "calendar_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          calendar_id: string
          color: string
          created_at: string
          custom_type_name: string | null
          description: string | null
          ends_at: string | null
          ends_on: string | null
          event_kind: Database["public"]["Enums"]["calendar_event_kind"]
          external_calendar_id: string | null
          id: string
          is_all_day: boolean
          is_private: boolean
          location_address: string | null
          location_maps_url: string | null
          location_name: string | null
          metadata: Json
          notifications_enabled: boolean
          organizer_id: string
          provider_change_key: string | null
          provider_event_id: string | null
          provider_updated_at: string | null
          source: Database["public"]["Enums"]["calendar_event_source"]
          starts_at: string | null
          starts_on: string | null
          status: Database["public"]["Enums"]["calendar_event_status"]
          timezone: string
          title: string
          updated_at: string
        }
        Insert: {
          calendar_id: string
          color?: string
          created_at?: string
          custom_type_name?: string | null
          description?: string | null
          ends_at?: string | null
          ends_on?: string | null
          event_kind?: Database["public"]["Enums"]["calendar_event_kind"]
          external_calendar_id?: string | null
          id?: string
          is_all_day?: boolean
          is_private?: boolean
          location_address?: string | null
          location_maps_url?: string | null
          location_name?: string | null
          metadata?: Json
          notifications_enabled?: boolean
          organizer_id: string
          provider_change_key?: string | null
          provider_event_id?: string | null
          provider_updated_at?: string | null
          source?: Database["public"]["Enums"]["calendar_event_source"]
          starts_at?: string | null
          starts_on?: string | null
          status?: Database["public"]["Enums"]["calendar_event_status"]
          timezone?: string
          title: string
          updated_at?: string
        }
        Update: {
          calendar_id?: string
          color?: string
          created_at?: string
          custom_type_name?: string | null
          description?: string | null
          ends_at?: string | null
          ends_on?: string | null
          event_kind?: Database["public"]["Enums"]["calendar_event_kind"]
          external_calendar_id?: string | null
          id?: string
          is_all_day?: boolean
          is_private?: boolean
          location_address?: string | null
          location_maps_url?: string | null
          location_name?: string | null
          metadata?: Json
          notifications_enabled?: boolean
          organizer_id?: string
          provider_change_key?: string | null
          provider_event_id?: string | null
          provider_updated_at?: string | null
          source?: Database["public"]["Enums"]["calendar_event_source"]
          starts_at?: string | null
          starts_on?: string | null
          status?: Database["public"]["Enums"]["calendar_event_status"]
          timezone?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_external_calendars: {
        Row: {
          access_level: Database["public"]["Enums"]["calendar_external_calendar_access"]
          created_at: string
          description: string | null
          display_color: string
          id: string
          integration_id: string
          is_primary: boolean
          is_selected: boolean
          is_visible: Database["public"]["Enums"]["calendar_sync_visibility"]
          last_attempted_sync_at: string | null
          last_successful_sync_at: string | null
          metadata: Json
          name: string
          provider_calendar_id: string
          provider_color: string | null
          sync_cursor: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["calendar_external_calendar_access"]
          created_at?: string
          description?: string | null
          display_color?: string
          id?: string
          integration_id: string
          is_primary?: boolean
          is_selected?: boolean
          is_visible?: Database["public"]["Enums"]["calendar_sync_visibility"]
          last_attempted_sync_at?: string | null
          last_successful_sync_at?: string | null
          metadata?: Json
          name: string
          provider_calendar_id: string
          provider_color?: string | null
          sync_cursor?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["calendar_external_calendar_access"]
          created_at?: string
          description?: string | null
          display_color?: string
          id?: string
          integration_id?: string
          is_primary?: boolean
          is_selected?: boolean
          is_visible?: Database["public"]["Enums"]["calendar_sync_visibility"]
          last_attempted_sync_at?: string | null
          last_successful_sync_at?: string | null
          metadata?: Json
          name?: string
          provider_calendar_id?: string
          provider_color?: string | null
          sync_cursor?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_external_calendars_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "calendar_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_external_calendars_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "calendar_integrations_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_external_calendars_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integration_account_overview"
            referencedColumns: ["calendar_integration_id"]
          },
        ]
      }
      calendar_integration_export_preferences: {
        Row: {
          auto_export_new_events: boolean
          created_at: string
          export_beeapp_attendees: boolean
          external_calendar_id: string
          id: string
          is_default_destination: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_export_new_events?: boolean
          created_at?: string
          export_beeapp_attendees?: boolean
          external_calendar_id: string
          id?: string
          is_default_destination?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_export_new_events?: boolean
          created_at?: string
          export_beeapp_attendees?: boolean
          external_calendar_id?: string
          id?: string
          is_default_destination?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_integration_export_preferenc_external_calendar_id_fkey"
            columns: ["external_calendar_id"]
            isOneToOne: false
            referencedRelation: "calendar_external_calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_integrations: {
        Row: {
          access_token_ciphertext: string | null
          connected_at: string
          created_at: string
          disconnected_at: string | null
          granted_scopes: string[]
          id: string
          integration_connection_id: string | null
          last_attempted_sync_at: string | null
          last_error_code: string | null
          last_error_message: string | null
          last_successful_sync_at: string | null
          metadata: Json
          next_sync_at: string | null
          provider: Database["public"]["Enums"]["calendar_provider"]
          provider_account_id: string
          provider_display_name: string | null
          provider_email: string | null
          reauth_required_at: string | null
          refresh_token_ciphertext: string | null
          status: Database["public"]["Enums"]["calendar_integration_status"]
          token_encryption_version: number
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_ciphertext?: string | null
          connected_at?: string
          created_at?: string
          disconnected_at?: string | null
          granted_scopes?: string[]
          id?: string
          integration_connection_id?: string | null
          last_attempted_sync_at?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          last_successful_sync_at?: string | null
          metadata?: Json
          next_sync_at?: string | null
          provider: Database["public"]["Enums"]["calendar_provider"]
          provider_account_id: string
          provider_display_name?: string | null
          provider_email?: string | null
          reauth_required_at?: string | null
          refresh_token_ciphertext?: string | null
          status?: Database["public"]["Enums"]["calendar_integration_status"]
          token_encryption_version?: number
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_ciphertext?: string | null
          connected_at?: string
          created_at?: string
          disconnected_at?: string | null
          granted_scopes?: string[]
          id?: string
          integration_connection_id?: string | null
          last_attempted_sync_at?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          last_successful_sync_at?: string | null
          metadata?: Json
          next_sync_at?: string | null
          provider?: Database["public"]["Enums"]["calendar_provider"]
          provider_account_id?: string
          provider_display_name?: string | null
          provider_email?: string | null
          reauth_required_at?: string | null
          refresh_token_ciphertext?: string | null
          status?: Database["public"]["Enums"]["calendar_integration_status"]
          token_encryption_version?: number
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_integrations_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_account_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_integrations_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_integrations_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_preferences: {
        Row: {
          created_at: string
          default_event_color: string
          default_event_kind: Database["public"]["Enums"]["calendar_event_kind"]
          default_reminders: Json
          default_view: string
          notify_conflicts: boolean
          notify_event_changes: boolean
          notify_invitations: boolean
          notify_reminders: boolean
          notify_rsvp_updates: boolean
          notify_sync_errors: boolean
          show_declined_events: boolean
          show_weekends: boolean
          timezone: string
          updated_at: string
          user_id: string
          week_starts_on: number
        }
        Insert: {
          created_at?: string
          default_event_color?: string
          default_event_kind?: Database["public"]["Enums"]["calendar_event_kind"]
          default_reminders?: Json
          default_view?: string
          notify_conflicts?: boolean
          notify_event_changes?: boolean
          notify_invitations?: boolean
          notify_reminders?: boolean
          notify_rsvp_updates?: boolean
          notify_sync_errors?: boolean
          show_declined_events?: boolean
          show_weekends?: boolean
          timezone?: string
          updated_at?: string
          user_id: string
          week_starts_on?: number
        }
        Update: {
          created_at?: string
          default_event_color?: string
          default_event_kind?: Database["public"]["Enums"]["calendar_event_kind"]
          default_reminders?: Json
          default_view?: string
          notify_conflicts?: boolean
          notify_event_changes?: boolean
          notify_invitations?: boolean
          notify_reminders?: boolean
          notify_rsvp_updates?: boolean
          notify_sync_errors?: boolean
          show_declined_events?: boolean
          show_weekends?: boolean
          timezone?: string
          updated_at?: string
          user_id?: string
          week_starts_on?: number
        }
        Relationships: []
      }
      calendar_shares: {
        Row: {
          accepted_at: string | null
          calendar_id: string
          created_at: string
          id: string
          permission: Database["public"]["Enums"]["calendar_share_permission"]
          revoked_at: string | null
          shared_with_user_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          calendar_id: string
          created_at?: string
          id?: string
          permission?: Database["public"]["Enums"]["calendar_share_permission"]
          revoked_at?: string | null
          shared_with_user_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          calendar_id?: string
          created_at?: string
          id?: string
          permission?: Database["public"]["Enums"]["calendar_share_permission"]
          revoked_at?: string | null
          shared_with_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_shares_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_sync_conflicts: {
        Row: {
          beeapp_snapshot: Json
          created_at: string
          detected_at: string
          event_id: string
          id: string
          integration_id: string
          mapping_id: string
          provider_snapshot: Json
          resolution_note: string | null
          resolved_at: string | null
          resolved_by_user_id: string | null
          status: Database["public"]["Enums"]["calendar_sync_conflict_status"]
          updated_at: string
        }
        Insert: {
          beeapp_snapshot?: Json
          created_at?: string
          detected_at?: string
          event_id: string
          id?: string
          integration_id: string
          mapping_id: string
          provider_snapshot?: Json
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          status?: Database["public"]["Enums"]["calendar_sync_conflict_status"]
          updated_at?: string
        }
        Update: {
          beeapp_snapshot?: Json
          created_at?: string
          detected_at?: string
          event_id?: string
          id?: string
          integration_id?: string
          mapping_id?: string
          provider_snapshot?: Json
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          status?: Database["public"]["Enums"]["calendar_sync_conflict_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_conflicts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_sync_conflicts_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "calendar_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_sync_conflicts_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "calendar_integrations_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_sync_conflicts_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integration_account_overview"
            referencedColumns: ["calendar_integration_id"]
          },
          {
            foreignKeyName: "calendar_sync_conflicts_mapping_id_fkey"
            columns: ["mapping_id"]
            isOneToOne: false
            referencedRelation: "calendar_event_external_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_sync_jobs: {
        Row: {
          attempts: number
          available_at: string
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          event_id: string | null
          external_calendar_id: string | null
          id: string
          integration_id: string
          job_type: Database["public"]["Enums"]["calendar_sync_job_type"]
          last_error_code: string | null
          last_error_message: string | null
          locked_at: string | null
          locked_by: string | null
          mapping_id: string | null
          max_attempts: number
          payload: Json
          priority: number
          result: Json
          status: Database["public"]["Enums"]["calendar_sync_job_status"]
          updated_at: string
        }
        Insert: {
          attempts?: number
          available_at?: string
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          event_id?: string | null
          external_calendar_id?: string | null
          id?: string
          integration_id: string
          job_type: Database["public"]["Enums"]["calendar_sync_job_type"]
          last_error_code?: string | null
          last_error_message?: string | null
          locked_at?: string | null
          locked_by?: string | null
          mapping_id?: string | null
          max_attempts?: number
          payload?: Json
          priority?: number
          result?: Json
          status?: Database["public"]["Enums"]["calendar_sync_job_status"]
          updated_at?: string
        }
        Update: {
          attempts?: number
          available_at?: string
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          event_id?: string | null
          external_calendar_id?: string | null
          id?: string
          integration_id?: string
          job_type?: Database["public"]["Enums"]["calendar_sync_job_type"]
          last_error_code?: string | null
          last_error_message?: string | null
          locked_at?: string | null
          locked_by?: string | null
          mapping_id?: string | null
          max_attempts?: number
          payload?: Json
          priority?: number
          result?: Json
          status?: Database["public"]["Enums"]["calendar_sync_job_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_jobs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_sync_jobs_external_calendar_id_fkey"
            columns: ["external_calendar_id"]
            isOneToOne: false
            referencedRelation: "calendar_external_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_sync_jobs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "calendar_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_sync_jobs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "calendar_integrations_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_sync_jobs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integration_account_overview"
            referencedColumns: ["calendar_integration_id"]
          },
          {
            foreignKeyName: "calendar_sync_jobs_mapping_id_fkey"
            columns: ["mapping_id"]
            isOneToOne: false
            referencedRelation: "calendar_event_external_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_sync_runs: {
        Row: {
          conflict_count: number
          created_at: string
          deleted_count: number
          error_code: string | null
          error_count: number
          error_message: string | null
          exported_count: number
          external_calendar_id: string | null
          finished_at: string | null
          id: string
          imported_count: number
          integration_id: string
          started_at: string
          status: Database["public"]["Enums"]["calendar_sync_run_status"]
          summary: Json
          trigger_source: string
          triggered_by_user_id: string | null
          updated_count: number
        }
        Insert: {
          conflict_count?: number
          created_at?: string
          deleted_count?: number
          error_code?: string | null
          error_count?: number
          error_message?: string | null
          exported_count?: number
          external_calendar_id?: string | null
          finished_at?: string | null
          id?: string
          imported_count?: number
          integration_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["calendar_sync_run_status"]
          summary?: Json
          trigger_source?: string
          triggered_by_user_id?: string | null
          updated_count?: number
        }
        Update: {
          conflict_count?: number
          created_at?: string
          deleted_count?: number
          error_code?: string | null
          error_count?: number
          error_message?: string | null
          exported_count?: number
          external_calendar_id?: string | null
          finished_at?: string | null
          id?: string
          imported_count?: number
          integration_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["calendar_sync_run_status"]
          summary?: Json
          trigger_source?: string
          triggered_by_user_id?: string | null
          updated_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_runs_external_calendar_id_fkey"
            columns: ["external_calendar_id"]
            isOneToOne: false
            referencedRelation: "calendar_external_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_sync_runs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "calendar_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_sync_runs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "calendar_integrations_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_sync_runs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integration_account_overview"
            referencedColumns: ["calendar_integration_id"]
          },
        ]
      }
      calendar_tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      calendars: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          is_archived: boolean
          is_default: boolean
          name: string
          owner_id: string
          timezone: string
          updated_at: string
          visibility: Database["public"]["Enums"]["calendar_visibility"]
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          is_default?: boolean
          name: string
          owner_id: string
          timezone?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["calendar_visibility"]
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          is_default?: boolean
          name?: string
          owner_id?: string
          timezone?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["calendar_visibility"]
        }
        Relationships: []
      }
      call_events: {
        Row: {
          actor_identity_id: string | null
          call_id: string
          created_at: string
          event_type: Database["public"]["Enums"]["call_event_type"]
          id: string
          metadata: Json
          target_identity_id: string | null
        }
        Insert: {
          actor_identity_id?: string | null
          call_id: string
          created_at?: string
          event_type: Database["public"]["Enums"]["call_event_type"]
          id?: string
          metadata?: Json
          target_identity_id?: string | null
        }
        Update: {
          actor_identity_id?: string | null
          call_id?: string
          created_at?: string
          event_type?: Database["public"]["Enums"]["call_event_type"]
          id?: string
          metadata?: Json
          target_identity_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_events_actor_identity_id_fkey"
            columns: ["actor_identity_id"]
            isOneToOne: false
            referencedRelation: "chat_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_events_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "call_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_events_target_identity_id_fkey"
            columns: ["target_identity_id"]
            isOneToOne: false
            referencedRelation: "chat_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      call_participants: {
        Row: {
          accepted_at: string | null
          agora_uid: number
          call_id: string
          created_at: string
          declined_at: string | null
          id: string
          identity_id: string
          invited_at: string
          joined_at: string | null
          kicked_at: string | null
          kicked_by_identity_id: string | null
          left_at: string | null
          metadata: Json
          missed_at: string | null
          status: Database["public"]["Enums"]["call_participant_status"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          agora_uid: number
          call_id: string
          created_at?: string
          declined_at?: string | null
          id?: string
          identity_id: string
          invited_at?: string
          joined_at?: string | null
          kicked_at?: string | null
          kicked_by_identity_id?: string | null
          left_at?: string | null
          metadata?: Json
          missed_at?: string | null
          status?: Database["public"]["Enums"]["call_participant_status"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          agora_uid?: number
          call_id?: string
          created_at?: string
          declined_at?: string | null
          id?: string
          identity_id?: string
          invited_at?: string
          joined_at?: string | null
          kicked_at?: string | null
          kicked_by_identity_id?: string | null
          left_at?: string | null
          metadata?: Json
          missed_at?: string | null
          status?: Database["public"]["Enums"]["call_participant_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_participants_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "call_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_participants_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "chat_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_participants_kicked_by_identity_id_fkey"
            columns: ["kicked_by_identity_id"]
            isOneToOne: false
            referencedRelation: "chat_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sessions: {
        Row: {
          agora_channel_name: string
          call_type: Database["public"]["Enums"]["call_type"]
          conversation_id: string
          created_at: string
          end_reason: string | null
          ended_at: string | null
          ended_by_identity_id: string | null
          id: string
          initiated_by_identity_id: string
          max_participants: number
          metadata: Json
          ringing_expires_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["call_status"]
          updated_at: string
        }
        Insert: {
          agora_channel_name: string
          call_type: Database["public"]["Enums"]["call_type"]
          conversation_id: string
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          ended_by_identity_id?: string | null
          id?: string
          initiated_by_identity_id: string
          max_participants: number
          metadata?: Json
          ringing_expires_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["call_status"]
          updated_at?: string
        }
        Update: {
          agora_channel_name?: string
          call_type?: Database["public"]["Enums"]["call_type"]
          conversation_id?: string
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          ended_by_identity_id?: string | null
          id?: string
          initiated_by_identity_id?: string
          max_participants?: number
          metadata?: Json
          ringing_expires_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["call_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sessions_ended_by_identity_id_fkey"
            columns: ["ended_by_identity_id"]
            isOneToOne: false
            referencedRelation: "chat_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sessions_initiated_by_identity_id_fkey"
            columns: ["initiated_by_identity_id"]
            isOneToOne: false
            referencedRelation: "chat_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          identity_id: string
          name: string
          owner_id: string
        }
        Insert: {
          color: string
          created_at?: string
          icon: string
          id?: string
          identity_id: string
          name: string
          owner_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          identity_id?: string
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_categories_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "chat_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_category_assignments: {
        Row: {
          category_id: string
          conversation_id: string
          created_at: string
          identity_id: string
          owner_id: string
        }
        Insert: {
          category_id: string
          conversation_id: string
          created_at?: string
          identity_id: string
          owner_id: string
        }
        Update: {
          category_id?: string
          conversation_id?: string
          created_at?: string
          identity_id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_category_assignments_category_fk"
            columns: ["category_id", "owner_id", "identity_id"]
            isOneToOne: false
            referencedRelation: "chat_categories"
            referencedColumns: ["id", "owner_id", "identity_id"]
          },
          {
            foreignKeyName: "chat_category_assignments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversation_participants: {
        Row: {
          cleared_at: string | null
          cleared_before_message_id: string | null
          conversation_id: string
          created_at: string
          id: string
          identity_id: string
          is_pinned: boolean
          joined_at: string
          last_delivered_at: string | null
          last_delivered_message_id: string | null
          last_read_at: string | null
          last_read_message_id: string | null
          left_at: string | null
          notifications_enabled: boolean
          removed_at: string | null
          removed_by_identity_id: string | null
          role: Database["public"]["Enums"]["chat_participant_role"]
          unread_count: number
          updated_at: string
        }
        Insert: {
          cleared_at?: string | null
          cleared_before_message_id?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          identity_id: string
          is_pinned?: boolean
          joined_at?: string
          last_delivered_at?: string | null
          last_delivered_message_id?: string | null
          last_read_at?: string | null
          last_read_message_id?: string | null
          left_at?: string | null
          notifications_enabled?: boolean
          removed_at?: string | null
          removed_by_identity_id?: string | null
          role?: Database["public"]["Enums"]["chat_participant_role"]
          unread_count?: number
          updated_at?: string
        }
        Update: {
          cleared_at?: string | null
          cleared_before_message_id?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          identity_id?: string
          is_pinned?: boolean
          joined_at?: string
          last_delivered_at?: string | null
          last_delivered_message_id?: string | null
          last_read_at?: string | null
          last_read_message_id?: string | null
          left_at?: string | null
          notifications_enabled?: boolean
          removed_at?: string | null
          removed_by_identity_id?: string | null
          role?: Database["public"]["Enums"]["chat_participant_role"]
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversation_participants_cleared_before_message_id_fkey"
            columns: ["cleared_before_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversation_participants_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "chat_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversation_participants_last_delivered_message_id_fkey"
            columns: ["last_delivered_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversation_participants_last_read_message_id_fkey"
            columns: ["last_read_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversation_participants_removed_by_identity_id_fkey"
            columns: ["removed_by_identity_id"]
            isOneToOne: false
            referencedRelation: "chat_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          conversation_type: Database["public"]["Enums"]["chat_conversation_type"]
          created_at: string
          created_by_identity_id: string
          description: string | null
          direct_key: string | null
          id: string
          image_file_id: string | null
          is_active: boolean
          last_message_at: string | null
          last_message_id: string | null
          name: string | null
          posting_identity_id: string | null
          posting_policy: Database["public"]["Enums"]["chat_group_posting_policy"]
          updated_at: string
        }
        Insert: {
          conversation_type: Database["public"]["Enums"]["chat_conversation_type"]
          created_at?: string
          created_by_identity_id: string
          description?: string | null
          direct_key?: string | null
          id?: string
          image_file_id?: string | null
          is_active?: boolean
          last_message_at?: string | null
          last_message_id?: string | null
          name?: string | null
          posting_identity_id?: string | null
          posting_policy?: Database["public"]["Enums"]["chat_group_posting_policy"]
          updated_at?: string
        }
        Update: {
          conversation_type?: Database["public"]["Enums"]["chat_conversation_type"]
          created_at?: string
          created_by_identity_id?: string
          description?: string | null
          direct_key?: string | null
          id?: string
          image_file_id?: string | null
          is_active?: boolean
          last_message_at?: string | null
          last_message_id?: string | null
          name?: string | null
          posting_identity_id?: string | null
          posting_policy?: Database["public"]["Enums"]["chat_group_posting_policy"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_created_by_identity_id_fkey"
            columns: ["created_by_identity_id"]
            isOneToOne: false
            referencedRelation: "chat_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_image_file_id_fkey"
            columns: ["image_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_last_message_id_fkey"
            columns: ["last_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_posting_identity_id_fkey"
            columns: ["posting_identity_id"]
            isOneToOne: false
            referencedRelation: "chat_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_group_invites: {
        Row: {
          conversation_id: string
          created_at: string
          expires_at: string | null
          id: string
          invited_by_identity_id: string
          invited_identity_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["chat_invite_status"]
          updated_at: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          invited_by_identity_id: string
          invited_identity_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["chat_invite_status"]
          updated_at?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          invited_by_identity_id?: string
          invited_identity_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["chat_invite_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_group_invites_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_group_invites_invited_by_identity_id_fkey"
            columns: ["invited_by_identity_id"]
            isOneToOne: false
            referencedRelation: "chat_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_group_invites_invited_identity_id_fkey"
            columns: ["invited_identity_id"]
            isOneToOne: false
            referencedRelation: "chat_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_identities: {
        Row: {
          commercial_profile_id: string | null
          created_at: string
          id: string
          identity_type: Database["public"]["Enums"]["chat_identity_type"]
          is_active: boolean
          owner_id: string
          profile_id: string | null
          updated_at: string
        }
        Insert: {
          commercial_profile_id?: string | null
          created_at?: string
          id?: string
          identity_type: Database["public"]["Enums"]["chat_identity_type"]
          is_active?: boolean
          owner_id: string
          profile_id?: string | null
          updated_at?: string
        }
        Update: {
          commercial_profile_id?: string | null
          created_at?: string
          id?: string
          identity_type?: Database["public"]["Enums"]["chat_identity_type"]
          is_active?: boolean
          owner_id?: string
          profile_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_identities_commercial_profile_id_fkey"
            columns: ["commercial_profile_id"]
            isOneToOne: false
            referencedRelation: "commercial_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_identities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_identities_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_identity_presence: {
        Row: {
          created_at: string
          disconnected_at: string | null
          expires_at: string
          identity_id: string
          last_seen_at: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          disconnected_at?: string | null
          expires_at: string
          identity_id: string
          last_seen_at?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          disconnected_at?: string | null
          expires_at?: string
          identity_id?: string
          last_seen_at?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_identity_presence_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: true
            referencedRelation: "chat_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_identity_presence_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_notifications: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          message_id: string
          notification_id: string | null
          push_error: string | null
          push_sent_at: string | null
          recipient_identity_id: string
          recipient_user_id: string
          status: Database["public"]["Enums"]["chat_notification_status"]
          updated_at: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          message_id: string
          notification_id?: string | null
          push_error?: string | null
          push_sent_at?: string | null
          recipient_identity_id: string
          recipient_user_id: string
          status?: Database["public"]["Enums"]["chat_notification_status"]
          updated_at?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          message_id?: string
          notification_id?: string | null
          push_error?: string | null
          push_sent_at?: string | null
          recipient_identity_id?: string
          recipient_user_id?: string
          status?: Database["public"]["Enums"]["chat_notification_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_notifications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_notifications_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_notifications_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_notifications_recipient_identity_id_fkey"
            columns: ["recipient_identity_id"]
            isOneToOne: false
            referencedRelation: "chat_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_notifications_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          identity_id: string
          message_id: string
          owner_user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          identity_id: string
          message_id: string
          owner_user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          identity_id?: string
          message_id?: string
          owner_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_reactions_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "chat_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_reactions_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachment_file_id: string | null
          body: string | null
          conversation_id: string
          created_at: string
          id: string
          message_type: Database["public"]["Enums"]["chat_message_type"]
          metadata: Json
          reference_id: string | null
          reference_type: string | null
          sender_identity_id: string | null
          sender_user_id: string | null
          sequence_number: number
        }
        Insert: {
          attachment_file_id?: string | null
          body?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          message_type: Database["public"]["Enums"]["chat_message_type"]
          metadata?: Json
          reference_id?: string | null
          reference_type?: string | null
          sender_identity_id?: string | null
          sender_user_id?: string | null
          sequence_number: number
        }
        Update: {
          attachment_file_id?: string | null
          body?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          message_type?: Database["public"]["Enums"]["chat_message_type"]
          metadata?: Json
          reference_id?: string | null
          reference_type?: string | null
          sender_identity_id?: string | null
          sender_user_id?: string | null
          sequence_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_attachment_file_id_fkey"
            columns: ["attachment_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_identity_id_fkey"
            columns: ["sender_identity_id"]
            isOneToOne: false
            referencedRelation: "chat_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_pin_protections: {
        Row: {
          conversation_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_pin_protections_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sync_events: {
        Row: {
          conversation_id: string | null
          created_at: string
          delivered_at: string | null
          event_sequence: number
          event_type: Database["public"]["Enums"]["chat_sync_event_type"]
          expires_at: string
          id: string
          invite_id: string | null
          message_id: string | null
          payload: Json
          reaction_id: string | null
          recipient_user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          event_sequence?: number
          event_type: Database["public"]["Enums"]["chat_sync_event_type"]
          expires_at?: string
          id?: string
          invite_id?: string | null
          message_id?: string | null
          payload?: Json
          reaction_id?: string | null
          recipient_user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          event_sequence?: number
          event_type?: Database["public"]["Enums"]["chat_sync_event_type"]
          expires_at?: string
          id?: string
          invite_id?: string | null
          message_id?: string | null
          payload?: Json
          reaction_id?: string | null
          recipient_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sync_events_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_chat_conversations: {
        Row: {
          client_profile_id: string
          commercial_profile_id: string
          conversation_id: string
          created_at: string
          created_by_profile_id: string
          updated_at: string
        }
        Insert: {
          client_profile_id: string
          commercial_profile_id: string
          conversation_id: string
          created_at?: string
          created_by_profile_id: string
          updated_at?: string
        }
        Update: {
          client_profile_id?: string
          commercial_profile_id?: string
          conversation_id?: string
          created_at?: string
          created_by_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_chat_conversations_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_chat_conversations_commercial_profile_id_fkey"
            columns: ["commercial_profile_id"]
            isOneToOne: false
            referencedRelation: "commercial_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_chat_conversations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_chat_conversations_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_dispute_events: {
        Row: {
          actor_profile_id: string | null
          commerce_dispute_id: string
          created_at: string
          event_type: Database["public"]["Enums"]["commerce_dispute_event_type"]
          id: string
          metadata: Json
          new_status:
            | Database["public"]["Enums"]["commerce_dispute_status"]
            | null
          previous_status:
            | Database["public"]["Enums"]["commerce_dispute_status"]
            | null
          reason_code: string | null
          reason_text: string | null
        }
        Insert: {
          actor_profile_id?: string | null
          commerce_dispute_id: string
          created_at?: string
          event_type: Database["public"]["Enums"]["commerce_dispute_event_type"]
          id?: string
          metadata?: Json
          new_status?:
            | Database["public"]["Enums"]["commerce_dispute_status"]
            | null
          previous_status?:
            | Database["public"]["Enums"]["commerce_dispute_status"]
            | null
          reason_code?: string | null
          reason_text?: string | null
        }
        Update: {
          actor_profile_id?: string | null
          commerce_dispute_id?: string
          created_at?: string
          event_type?: Database["public"]["Enums"]["commerce_dispute_event_type"]
          id?: string
          metadata?: Json
          new_status?:
            | Database["public"]["Enums"]["commerce_dispute_status"]
            | null
          previous_status?:
            | Database["public"]["Enums"]["commerce_dispute_status"]
            | null
          reason_code?: string | null
          reason_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commerce_dispute_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_dispute_events_commerce_dispute_id_fkey"
            columns: ["commerce_dispute_id"]
            isOneToOne: false
            referencedRelation: "commerce_disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_dispute_evidence: {
        Row: {
          commerce_dispute_id: string
          created_at: string
          file_id: string
          id: string
          note: string | null
          submitted_by_profile_id: string
        }
        Insert: {
          commerce_dispute_id: string
          created_at?: string
          file_id: string
          id?: string
          note?: string | null
          submitted_by_profile_id: string
        }
        Update: {
          commerce_dispute_id?: string
          created_at?: string
          file_id?: string
          id?: string
          note?: string | null
          submitted_by_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_dispute_evidence_commerce_dispute_id_fkey"
            columns: ["commerce_dispute_id"]
            isOneToOne: false
            referencedRelation: "commerce_disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_dispute_evidence_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_dispute_evidence_submitted_by_profile_id_fkey"
            columns: ["submitted_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_disputes: {
        Row: {
          closed_at: string | null
          closed_by_profile_id: string | null
          commerce_request_id: string
          commerce_reservation_id: string | null
          commercial_profile_id: string
          created_at: string
          id: string
          opened_by_profile_id: string
          reason_code: string
          reason_text: string | null
          resolution_text: string | null
          resolved_at: string | null
          resolved_by_profile_id: string | null
          status: Database["public"]["Enums"]["commerce_dispute_status"]
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by_profile_id?: string | null
          commerce_request_id: string
          commerce_reservation_id?: string | null
          commercial_profile_id: string
          created_at?: string
          id?: string
          opened_by_profile_id: string
          reason_code: string
          reason_text?: string | null
          resolution_text?: string | null
          resolved_at?: string | null
          resolved_by_profile_id?: string | null
          status?: Database["public"]["Enums"]["commerce_dispute_status"]
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by_profile_id?: string | null
          commerce_request_id?: string
          commerce_reservation_id?: string | null
          commercial_profile_id?: string
          created_at?: string
          id?: string
          opened_by_profile_id?: string
          reason_code?: string
          reason_text?: string | null
          resolution_text?: string | null
          resolved_at?: string | null
          resolved_by_profile_id?: string | null
          status?: Database["public"]["Enums"]["commerce_dispute_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_disputes_closed_by_profile_id_fkey"
            columns: ["closed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_disputes_commerce_request_id_fkey"
            columns: ["commerce_request_id"]
            isOneToOne: false
            referencedRelation: "commerce_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_disputes_commerce_reservation_id_fkey"
            columns: ["commerce_reservation_id"]
            isOneToOne: false
            referencedRelation: "commerce_reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_disputes_commercial_profile_id_fkey"
            columns: ["commercial_profile_id"]
            isOneToOne: false
            referencedRelation: "commercial_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_disputes_opened_by_profile_id_fkey"
            columns: ["opened_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_disputes_resolved_by_profile_id_fkey"
            columns: ["resolved_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_idempotency_keys: {
        Row: {
          actor_profile_id: string
          completed_at: string | null
          created_at: string
          expires_at: string
          id: string
          idempotency_key: string
          locked_at: string
          operation: string
          request_fingerprint: string
          response_body: Json | null
          response_status: number | null
          updated_at: string
        }
        Insert: {
          actor_profile_id: string
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key: string
          locked_at?: string
          operation: string
          request_fingerprint: string
          response_body?: Json | null
          response_status?: number | null
          updated_at?: string
        }
        Update: {
          actor_profile_id?: string
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key?: string
          locked_at?: string
          operation?: string
          request_fingerprint?: string
          response_body?: Json | null
          response_status?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_idempotency_keys_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_inventory_holds: {
        Row: {
          commerce_request_id: string
          commerce_request_item_id: string
          commercial_offer_id: string
          commercial_profile_id: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          held_at: string
          id: string
          metadata: Json
          quantity: number
          release_reason: string | null
          released_at: string | null
          status: Database["public"]["Enums"]["commerce_inventory_hold_status"]
        }
        Insert: {
          commerce_request_id: string
          commerce_request_item_id: string
          commercial_offer_id: string
          commercial_profile_id: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          held_at?: string
          id?: string
          metadata?: Json
          quantity: number
          release_reason?: string | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["commerce_inventory_hold_status"]
        }
        Update: {
          commerce_request_id?: string
          commerce_request_item_id?: string
          commercial_offer_id?: string
          commercial_profile_id?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          held_at?: string
          id?: string
          metadata?: Json
          quantity?: number
          release_reason?: string | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["commerce_inventory_hold_status"]
        }
        Relationships: [
          {
            foreignKeyName: "commerce_inventory_holds_commerce_request_id_fkey"
            columns: ["commerce_request_id"]
            isOneToOne: false
            referencedRelation: "commerce_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_inventory_holds_commerce_request_item_id_fkey"
            columns: ["commerce_request_item_id"]
            isOneToOne: false
            referencedRelation: "commerce_request_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_inventory_holds_commercial_offer_id_fkey"
            columns: ["commercial_offer_id"]
            isOneToOne: false
            referencedRelation: "commercial_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_inventory_holds_commercial_profile_id_fkey"
            columns: ["commercial_profile_id"]
            isOneToOne: false
            referencedRelation: "commercial_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_notification_deliveries: {
        Row: {
          commerce_dispute_id: string | null
          commerce_payment_proof_id: string | null
          commerce_request_id: string | null
          commerce_reservation_id: string | null
          commercial_profile_id: string | null
          conversation_id: string | null
          created_at: string
          dedupe_key: string
          error_code: string | null
          error_message: string | null
          event_type: string
          id: string
          notification_id: string | null
          payload: Json
          push_sent_at: string | null
          recipient_profile_id: string
          status: string
          updated_at: string
        }
        Insert: {
          commerce_dispute_id?: string | null
          commerce_payment_proof_id?: string | null
          commerce_request_id?: string | null
          commerce_reservation_id?: string | null
          commercial_profile_id?: string | null
          conversation_id?: string | null
          created_at?: string
          dedupe_key: string
          error_code?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          notification_id?: string | null
          payload?: Json
          push_sent_at?: string | null
          recipient_profile_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          commerce_dispute_id?: string | null
          commerce_payment_proof_id?: string | null
          commerce_request_id?: string | null
          commerce_reservation_id?: string | null
          commercial_profile_id?: string | null
          conversation_id?: string | null
          created_at?: string
          dedupe_key?: string
          error_code?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          notification_id?: string | null
          payload?: Json
          push_sent_at?: string | null
          recipient_profile_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_notification_deliveries_commerce_dispute_id_fkey"
            columns: ["commerce_dispute_id"]
            isOneToOne: false
            referencedRelation: "commerce_disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_notification_deliveries_commerce_payment_proof_id_fkey"
            columns: ["commerce_payment_proof_id"]
            isOneToOne: false
            referencedRelation: "commerce_payment_proofs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_notification_deliveries_commerce_request_id_fkey"
            columns: ["commerce_request_id"]
            isOneToOne: false
            referencedRelation: "commerce_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_notification_deliveries_commerce_reservation_id_fkey"
            columns: ["commerce_reservation_id"]
            isOneToOne: false
            referencedRelation: "commerce_reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_notification_deliveries_commercial_profile_id_fkey"
            columns: ["commercial_profile_id"]
            isOneToOne: false
            referencedRelation: "commercial_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_notification_deliveries_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_notification_deliveries_recipient_profile_id_fkey"
            columns: ["recipient_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_payment_proof_events: {
        Row: {
          actor_profile_id: string | null
          commerce_payment_proof_id: string
          created_at: string
          event_type: Database["public"]["Enums"]["commerce_payment_proof_event_type"]
          id: string
          metadata: Json
          new_status:
            | Database["public"]["Enums"]["commerce_payment_proof_status"]
            | null
          previous_status:
            | Database["public"]["Enums"]["commerce_payment_proof_status"]
            | null
          reason_code: string | null
          reason_text: string | null
        }
        Insert: {
          actor_profile_id?: string | null
          commerce_payment_proof_id: string
          created_at?: string
          event_type: Database["public"]["Enums"]["commerce_payment_proof_event_type"]
          id?: string
          metadata?: Json
          new_status?:
            | Database["public"]["Enums"]["commerce_payment_proof_status"]
            | null
          previous_status?:
            | Database["public"]["Enums"]["commerce_payment_proof_status"]
            | null
          reason_code?: string | null
          reason_text?: string | null
        }
        Update: {
          actor_profile_id?: string | null
          commerce_payment_proof_id?: string
          created_at?: string
          event_type?: Database["public"]["Enums"]["commerce_payment_proof_event_type"]
          id?: string
          metadata?: Json
          new_status?:
            | Database["public"]["Enums"]["commerce_payment_proof_status"]
            | null
          previous_status?:
            | Database["public"]["Enums"]["commerce_payment_proof_status"]
            | null
          reason_code?: string | null
          reason_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commerce_payment_proof_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_payment_proof_events_commerce_payment_proof_id_fkey"
            columns: ["commerce_payment_proof_id"]
            isOneToOne: false
            referencedRelation: "commerce_payment_proofs"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_payment_proofs: {
        Row: {
          commerce_request_id: string
          commercial_profile_id: string
          confirmed_at: string | null
          confirmed_by_profile_id: string | null
          created_at: string
          file_id: string
          id: string
          note: string | null
          payment_method_id: string | null
          payment_method_snapshot: Json
          payment_reference: string | null
          rejected_at: string | null
          rejected_by_profile_id: string | null
          rejection_reason: string | null
          replaced_by_proof_id: string | null
          status: Database["public"]["Enums"]["commerce_payment_proof_status"]
          submitted_by_profile_id: string
          updated_at: string
        }
        Insert: {
          commerce_request_id: string
          commercial_profile_id: string
          confirmed_at?: string | null
          confirmed_by_profile_id?: string | null
          created_at?: string
          file_id: string
          id?: string
          note?: string | null
          payment_method_id?: string | null
          payment_method_snapshot?: Json
          payment_reference?: string | null
          rejected_at?: string | null
          rejected_by_profile_id?: string | null
          rejection_reason?: string | null
          replaced_by_proof_id?: string | null
          status?: Database["public"]["Enums"]["commerce_payment_proof_status"]
          submitted_by_profile_id: string
          updated_at?: string
        }
        Update: {
          commerce_request_id?: string
          commercial_profile_id?: string
          confirmed_at?: string | null
          confirmed_by_profile_id?: string | null
          created_at?: string
          file_id?: string
          id?: string
          note?: string | null
          payment_method_id?: string | null
          payment_method_snapshot?: Json
          payment_reference?: string | null
          rejected_at?: string | null
          rejected_by_profile_id?: string | null
          rejection_reason?: string | null
          replaced_by_proof_id?: string | null
          status?: Database["public"]["Enums"]["commerce_payment_proof_status"]
          submitted_by_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_payment_proofs_commerce_request_id_fkey"
            columns: ["commerce_request_id"]
            isOneToOne: false
            referencedRelation: "commerce_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_payment_proofs_commercial_profile_id_fkey"
            columns: ["commercial_profile_id"]
            isOneToOne: false
            referencedRelation: "commercial_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_payment_proofs_confirmed_by_profile_id_fkey"
            columns: ["confirmed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_payment_proofs_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_payment_proofs_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "commercial_payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_payment_proofs_rejected_by_profile_id_fkey"
            columns: ["rejected_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_payment_proofs_replaced_by_proof_id_fkey"
            columns: ["replaced_by_proof_id"]
            isOneToOne: false
            referencedRelation: "commerce_payment_proofs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_payment_proofs_submitted_by_profile_id_fkey"
            columns: ["submitted_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_request_events: {
        Row: {
          actor_profile_id: string | null
          commerce_request_id: string
          created_at: string
          event_type: Database["public"]["Enums"]["commerce_request_event_type"]
          id: string
          metadata: Json
          new_status:
            | Database["public"]["Enums"]["commerce_request_status"]
            | null
          previous_status:
            | Database["public"]["Enums"]["commerce_request_status"]
            | null
          reason_code: string | null
          reason_text: string | null
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          actor_profile_id?: string | null
          commerce_request_id: string
          created_at?: string
          event_type: Database["public"]["Enums"]["commerce_request_event_type"]
          id?: string
          metadata?: Json
          new_status?:
            | Database["public"]["Enums"]["commerce_request_status"]
            | null
          previous_status?:
            | Database["public"]["Enums"]["commerce_request_status"]
            | null
          reason_code?: string | null
          reason_text?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          actor_profile_id?: string | null
          commerce_request_id?: string
          created_at?: string
          event_type?: Database["public"]["Enums"]["commerce_request_event_type"]
          id?: string
          metadata?: Json
          new_status?:
            | Database["public"]["Enums"]["commerce_request_status"]
            | null
          previous_status?:
            | Database["public"]["Enums"]["commerce_request_status"]
            | null
          reason_code?: string | null
          reason_text?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commerce_request_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_request_events_commerce_request_id_fkey"
            columns: ["commerce_request_id"]
            isOneToOne: false
            referencedRelation: "commerce_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_request_items: {
        Row: {
          close_reason: string | null
          closed_at: string | null
          closed_by_profile_id: string | null
          commerce_request_id: string
          commercial_offer_id: string
          commercial_profile_id: string
          created_at: string
          currency_code: string
          customer_note: string | null
          duration_minutes_snapshot: number | null
          final_ends_at: string | null
          final_line_total_amount: number | null
          final_modality:
            | Database["public"]["Enums"]["commercial_profile_modality"]
            | null
          final_quantity: number | null
          final_starts_at: string | null
          final_terms: Json
          final_timezone: string | null
          final_unit_price_amount: number | null
          id: string
          lifecycle_status: string
          lifecycle_updated_at: string
          line_total_amount: number | null
          modality_snapshot:
            | Database["public"]["Enums"]["commercial_profile_modality"]
            | null
          offer_description_snapshot: string | null
          offer_kind: Database["public"]["Enums"]["commercial_offer_kind"]
          offer_snapshot: Json
          offer_title_snapshot: string
          original_terms: Json
          payment_policy_snapshot:
            | Database["public"]["Enums"]["commercial_service_payment_policy"]
            | null
          pricing_strategy_snapshot: Database["public"]["Enums"]["commercial_pricing_strategy"]
          quantity: number
          requires_booking_snapshot: boolean
          sort_order: number
          unit_price_amount: number | null
        }
        Insert: {
          close_reason?: string | null
          closed_at?: string | null
          closed_by_profile_id?: string | null
          commerce_request_id: string
          commercial_offer_id: string
          commercial_profile_id: string
          created_at?: string
          currency_code?: string
          customer_note?: string | null
          duration_minutes_snapshot?: number | null
          final_ends_at?: string | null
          final_line_total_amount?: number | null
          final_modality?:
            | Database["public"]["Enums"]["commercial_profile_modality"]
            | null
          final_quantity?: number | null
          final_starts_at?: string | null
          final_terms?: Json
          final_timezone?: string | null
          final_unit_price_amount?: number | null
          id?: string
          lifecycle_status?: string
          lifecycle_updated_at?: string
          line_total_amount?: number | null
          modality_snapshot?:
            | Database["public"]["Enums"]["commercial_profile_modality"]
            | null
          offer_description_snapshot?: string | null
          offer_kind: Database["public"]["Enums"]["commercial_offer_kind"]
          offer_snapshot?: Json
          offer_title_snapshot: string
          original_terms?: Json
          payment_policy_snapshot?:
            | Database["public"]["Enums"]["commercial_service_payment_policy"]
            | null
          pricing_strategy_snapshot: Database["public"]["Enums"]["commercial_pricing_strategy"]
          quantity?: number
          requires_booking_snapshot?: boolean
          sort_order?: number
          unit_price_amount?: number | null
        }
        Update: {
          close_reason?: string | null
          closed_at?: string | null
          closed_by_profile_id?: string | null
          commerce_request_id?: string
          commercial_offer_id?: string
          commercial_profile_id?: string
          created_at?: string
          currency_code?: string
          customer_note?: string | null
          duration_minutes_snapshot?: number | null
          final_ends_at?: string | null
          final_line_total_amount?: number | null
          final_modality?:
            | Database["public"]["Enums"]["commercial_profile_modality"]
            | null
          final_quantity?: number | null
          final_starts_at?: string | null
          final_terms?: Json
          final_timezone?: string | null
          final_unit_price_amount?: number | null
          id?: string
          lifecycle_status?: string
          lifecycle_updated_at?: string
          line_total_amount?: number | null
          modality_snapshot?:
            | Database["public"]["Enums"]["commercial_profile_modality"]
            | null
          offer_description_snapshot?: string | null
          offer_kind?: Database["public"]["Enums"]["commercial_offer_kind"]
          offer_snapshot?: Json
          offer_title_snapshot?: string
          original_terms?: Json
          payment_policy_snapshot?:
            | Database["public"]["Enums"]["commercial_service_payment_policy"]
            | null
          pricing_strategy_snapshot?: Database["public"]["Enums"]["commercial_pricing_strategy"]
          quantity?: number
          requires_booking_snapshot?: boolean
          sort_order?: number
          unit_price_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "commerce_request_items_closed_by_profile_id_fkey"
            columns: ["closed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_request_items_commerce_request_id_fkey"
            columns: ["commerce_request_id"]
            isOneToOne: false
            referencedRelation: "commerce_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_request_items_commercial_offer_id_fkey"
            columns: ["commercial_offer_id"]
            isOneToOne: false
            referencedRelation: "commercial_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_request_items_commercial_profile_id_fkey"
            columns: ["commercial_profile_id"]
            isOneToOne: false
            referencedRelation: "commercial_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_request_proposals: {
        Row: {
          commerce_request_id: string
          commerce_request_item_id: string | null
          commercial_profile_id: string
          created_at: string
          currency_code: string
          delivery_fee_amount: number | null
          id: string
          note: string | null
          proposed_by_profile_id: string
          proposed_ends_at: string | null
          proposed_line_total_amount: number | null
          proposed_quantity: number | null
          proposed_starts_at: string | null
          proposed_unit_price_amount: number | null
          requested_modality:
            | Database["public"]["Enums"]["commercial_profile_modality"]
            | null
          responded_at: string | null
          responded_by_profile_id: string | null
          status: Database["public"]["Enums"]["commerce_request_proposal_status"]
          subtotal_amount: number | null
          terms_snapshot: Json
          timezone: string | null
          total_amount: number | null
          version_number: number
        }
        Insert: {
          commerce_request_id: string
          commerce_request_item_id?: string | null
          commercial_profile_id: string
          created_at?: string
          currency_code?: string
          delivery_fee_amount?: number | null
          id?: string
          note?: string | null
          proposed_by_profile_id: string
          proposed_ends_at?: string | null
          proposed_line_total_amount?: number | null
          proposed_quantity?: number | null
          proposed_starts_at?: string | null
          proposed_unit_price_amount?: number | null
          requested_modality?:
            | Database["public"]["Enums"]["commercial_profile_modality"]
            | null
          responded_at?: string | null
          responded_by_profile_id?: string | null
          status?: Database["public"]["Enums"]["commerce_request_proposal_status"]
          subtotal_amount?: number | null
          terms_snapshot?: Json
          timezone?: string | null
          total_amount?: number | null
          version_number: number
        }
        Update: {
          commerce_request_id?: string
          commerce_request_item_id?: string | null
          commercial_profile_id?: string
          created_at?: string
          currency_code?: string
          delivery_fee_amount?: number | null
          id?: string
          note?: string | null
          proposed_by_profile_id?: string
          proposed_ends_at?: string | null
          proposed_line_total_amount?: number | null
          proposed_quantity?: number | null
          proposed_starts_at?: string | null
          proposed_unit_price_amount?: number | null
          requested_modality?:
            | Database["public"]["Enums"]["commercial_profile_modality"]
            | null
          responded_at?: string | null
          responded_by_profile_id?: string | null
          status?: Database["public"]["Enums"]["commerce_request_proposal_status"]
          subtotal_amount?: number | null
          terms_snapshot?: Json
          timezone?: string | null
          total_amount?: number | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "commerce_request_proposals_commerce_request_id_fkey"
            columns: ["commerce_request_id"]
            isOneToOne: false
            referencedRelation: "commerce_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_request_proposals_commerce_request_item_id_fkey"
            columns: ["commerce_request_item_id"]
            isOneToOne: false
            referencedRelation: "commerce_request_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_request_proposals_commercial_profile_id_fkey"
            columns: ["commercial_profile_id"]
            isOneToOne: false
            referencedRelation: "commercial_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_request_proposals_proposed_by_profile_id_fkey"
            columns: ["proposed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_request_proposals_responded_by_profile_id_fkey"
            columns: ["responded_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_requests: {
        Row: {
          business_snapshot: Json
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by_profile_id: string | null
          client_id: string
          code: string
          commercial_profile_id: string
          completed_at: string | null
          created_at: string
          currency_code: string
          customer_note: string | null
          delivery_address: string | null
          delivery_fee_amount: number | null
          delivery_reference: string | null
          expires_at: string | null
          final_terms: Json
          final_terms_accepted_at: string | null
          final_terms_accepted_by_profile_id: string | null
          id: string
          rejected_at: string | null
          rejected_by_profile_id: string | null
          rejection_reason: string | null
          request_type: Database["public"]["Enums"]["commerce_request_type"]
          requested_modality:
            | Database["public"]["Enums"]["commercial_profile_modality"]
            | null
          status: Database["public"]["Enums"]["commerce_request_status"]
          subtotal_amount: number | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          business_snapshot?: Json
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_profile_id?: string | null
          client_id: string
          code?: string
          commercial_profile_id: string
          completed_at?: string | null
          created_at?: string
          currency_code?: string
          customer_note?: string | null
          delivery_address?: string | null
          delivery_fee_amount?: number | null
          delivery_reference?: string | null
          expires_at?: string | null
          final_terms?: Json
          final_terms_accepted_at?: string | null
          final_terms_accepted_by_profile_id?: string | null
          id?: string
          rejected_at?: string | null
          rejected_by_profile_id?: string | null
          rejection_reason?: string | null
          request_type: Database["public"]["Enums"]["commerce_request_type"]
          requested_modality?:
            | Database["public"]["Enums"]["commercial_profile_modality"]
            | null
          status?: Database["public"]["Enums"]["commerce_request_status"]
          subtotal_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          business_snapshot?: Json
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_profile_id?: string | null
          client_id?: string
          code?: string
          commercial_profile_id?: string
          completed_at?: string | null
          created_at?: string
          currency_code?: string
          customer_note?: string | null
          delivery_address?: string | null
          delivery_fee_amount?: number | null
          delivery_reference?: string | null
          expires_at?: string | null
          final_terms?: Json
          final_terms_accepted_at?: string | null
          final_terms_accepted_by_profile_id?: string | null
          id?: string
          rejected_at?: string | null
          rejected_by_profile_id?: string | null
          rejection_reason?: string | null
          request_type?: Database["public"]["Enums"]["commerce_request_type"]
          requested_modality?:
            | Database["public"]["Enums"]["commercial_profile_modality"]
            | null
          status?: Database["public"]["Enums"]["commerce_request_status"]
          subtotal_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_requests_cancelled_by_profile_id_fkey"
            columns: ["cancelled_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_requests_commercial_profile_id_fkey"
            columns: ["commercial_profile_id"]
            isOneToOne: false
            referencedRelation: "commercial_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_requests_final_terms_accepted_by_profile_id_fkey"
            columns: ["final_terms_accepted_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_requests_rejected_by_profile_id_fkey"
            columns: ["rejected_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_reservation_events: {
        Row: {
          actor_profile_id: string | null
          commerce_reservation_id: string
          created_at: string
          event_type: Database["public"]["Enums"]["commerce_reservation_event_type"]
          id: string
          metadata: Json
          new_status:
            | Database["public"]["Enums"]["commerce_reservation_status"]
            | null
          previous_status:
            | Database["public"]["Enums"]["commerce_reservation_status"]
            | null
          reason_code: string | null
          reason_text: string | null
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          actor_profile_id?: string | null
          commerce_reservation_id: string
          created_at?: string
          event_type: Database["public"]["Enums"]["commerce_reservation_event_type"]
          id?: string
          metadata?: Json
          new_status?:
            | Database["public"]["Enums"]["commerce_reservation_status"]
            | null
          previous_status?:
            | Database["public"]["Enums"]["commerce_reservation_status"]
            | null
          reason_code?: string | null
          reason_text?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          actor_profile_id?: string | null
          commerce_reservation_id?: string
          created_at?: string
          event_type?: Database["public"]["Enums"]["commerce_reservation_event_type"]
          id?: string
          metadata?: Json
          new_status?:
            | Database["public"]["Enums"]["commerce_reservation_status"]
            | null
          previous_status?:
            | Database["public"]["Enums"]["commerce_reservation_status"]
            | null
          reason_code?: string | null
          reason_text?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commerce_reservation_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_reservation_events_commerce_reservation_id_fkey"
            columns: ["commerce_reservation_id"]
            isOneToOne: false
            referencedRelation: "commerce_reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_reservations: {
        Row: {
          booking_range: unknown
          calendar_event_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by_profile_id: string | null
          commerce_request_id: string
          commerce_request_item_id: string | null
          commercial_offer_id: string
          commercial_profile_id: string
          completed_at: string | null
          created_at: string
          ends_at: string
          hold_expires_at: string | null
          hold_started_at: string | null
          id: string
          no_show_at: string | null
          no_show_marked_by_profile_id: string | null
          no_show_reason: string | null
          rejected_at: string | null
          rejected_by_profile_id: string | null
          rejection_reason: string | null
          source_proposal_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["commerce_reservation_status"]
          timezone: string
          updated_at: string
        }
        Insert: {
          booking_range?: unknown
          calendar_event_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_profile_id?: string | null
          commerce_request_id: string
          commerce_request_item_id?: string | null
          commercial_offer_id: string
          commercial_profile_id: string
          completed_at?: string | null
          created_at?: string
          ends_at: string
          hold_expires_at?: string | null
          hold_started_at?: string | null
          id?: string
          no_show_at?: string | null
          no_show_marked_by_profile_id?: string | null
          no_show_reason?: string | null
          rejected_at?: string | null
          rejected_by_profile_id?: string | null
          rejection_reason?: string | null
          source_proposal_id?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["commerce_reservation_status"]
          timezone: string
          updated_at?: string
        }
        Update: {
          booking_range?: unknown
          calendar_event_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_profile_id?: string | null
          commerce_request_id?: string
          commerce_request_item_id?: string | null
          commercial_offer_id?: string
          commercial_profile_id?: string
          completed_at?: string | null
          created_at?: string
          ends_at?: string
          hold_expires_at?: string | null
          hold_started_at?: string | null
          id?: string
          no_show_at?: string | null
          no_show_marked_by_profile_id?: string | null
          no_show_reason?: string | null
          rejected_at?: string | null
          rejected_by_profile_id?: string | null
          rejection_reason?: string | null
          source_proposal_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["commerce_reservation_status"]
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_reservations_calendar_event_id_fkey"
            columns: ["calendar_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_reservations_cancelled_by_profile_id_fkey"
            columns: ["cancelled_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_reservations_commerce_request_id_fkey"
            columns: ["commerce_request_id"]
            isOneToOne: false
            referencedRelation: "commerce_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_reservations_commerce_request_item_id_fkey"
            columns: ["commerce_request_item_id"]
            isOneToOne: false
            referencedRelation: "commerce_request_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_reservations_commercial_offer_id_fkey"
            columns: ["commercial_offer_id"]
            isOneToOne: false
            referencedRelation: "commercial_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_reservations_commercial_profile_id_fkey"
            columns: ["commercial_profile_id"]
            isOneToOne: false
            referencedRelation: "commercial_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_reservations_no_show_marked_by_profile_id_fkey"
            columns: ["no_show_marked_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_reservations_rejected_by_profile_id_fkey"
            columns: ["rejected_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_reservations_source_proposal_id_fkey"
            columns: ["source_proposal_id"]
            isOneToOne: false
            referencedRelation: "commerce_request_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_audit_events: {
        Row: {
          action: string
          actor_profile_id: string | null
          actor_role_snapshot:
            | Database["public"]["Enums"]["profile_role"]
            | null
          commercial_profile_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json
          new_state: string | null
          previous_state: string | null
          reason_code: string | null
          reason_text: string | null
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          actor_role_snapshot?:
            | Database["public"]["Enums"]["profile_role"]
            | null
          commercial_profile_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json
          new_state?: string | null
          previous_state?: string | null
          reason_code?: string | null
          reason_text?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          actor_role_snapshot?:
            | Database["public"]["Enums"]["profile_role"]
            | null
          commercial_profile_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json
          new_state?: string | null
          previous_state?: string | null
          reason_code?: string | null
          reason_text?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commercial_audit_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_audit_events_commercial_profile_id_fkey"
            columns: ["commercial_profile_id"]
            isOneToOne: false
            referencedRelation: "commercial_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_bank_accounts: {
        Row: {
          account_holder_document_number: string
          account_holder_document_type: string
          account_holder_name: string
          account_number: string
          account_type: string
          bank_name: string
          created_at: string
          payment_method_id: string
          updated_at: string
        }
        Insert: {
          account_holder_document_number: string
          account_holder_document_type: string
          account_holder_name: string
          account_number: string
          account_type: string
          bank_name: string
          created_at?: string
          payment_method_id: string
          updated_at?: string
        }
        Update: {
          account_holder_document_number?: string
          account_holder_document_type?: string
          account_holder_name?: string
          account_number?: string
          account_type?: string
          bank_name?: string
          created_at?: string
          payment_method_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_bank_accounts_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: true
            referencedRelation: "commercial_payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_catalogs: {
        Row: {
          archived_at: string | null
          commercial_profile_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          status: Database["public"]["Enums"]["commercial_catalog_status"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          commercial_profile_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          status?: Database["public"]["Enums"]["commercial_catalog_status"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          commercial_profile_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["commercial_catalog_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_catalogs_commercial_profile_id_fkey"
            columns: ["commercial_profile_id"]
            isOneToOne: false
            referencedRelation: "commercial_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          normalized_name: string
          offer_type: Database["public"]["Enums"]["commercial_offer_type"]
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          normalized_name: string
          offer_type: Database["public"]["Enums"]["commercial_offer_type"]
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          normalized_name?: string
          offer_type?: Database["public"]["Enums"]["commercial_offer_type"]
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "commercial_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_mobile_payment_accounts: {
        Row: {
          account_holder_name: string | null
          created_at: string
          payment_key: string
          payment_method_id: string
          updated_at: string
          wallet_type: Database["public"]["Enums"]["commercial_payment_method_type"]
        }
        Insert: {
          account_holder_name?: string | null
          created_at?: string
          payment_key: string
          payment_method_id: string
          updated_at?: string
          wallet_type: Database["public"]["Enums"]["commercial_payment_method_type"]
        }
        Update: {
          account_holder_name?: string | null
          created_at?: string
          payment_key?: string
          payment_method_id?: string
          updated_at?: string
          wallet_type?: Database["public"]["Enums"]["commercial_payment_method_type"]
        }
        Relationships: [
          {
            foreignKeyName: "commercial_mobile_payment_accounts_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: true
            referencedRelation: "commercial_payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_offer_images: {
        Row: {
          archived_at: string | null
          commercial_offer_id: string
          created_at: string
          file_id: string
          id: string
          is_primary: boolean
          sort_order: number
          status: Database["public"]["Enums"]["commercial_offer_image_status"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          commercial_offer_id: string
          created_at?: string
          file_id: string
          id?: string
          is_primary?: boolean
          sort_order?: number
          status?: Database["public"]["Enums"]["commercial_offer_image_status"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          commercial_offer_id?: string
          created_at?: string
          file_id?: string
          id?: string
          is_primary?: boolean
          sort_order?: number
          status?: Database["public"]["Enums"]["commercial_offer_image_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_offer_images_commercial_offer_id_fkey"
            columns: ["commercial_offer_id"]
            isOneToOne: false
            referencedRelation: "commercial_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_offer_images_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_offer_modalities: {
        Row: {
          archived_at: string | null
          commercial_offer_id: string
          created_at: string
          id: string
          modality: Database["public"]["Enums"]["commercial_profile_modality"]
          status: Database["public"]["Enums"]["commercial_offer_modality_status"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          commercial_offer_id: string
          created_at?: string
          id?: string
          modality: Database["public"]["Enums"]["commercial_profile_modality"]
          status?: Database["public"]["Enums"]["commercial_offer_modality_status"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          commercial_offer_id?: string
          created_at?: string
          id?: string
          modality?: Database["public"]["Enums"]["commercial_profile_modality"]
          status?: Database["public"]["Enums"]["commercial_offer_modality_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_offer_modalities_commercial_offer_id_fkey"
            columns: ["commercial_offer_id"]
            isOneToOne: false
            referencedRelation: "commercial_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_offers: {
        Row: {
          archived_at: string | null
          base_price_amount: number | null
          catalog_id: string
          commercial_profile_id: string
          created_at: string
          currency_code: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_available: boolean
          offer_kind: Database["public"]["Enums"]["commercial_offer_kind"]
          payment_policy:
            | Database["public"]["Enums"]["commercial_service_payment_policy"]
            | null
          pricing_strategy: Database["public"]["Enums"]["commercial_pricing_strategy"]
          requires_booking: boolean
          sort_order: number
          status: Database["public"]["Enums"]["commercial_offer_status"]
          stock_quantity: number | null
          title: string
          track_inventory: boolean
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          base_price_amount?: number | null
          catalog_id: string
          commercial_profile_id: string
          created_at?: string
          currency_code?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_available?: boolean
          offer_kind: Database["public"]["Enums"]["commercial_offer_kind"]
          payment_policy?:
            | Database["public"]["Enums"]["commercial_service_payment_policy"]
            | null
          pricing_strategy?: Database["public"]["Enums"]["commercial_pricing_strategy"]
          requires_booking?: boolean
          sort_order?: number
          status?: Database["public"]["Enums"]["commercial_offer_status"]
          stock_quantity?: number | null
          title: string
          track_inventory?: boolean
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          base_price_amount?: number | null
          catalog_id?: string
          commercial_profile_id?: string
          created_at?: string
          currency_code?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_available?: boolean
          offer_kind?: Database["public"]["Enums"]["commercial_offer_kind"]
          payment_policy?:
            | Database["public"]["Enums"]["commercial_service_payment_policy"]
            | null
          pricing_strategy?: Database["public"]["Enums"]["commercial_pricing_strategy"]
          requires_booking?: boolean
          sort_order?: number
          status?: Database["public"]["Enums"]["commercial_offer_status"]
          stock_quantity?: number | null
          title?: string
          track_inventory?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_offers_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "commercial_catalogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_offers_commercial_profile_id_fkey"
            columns: ["commercial_profile_id"]
            isOneToOne: false
            referencedRelation: "commercial_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_payment_methods: {
        Row: {
          archived_at: string | null
          available_before_acceptance: boolean
          commercial_profile_id: string
          created_at: string
          display_name: string
          id: string
          payment_method_type: Database["public"]["Enums"]["commercial_payment_method_type"]
          private_details: Json
          private_instructions: string | null
          public_details: Json
          public_instructions: string | null
          sort_order: number
          status: Database["public"]["Enums"]["commercial_payment_method_status"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          available_before_acceptance?: boolean
          commercial_profile_id: string
          created_at?: string
          display_name: string
          id?: string
          payment_method_type: Database["public"]["Enums"]["commercial_payment_method_type"]
          private_details?: Json
          private_instructions?: string | null
          public_details?: Json
          public_instructions?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["commercial_payment_method_status"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          available_before_acceptance?: boolean
          commercial_profile_id?: string
          created_at?: string
          display_name?: string
          id?: string
          payment_method_type?: Database["public"]["Enums"]["commercial_payment_method_type"]
          private_details?: Json
          private_instructions?: string | null
          public_details?: Json
          public_instructions?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["commercial_payment_method_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_payment_methods_commercial_profile_id_fkey"
            columns: ["commercial_profile_id"]
            isOneToOne: false
            referencedRelation: "commercial_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_profile_categories: {
        Row: {
          commercial_category_id: string
          commercial_profile_id: string
          created_at: string
          id: string
          sort_order: number
        }
        Insert: {
          commercial_category_id: string
          commercial_profile_id: string
          created_at?: string
          id?: string
          sort_order?: number
        }
        Update: {
          commercial_category_id?: string
          commercial_profile_id?: string
          created_at?: string
          id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "commercial_profile_categories_commercial_category_id_fkey"
            columns: ["commercial_category_id"]
            isOneToOne: false
            referencedRelation: "commercial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_profile_categories_commercial_profile_id_fkey"
            columns: ["commercial_profile_id"]
            isOneToOne: false
            referencedRelation: "commercial_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_profile_hours: {
        Row: {
          closes_at: string | null
          commercial_profile_id: string
          created_at: string
          day_of_week: number
          id: string
          is_closed: boolean
          opens_at: string | null
          updated_at: string
        }
        Insert: {
          closes_at?: string | null
          commercial_profile_id: string
          created_at?: string
          day_of_week: number
          id?: string
          is_closed?: boolean
          opens_at?: string | null
          updated_at?: string
        }
        Update: {
          closes_at?: string | null
          commercial_profile_id?: string
          created_at?: string
          day_of_week?: number
          id?: string
          is_closed?: boolean
          opens_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_profile_hours_commercial_profile_id_fkey"
            columns: ["commercial_profile_id"]
            isOneToOne: false
            referencedRelation: "commercial_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_profile_modalities: {
        Row: {
          commercial_profile_id: string
          created_at: string
          id: string
          modality: Database["public"]["Enums"]["commercial_profile_modality"]
        }
        Insert: {
          commercial_profile_id: string
          created_at?: string
          id?: string
          modality: Database["public"]["Enums"]["commercial_profile_modality"]
        }
        Update: {
          commercial_profile_id?: string
          created_at?: string
          id?: string
          modality?: Database["public"]["Enums"]["commercial_profile_modality"]
        }
        Relationships: [
          {
            foreignKeyName: "commercial_profile_modalities_commercial_profile_id_fkey"
            columns: ["commercial_profile_id"]
            isOneToOne: false
            referencedRelation: "commercial_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_profile_social_links_legacy: {
        Row: {
          commercial_profile_id: string
          created_at: string
          id: string
          platform: Database["public"]["Enums"]["social_platform"]
          updated_at: string
          url: string
        }
        Insert: {
          commercial_profile_id: string
          created_at?: string
          id?: string
          platform: Database["public"]["Enums"]["social_platform"]
          updated_at?: string
          url: string
        }
        Update: {
          commercial_profile_id?: string
          created_at?: string
          id?: string
          platform?: Database["public"]["Enums"]["social_platform"]
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_profile_social_links_commercial_profile_id_fkey"
            columns: ["commercial_profile_id"]
            isOneToOne: false
            referencedRelation: "commercial_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_profiles: {
        Row: {
          address: string | null
          archived_at: string | null
          booking_hold_minutes: number
          cash_on_delivery_enabled: boolean
          category_id: string | null
          city: string
          country_code: string
          created_at: string
          custom_activity_text: string | null
          delivery_currency_code: string
          delivery_fee_amount: number | null
          delivery_fee_mode: Database["public"]["Enums"]["commercial_delivery_fee_mode"]
          description: string
          display_name: string
          id: string
          inventory_hold_minutes: number
          is_address_public: boolean
          is_available: boolean
          is_email_public: boolean
          is_phone_public: boolean
          is_public: boolean
          location_reference: string | null
          logo_file_id: string | null
          neighborhood: string | null
          offer_type: Database["public"]["Enums"]["commercial_offer_type"]
          owner_id: string
          phone_dial_code: string | null
          phone_number: string | null
          public_email: string | null
          publication_status: Database["public"]["Enums"]["commercial_publication_status"]
          suspended_at: string | null
          suspension_reason: string | null
          timezone: string
          updated_at: string
          verification_badge_visible: boolean
          verification_status: Database["public"]["Enums"]["commercial_verification_status"]
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          booking_hold_minutes?: number
          cash_on_delivery_enabled?: boolean
          category_id?: string | null
          city: string
          country_code?: string
          created_at?: string
          custom_activity_text?: string | null
          delivery_currency_code?: string
          delivery_fee_amount?: number | null
          delivery_fee_mode?: Database["public"]["Enums"]["commercial_delivery_fee_mode"]
          description: string
          display_name: string
          id?: string
          inventory_hold_minutes?: number
          is_address_public?: boolean
          is_available?: boolean
          is_email_public?: boolean
          is_phone_public?: boolean
          is_public?: boolean
          location_reference?: string | null
          logo_file_id?: string | null
          neighborhood?: string | null
          offer_type: Database["public"]["Enums"]["commercial_offer_type"]
          owner_id: string
          phone_dial_code?: string | null
          phone_number?: string | null
          public_email?: string | null
          publication_status?: Database["public"]["Enums"]["commercial_publication_status"]
          suspended_at?: string | null
          suspension_reason?: string | null
          timezone?: string
          updated_at?: string
          verification_badge_visible?: boolean
          verification_status?: Database["public"]["Enums"]["commercial_verification_status"]
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          booking_hold_minutes?: number
          cash_on_delivery_enabled?: boolean
          category_id?: string | null
          city?: string
          country_code?: string
          created_at?: string
          custom_activity_text?: string | null
          delivery_currency_code?: string
          delivery_fee_amount?: number | null
          delivery_fee_mode?: Database["public"]["Enums"]["commercial_delivery_fee_mode"]
          description?: string
          display_name?: string
          id?: string
          inventory_hold_minutes?: number
          is_address_public?: boolean
          is_available?: boolean
          is_email_public?: boolean
          is_phone_public?: boolean
          is_public?: boolean
          location_reference?: string | null
          logo_file_id?: string | null
          neighborhood?: string | null
          offer_type?: Database["public"]["Enums"]["commercial_offer_type"]
          owner_id?: string
          phone_dial_code?: string | null
          phone_number?: string | null
          public_email?: string | null
          publication_status?: Database["public"]["Enums"]["commercial_publication_status"]
          suspended_at?: string | null
          suspension_reason?: string | null
          timezone?: string
          updated_at?: string
          verification_badge_visible?: boolean
          verification_status?: Database["public"]["Enums"]["commercial_verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "commercial_profiles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "commercial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_profiles_logo_file_id_fkey"
            columns: ["logo_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_profiles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_verification_documents: {
        Row: {
          archived_at: string | null
          commercial_verification_request_id: string
          created_at: string
          file_id: string
          id: string
          note: string | null
          replaced_by_document_id: string | null
          status: Database["public"]["Enums"]["commercial_verification_document_status"]
          updated_at: string
          uploaded_by_profile_id: string
        }
        Insert: {
          archived_at?: string | null
          commercial_verification_request_id: string
          created_at?: string
          file_id: string
          id?: string
          note?: string | null
          replaced_by_document_id?: string | null
          status?: Database["public"]["Enums"]["commercial_verification_document_status"]
          updated_at?: string
          uploaded_by_profile_id: string
        }
        Update: {
          archived_at?: string | null
          commercial_verification_request_id?: string
          created_at?: string
          file_id?: string
          id?: string
          note?: string | null
          replaced_by_document_id?: string | null
          status?: Database["public"]["Enums"]["commercial_verification_document_status"]
          updated_at?: string
          uploaded_by_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_verification_docum_commercial_verification_requ_fkey"
            columns: ["commercial_verification_request_id"]
            isOneToOne: false
            referencedRelation: "commercial_verification_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_verification_documents_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_verification_documents_replaced_by_document_id_fkey"
            columns: ["replaced_by_document_id"]
            isOneToOne: false
            referencedRelation: "commercial_verification_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_verification_documents_uploaded_by_profile_id_fkey"
            columns: ["uploaded_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_verification_events: {
        Row: {
          actor_profile_id: string | null
          commercial_verification_request_id: string
          created_at: string
          event_type: Database["public"]["Enums"]["commercial_verification_event_type"]
          id: string
          metadata: Json
          new_status:
            | Database["public"]["Enums"]["commercial_verification_status"]
            | null
          previous_status:
            | Database["public"]["Enums"]["commercial_verification_status"]
            | null
          reason_code: string | null
          reason_text: string | null
          reference_document_id: string | null
        }
        Insert: {
          actor_profile_id?: string | null
          commercial_verification_request_id: string
          created_at?: string
          event_type: Database["public"]["Enums"]["commercial_verification_event_type"]
          id?: string
          metadata?: Json
          new_status?:
            | Database["public"]["Enums"]["commercial_verification_status"]
            | null
          previous_status?:
            | Database["public"]["Enums"]["commercial_verification_status"]
            | null
          reason_code?: string | null
          reason_text?: string | null
          reference_document_id?: string | null
        }
        Update: {
          actor_profile_id?: string | null
          commercial_verification_request_id?: string
          created_at?: string
          event_type?: Database["public"]["Enums"]["commercial_verification_event_type"]
          id?: string
          metadata?: Json
          new_status?:
            | Database["public"]["Enums"]["commercial_verification_status"]
            | null
          previous_status?:
            | Database["public"]["Enums"]["commercial_verification_status"]
            | null
          reason_code?: string | null
          reason_text?: string | null
          reference_document_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commercial_verification_event_commercial_verification_requ_fkey"
            columns: ["commercial_verification_request_id"]
            isOneToOne: false
            referencedRelation: "commercial_verification_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_verification_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_verification_events_reference_document_id_fkey"
            columns: ["reference_document_id"]
            isOneToOne: false
            referencedRelation: "commercial_verification_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_verification_requests: {
        Row: {
          applicant_type: string | null
          business_address: string | null
          commercial_profile_id: string
          created_at: string
          declaration_accepted_at: string | null
          declaration_version: string | null
          id: string
          legal_name: string | null
          review_note: string | null
          review_reason_code: string | null
          review_reason_text: string | null
          reviewed_at: string | null
          reviewed_by_profile_id: string | null
          status: Database["public"]["Enums"]["commercial_verification_status"]
          submitted_at: string | null
          submitted_by_profile_id: string
          tax_id: string | null
          tax_id_normalized: string | null
          updated_at: string
        }
        Insert: {
          applicant_type?: string | null
          business_address?: string | null
          commercial_profile_id: string
          created_at?: string
          declaration_accepted_at?: string | null
          declaration_version?: string | null
          id?: string
          legal_name?: string | null
          review_note?: string | null
          review_reason_code?: string | null
          review_reason_text?: string | null
          reviewed_at?: string | null
          reviewed_by_profile_id?: string | null
          status?: Database["public"]["Enums"]["commercial_verification_status"]
          submitted_at?: string | null
          submitted_by_profile_id: string
          tax_id?: string | null
          tax_id_normalized?: string | null
          updated_at?: string
        }
        Update: {
          applicant_type?: string | null
          business_address?: string | null
          commercial_profile_id?: string
          created_at?: string
          declaration_accepted_at?: string | null
          declaration_version?: string | null
          id?: string
          legal_name?: string | null
          review_note?: string | null
          review_reason_code?: string | null
          review_reason_text?: string | null
          reviewed_at?: string | null
          reviewed_by_profile_id?: string | null
          status?: Database["public"]["Enums"]["commercial_verification_status"]
          submitted_at?: string | null
          submitted_by_profile_id?: string
          tax_id?: string | null
          tax_id_normalized?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_verification_requests_commercial_profile_id_fkey"
            columns: ["commercial_profile_id"]
            isOneToOne: false
            referencedRelation: "commercial_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_verification_requests_reviewed_by_profile_id_fkey"
            columns: ["reviewed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_verification_requests_submitted_by_profile_id_fkey"
            columns: ["submitted_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          created_at: string
          member_role: string
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          member_role?: string
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          member_role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string
          body: string
          community_id: string
          created_at: string
          id: string
        }
        Insert: {
          author_id: string
          body: string
          community_id: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string
          body?: string
          community_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          display_name: string
          email: string | null
          id: string
          linked_user_id: string | null
          notes: string
          owner_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          email?: string | null
          id?: string
          linked_user_id?: string | null
          notes?: string
          owner_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          linked_user_id?: string | null
          notes?: string
          owner_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_linked_user_id_fkey"
            columns: ["linked_user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      device_sessions: {
        Row: {
          auth_session_id: string | null
          browser: string | null
          created_at: string
          device_name: string
          device_type: string
          expires_at: string
          id: string
          ip_address: unknown
          is_active: boolean
          last_seen_at: string
          platform: string | null
          revoked_at: string | null
          session_token_hash: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_session_id?: string | null
          browser?: string | null
          created_at?: string
          device_name: string
          device_type: string
          expires_at: string
          id?: string
          ip_address?: unknown
          is_active?: boolean
          last_seen_at?: string
          platform?: string | null
          revoked_at?: string | null
          session_token_hash: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_session_id?: string | null
          browser?: string | null
          created_at?: string
          device_name?: string
          device_type?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          is_active?: boolean
          last_seen_at?: string
          platform?: string | null
          revoked_at?: string | null
          session_token_hash?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      domain_audit_events: {
        Row: {
          created_at: string
          id: string
          payload: Json
          source_id: string | null
          source_table: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload: Json
          source_id?: string | null
          source_table: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          source_id?: string | null
          source_table?: string
        }
        Relationships: []
      }
      file_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "file_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      file_quotas: {
        Row: {
          created_at: string
          quota_bytes: number
          reserved_bytes: number
          updated_at: string
          used_bytes: number
          user_id: string
        }
        Insert: {
          created_at?: string
          quota_bytes?: number
          reserved_bytes?: number
          updated_at?: string
          used_bytes?: number
          user_id: string
        }
        Update: {
          created_at?: string
          quota_bytes?: number
          reserved_bytes?: number
          updated_at?: string
          used_bytes?: number
          user_id?: string
        }
        Relationships: []
      }
      file_shares: {
        Row: {
          accepted_at: string | null
          created_at: string
          expires_at: string | null
          file_id: string
          hidden_at: string | null
          id: string
          permission: Database["public"]["Enums"]["file_share_permission"]
          revoked_at: string | null
          share_source: string
          shared_by_user_id: string
          shared_with_displayed_at: string | null
          shared_with_user_id: string
          source_conversation_id: string | null
          source_message_id: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string | null
          file_id: string
          hidden_at?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["file_share_permission"]
          revoked_at?: string | null
          share_source?: string
          shared_by_user_id: string
          shared_with_displayed_at?: string | null
          shared_with_user_id: string
          source_conversation_id?: string | null
          source_message_id?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string | null
          file_id?: string
          hidden_at?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["file_share_permission"]
          revoked_at?: string | null
          share_source?: string
          shared_by_user_id?: string
          shared_with_displayed_at?: string | null
          shared_with_user_id?: string
          source_conversation_id?: string | null
          source_message_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_shares_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_shares_source_conversation_id_fkey"
            columns: ["source_conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_shares_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      file_tag_assignments: {
        Row: {
          created_at: string
          file_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          file_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          file_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_tags_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "file_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      file_tags: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          is_default: boolean
          name: string
          owner_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_default?: boolean
          name: string
          owner_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_default?: boolean
          name?: string
          owner_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      files: {
        Row: {
          bucket_id: string
          checksum_sha256: string | null
          created_at: string
          display_name: string
          duration_seconds: number | null
          extension: string | null
          folder_id: string | null
          height: number | null
          id: string
          is_starred: boolean
          kind: Database["public"]["Enums"]["file_kind"]
          mime_type: string
          original_name: string
          owner_id: string
          purge_after: string | null
          size_bytes: number
          status: Database["public"]["Enums"]["file_status"]
          storage_path: string
          trashed_at: string | null
          updated_at: string
          upload_completed_at: string | null
          upload_expected_size_bytes: number | null
          upload_expires_at: string | null
          upload_session_status: string | null
          width: number | null
        }
        Insert: {
          bucket_id?: string
          checksum_sha256?: string | null
          created_at?: string
          display_name: string
          duration_seconds?: number | null
          extension?: string | null
          folder_id?: string | null
          height?: number | null
          id?: string
          is_starred?: boolean
          kind?: Database["public"]["Enums"]["file_kind"]
          mime_type: string
          original_name: string
          owner_id: string
          purge_after?: string | null
          size_bytes?: number
          status?: Database["public"]["Enums"]["file_status"]
          storage_path: string
          trashed_at?: string | null
          updated_at?: string
          upload_completed_at?: string | null
          upload_expected_size_bytes?: number | null
          upload_expires_at?: string | null
          upload_session_status?: string | null
          width?: number | null
        }
        Update: {
          bucket_id?: string
          checksum_sha256?: string | null
          created_at?: string
          display_name?: string
          duration_seconds?: number | null
          extension?: string | null
          folder_id?: string | null
          height?: number | null
          id?: string
          is_starred?: boolean
          kind?: Database["public"]["Enums"]["file_kind"]
          mime_type?: string
          original_name?: string
          owner_id?: string
          purge_after?: string | null
          size_bytes?: number
          status?: Database["public"]["Enums"]["file_status"]
          storage_path?: string
          trashed_at?: string | null
          updated_at?: string
          upload_completed_at?: string | null
          upload_expected_size_bytes?: number | null
          upload_expires_at?: string | null
          upload_session_status?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "file_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_connections: {
        Row: {
          capabilities: Json
          created_at: string
          disconnected_at: string | null
          granted_scopes: Json
          id: string
          last_error_code: string | null
          last_error_message: string | null
          last_successful_auth_at: string | null
          last_token_refresh_at: string | null
          metadata: Json
          provider: Database["public"]["Enums"]["integration_provider"]
          provider_account_id: string
          provider_avatar_url: string | null
          provider_display_name: string | null
          provider_email: string | null
          provider_tenant_id: string | null
          reauth_required_at: string | null
          status: Database["public"]["Enums"]["integration_connection_status"]
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          capabilities?: Json
          created_at?: string
          disconnected_at?: string | null
          granted_scopes?: Json
          id?: string
          last_error_code?: string | null
          last_error_message?: string | null
          last_successful_auth_at?: string | null
          last_token_refresh_at?: string | null
          metadata?: Json
          provider: Database["public"]["Enums"]["integration_provider"]
          provider_account_id: string
          provider_avatar_url?: string | null
          provider_display_name?: string | null
          provider_email?: string | null
          provider_tenant_id?: string | null
          reauth_required_at?: string | null
          status?: Database["public"]["Enums"]["integration_connection_status"]
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          capabilities?: Json
          created_at?: string
          disconnected_at?: string | null
          granted_scopes?: Json
          id?: string
          last_error_code?: string | null
          last_error_message?: string | null
          last_successful_auth_at?: string | null
          last_token_refresh_at?: string | null
          metadata?: Json
          provider?: Database["public"]["Enums"]["integration_provider"]
          provider_account_id?: string
          provider_avatar_url?: string | null
          provider_display_name?: string | null
          provider_email?: string | null
          provider_tenant_id?: string | null
          reauth_required_at?: string | null
          status?: Database["public"]["Enums"]["integration_connection_status"]
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      integration_credentials: {
        Row: {
          access_token_ciphertext: string | null
          connection_id: string
          created_at: string
          id_token_ciphertext: string | null
          provider_metadata: Json
          refresh_token_ciphertext: string | null
          token_encryption_version: number
          token_type: string | null
          updated_at: string
        }
        Insert: {
          access_token_ciphertext?: string | null
          connection_id: string
          created_at?: string
          id_token_ciphertext?: string | null
          provider_metadata?: Json
          refresh_token_ciphertext?: string | null
          token_encryption_version?: number
          token_type?: string | null
          updated_at?: string
        }
        Update: {
          access_token_ciphertext?: string | null
          connection_id?: string
          created_at?: string
          id_token_ciphertext?: string | null
          provider_metadata?: Json
          refresh_token_ciphertext?: string | null
          token_encryption_version?: number
          token_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_credentials_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: true
            referencedRelation: "integration_account_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_credentials_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: true
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_credentials_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: true
            referencedRelation: "integration_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_events: {
        Row: {
          connection_id: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          event_type: Database["public"]["Enums"]["integration_event_type"]
          id: string
          metadata: Json
          provider: Database["public"]["Enums"]["integration_provider"]
          user_id: string
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          event_type: Database["public"]["Enums"]["integration_event_type"]
          id?: string
          metadata?: Json
          provider: Database["public"]["Enums"]["integration_provider"]
          user_id: string
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          event_type?: Database["public"]["Enums"]["integration_event_type"]
          id?: string
          metadata?: Json
          provider?: Database["public"]["Enums"]["integration_provider"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_account_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_notification_deliveries: {
        Row: {
          connection_id: string
          created_at: string
          error_message: string | null
          id: string
          notification_id: string | null
          notification_kind: string
          sent_at: string | null
          status: Database["public"]["Enums"]["integration_notification_status"]
          updated_at: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          notification_id?: string | null
          notification_kind: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["integration_notification_status"]
          updated_at?: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          notification_id?: string | null
          notification_kind?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["integration_notification_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_notification_deliveries_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_account_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_notification_deliveries_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_notification_deliveries_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_oauth_requests: {
        Row: {
          browser_binding_hash: string | null
          browser_binding_secret_ciphertext: string | null
          browser_start_token_hash: string | null
          browser_started_at: string | null
          cancelled_at: string | null
          consumed_at: string | null
          created_at: string
          existing_connection_id: string | null
          expires_at: string
          id: string
          initiating_auth_session_hash: string | null
          mobile_confirmation_token_hash: string | null
          mobile_confirmed_at: string | null
          oauth_state_ciphertext: string | null
          pkce_challenge_ciphertext: string | null
          pkce_verifier_ciphertext: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          provider_authorization_code_ciphertext: string | null
          provider_callback_received_at: string | null
          provider_error_code: string | null
          provider_error_description: string | null
          requested_capabilities: Json
          requested_scopes: Json
          return_path: string | null
          state_hash: string
          user_id: string
        }
        Insert: {
          browser_binding_hash?: string | null
          browser_binding_secret_ciphertext?: string | null
          browser_start_token_hash?: string | null
          browser_started_at?: string | null
          cancelled_at?: string | null
          consumed_at?: string | null
          created_at?: string
          existing_connection_id?: string | null
          expires_at: string
          id?: string
          initiating_auth_session_hash?: string | null
          mobile_confirmation_token_hash?: string | null
          mobile_confirmed_at?: string | null
          oauth_state_ciphertext?: string | null
          pkce_challenge_ciphertext?: string | null
          pkce_verifier_ciphertext?: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          provider_authorization_code_ciphertext?: string | null
          provider_callback_received_at?: string | null
          provider_error_code?: string | null
          provider_error_description?: string | null
          requested_capabilities?: Json
          requested_scopes?: Json
          return_path?: string | null
          state_hash: string
          user_id: string
        }
        Update: {
          browser_binding_hash?: string | null
          browser_binding_secret_ciphertext?: string | null
          browser_start_token_hash?: string | null
          browser_started_at?: string | null
          cancelled_at?: string | null
          consumed_at?: string | null
          created_at?: string
          existing_connection_id?: string | null
          expires_at?: string
          id?: string
          initiating_auth_session_hash?: string | null
          mobile_confirmation_token_hash?: string | null
          mobile_confirmed_at?: string | null
          oauth_state_ciphertext?: string | null
          pkce_challenge_ciphertext?: string | null
          pkce_verifier_ciphertext?: string | null
          provider?: Database["public"]["Enums"]["integration_provider"]
          provider_authorization_code_ciphertext?: string | null
          provider_callback_received_at?: string | null
          provider_error_code?: string | null
          provider_error_description?: string | null
          requested_capabilities?: Json
          requested_scopes?: Json
          return_path?: string | null
          state_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_oauth_requests_existing_connection_id_fkey"
            columns: ["existing_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_account_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_oauth_requests_existing_connection_id_fkey"
            columns: ["existing_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_oauth_requests_existing_connection_id_fkey"
            columns: ["existing_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_draft_attachments: {
        Row: {
          created_at: string
          draft_id: string
          id: string
          original_message_attachment_id: string | null
          position: number
          source: Database["public"]["Enums"]["mail_attachment_source"]
          storage_file_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          draft_id: string
          id?: string
          original_message_attachment_id?: string | null
          position?: number
          source?: Database["public"]["Enums"]["mail_attachment_source"]
          storage_file_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          draft_id?: string
          id?: string
          original_message_attachment_id?: string | null
          position?: number
          source?: Database["public"]["Enums"]["mail_attachment_source"]
          storage_file_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_draft_attachments_draft_fk"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "mail_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_draft_attachments_original_attachment_fk"
            columns: ["original_message_attachment_id"]
            isOneToOne: false
            referencedRelation: "mail_message_attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_draft_attachments_storage_file_fk"
            columns: ["storage_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_drafts: {
        Row: {
          auto_save_version: number
          bcc_recipients: Json
          body_html: string | null
          body_text: string | null
          cc_recipients: Json
          created_at: string
          forward_message_id: string | null
          id: string
          last_auto_saved_at: string | null
          mail_integration_id: string
          metadata: Json
          provider: Database["public"]["Enums"]["integration_provider"]
          provider_draft_id: string | null
          provider_message_id: string | null
          reply_to_message_id: string | null
          status: Database["public"]["Enums"]["mail_draft_status"]
          subject: string | null
          to_recipients: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_save_version?: number
          bcc_recipients?: Json
          body_html?: string | null
          body_text?: string | null
          cc_recipients?: Json
          created_at?: string
          forward_message_id?: string | null
          id?: string
          last_auto_saved_at?: string | null
          mail_integration_id: string
          metadata?: Json
          provider: Database["public"]["Enums"]["integration_provider"]
          provider_draft_id?: string | null
          provider_message_id?: string | null
          reply_to_message_id?: string | null
          status?: Database["public"]["Enums"]["mail_draft_status"]
          subject?: string | null
          to_recipients?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_save_version?: number
          bcc_recipients?: Json
          body_html?: string | null
          body_text?: string | null
          cc_recipients?: Json
          created_at?: string
          forward_message_id?: string | null
          id?: string
          last_auto_saved_at?: string | null
          mail_integration_id?: string
          metadata?: Json
          provider?: Database["public"]["Enums"]["integration_provider"]
          provider_draft_id?: string | null
          provider_message_id?: string | null
          reply_to_message_id?: string | null
          status?: Database["public"]["Enums"]["mail_draft_status"]
          subject?: string | null
          to_recipients?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_drafts_forward_message_fk"
            columns: ["forward_message_id"]
            isOneToOne: false
            referencedRelation: "mail_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_drafts_integration_fk"
            columns: ["mail_integration_id"]
            isOneToOne: false
            referencedRelation: "integration_account_overview"
            referencedColumns: ["mail_integration_id"]
          },
          {
            foreignKeyName: "mail_drafts_integration_fk"
            columns: ["mail_integration_id"]
            isOneToOne: false
            referencedRelation: "mail_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_drafts_reply_to_message_fk"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "mail_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_integrations: {
        Row: {
          connected_at: string
          created_at: string
          disconnected_at: string | null
          id: string
          initial_sync_completed_at: string | null
          initial_sync_started_at: string | null
          integration_connection_id: string
          last_attempted_sync_at: string | null
          last_error_code: string | null
          last_error_message: string | null
          last_successful_sync_at: string | null
          metadata: Json
          next_sync_at: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          provider_account_id: string
          provider_display_name: string | null
          provider_email: string | null
          reauth_required_at: string | null
          status: string
          sync_cursor: string | null
          sync_cursor_updated_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          connected_at?: string
          created_at?: string
          disconnected_at?: string | null
          id?: string
          initial_sync_completed_at?: string | null
          initial_sync_started_at?: string | null
          integration_connection_id: string
          last_attempted_sync_at?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          last_successful_sync_at?: string | null
          metadata?: Json
          next_sync_at?: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          provider_account_id: string
          provider_display_name?: string | null
          provider_email?: string | null
          reauth_required_at?: string | null
          status?: string
          sync_cursor?: string | null
          sync_cursor_updated_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          connected_at?: string
          created_at?: string
          disconnected_at?: string | null
          id?: string
          initial_sync_completed_at?: string | null
          initial_sync_started_at?: string | null
          integration_connection_id?: string
          last_attempted_sync_at?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          last_successful_sync_at?: string | null
          metadata?: Json
          next_sync_at?: string | null
          provider?: Database["public"]["Enums"]["integration_provider"]
          provider_account_id?: string
          provider_display_name?: string | null
          provider_email?: string | null
          reauth_required_at?: string | null
          status?: string
          sync_cursor?: string | null
          sync_cursor_updated_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_integrations_connection_fk"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_account_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_integrations_connection_fk"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_integrations_connection_fk"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_message_actions: {
        Row: {
          action_type: Database["public"]["Enums"]["mail_action_type"]
          attempt_count: number
          available_at: string
          completed_at: string | null
          created_at: string
          draft_id: string | null
          error_code: string | null
          error_message: string | null
          id: string
          idempotency_key: string | null
          mail_integration_id: string
          message_id: string | null
          request_payload: Json
          result_payload: Json
          started_at: string | null
          status: Database["public"]["Enums"]["mail_action_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["mail_action_type"]
          attempt_count?: number
          available_at?: string
          completed_at?: string | null
          created_at?: string
          draft_id?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          mail_integration_id: string
          message_id?: string | null
          request_payload?: Json
          result_payload?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["mail_action_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["mail_action_type"]
          attempt_count?: number
          available_at?: string
          completed_at?: string | null
          created_at?: string
          draft_id?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          mail_integration_id?: string
          message_id?: string | null
          request_payload?: Json
          result_payload?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["mail_action_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_message_actions_draft_fk"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "mail_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_message_actions_integration_fk"
            columns: ["mail_integration_id"]
            isOneToOne: false
            referencedRelation: "integration_account_overview"
            referencedColumns: ["mail_integration_id"]
          },
          {
            foreignKeyName: "mail_message_actions_integration_fk"
            columns: ["mail_integration_id"]
            isOneToOne: false
            referencedRelation: "mail_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_message_actions_message_fk"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "mail_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_message_attachments: {
        Row: {
          checksum_sha256: string | null
          content_disposition: string | null
          content_id: string | null
          created_at: string
          filename: string
          id: string
          is_inline: boolean
          message_id: string
          metadata: Json
          mime_type: string
          provider_attachment_id: string | null
          provider_message_attachment_id: string | null
          size_bytes: number | null
          source: Database["public"]["Enums"]["mail_attachment_source"]
          storage_file_id: string | null
          updated_at: string
        }
        Insert: {
          checksum_sha256?: string | null
          content_disposition?: string | null
          content_id?: string | null
          created_at?: string
          filename: string
          id?: string
          is_inline?: boolean
          message_id: string
          metadata?: Json
          mime_type?: string
          provider_attachment_id?: string | null
          provider_message_attachment_id?: string | null
          size_bytes?: number | null
          source?: Database["public"]["Enums"]["mail_attachment_source"]
          storage_file_id?: string | null
          updated_at?: string
        }
        Update: {
          checksum_sha256?: string | null
          content_disposition?: string | null
          content_id?: string | null
          created_at?: string
          filename?: string
          id?: string
          is_inline?: boolean
          message_id?: string
          metadata?: Json
          mime_type?: string
          provider_attachment_id?: string | null
          provider_message_attachment_id?: string | null
          size_bytes?: number | null
          source?: Database["public"]["Enums"]["mail_attachment_source"]
          storage_file_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_message_attachments_message_fk"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "mail_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_message_attachments_storage_file_fk"
            columns: ["storage_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_message_recipients: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          message_id: string
          metadata: Json
          position: number
          provider_recipient_id: string | null
          recipient_kind: Database["public"]["Enums"]["mail_recipient_kind"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          message_id: string
          metadata?: Json
          position?: number
          provider_recipient_id?: string | null
          recipient_kind: Database["public"]["Enums"]["mail_recipient_kind"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          message_id?: string
          metadata?: Json
          position?: number
          provider_recipient_id?: string | null
          recipient_kind?: Database["public"]["Enums"]["mail_recipient_kind"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_message_recipients_message_fk"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "mail_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_messages: {
        Row: {
          attachment_count: number
          body_html: string | null
          body_preview: string | null
          body_text: string | null
          created_at: string
          deleted_permanently_at: string | null
          direction: Database["public"]["Enums"]["mail_message_direction"]
          folder: Database["public"]["Enums"]["mail_folder"]
          has_attachments: boolean
          id: string
          in_reply_to_header: string | null
          is_archived: boolean
          is_deleted_permanently: boolean
          is_provider_deleted: boolean
          is_read: boolean
          is_spam: boolean
          is_starred: boolean
          is_trashed: boolean
          last_synced_at: string | null
          mail_integration_id: string
          message_id_header: string | null
          metadata: Json
          provider: Database["public"]["Enums"]["integration_provider"]
          provider_change_key: string | null
          provider_conversation_id: string | null
          provider_created_at: string | null
          provider_deleted_at: string | null
          provider_etag: string | null
          provider_message_id: string
          provider_thread_id: string | null
          provider_updated_at: string | null
          provider_web_link: string | null
          received_at: string | null
          references_header: string | null
          sent_at: string | null
          snippet: string | null
          status: Database["public"]["Enums"]["mail_message_status"]
          subject: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attachment_count?: number
          body_html?: string | null
          body_preview?: string | null
          body_text?: string | null
          created_at?: string
          deleted_permanently_at?: string | null
          direction: Database["public"]["Enums"]["mail_message_direction"]
          folder?: Database["public"]["Enums"]["mail_folder"]
          has_attachments?: boolean
          id?: string
          in_reply_to_header?: string | null
          is_archived?: boolean
          is_deleted_permanently?: boolean
          is_provider_deleted?: boolean
          is_read?: boolean
          is_spam?: boolean
          is_starred?: boolean
          is_trashed?: boolean
          last_synced_at?: string | null
          mail_integration_id: string
          message_id_header?: string | null
          metadata?: Json
          provider: Database["public"]["Enums"]["integration_provider"]
          provider_change_key?: string | null
          provider_conversation_id?: string | null
          provider_created_at?: string | null
          provider_deleted_at?: string | null
          provider_etag?: string | null
          provider_message_id: string
          provider_thread_id?: string | null
          provider_updated_at?: string | null
          provider_web_link?: string | null
          received_at?: string | null
          references_header?: string | null
          sent_at?: string | null
          snippet?: string | null
          status?: Database["public"]["Enums"]["mail_message_status"]
          subject?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attachment_count?: number
          body_html?: string | null
          body_preview?: string | null
          body_text?: string | null
          created_at?: string
          deleted_permanently_at?: string | null
          direction?: Database["public"]["Enums"]["mail_message_direction"]
          folder?: Database["public"]["Enums"]["mail_folder"]
          has_attachments?: boolean
          id?: string
          in_reply_to_header?: string | null
          is_archived?: boolean
          is_deleted_permanently?: boolean
          is_provider_deleted?: boolean
          is_read?: boolean
          is_spam?: boolean
          is_starred?: boolean
          is_trashed?: boolean
          last_synced_at?: string | null
          mail_integration_id?: string
          message_id_header?: string | null
          metadata?: Json
          provider?: Database["public"]["Enums"]["integration_provider"]
          provider_change_key?: string | null
          provider_conversation_id?: string | null
          provider_created_at?: string | null
          provider_deleted_at?: string | null
          provider_etag?: string | null
          provider_message_id?: string
          provider_thread_id?: string | null
          provider_updated_at?: string | null
          provider_web_link?: string | null
          received_at?: string | null
          references_header?: string | null
          sent_at?: string | null
          snippet?: string | null
          status?: Database["public"]["Enums"]["mail_message_status"]
          subject?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_messages_integration_fk"
            columns: ["mail_integration_id"]
            isOneToOne: false
            referencedRelation: "integration_account_overview"
            referencedColumns: ["mail_integration_id"]
          },
          {
            foreignKeyName: "mail_messages_integration_fk"
            columns: ["mail_integration_id"]
            isOneToOne: false
            referencedRelation: "mail_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_sync_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          cursor_after: string | null
          cursor_before: string | null
          error_code: string | null
          error_message: string | null
          id: string
          is_full_sync: boolean
          mail_integration_id: string
          messages_created_count: number
          messages_deleted_count: number
          messages_fetched_count: number
          messages_skipped_count: number
          messages_updated_count: number
          metadata: Json
          started_at: string | null
          status: Database["public"]["Enums"]["mail_sync_status"]
          trigger: Database["public"]["Enums"]["mail_sync_trigger"]
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          cursor_after?: string | null
          cursor_before?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          is_full_sync?: boolean
          mail_integration_id: string
          messages_created_count?: number
          messages_deleted_count?: number
          messages_fetched_count?: number
          messages_skipped_count?: number
          messages_updated_count?: number
          metadata?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["mail_sync_status"]
          trigger: Database["public"]["Enums"]["mail_sync_trigger"]
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          cursor_after?: string | null
          cursor_before?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          is_full_sync?: boolean
          mail_integration_id?: string
          messages_created_count?: number
          messages_deleted_count?: number
          messages_fetched_count?: number
          messages_skipped_count?: number
          messages_updated_count?: number
          metadata?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["mail_sync_status"]
          trigger?: Database["public"]["Enums"]["mail_sync_trigger"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_sync_runs_integration_fk"
            columns: ["mail_integration_id"]
            isOneToOne: false
            referencedRelation: "integration_account_overview"
            referencedColumns: ["mail_integration_id"]
          },
          {
            foreignKeyName: "mail_sync_runs_integration_fk"
            columns: ["mail_integration_id"]
            isOneToOne: false
            referencedRelation: "mail_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_webhook_subscriptions: {
        Row: {
          created_at: string
          expiration_at: string | null
          failure_count: number
          id: string
          last_error_code: string | null
          last_error_message: string | null
          last_notification_at: string | null
          last_renewed_at: string | null
          mail_integration_id: string
          metadata: Json
          provider: Database["public"]["Enums"]["mail_webhook_provider"]
          provider_client_state: string | null
          provider_resource: string | null
          provider_subscription_id: string | null
          status: Database["public"]["Enums"]["mail_webhook_status"]
          subscription_name: string | null
          topic_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expiration_at?: string | null
          failure_count?: number
          id?: string
          last_error_code?: string | null
          last_error_message?: string | null
          last_notification_at?: string | null
          last_renewed_at?: string | null
          mail_integration_id: string
          metadata?: Json
          provider: Database["public"]["Enums"]["mail_webhook_provider"]
          provider_client_state?: string | null
          provider_resource?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["mail_webhook_status"]
          subscription_name?: string | null
          topic_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expiration_at?: string | null
          failure_count?: number
          id?: string
          last_error_code?: string | null
          last_error_message?: string | null
          last_notification_at?: string | null
          last_renewed_at?: string | null
          mail_integration_id?: string
          metadata?: Json
          provider?: Database["public"]["Enums"]["mail_webhook_provider"]
          provider_client_state?: string | null
          provider_resource?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["mail_webhook_status"]
          subscription_name?: string | null
          topic_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_webhook_subscriptions_integration_fk"
            columns: ["mail_integration_id"]
            isOneToOne: false
            referencedRelation: "integration_account_overview"
            referencedColumns: ["mail_integration_id"]
          },
          {
            foreignKeyName: "mail_webhook_subscriptions_integration_fk"
            columns: ["mail_integration_id"]
            isOneToOne: false
            referencedRelation: "mail_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      note_attachments: {
        Row: {
          attachment_type: string
          created_at: string
          display_order: number
          file_id: string
          id: string
          note_id: string
        }
        Insert: {
          attachment_type?: string
          created_at?: string
          display_order?: number
          file_id: string
          id?: string
          note_id: string
        }
        Update: {
          attachment_type?: string
          created_at?: string
          display_order?: number
          file_id?: string
          id?: string
          note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_attachments_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_attachments_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      note_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "note_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      note_shares: {
        Row: {
          accepted_at: string | null
          created_at: string
          expires_at: string | null
          hidden_at: string | null
          id: string
          note_id: string
          permission: Database["public"]["Enums"]["note_share_permission"]
          revoked_at: string | null
          shared_by_user_id: string
          shared_with_displayed_at: string | null
          shared_with_user_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string | null
          hidden_at?: string | null
          id?: string
          note_id: string
          permission?: Database["public"]["Enums"]["note_share_permission"]
          revoked_at?: string | null
          shared_by_user_id: string
          shared_with_displayed_at?: string | null
          shared_with_user_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string | null
          hidden_at?: string | null
          id?: string
          note_id?: string
          permission?: Database["public"]["Enums"]["note_share_permission"]
          revoked_at?: string | null
          shared_by_user_id?: string
          shared_with_displayed_at?: string | null
          shared_with_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_shares_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      note_tag_assignments: {
        Row: {
          created_at: string
          note_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          note_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          note_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_tag_assignments_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "note_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      note_tags: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          name: string
          owner_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name: string
          owner_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          owner_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      note_templates: {
        Row: {
          color: string
          content: Json
          created_at: string
          created_by: string | null
          description: string
          display_order: number
          icon: string
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          description: string
          display_order?: number
          icon: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          description?: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          color: string
          content: Json
          created_at: string
          deleted_at: string | null
          folder_id: string | null
          id: string
          is_archived: boolean
          is_favorite: boolean
          is_pinned: boolean
          last_opened_at: string | null
          owner_id: string
          position: number
          purge_after: string | null
          search_vector: unknown
          template_id: string | null
          template_snapshot: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          color?: string
          content?: Json
          created_at?: string
          deleted_at?: string | null
          folder_id?: string | null
          id?: string
          is_archived?: boolean
          is_favorite?: boolean
          is_pinned?: boolean
          last_opened_at?: string | null
          owner_id: string
          position?: number
          purge_after?: string | null
          search_vector?: unknown
          template_id?: string | null
          template_snapshot?: Json | null
          title?: string
          updated_at?: string
        }
        Update: {
          color?: string
          content?: Json
          created_at?: string
          deleted_at?: string | null
          folder_id?: string | null
          id?: string
          is_archived?: boolean
          is_favorite?: boolean
          is_pinned?: boolean
          last_opened_at?: string | null
          owner_id?: string
          position?: number
          purge_after?: string | null
          search_vector?: unknown
          template_id?: string | null
          template_snapshot?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "note_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "note_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_outbox: {
        Row: {
          created_at: string
          id: string
          payload: Json
          source: string
          source_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          source: string
          source_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          source?: string
          source_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          expires_at: string
          id: string
          metadata: Json
          module: string
          push_error: string | null
          push_sent_at: string | null
          read_at: string | null
          recipient_id: string
          title: string
          type: string
        }
        Insert: {
          body: string
          created_at?: string
          expires_at?: string
          id?: string
          metadata?: Json
          module?: string
          push_error?: string | null
          push_sent_at?: string | null
          read_at?: string | null
          recipient_id: string
          title: string
          type: string
        }
        Update: {
          body?: string
          created_at?: string
          expires_at?: string
          id?: string
          metadata?: Json
          module?: string
          push_error?: string | null
          push_sent_at?: string | null
          read_at?: string | null
          recipient_id?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_method: string
          plan_id: string
          status: string
          subscription_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          payment_method?: string
          plan_id: string
          status: string
          subscription_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_method?: string
          plan_id?: string
          status?: string
          subscription_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          color: string
          created_at: string
          description: string
          device_limit: number
          features: Json
          highlights: string[]
          id: string
          is_active: boolean
          monthly_price: number
          name: string
          offer_limit: number
          sort_order: number
          storage_gb: number
          updated_at: string
          yearly_price: number
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string
          device_limit?: number
          features?: Json
          highlights?: string[]
          id: string
          is_active?: boolean
          monthly_price?: number
          name: string
          offer_limit?: number
          sort_order?: number
          storage_gb?: number
          updated_at?: string
          yearly_price?: number
        }
        Update: {
          color?: string
          created_at?: string
          description?: string
          device_limit?: number
          features?: Json
          highlights?: string[]
          id?: string
          is_active?: boolean
          monthly_price?: number
          name?: string
          offer_limit?: number
          sort_order?: number
          storage_gb?: number
          updated_at?: string
          yearly_price?: number
        }
        Relationships: []
      }
      profile: {
        Row: {
          account_status: string
          assistant_name: string | null
          assistant_tone: string | null
          avatar_file_id: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          is_public: boolean
          last_name: string
          location: string | null
          network_visibility: string
          normalized_phone: string | null
          occupation: string | null
          phone_dial_code: string | null
          phone_number: string | null
          role: Database["public"]["Enums"]["profile_role"]
          timezone: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          account_status?: string
          assistant_name?: string | null
          assistant_tone?: string | null
          avatar_file_id?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id: string
          is_public?: boolean
          last_name: string
          location?: string | null
          network_visibility?: string
          normalized_phone?: string | null
          occupation?: string | null
          phone_dial_code?: string | null
          phone_number?: string | null
          role?: Database["public"]["Enums"]["profile_role"]
          timezone?: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          account_status?: string
          assistant_name?: string | null
          assistant_tone?: string | null
          avatar_file_id?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          is_public?: boolean
          last_name?: string
          location?: string | null
          network_visibility?: string
          normalized_phone?: string | null
          occupation?: string | null
          phone_dial_code?: string | null
          phone_number?: string | null
          role?: Database["public"]["Enums"]["profile_role"]
          timezone?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_avatar_file_id_fkey"
            columns: ["avatar_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_social_links_legacy: {
        Row: {
          created_at: string
          id: string
          platform: Database["public"]["Enums"]["social_platform"]
          profile_id: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: Database["public"]["Enums"]["social_platform"]
          profile_id: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: Database["public"]["Enums"]["social_platform"]
          profile_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_social_links_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      push_devices: {
        Row: {
          app_version: string | null
          created_at: string
          device_id: string | null
          device_session_id: string | null
          onesignal_subscription_id: string
          id: string
          is_active: boolean
          last_seen_at: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          device_id?: string | null
          device_session_id?: string | null
          onesignal_subscription_id: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          platform: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          device_id?: string | null
          device_session_id?: string | null
          onesignal_subscription_id?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_devices_device_session_id_fkey"
            columns: ["device_session_id"]
            isOneToOne: false
            referencedRelation: "device_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_login_challenges: {
        Row: {
          approved_at: string | null
          browser_nonce_hash: string | null
          challenge_token_hash: string
          consumed_at: string | null
          created_at: string
          device_session_id: string | null
          expires_at: string
          id: string
          status: string
          web_session_token_ciphertext: string | null
        }
        Insert: {
          approved_at?: string | null
          browser_nonce_hash?: string | null
          challenge_token_hash: string
          consumed_at?: string | null
          created_at?: string
          device_session_id?: string | null
          expires_at: string
          id?: string
          status?: string
          web_session_token_ciphertext?: string | null
        }
        Update: {
          approved_at?: string | null
          browser_nonce_hash?: string | null
          challenge_token_hash?: string
          consumed_at?: string | null
          created_at?: string
          device_session_id?: string | null
          expires_at?: string
          id?: string
          status?: string
          web_session_token_ciphertext?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_login_challenges_device_session_id_fkey"
            columns: ["device_session_id"]
            isOneToOne: false
            referencedRelation: "device_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      social_links: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          owner_type: string
          platform: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          owner_type: string
          platform: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          owner_type?: string
          platform?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      status_follows: {
        Row: {
          accepted_at: string | null
          created_at: string
          follower_actor_type: Database["public"]["Enums"]["status_actor_type"]
          follower_commercial_profile_id: string | null
          follower_profile_id: string | null
          id: string
          rejected_at: string | null
          requested_at: string
          responded_at: string | null
          state: Database["public"]["Enums"]["status_follow_state"]
          target_actor_type: Database["public"]["Enums"]["status_actor_type"]
          target_commercial_profile_id: string | null
          target_profile_id: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          follower_actor_type: Database["public"]["Enums"]["status_actor_type"]
          follower_commercial_profile_id?: string | null
          follower_profile_id?: string | null
          id?: string
          rejected_at?: string | null
          requested_at?: string
          responded_at?: string | null
          state?: Database["public"]["Enums"]["status_follow_state"]
          target_actor_type: Database["public"]["Enums"]["status_actor_type"]
          target_commercial_profile_id?: string | null
          target_profile_id?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          follower_actor_type?: Database["public"]["Enums"]["status_actor_type"]
          follower_commercial_profile_id?: string | null
          follower_profile_id?: string | null
          id?: string
          rejected_at?: string | null
          requested_at?: string
          responded_at?: string | null
          state?: Database["public"]["Enums"]["status_follow_state"]
          target_actor_type?: Database["public"]["Enums"]["status_actor_type"]
          target_commercial_profile_id?: string | null
          target_profile_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_follows_follower_commercial_profile_id_fkey"
            columns: ["follower_commercial_profile_id"]
            isOneToOne: false
            referencedRelation: "commercial_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_follows_follower_profile_id_fkey"
            columns: ["follower_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_follows_target_commercial_profile_id_fkey"
            columns: ["target_commercial_profile_id"]
            isOneToOne: false
            referencedRelation: "commercial_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_follows_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      status_stories: {
        Row: {
          actor_commercial_profile_id: string | null
          actor_profile_id: string | null
          actor_type: Database["public"]["Enums"]["status_actor_type"]
          caption: string | null
          created_at: string
          deleted_at: string | null
          editor_metadata: Json
          expires_at: string
          id: string
          kind: Database["public"]["Enums"]["status_story_kind"]
          manually_archived_at: string | null
          text_background_id: string | null
          text_content: string | null
          updated_at: string
        }
        Insert: {
          actor_commercial_profile_id?: string | null
          actor_profile_id?: string | null
          actor_type: Database["public"]["Enums"]["status_actor_type"]
          caption?: string | null
          created_at?: string
          deleted_at?: string | null
          editor_metadata?: Json
          expires_at?: string
          id?: string
          kind: Database["public"]["Enums"]["status_story_kind"]
          manually_archived_at?: string | null
          text_background_id?: string | null
          text_content?: string | null
          updated_at?: string
        }
        Update: {
          actor_commercial_profile_id?: string | null
          actor_profile_id?: string | null
          actor_type?: Database["public"]["Enums"]["status_actor_type"]
          caption?: string | null
          created_at?: string
          deleted_at?: string | null
          editor_metadata?: Json
          expires_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["status_story_kind"]
          manually_archived_at?: string | null
          text_background_id?: string | null
          text_content?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_stories_actor_commercial_profile_id_fkey"
            columns: ["actor_commercial_profile_id"]
            isOneToOne: false
            referencedRelation: "commercial_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_stories_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_stories_text_background_id_fkey"
            columns: ["text_background_id"]
            isOneToOne: false
            referencedRelation: "status_text_backgrounds"
            referencedColumns: ["id"]
          },
        ]
      }
      status_story_archives: {
        Row: {
          archive_reason: Database["public"]["Enums"]["status_story_archive_reason"]
          archived_at: string
          created_at: string
          id: string
          story_id: string
        }
        Insert: {
          archive_reason: Database["public"]["Enums"]["status_story_archive_reason"]
          archived_at?: string
          created_at?: string
          id?: string
          story_id: string
        }
        Update: {
          archive_reason?: Database["public"]["Enums"]["status_story_archive_reason"]
          archived_at?: string
          created_at?: string
          id?: string
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_story_archives_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: true
            referencedRelation: "status_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      status_story_commercial_offers: {
        Row: {
          commercial_offer_id: string
          commercial_offer_image_id: string
          commercial_profile_id: string
          created_at: string
          image_layer_id: string
          offer_kind_snapshot: Database["public"]["Enums"]["commercial_offer_kind"]
          offer_title_snapshot: string
          rotation: number
          scale: number
          size: number
          story_id: string
          updated_at: string
          x: number
          y: number
        }
        Insert: {
          commercial_offer_id: string
          commercial_offer_image_id: string
          commercial_profile_id: string
          created_at?: string
          image_layer_id: string
          offer_kind_snapshot: Database["public"]["Enums"]["commercial_offer_kind"]
          offer_title_snapshot: string
          rotation?: number
          scale?: number
          size?: number
          story_id: string
          updated_at?: string
          x?: number
          y?: number
        }
        Update: {
          commercial_offer_id?: string
          commercial_offer_image_id?: string
          commercial_profile_id?: string
          created_at?: string
          image_layer_id?: string
          offer_kind_snapshot?: Database["public"]["Enums"]["commercial_offer_kind"]
          offer_title_snapshot?: string
          rotation?: number
          scale?: number
          size?: number
          story_id?: string
          updated_at?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "status_story_commercial_offers_commercial_offer_id_fkey"
            columns: ["commercial_offer_id"]
            isOneToOne: false
            referencedRelation: "commercial_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_story_commercial_offers_commercial_offer_image_id_fkey"
            columns: ["commercial_offer_image_id"]
            isOneToOne: false
            referencedRelation: "commercial_offer_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_story_commercial_offers_commercial_profile_id_fkey"
            columns: ["commercial_profile_id"]
            isOneToOne: false
            referencedRelation: "commercial_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_story_commercial_offers_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: true
            referencedRelation: "status_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      status_story_image_layers: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          mime_type: string
          original_name: string
          rotation: number
          scale: number
          size: number
          size_bytes: number
          sort_order: number
          storage_path: string
          story_id: string
          updated_at: string
          x: number
          y: number
        }
        Insert: {
          bucket_id?: string
          created_at?: string
          id?: string
          mime_type: string
          original_name: string
          rotation?: number
          scale?: number
          size?: number
          size_bytes: number
          sort_order?: number
          storage_path: string
          story_id: string
          updated_at?: string
          x?: number
          y?: number
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          mime_type?: string
          original_name?: string
          rotation?: number
          scale?: number
          size?: number
          size_bytes?: number
          sort_order?: number
          storage_path?: string
          story_id?: string
          updated_at?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "status_story_image_layers_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "status_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      status_story_media: {
        Row: {
          bucket_id: string
          created_at: string
          duration_seconds: number | null
          height: number | null
          id: string
          mime_type: string
          original_name: string
          size_bytes: number
          storage_path: string
          story_id: string
          updated_at: string
          width: number | null
        }
        Insert: {
          bucket_id?: string
          created_at?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          mime_type: string
          original_name: string
          size_bytes: number
          storage_path: string
          story_id: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          bucket_id?: string
          created_at?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          mime_type?: string
          original_name?: string
          size_bytes?: number
          storage_path?: string
          story_id?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "status_story_media_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: true
            referencedRelation: "status_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      status_story_views: {
        Row: {
          created_at: string
          id: string
          story_id: string
          viewed_at: string
          viewer_profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          story_id: string
          viewed_at?: string
          viewer_profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          story_id?: string
          viewed_at?: string
          viewer_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "status_stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_story_views_viewer_profile_id_fkey"
            columns: ["viewer_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      status_text_backgrounds: {
        Row: {
          code: string
          created_at: string
          hex_color: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          hex_color: string
          id?: string
          is_active?: boolean
          label: string
          sort_order: number
        }
        Update: {
          code?: string
          created_at?: string
          hex_color?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      status_user_blocks: {
        Row: {
          blocked_profile_id: string
          blocker_profile_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_profile_id: string
          blocker_profile_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_profile_id?: string
          blocker_profile_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_user_blocks_blocked_profile_id_fkey"
            columns: ["blocked_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_user_blocks_blocker_profile_id_fkey"
            columns: ["blocker_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_uploads: {
        Row: {
          completed_at: string | null
          created_at: string
          expected_size_bytes: number
          expires_at: string
          file_id: string
          id: string
          owner_id: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          expected_size_bytes: number
          expires_at?: string
          file_id: string
          id?: string
          owner_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          expected_size_bytes?: number
          expires_at?: string
          file_id?: string
          id?: string
          owner_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_uploads_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: true
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_period: string
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          id: string
          plan_id: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_period?: string
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_period?: string
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reports: {
        Row: {
          created_at: string
          detail: string
          id: string
          reason: string
          reported_content: string
          reported_user_id: string
          reporter_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          detail?: string
          id?: string
          reason: string
          reported_content?: string
          reported_user_id: string
          reporter_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          detail?: string
          id?: string
          reason?: string
          reported_content?: string
          reported_user_id?: string
          reporter_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sanctions: {
        Row: {
          admin_id: string | null
          created_at: string
          id: string
          reason: string
          sanction_type: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          id?: string
          reason: string
          sanction_type: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          id?: string
          reason?: string
          sanction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sanctions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sanctions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      calendar_integrations_safe: {
        Row: {
          connected_at: string | null
          created_at: string | null
          disconnected_at: string | null
          granted_scopes: string[] | null
          id: string | null
          last_attempted_sync_at: string | null
          last_error_code: string | null
          last_error_message: string | null
          last_successful_sync_at: string | null
          metadata: Json | null
          next_sync_at: string | null
          provider: Database["public"]["Enums"]["calendar_provider"] | null
          provider_account_id: string | null
          provider_display_name: string | null
          provider_email: string | null
          reauth_required_at: string | null
          status:
            | Database["public"]["Enums"]["calendar_integration_status"]
            | null
          token_encryption_version: number | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          connected_at?: string | null
          created_at?: string | null
          disconnected_at?: string | null
          granted_scopes?: string[] | null
          id?: string | null
          last_attempted_sync_at?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          last_successful_sync_at?: string | null
          metadata?: Json | null
          next_sync_at?: string | null
          provider?: Database["public"]["Enums"]["calendar_provider"] | null
          provider_account_id?: string | null
          provider_display_name?: string | null
          provider_email?: string | null
          reauth_required_at?: string | null
          status?:
            | Database["public"]["Enums"]["calendar_integration_status"]
            | null
          token_encryption_version?: number | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          connected_at?: string | null
          created_at?: string | null
          disconnected_at?: string | null
          granted_scopes?: string[] | null
          id?: string | null
          last_attempted_sync_at?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          last_successful_sync_at?: string | null
          metadata?: Json | null
          next_sync_at?: string | null
          provider?: Database["public"]["Enums"]["calendar_provider"] | null
          provider_account_id?: string | null
          provider_display_name?: string | null
          provider_email?: string | null
          reauth_required_at?: string | null
          status?:
            | Database["public"]["Enums"]["calendar_integration_status"]
            | null
          token_encryption_version?: number | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      commercial_profile_social_links: {
        Row: {
          commercial_profile_id: string | null
          created_at: string | null
          id: string | null
          platform: string | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          commercial_profile_id?: string | null
          created_at?: string | null
          id?: string | null
          platform?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          commercial_profile_id?: string | null
          created_at?: string | null
          id?: string | null
          platform?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      integration_account_overview: {
        Row: {
          calendar_integration_id: string | null
          capabilities: Json | null
          id: string | null
          mail_integration_id: string | null
          provider: Database["public"]["Enums"]["integration_provider"] | null
          provider_email: string | null
          status:
            | Database["public"]["Enums"]["integration_connection_status"]
            | null
          user_id: string | null
        }
        Relationships: []
      }
      integration_connections_safe: {
        Row: {
          capabilities: Json | null
          created_at: string | null
          disconnected_at: string | null
          granted_scopes: Json | null
          id: string | null
          last_error_code: string | null
          last_error_message: string | null
          last_successful_auth_at: string | null
          last_token_refresh_at: string | null
          metadata: Json | null
          provider: Database["public"]["Enums"]["integration_provider"] | null
          provider_account_id: string | null
          provider_avatar_url: string | null
          provider_display_name: string | null
          provider_email: string | null
          provider_tenant_id: string | null
          reauth_required_at: string | null
          status:
            | Database["public"]["Enums"]["integration_connection_status"]
            | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          capabilities?: Json | null
          created_at?: string | null
          disconnected_at?: string | null
          granted_scopes?: Json | null
          id?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          last_successful_auth_at?: string | null
          last_token_refresh_at?: string | null
          metadata?: Json | null
          provider?: Database["public"]["Enums"]["integration_provider"] | null
          provider_account_id?: string | null
          provider_avatar_url?: string | null
          provider_display_name?: string | null
          provider_email?: string | null
          provider_tenant_id?: string | null
          reauth_required_at?: string | null
          status?:
            | Database["public"]["Enums"]["integration_connection_status"]
            | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          capabilities?: Json | null
          created_at?: string | null
          disconnected_at?: string | null
          granted_scopes?: Json | null
          id?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          last_successful_auth_at?: string | null
          last_token_refresh_at?: string | null
          metadata?: Json | null
          provider?: Database["public"]["Enums"]["integration_provider"] | null
          provider_account_id?: string | null
          provider_avatar_url?: string | null
          provider_display_name?: string | null
          provider_email?: string | null
          provider_tenant_id?: string | null
          reauth_required_at?: string | null
          status?:
            | Database["public"]["Enums"]["integration_connection_status"]
            | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profile_social_links: {
        Row: {
          created_at: string | null
          id: string | null
          platform: string | null
          profile_id: string | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          platform?: string | null
          profile_id?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          platform?: string | null
          profile_id?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_activity_feed: { Args: { p_limit?: number }; Returns: Json }
      admin_apply_sanction: {
        Args: { p_reason: string; p_type: string; p_user_id: string }
        Returns: Json
      }
      admin_campaign_recipient_ids: {
        Args: { p_mode: string; p_segment: Json; p_user_ids: string[] }
        Returns: string[]
      }
      admin_dashboard_kpis: { Args: never; Returns: Json }
      admin_get_settings: { Args: never; Returns: Json }
      admin_list_campaigns: { Args: never; Returns: Json }
      admin_list_plans: { Args: never; Returns: Json }
      admin_list_transactions: {
        Args: {
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_status?: string
        }
        Returns: Json
      }
      admin_list_users: {
        Args: {
          p_page?: number
          p_page_size?: number
          p_plan?: string
          p_search?: string
          p_status?: string
        }
        Returns: Json
      }
      admin_module_usage: { Args: never; Returns: Json }
      admin_plan_distribution: { Args: never; Returns: Json }
      admin_revenue_series: { Args: { p_months?: number }; Returns: Json }
      admin_send_notification_campaign: {
        Args: {
          p_body: string
          p_mode: string
          p_scheduled_for?: string
          p_segment?: Json
          p_title: string
          p_user_ids?: string[]
        }
        Returns: Json
      }
      admin_set_report_status: {
        Args: { p_report_id: string; p_status: string }
        Returns: Json
      }
      admin_set_setting: {
        Args: { p_key: string; p_value: string }
        Returns: Json
      }
      admin_set_user_status: {
        Args: {
          p_status?: string
          p_user_id: string
          p_verification?: string
          p_visibility?: string
        }
        Returns: Json
      }
      admin_subscription_flow: { Args: { p_months?: number }; Returns: Json }
      admin_subscription_kpis: { Args: never; Returns: Json }
      admin_update_plan: {
        Args: {
          p_description: string
          p_device_limit: number
          p_features: Json
          p_highlights: string[]
          p_monthly_price: number
          p_name: string
          p_offer_limit: number
          p_plan_id: string
          p_storage_gb: number
          p_yearly_price: number
        }
        Returns: Json
      }
      admin_user_detail: { Args: { p_user_id: string }; Returns: Json }
      admin_user_growth: { Args: { p_months?: number }; Returns: Json }
      assert_admin: { Args: never; Returns: undefined }
      assert_note_user: { Args: { p_user_id: string }; Returns: undefined }
      attach_file_to_note: {
        Args: {
          p_attachment_type?: string
          p_display_order?: number
          p_file_id: string
          p_note_id: string
          p_user_id: string
        }
        Returns: string
      }
      beeapp_has_active_auth_device_session: { Args: never; Returns: boolean }
      beeapp_revoke_all_user_sessions: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      calculate_calendar_reminder_schedule: {
        Args: {
          p_all_day_reminder_time?: string
          p_event_id: string
          p_offset_minutes: number
        }
        Returns: string
      }
      calendar_share_permission_for_user: {
        Args: { p_calendar_id: string; p_user_id?: string }
        Returns: Database["public"]["Enums"]["calendar_share_permission"]
      }
      call_get_direct_other_identity_id: {
        Args: { p_conversation_id: string; p_identity_id: string }
        Returns: string
      }
      call_get_eligible_conversation: {
        Args: { p_conversation_id: string }
        Returns: {
          conversation_type: Database["public"]["Enums"]["chat_conversation_type"]
          created_at: string
          created_by_identity_id: string
          description: string | null
          direct_key: string | null
          id: string
          image_file_id: string | null
          is_active: boolean
          last_message_at: string | null
          last_message_id: string | null
          name: string | null
          posting_identity_id: string | null
          posting_policy: Database["public"]["Enums"]["chat_group_posting_policy"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "chat_conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      call_get_identity_owner_id: {
        Args: { p_identity_id: string }
        Returns: string
      }
      call_get_open_session_for_conversation: {
        Args: { p_conversation_id: string }
        Returns: {
          agora_channel_name: string
          call_type: Database["public"]["Enums"]["call_type"]
          conversation_id: string
          created_at: string
          end_reason: string | null
          ended_at: string | null
          ended_by_identity_id: string | null
          id: string
          initiated_by_identity_id: string
          max_participants: number
          metadata: Json
          ringing_expires_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["call_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "call_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      call_lock_owner: { Args: { p_owner_id: string }; Returns: undefined }
      call_lock_owners: {
        Args: { p_owner_a: string; p_owner_b: string }
        Returns: undefined
      }
      call_owner_has_open_call: {
        Args: { p_exclude_call_id?: string; p_owner_id: string }
        Returns: boolean
      }
      call_reconcile_open_sessions: {
        Args: { p_limit?: number }
        Returns: {
          call_id: string
          end_reason: string
          ended_at: string
          final_status: Database["public"]["Enums"]["call_status"]
          previous_status: Database["public"]["Enums"]["call_status"]
        }[]
      }
      call_require_active_conversation_participant: {
        Args: { p_conversation_id: string; p_identity_id: string }
        Returns: {
          cleared_at: string | null
          cleared_before_message_id: string | null
          conversation_id: string
          created_at: string
          id: string
          identity_id: string
          is_pinned: boolean
          joined_at: string
          last_delivered_at: string | null
          last_delivered_message_id: string | null
          last_read_at: string | null
          last_read_message_id: string | null
          left_at: string | null
          notifications_enabled: boolean
          removed_at: string | null
          removed_by_identity_id: string | null
          role: Database["public"]["Enums"]["chat_participant_role"]
          unread_count: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "chat_conversation_participants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      call_require_identity_owned_by_user: {
        Args: { p_identity_id: string; p_user_id: string }
        Returns: undefined
      }
      can_edit_calendar_event: {
        Args: { p_event_id: string; p_user_id?: string }
        Returns: boolean
      }
      can_manage_calendar_event_attendees: {
        Args: { p_event_id: string; p_user_id?: string }
        Returns: boolean
      }
      can_view_calendar_event: {
        Args: { p_event_id: string; p_user_id?: string }
        Returns: boolean
      }
      cancel_call_join_attempt: {
        Args: {
          p_actor_identity_id: string
          p_call_id: string
          p_failure_reason?: string
        }
        Returns: {
          accepted_at: string | null
          agora_uid: number
          call_id: string
          created_at: string
          declined_at: string | null
          id: string
          identity_id: string
          invited_at: string
          joined_at: string | null
          kicked_at: string | null
          kicked_by_identity_id: string | null
          left_at: string | null
          metadata: Json
          missed_at: string | null
          status: Database["public"]["Enums"]["call_participant_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "call_participants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_storage_upload: {
        Args: { p_upload_id: string; p_user_id: string }
        Returns: boolean
      }
      chat_active_recipient_user_ids: {
        Args: { p_conversation_id: string; p_exclude_user_id?: string }
        Returns: {
          recipient_user_id: string
        }[]
      }
      chat_file_is_attached: { Args: { p_file_id: string }; Returns: boolean }
      chat_identity_belongs_to_user: {
        Args: { p_identity_id: string; p_user_id?: string }
        Returns: boolean
      }
      chat_identity_can_send_message: {
        Args: {
          p_conversation_id: string
          p_identity_id: string
          p_user_id?: string
        }
        Returns: boolean
      }
      chat_identity_owner_id: {
        Args: { p_identity_id: string }
        Returns: string
      }
      chat_identity_owner_user_id: {
        Args: { p_identity_id: string }
        Returns: string
      }
      chat_is_active_participant: {
        Args: { p_conversation_id: string; p_identity_id: string }
        Returns: boolean
      }
      chat_presence_emit_transition: {
        Args: { p_expires_at: string; p_identity_id: string; p_online: boolean }
        Returns: number
      }
      chat_presence_expire_stale: {
        Args: { p_batch_size?: number }
        Returns: number
      }
      chat_presence_list_for_inbox: {
        Args: { p_target_identity_ids: string[]; p_viewer_identity_id: string }
        Returns: {
          expires_at: string
          identity_id: string
          is_online: boolean
        }[]
      }
      chat_presence_list_with_last_seen: {
        Args: { p_target_identity_ids: string[]; p_viewer_identity_id: string }
        Returns: {
          expires_at: string
          identity_id: string
          is_online: boolean
          last_seen_at: string
        }[]
      }
      chat_presence_set_own_identity: {
        Args: { p_identity_id: string; p_online: boolean }
        Returns: boolean
      }
      chat_user_can_act_in_conversation: {
        Args: {
          p_conversation_id: string
          p_identity_id: string
          p_user_id?: string
        }
        Returns: boolean
      }
      chat_user_can_manage_group: {
        Args: { p_conversation_id: string; p_user_id?: string }
        Returns: boolean
      }
      chat_user_can_manage_group_as_identity: {
        Args: {
          p_conversation_id: string
          p_identity_id: string
          p_user_id?: string
        }
        Returns: boolean
      }
      chat_user_can_view_conversation: {
        Args: { p_conversation_id: string; p_user_id?: string }
        Returns: boolean
      }
      chat_user_group_role: {
        Args: {
          p_conversation_id: string
          p_identity_id: string
          p_user_id?: string
        }
        Returns: Database["public"]["Enums"]["chat_participant_role"]
      }
      chat_user_is_group_owner: {
        Args: {
          p_conversation_id: string
          p_identity_id: string
          p_user_id?: string
        }
        Returns: boolean
      }
      claim_chat_push_notifications: {
        Args: { p_limit?: number }
        Returns: {
          chat_notification_id: string
          conversation_id: string
          onesignal_subscription_id: string
          message_id: string
          notification_body: string
          notification_metadata: Json
          notification_title: string
          platform: string
          recipient_identity_id: string
          recipient_user_id: string
        }[]
      }
      clear_chat_conversation: {
        Args: { p_conversation_id: string; p_identity_id: string }
        Returns: boolean
      }
      commerce_accept_fixed_request_item: {
        Args: { p_commerce_request_item_id: string }
        Returns: Json
      }
      commerce_accept_item_proposal: {
        Args: { p_commerce_request_proposal_id: string }
        Returns: Json
      }
      commerce_accept_request: {
        Args: { p_commerce_request_id: string }
        Returns: string
      }
      commerce_accept_request_proposal: {
        Args: { p_commerce_request_proposal_id: string }
        Returns: string
      }
      commerce_add_business_days: {
        Args: {
          p_business_days: number
          p_starts_at: string
          p_timezone?: string
        }
        Returns: string
      }
      commerce_add_draft_request_item: {
        Args: {
          p_commerce_request_id: string
          p_commercial_offer_id: string
          p_modality: Database["public"]["Enums"]["commercial_profile_modality"]
          p_quantity?: number
        }
        Returns: string
      }
      commerce_adjust_offer_inventory: {
        Args: {
          p_commercial_profile_id: string
          p_offer_id: string
          p_quantity_delta: number
          p_reason_code: string
          p_reason_text?: string
        }
        Returns: number
      }
      commerce_available_inventory: {
        Args: { p_commercial_offer_id: string }
        Returns: number
      }
      commerce_cancel_request: {
        Args: { p_cancellation_reason?: string; p_commerce_request_id: string }
        Returns: string
      }
      commerce_close_dispute: {
        Args: { p_closure_note?: string; p_commerce_dispute_id: string }
        Returns: string
      }
      commerce_close_request_item: {
        Args: {
          p_action: string
          p_commerce_request_item_id: string
          p_reason_code?: string
          p_reason_text?: string
        }
        Returns: Json
      }
      commerce_complete_request: {
        Args: { p_commerce_request_id: string; p_completion_note?: string }
        Returns: string
      }
      commerce_confirm_mixed_cash_on_delivery: {
        Args: { p_commerce_request_id: string }
        Returns: Json
      }
      commerce_confirm_request: {
        Args: { p_commerce_request_id: string }
        Returns: string
      }
      commerce_create_draft_request: {
        Args: {
          p_commercial_profile_id: string
          p_customer_note?: string
          p_delivery_address?: string
          p_delivery_reference?: string
          p_request_type: Database["public"]["Enums"]["commerce_request_type"]
          p_requested_modality: Database["public"]["Enums"]["commercial_profile_modality"]
        }
        Returns: string
      }
      commerce_create_item_proposal: {
        Args: {
          p_commerce_request_item_id: string
          p_note?: string
          p_proposed_ends_at?: string
          p_proposed_quantity?: number
          p_proposed_starts_at?: string
          p_proposed_unit_price_amount?: number
          p_requested_modality?: Database["public"]["Enums"]["commercial_profile_modality"]
          p_timezone?: string
        }
        Returns: Json
      }
      commerce_create_mixed_request: {
        Args: {
          p_commercial_profile_id: string
          p_customer_note?: string
          p_delivery_address?: string
          p_delivery_reference?: string
          p_idempotency_key?: string
          p_items?: Json
          p_requested_modality: Database["public"]["Enums"]["commercial_profile_modality"]
        }
        Returns: Json
      }
      commerce_create_request: {
        Args: { p_idempotency_key: string; p_request_payload: Json }
        Returns: Json
      }
      commerce_create_request_proposal: {
        Args: {
          p_delivery_fee_amount?: number
          p_note?: string
          p_proposed_ends_at?: string
          p_proposed_starts_at?: string
          p_request_id: string
          p_requested_modality?: string
          p_subtotal_amount?: number
          p_terms_snapshot?: Json
          p_timezone?: string
          p_total_amount?: number
        }
        Returns: Json
      }
      commerce_create_reservation_hold: {
        Args: {
          p_commerce_request_id: string
          p_starts_at: string
          p_timezone: string
        }
        Returns: string
      }
      commerce_create_story: {
        Args: {
          p_caption?: string
          p_commercial_profile_id: string
          p_cta_id?: string
          p_cta_type?: string
          p_editor_metadata?: Json
          p_kind: Database["public"]["Enums"]["status_story_kind"]
          p_text_background_id?: string
          p_text_content?: string
        }
        Returns: string
      }
      commerce_current_user_is_admin: {
        Args: { p_user_id?: string }
        Returns: boolean
      }
      commerce_enqueue_notification: {
        Args: {
          p_body: string
          p_metadata?: Json
          p_recipient_id: string
          p_title: string
          p_type: string
        }
        Returns: string
      }
      commerce_expire_inventory_holds: {
        Args: { p_limit?: number }
        Returns: {
          commerce_inventory_hold_id: string
          commerce_request_id: string
          commercial_offer_id: string
        }[]
      }
      commerce_expire_mixed_payment_requests: {
        Args: { p_limit?: number }
        Returns: {
          cancelled_reservation_count: number
          commerce_request_id: string
          expired_item_count: number
          released_inventory_hold_count: number
        }[]
      }
      commerce_expire_reservation_holds: {
        Args: { p_limit?: number }
        Returns: {
          commerce_request_id: string
          commerce_reservation_id: string
          commercial_profile_id: string
        }[]
      }
      commerce_expire_submitted_requests: {
        Args: { p_limit?: number }
        Returns: {
          commerce_request_id: string
          expired_hold_count: number
        }[]
      }
      commerce_get_admin_audit_timeline: {
        Args: { p_entity_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          action: string
          actor_profile_id: string
          actor_role_snapshot: Database["public"]["Enums"]["profile_role"]
          commercial_profile_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json
          new_state: string
          previous_state: string
          reason_code: string
          reason_text: string
          reference_id: string
          reference_type: string
        }[]
      }
      commerce_get_admin_dispute_detail: {
        Args: { p_commerce_dispute_id: string }
        Returns: Json
      }
      commerce_get_mixed_request_payment_options: {
        Args: { p_commerce_request_id: string }
        Returns: Json
      }
      commerce_get_or_create_chat_conversation: {
        Args: { p_commercial_profile_id: string }
        Returns: string
      }
      commerce_get_or_create_request_chat: {
        Args: { p_commerce_request_id: string }
        Returns: string
      }
      commerce_get_payment_proof_context: {
        Args: { p_commerce_payment_proof_id: string }
        Returns: Json
      }
      commerce_get_request_detail: {
        Args: { p_commerce_request_id: string }
        Returns: {
          client_id: string
          code: string
          commercial_profile_id: string
          created_at: string
          currency_code: string
          customer_note: string
          delivery_address: string
          delivery_fee_amount: number
          delivery_reference: string
          expires_at: string
          final_terms: Json
          id: string
          items: Json
          request_type: Database["public"]["Enums"]["commerce_request_type"]
          requested_modality: Database["public"]["Enums"]["commercial_profile_modality"]
          status: Database["public"]["Enums"]["commerce_request_status"]
          subtotal_amount: number
          total_amount: number
          updated_at: string
        }[]
      }
      commerce_get_request_formal_detail: {
        Args: { p_commerce_request_id: string }
        Returns: Json
      }
      commerce_get_request_timeline: {
        Args: { p_commerce_request_id: string }
        Returns: {
          events: Json
          proposals: Json
          request_id: string
          request_status: Database["public"]["Enums"]["commerce_request_status"]
        }[]
      }
      commerce_list_disputes: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_statuses?: Database["public"]["Enums"]["commerce_dispute_status"][]
        }
        Returns: {
          closed_at: string
          closed_by_profile_id: string
          commerce_request_id: string
          commercial_profile_id: string
          created_at: string
          id: string
          opened_by_profile_id: string
          reason_code: string
          reason_text: string
          request_code: string
          resolution_text: string
          resolved_at: string
          resolved_by_profile_id: string
          status: Database["public"]["Enums"]["commerce_dispute_status"]
          updated_at: string
        }[]
      }
      commerce_list_payment_proofs: {
        Args: {
          p_commercial_profile_id: string
          p_limit?: number
          p_offset?: number
          p_statuses?: Database["public"]["Enums"]["commerce_payment_proof_status"][]
        }
        Returns: {
          commerce_request_id: string
          confirmed_at: string
          created_at: string
          file_id: string
          id: string
          note: string
          payment_method_id: string
          payment_method_snapshot: Json
          payment_reference: string
          rejected_at: string
          rejection_reason: string
          replaced_by_proof_id: string
          request_code: string
          status: Database["public"]["Enums"]["commerce_payment_proof_status"]
          submitted_by_profile_id: string
          updated_at: string
        }[]
      }
      commerce_list_requests: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_scope?: string
          p_statuses?: Database["public"]["Enums"]["commerce_request_status"][]
        }
        Returns: {
          client_id: string
          code: string
          commercial_profile_id: string
          created_at: string
          currency_code: string
          delivery_fee_amount: number
          expires_at: string
          id: string
          item_count: number
          request_type: Database["public"]["Enums"]["commerce_request_type"]
          requested_modality: Database["public"]["Enums"]["commercial_profile_modality"]
          status: Database["public"]["Enums"]["commerce_request_status"]
          subtotal_amount: number
          total_amount: number
          updated_at: string
        }[]
      }
      commerce_open_dispute: {
        Args: {
          p_commerce_request_id: string
          p_reason_code: string
          p_reason_text?: string
        }
        Returns: string
      }
      commerce_public_cities: {
        Args: { p_country_code?: string }
        Returns: {
          business_count: number
          city: string
          country_code: string
        }[]
      }
      commerce_public_countries: {
        Args: never
        Returns: {
          business_count: number
          country_code: string
        }[]
      }
      commerce_public_popular_categories: {
        Args: { p_city?: string; p_country_code?: string; p_limit?: number }
        Returns: {
          business_count: number
          category_id: string
          category_name: string
          category_slug: string
          offer_type: Database["public"]["Enums"]["commercial_offer_type"]
        }[]
      }
      commerce_purge_expired_idempotency_keys: {
        Args: { p_limit?: number }
        Returns: number
      }
      commerce_recalculate_mixed_request: {
        Args: { p_commerce_request_id: string }
        Returns: Json
      }
      commerce_recalculate_request_after_item_transition: {
        Args: { p_commerce_request_id: string }
        Returns: Json
      }
      commerce_refresh_mixed_request_deadlines: {
        Args: { p_commerce_request_id: string }
        Returns: Json
      }
      commerce_reject_item_proposal: {
        Args: { p_commerce_request_item_id: string; p_reason_text?: string }
        Returns: Json
      }
      commerce_reject_request: {
        Args: { p_commerce_request_id: string; p_rejection_reason: string }
        Returns: string
      }
      commerce_reject_request_proposal: {
        Args: {
          p_commerce_request_proposal_id: string
          p_rejection_reason?: string
        }
        Returns: string
      }
      commerce_remove_draft_request_item: {
        Args: { p_request_item_id: string }
        Returns: string
      }
      commerce_replace_draft_request_item: {
        Args: { p_quantity: number; p_request_item_id: string }
        Returns: string
      }
      commerce_replace_mixed_payment_proof: {
        Args: {
          p_file_id: string
          p_note?: string
          p_payment_method_id?: string
          p_payment_reference?: string
          p_rejected_payment_proof_id: string
        }
        Returns: Json
      }
      commerce_replace_payment_proof: {
        Args: {
          p_file_id: string
          p_note?: string
          p_payment_method_id?: string
          p_payment_reference?: string
          p_rejected_payment_proof_id: string
        }
        Returns: string
      }
      commerce_request_item_internal_write_enabled: {
        Args: never
        Returns: boolean
      }
      commerce_request_payment: {
        Args: { p_commerce_request_id: string }
        Returns: string
      }
      commerce_request_payment_methods: {
        Args: { p_commerce_request_id: string }
        Returns: {
          display_name: string
          id: string
          payment_method_type: Database["public"]["Enums"]["commercial_payment_method_type"]
          public_details: Json
          public_instructions: string
          sort_order: number
        }[]
      }
      commerce_reset_mixed_request_payment_deadline: {
        Args: { p_commerce_request_id: string }
        Returns: undefined
      }
      commerce_resolve_dispute: {
        Args: {
          p_commerce_dispute_id: string
          p_resolution_status: Database["public"]["Enums"]["commerce_dispute_status"]
          p_resolution_text: string
        }
        Returns: string
      }
      commerce_resolve_story_cta: {
        Args: { p_story_id: string }
        Returns: Json
      }
      commerce_review_mixed_payment_proof: {
        Args: {
          p_commerce_payment_proof_id: string
          p_decision: Database["public"]["Enums"]["commerce_payment_proof_status"]
          p_rejection_reason?: string
        }
        Returns: Json
      }
      commerce_review_payment_proof: {
        Args: {
          p_commerce_payment_proof_id: string
          p_decision: Database["public"]["Enums"]["commerce_payment_proof_status"]
          p_rejection_reason?: string
        }
        Returns: string
      }
      commerce_run_expiration_jobs: {
        Args: { p_limit?: number }
        Returns: {
          commercial_profile_id: string
          entity_id: string
          job_type: string
        }[]
      }
      commerce_set_offer_primary_image: {
        Args: {
          p_commercial_profile_id: string
          p_image_id: string
          p_offer_id: string
        }
        Returns: string
      }
      commerce_set_profile_publication_status: {
        Args: {
          p_commercial_profile_id: string
          p_reason_code?: string
          p_reason_text?: string
          p_target_status: Database["public"]["Enums"]["commercial_publication_status"]
        }
        Returns: Json
      }
      commerce_settle_confirmed_request: {
        Args: {
          p_actor_profile_id: string
          p_commerce_request_id: string
          p_metadata?: Json
          p_previous_status: Database["public"]["Enums"]["commerce_request_status"]
          p_reason_code: string
        }
        Returns: string
      }
      commerce_share_request_in_chat: {
        Args: {
          p_body?: string
          p_commerce_request_id: string
          p_commerce_reservation_id?: string
        }
        Returns: string
      }
      commerce_submit_mixed_payment_proof: {
        Args: {
          p_commerce_request_id: string
          p_file_id: string
          p_note?: string
          p_payment_method_id?: string
          p_payment_reference?: string
        }
        Returns: Json
      }
      commerce_submit_mixed_request: {
        Args: { p_commerce_request_id: string; p_idempotency_key?: string }
        Returns: Json
      }
      commerce_submit_payment_proof: {
        Args: {
          p_commerce_request_id: string
          p_file_id: string
          p_note?: string
          p_payment_method_id?: string
          p_payment_reference?: string
        }
        Returns: string
      }
      commerce_submit_request: {
        Args: { p_commerce_request_id: string }
        Returns: string
      }
      commerce_transition_request: {
        Args: {
          p_action: string
          p_reason_code?: string
          p_reason_text?: string
          p_request_id: string
        }
        Returns: Json
      }
      commerce_update_item_operational_status: {
        Args: {
          p_commerce_request_item_id: string
          p_next_status: string
          p_reason_text?: string
        }
        Returns: Json
      }
      commerce_upsert_owned_payment_method: {
        Args: {
          p_bank_account?: Json
          p_commercial_profile_id: string
          p_display_name?: string
          p_mobile_account?: Json
          p_payment_method_id?: string
          p_payment_method_type?: Database["public"]["Enums"]["commercial_payment_method_type"]
          p_sort_order?: number
        }
        Returns: {
          archived_at: string
          bank_account: Json
          commercial_profile_id: string
          created_at: string
          display_name: string
          id: string
          mobile_account: Json
          payment_method_type: Database["public"]["Enums"]["commercial_payment_method_type"]
          sort_order: number
          status: Database["public"]["Enums"]["commercial_payment_method_status"]
          updated_at: string
        }[]
      }
      commerce_withdraw_item_proposal: {
        Args: { p_commerce_request_proposal_id: string; p_reason_text?: string }
        Returns: Json
      }
      commerce_withdraw_request_proposal: {
        Args: {
          p_commerce_request_proposal_id: string
          p_withdrawal_reason?: string
        }
        Returns: string
      }
      commerce_write_audit_event: {
        Args: {
          p_action: string
          p_actor_profile_id: string
          p_commercial_profile_id: string
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
          p_new_state?: string
          p_previous_state?: string
          p_reason_code?: string
          p_reason_text?: string
          p_reference_id?: string
          p_reference_type?: string
        }
        Returns: string
      }
      commerce_write_request_audit_event: {
        Args: {
          p_action: string
          p_commerce_request_id: string
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
          p_new_state?: string
          p_previous_state?: string
          p_reason_code?: string
          p_reason_text?: string
          p_reference_id?: string
          p_reference_type?: string
        }
        Returns: string
      }
      commercial_verification_request_is_editable: {
        Args: {
          p_status: Database["public"]["Enums"]["commercial_verification_status"]
        }
        Returns: boolean
      }
      complete_chat_push_notification: {
        Args: {
          p_chat_notification_id: string
          p_error?: string
          p_success: boolean
        }
        Returns: boolean
      }
      complete_storage_upload: {
        Args: { p_upload_id: string; p_user_id: string }
        Returns: {
          file_id: string
          size_bytes: number
          status: Database["public"]["Enums"]["file_status"]
          storage_path: string
        }[]
      }
      configure_account_security_pin: {
        Args: { p_pin_digest: string; p_user_id: string }
        Returns: boolean
      }
      confirm_call_joined: {
        Args: { p_actor_identity_id: string; p_call_id: string }
        Returns: {
          accepted_at: string | null
          agora_uid: number
          call_id: string
          created_at: string
          declined_at: string | null
          id: string
          identity_id: string
          invited_at: string
          joined_at: string | null
          kicked_at: string | null
          kicked_by_identity_id: string | null
          left_at: string | null
          metadata: Json
          missed_at: string | null
          status: Database["public"]["Enums"]["call_participant_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "call_participants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      consume_qr_login_challenge: {
        Args: {
          p_browser_nonce_hash: string
          p_challenge_token_hash: string
          p_consumed_at: string
        }
        Returns: {
          device_session_id: string
          id: string
          web_session_token_ciphertext: string
        }[]
      }
      create_calendar_share_for_backend: {
        Args: {
          p_calendar_id: string
          p_owner_id: string
          p_permission: Database["public"]["Enums"]["calendar_share_permission"]
          p_shared_with_user_id: string
        }
        Returns: {
          accepted_at: string | null
          calendar_id: string
          created_at: string
          id: string
          permission: Database["public"]["Enums"]["calendar_share_permission"]
          revoked_at: string | null
          shared_with_user_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "calendar_shares"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_call_session: {
        Args: {
          p_actor_identity_id: string
          p_agora_channel_name: string
          p_call_type: Database["public"]["Enums"]["call_type"]
          p_conversation_id: string
        }
        Returns: {
          agora_channel_name: string
          call_type: Database["public"]["Enums"]["call_type"]
          conversation_id: string
          created_at: string
          end_reason: string | null
          ended_at: string | null
          ended_by_identity_id: string | null
          id: string
          initiated_by_identity_id: string
          max_participants: number
          metadata: Json
          ringing_expires_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["call_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "call_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_chat_in_app_notification: {
        Args: {
          p_conversation_id: string
          p_message_id: string
          p_recipient_identity_id: string
          p_recipient_user_id: string
        }
        Returns: string
      }
      create_default_file_tags: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      create_default_storage_tags: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      create_direct_chat: {
        Args: { p_recipient_identity_id: string; p_sender_identity_id: string }
        Returns: string
      }
      create_group_chat: {
        Args: {
          p_creator_identity_id: string
          p_description?: string
          p_image_file_id?: string
          p_name: string
          p_posting_policy?: Database["public"]["Enums"]["chat_group_posting_policy"]
        }
        Returns: string
      }
      create_note: {
        Args: {
          p_folder_id?: string
          p_template_id?: string
          p_title?: string
          p_user_id: string
        }
        Returns: string
      }
      deactivate_chat_group: {
        Args: { p_conversation_id: string; p_owner_identity_id: string }
        Returns: boolean
      }
      deactivate_chat_group_if_sole_owner: {
        Args: { p_conversation_id: string; p_owner_identity_id: string }
        Returns: boolean
      }
      decline_direct_call: {
        Args: { p_actor_identity_id: string; p_call_id: string }
        Returns: {
          accepted_at: string | null
          agora_uid: number
          call_id: string
          created_at: string
          declined_at: string | null
          id: string
          identity_id: string
          invited_at: string
          joined_at: string | null
          kicked_at: string | null
          kicked_by_identity_id: string | null
          left_at: string | null
          metadata: Json
          missed_at: string | null
          status: Database["public"]["Enums"]["call_participant_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "call_participants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      detach_calendar_integration_events: {
        Args: { p_integration_id: string }
        Returns: number
      }
      disconnect_integration_and_delete_calendar_data: {
        Args: { p_connection_id: string; p_user_id: string }
        Returns: {
          deleted_calendar_count: number
          deleted_calendar_integration_count: number
          deleted_connection_id: string
        }[]
      }
      disconnect_integration_and_delete_connected_data: {
        Args: { p_connection_id: string; p_user_id: string }
        Returns: {
          deleted_calendar_count: number
          deleted_calendar_integration_count: number
          deleted_connection_id: string
          deleted_mail_draft_count: number
          deleted_mail_integration_count: number
          deleted_mail_message_count: number
        }[]
      }
      discover_network_profiles: { Args: { p_search?: string }; Returns: Json }
      emit_chat_conversation_event_to_active_users: {
        Args: {
          p_conversation_id: string
          p_event_type: Database["public"]["Enums"]["chat_sync_event_type"]
          p_exclude_user_id?: string
          p_invite_id?: string
          p_message_id?: string
          p_payload?: Json
          p_reaction_id?: string
        }
        Returns: undefined
      }
      emit_chat_sync_event: {
        Args: {
          p_conversation_id?: string
          p_event_type: Database["public"]["Enums"]["chat_sync_event_type"]
          p_invite_id?: string
          p_message_id?: string
          p_payload?: Json
          p_reaction_id?: string
          p_recipient_user_id: string
        }
        Returns: {
          conversation_id: string | null
          created_at: string
          delivered_at: string | null
          event_sequence: number
          event_type: Database["public"]["Enums"]["chat_sync_event_type"]
          expires_at: string
          id: string
          invite_id: string | null
          message_id: string | null
          payload: Json
          reaction_id: string | null
          recipient_user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "chat_sync_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      emit_chat_sync_event_and_broadcast: {
        Args: {
          p_conversation_id?: string
          p_event_type: Database["public"]["Enums"]["chat_sync_event_type"]
          p_invite_id?: string
          p_message_id?: string
          p_payload?: Json
          p_reaction_id?: string
          p_recipient_user_id: string
        }
        Returns: {
          conversation_id: string | null
          created_at: string
          delivered_at: string | null
          event_sequence: number
          event_type: Database["public"]["Enums"]["chat_sync_event_type"]
          expires_at: string
          id: string
          invite_id: string | null
          message_id: string | null
          payload: Json
          reaction_id: string | null
          recipient_user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "chat_sync_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      end_call_session: {
        Args: { p_actor_identity_id: string; p_call_id: string }
        Returns: {
          agora_channel_name: string
          call_type: Database["public"]["Enums"]["call_type"]
          conversation_id: string
          created_at: string
          end_reason: string | null
          ended_at: string | null
          ended_by_identity_id: string | null
          id: string
          initiated_by_identity_id: string
          max_participants: number
          metadata: Json
          ringing_expires_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["call_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "call_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_default_calendar: { Args: { p_user_id: string }; Returns: string }
      expire_ringing_calls: { Args: never; Returns: number }
      expire_ringing_direct_calls: {
        Args: { p_limit?: number }
        Returns: {
          call_id: string
          conversation_id: string
          ended_at: string
          initiated_by_identity_id: string
          missed_identity_id: string
        }[]
      }
      expire_stale_call_join_attempts: {
        Args: { p_max_age_seconds?: number }
        Returns: number
      }
      expire_storage_uploads: { Args: never; Returns: number }
      get_active_call_for_conversation: {
        Args: { p_actor_identity_id: string; p_conversation_id: string }
        Returns: {
          agora_channel_name: string
          call_type: Database["public"]["Enums"]["call_type"]
          conversation_id: string
          created_at: string
          end_reason: string | null
          ended_at: string | null
          ended_by_identity_id: string | null
          id: string
          initiated_by_identity_id: string
          max_participants: number
          metadata: Json
          ringing_expires_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["call_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "call_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_call_history_for_conversation: {
        Args: {
          p_actor_identity_id: string
          p_before_created_at?: string
          p_conversation_id: string
          p_limit?: number
        }
        Returns: {
          call_type: Database["public"]["Enums"]["call_type"]
          created_at: string
          end_reason: string
          ended_at: string
          ended_by_identity_id: string
          id: string
          initiated_by_identity_id: string
          max_participants: number
          started_at: string
          status: Database["public"]["Enums"]["call_status"]
        }[]
      }
      get_call_session_detail: {
        Args: { p_actor_identity_id: string; p_call_id: string }
        Returns: Json
      }
      get_chat_attachment_access: {
        Args: { p_identity_id: string; p_message_id: string }
        Returns: {
          bucket_id: string
          display_name: string
          file_id: string
          kind: Database["public"]["Enums"]["file_kind"]
          mime_type: string
          original_name: string
          size_bytes: number
          storage_path: string
        }[]
      }
      get_chat_bootstrap: {
        Args: {
          p_direct_limit?: number
          p_group_limit?: number
          p_messages_per_conversation?: number
          p_messages_since?: string
        }
        Returns: Json
      }
      get_chat_inbox: {
        Args: {
          p_before_last_message_at?: string
          p_identity_id: string
          p_limit?: number
        }
        Returns: {
          cleared_at: string
          conversation_id: string
          conversation_type: Database["public"]["Enums"]["chat_conversation_type"]
          group_description: string
          group_image_file_id: string
          group_name: string
          last_message_at: string
          last_message_id: string
          last_message_preview: string
          last_message_sender_identity_id: string
          last_message_type: Database["public"]["Enums"]["chat_message_type"]
          last_read_at: string
          last_read_message_id: string
          notifications_enabled: boolean
          other_commercial_profile_id: string
          other_display_name: string
          other_identity_id: string
          other_identity_type: Database["public"]["Enums"]["chat_identity_type"]
          other_logo_file_id: string
          other_profile_id: string
          unread_count: number
        }[]
      }
      get_chat_message_read_status: {
        Args: { p_message_id: string }
        Returns: {
          is_read: boolean
          recipient_identity_id: string
          recipient_read_at: string
        }[]
      }
      get_chat_message_readers: {
        Args: { p_message_id: string }
        Returns: {
          commercial_profile_id: string
          display_name: string
          identity_id: string
          identity_type: Database["public"]["Enums"]["chat_identity_type"]
          logo_file_id: string
          profile_id: string
          read_at: string
        }[]
      }
      get_chat_pinned_conversation_ids: {
        Args: { p_identity_id: string }
        Returns: {
          conversation_id: string
        }[]
      }
      get_chat_pinned_inbox: {
        Args: { p_identity_id: string }
        Returns: Json[]
      }
      get_chat_sync_changes: {
        Args: { p_after_event_sequence?: number; p_limit?: number }
        Returns: {
          conversation_id: string
          created_at: string
          event_id: string
          event_sequence: number
          event_type: Database["public"]["Enums"]["chat_sync_event_type"]
          has_more: boolean
          invite_id: string
          message_id: string
          next_event_sequence: number
          payload: Json
          reaction_id: string
        }[]
      }
      get_chat_unpinned_inbox_by_type: {
        Args: {
          p_before_id?: string
          p_before_sort_at?: string
          p_conversation_type: Database["public"]["Enums"]["chat_conversation_type"]
          p_identity_id: string
          p_limit?: number
        }
        Returns: Json[]
      }
      get_or_create_notes_storage_folder: {
        Args: { p_user_id: string }
        Returns: string
      }
      hide_shared_note: {
        Args: { p_note_share_id: string; p_user_id: string }
        Returns: boolean
      }
      insert_call_system_message: {
        Args: {
          p_body: string
          p_call_id: string
          p_event: string
          p_suppress_notification?: boolean
        }
        Returns: {
          attachment_file_id: string | null
          body: string | null
          conversation_id: string
          created_at: string
          id: string
          message_type: Database["public"]["Enums"]["chat_message_type"]
          metadata: Json
          reference_id: string | null
          reference_type: string | null
          sender_identity_id: string | null
          sender_user_id: string | null
          sequence_number: number
        }
        SetofOptions: {
          from: "*"
          to: "chat_messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      invite_identity_to_chat_group:
        | {
            Args: {
              p_actor_identity_id: string
              p_conversation_id: string
              p_expires_at?: string
              p_invited_identity_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_conversation_id: string
              p_expires_at?: string
              p_invited_identity_id: string
            }
            Returns: string
          }
      is_admin: { Args: never; Returns: boolean }
      is_calendar_owner: {
        Args: { p_calendar_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_community_member: {
        Args: { p_community_id: string }
        Returns: boolean
      }
      is_community_owner: { Args: { p_community_id: string }; Returns: boolean }
      join_call_session: {
        Args: {
          p_actor_identity_id: string
          p_agora_uid: number
          p_call_id: string
        }
        Returns: {
          accepted_at: string | null
          agora_uid: number
          call_id: string
          created_at: string
          declined_at: string | null
          id: string
          identity_id: string
          invited_at: string
          joined_at: string | null
          kicked_at: string | null
          kicked_by_identity_id: string | null
          left_at: string | null
          metadata: Json
          missed_at: string | null
          status: Database["public"]["Enums"]["call_participant_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "call_participants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      kick_call_participant: {
        Args: {
          p_actor_identity_id: string
          p_call_id: string
          p_target_identity_id: string
        }
        Returns: {
          accepted_at: string | null
          agora_uid: number
          call_id: string
          created_at: string
          declined_at: string | null
          id: string
          identity_id: string
          invited_at: string
          joined_at: string | null
          kicked_at: string | null
          kicked_by_identity_id: string | null
          left_at: string | null
          metadata: Json
          missed_at: string | null
          status: Database["public"]["Enums"]["call_participant_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "call_participants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      leave_call_session: {
        Args: { p_actor_identity_id: string; p_call_id: string }
        Returns: {
          agora_channel_name: string
          call_type: Database["public"]["Enums"]["call_type"]
          conversation_id: string
          created_at: string
          end_reason: string | null
          ended_at: string | null
          ended_by_identity_id: string | null
          id: string
          initiated_by_identity_id: string
          max_participants: number
          metadata: Json
          ringing_expires_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["call_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "call_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      leave_chat_group: {
        Args: { p_conversation_id: string; p_identity_id: string }
        Returns: boolean
      }
      list_my_call_logs: { Args: { p_limit?: number }; Returns: Json }
      mark_calendar_integration_reauth_required: {
        Args: {
          p_error_code?: string
          p_error_message?: string
          p_integration_id: string
        }
        Returns: undefined
      }
      mark_chat_conversation_delivered: {
        Args: {
          p_conversation_id: string
          p_identity_id: string
          p_last_delivered_message_id: string
        }
        Returns: boolean
      }
      mark_chat_conversation_read: {
        Args: {
          p_conversation_id: string
          p_identity_id: string
          p_last_read_message_id: string
        }
        Returns: boolean
      }
      move_file_to_trash: {
        Args: { p_file_id: string; p_user_id: string }
        Returns: boolean
      }
      move_note_to_trash: {
        Args: { p_note_id: string; p_user_id: string }
        Returns: boolean
      }
      normalize_commercial_verification_tax_id: {
        Args: { p_tax_id: string }
        Returns: string
      }
      note_jsonb_to_text: { Args: { p_value: Json }; Returns: string }
      permanently_delete_file: {
        Args: { p_file_id: string; p_user_id: string }
        Returns: boolean
      }
      prepare_storage_upload: {
        Args: {
          p_bucket_id?: string
          p_folder_id?: string
          p_mime_type: string
          p_original_name: string
          p_size_bytes: number
          p_user_id: string
        }
        Returns: {
          bucket_id: string
          expires_at: string
          file_id: string
          storage_path: string
          upload_id: string
        }[]
      }
      purge_expired_chat_sync_events: {
        Args: { p_batch_size?: number }
        Returns: number
      }
      purge_expired_notifications: { Args: never; Returns: number }
      purge_expired_trashed_files: { Args: never; Returns: number }
      purge_expired_trashed_notes: { Args: never; Returns: number }
      register_device_session: {
        Args: {
          p_device_name: string
          p_device_type?: string
          p_platform?: string
          p_user_agent?: string
        }
        Returns: string
      }
      remove_identity_from_chat_group:
        | {
            Args: {
              p_actor_identity_id: string
              p_conversation_id: string
              p_target_identity_id: string
            }
            Returns: boolean
          }
        | {
            Args: { p_conversation_id: string; p_identity_id: string }
            Returns: boolean
          }
      replace_account_security_pin: {
        Args: { p_pin_digest: string; p_user_id: string }
        Returns: boolean
      }
      replace_mobile_device_session: {
        Args: {
          p_auth_session_id: string
          p_browser?: string
          p_device_name?: string
          p_expires_at?: string
          p_ip_address?: unknown
          p_platform?: string
          p_session_token_hash: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: {
          auth_session_id: string | null
          browser: string | null
          created_at: string
          device_name: string
          device_type: string
          expires_at: string
          id: string
          ip_address: unknown
          is_active: boolean
          last_seen_at: string
          platform: string | null
          revoked_at: string | null
          session_token_hash: string
          user_agent: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "device_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      replace_mobile_device_session_with_revocation: {
        Args: {
          p_auth_session_id: string
          p_browser?: string
          p_device_name?: string
          p_expires_at?: string
          p_ip_address?: unknown
          p_platform?: string
          p_session_token_hash: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: {
          id: string
          revoked_device_session_ids: string[]
          revoked_push_tokens: string[]
        }[]
      }
      replace_web_device_session: {
        Args: {
          p_browser?: string
          p_device_name?: string
          p_expires_at?: string
          p_ip_address?: unknown
          p_platform?: string
          p_session_token_hash: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: {
          auth_session_id: string | null
          browser: string | null
          created_at: string
          device_name: string
          device_type: string
          expires_at: string
          id: string
          ip_address: unknown
          is_active: boolean
          last_seen_at: string
          platform: string | null
          revoked_at: string | null
          session_token_hash: string
          user_agent: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "device_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      respond_to_chat_group_invite: {
        Args: { p_accept: boolean; p_invite_id: string }
        Returns: string
      }
      restore_file_from_trash: {
        Args: { p_file_id: string; p_user_id: string }
        Returns: boolean
      }
      restore_note_from_trash: {
        Args: { p_note_id: string; p_user_id: string }
        Returns: boolean
      }
      revoke_note_share: {
        Args: { p_note_share_id: string; p_user_id: string }
        Returns: boolean
      }
      search_beeapp_users_for_backend: {
        Args: { p_limit?: number; p_query: string; p_requester_id: string }
        Returns: {
          display_name: string
          email: string
          first_name: string
          last_name: string
          normalized_phone: string
          phone_dial_code: string
          phone_number: string
          user_id: string
        }[]
      }
      search_beeapp_users_for_invitation: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          display_name: string
          email: string
          first_name: string
          last_name: string
          normalized_phone: string
          phone_dial_code: string
          phone_number: string
          user_id: string
        }[]
      }
      search_notes: {
        Args: {
          p_deleted?: boolean
          p_folder_id?: string
          p_is_archived?: boolean
          p_is_favorite?: boolean
          p_is_pinned?: boolean
          p_limit?: number
          p_offset?: number
          p_search: string
          p_template_id?: string
          p_user_id: string
        }
        Returns: {
          color: string
          created_at: string
          deleted_at: string
          folder_id: string
          id: string
          is_archived: boolean
          is_favorite: boolean
          is_pinned: boolean
          last_opened_at: string
          note_position: number
          owner_id: string
          purge_after: string
          template_id: string
          title: string
          total_count: number
          updated_at: string
        }[]
      }
      search_share_recipients: {
        Args: { result_limit?: number; search_value: string }
        Returns: {
          email: string
          first_name: string
          id: string
          last_name: string
          phone_dial_code: string
          phone_number: string
        }[]
      }
      set_chat_conversation_categories: {
        Args: {
          p_category_ids: string[]
          p_conversation_id: string
          p_identity_id: string
        }
        Returns: undefined
      }
      set_chat_conversation_notifications: {
        Args: {
          p_conversation_id: string
          p_identity_id: string
          p_notifications_enabled: boolean
        }
        Returns: boolean
      }
      set_chat_conversation_pinned: {
        Args: {
          p_conversation_id: string
          p_identity_id: string
          p_is_pinned: boolean
        }
        Returns: boolean
      }
      set_chat_group_participant_role: {
        Args: {
          p_actor_identity_id: string
          p_conversation_id: string
          p_new_role: Database["public"]["Enums"]["chat_participant_role"]
          p_target_identity_id: string
        }
        Returns: boolean
      }
      share_note: {
        Args: {
          p_expires_at?: string
          p_note_id: string
          p_shared_with_user_id: string
          p_user_id: string
        }
        Returns: string
      }
      status_accept_follow_request: {
        Args: { p_follow_id: string; p_target_owner_profile_id: string }
        Returns: {
          accepted_at: string | null
          created_at: string
          follower_actor_type: Database["public"]["Enums"]["status_actor_type"]
          follower_commercial_profile_id: string | null
          follower_profile_id: string | null
          id: string
          rejected_at: string | null
          requested_at: string
          responded_at: string | null
          state: Database["public"]["Enums"]["status_follow_state"]
          target_actor_type: Database["public"]["Enums"]["status_actor_type"]
          target_commercial_profile_id: string | null
          target_profile_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "status_follows"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      status_actor_is_owned_by_user: {
        Args: {
          p_actor_commercial_profile_id: string
          p_actor_profile_id: string
          p_actor_type: Database["public"]["Enums"]["status_actor_type"]
          p_user_id: string
        }
        Returns: boolean
      }
      status_actor_owner_id: {
        Args: {
          p_actor_commercial_profile_id: string
          p_actor_profile_id: string
          p_actor_type: Database["public"]["Enums"]["status_actor_type"]
        }
        Returns: string
      }
      status_archive_story: {
        Args: { p_owner_profile_id: string; p_story_id: string }
        Returns: {
          actor_commercial_profile_id: string | null
          actor_profile_id: string | null
          actor_type: Database["public"]["Enums"]["status_actor_type"]
          caption: string | null
          created_at: string
          deleted_at: string | null
          editor_metadata: Json
          expires_at: string
          id: string
          kind: Database["public"]["Enums"]["status_story_kind"]
          manually_archived_at: string | null
          text_background_id: string | null
          text_content: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "status_stories"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      status_attach_story_commercial_offer: {
        Args: {
          p_commercial_offer_id: string
          p_commercial_offer_image_id: string
          p_image_layer_id: string
          p_rotation: number
          p_scale: number
          p_size: number
          p_story_id: string
          p_x: number
          p_y: number
        }
        Returns: {
          commercial_offer_id: string
          commercial_offer_image_id: string
          commercial_profile_id: string
          created_at: string
          image_layer_id: string
          offer_kind_snapshot: Database["public"]["Enums"]["commercial_offer_kind"]
          offer_title_snapshot: string
          rotation: number
          scale: number
          size: number
          story_id: string
          updated_at: string
          x: number
          y: number
        }
        SetofOptions: {
          from: "*"
          to: "status_story_commercial_offers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      status_attach_story_image_layer: {
        Args: {
          p_bucket_id: string
          p_mime_type: string
          p_original_name: string
          p_rotation: number
          p_scale: number
          p_size: number
          p_size_bytes: number
          p_sort_order: number
          p_storage_path: string
          p_story_id: string
          p_x: number
          p_y: number
        }
        Returns: {
          bucket_id: string
          created_at: string
          id: string
          mime_type: string
          original_name: string
          rotation: number
          scale: number
          size: number
          size_bytes: number
          sort_order: number
          storage_path: string
          story_id: string
          updated_at: string
          x: number
          y: number
        }
        SetofOptions: {
          from: "*"
          to: "status_story_image_layers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      status_attach_story_media: {
        Args: {
          p_bucket_id: string
          p_duration_seconds?: number
          p_height?: number
          p_mime_type: string
          p_original_name: string
          p_size_bytes: number
          p_storage_path: string
          p_story_id: string
          p_width?: number
        }
        Returns: {
          bucket_id: string
          created_at: string
          duration_seconds: number | null
          height: number | null
          id: string
          mime_type: string
          original_name: string
          size_bytes: number
          storage_path: string
          story_id: string
          updated_at: string
          width: number | null
        }
        SetofOptions: {
          from: "*"
          to: "status_story_media"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      status_create_story: {
        Args: {
          p_actor_commercial_profile_id: string
          p_actor_profile_id: string
          p_actor_type: Database["public"]["Enums"]["status_actor_type"]
          p_caption?: string
          p_editor_metadata?: Json
          p_kind: Database["public"]["Enums"]["status_story_kind"]
          p_text_background_id?: string
          p_text_content?: string
        }
        Returns: {
          actor_commercial_profile_id: string | null
          actor_profile_id: string | null
          actor_type: Database["public"]["Enums"]["status_actor_type"]
          caption: string | null
          created_at: string
          deleted_at: string | null
          editor_metadata: Json
          expires_at: string
          id: string
          kind: Database["public"]["Enums"]["status_story_kind"]
          manually_archived_at: string | null
          text_background_id: string | null
          text_content: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "status_stories"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      status_current_user_can_insert_follow: {
        Args: {
          p_follower_profile_id: string
          p_target_actor_type: Database["public"]["Enums"]["status_actor_type"]
          p_target_commercial_profile_id: string
          p_target_profile_id: string
        }
        Returns: boolean
      }
      status_current_user_can_insert_view: {
        Args: { p_story_id: string; p_viewer_profile_id: string }
        Returns: boolean
      }
      status_current_user_can_read_follow: {
        Args: {
          p_follower_profile_id: string
          p_target_actor_type: Database["public"]["Enums"]["status_actor_type"]
          p_target_commercial_profile_id: string
          p_target_profile_id: string
        }
        Returns: boolean
      }
      status_current_user_can_update_follow: {
        Args: {
          p_follower_profile_id: string
          p_state: Database["public"]["Enums"]["status_follow_state"]
          p_target_actor_type: Database["public"]["Enums"]["status_actor_type"]
          p_target_commercial_profile_id: string
          p_target_profile_id: string
        }
        Returns: boolean
      }
      status_current_user_can_update_story: {
        Args: {
          p_actor_commercial_profile_id: string
          p_actor_profile_id: string
          p_actor_type: Database["public"]["Enums"]["status_actor_type"]
          p_deleted_at: string
          p_manually_archived_at: string
          p_story_id: string
        }
        Returns: boolean
      }
      status_current_user_can_view_story: {
        Args: { p_story_id: string }
        Returns: boolean
      }
      status_current_user_owns_actor: {
        Args: {
          p_actor_commercial_profile_id: string
          p_actor_profile_id: string
          p_actor_type: Database["public"]["Enums"]["status_actor_type"]
        }
        Returns: boolean
      }
      status_current_user_owns_story: {
        Args: { p_story_id: string }
        Returns: boolean
      }
      status_discover_follow_targets: {
        Args: {
          p_cursor?: string
          p_follower_actor_type: Database["public"]["Enums"]["status_actor_type"]
          p_follower_commercial_profile_id?: string
          p_follower_profile_id?: string
          p_limit?: number
          p_query?: string
        }
        Returns: {
          actor_type: Database["public"]["Enums"]["status_actor_type"]
          avatar_file_id: string
          commercial_profile_id: string
          display_name: string
          follow_id: string
          follow_state: Database["public"]["Enums"]["status_follow_state"]
          match_rank: number
          next_cursor: string
          profile_id: string
        }[]
      }
      status_discover_people_targets: {
        Args: {
          p_cursor?: string
          p_follower_actor_type: Database["public"]["Enums"]["status_actor_type"]
          p_follower_commercial_profile_id?: string
          p_follower_profile_id?: string
          p_limit?: number
          p_query?: string
        }
        Returns: {
          actor_type: Database["public"]["Enums"]["status_actor_type"]
          avatar_file_id: string
          commercial_profile_id: string
          display_name: string
          follow_id: string
          follow_state: Database["public"]["Enums"]["status_follow_state"]
          identity_id: string
          match_rank: number
          next_cursor: string
          profile_id: string
        }[]
      }
      status_get_story: {
        Args: {
          p_include_archived?: boolean
          p_story_id: string
          p_viewer_profile_id: string
        }
        Returns: Json
      }
      status_list_author_stories: {
        Args: {
          p_actor_id: string
          p_actor_type: Database["public"]["Enums"]["status_actor_type"]
          p_include_archived?: boolean
          p_viewer_profile_id: string
        }
        Returns: {
          story: Json
        }[]
      }
      status_list_author_stories_by_scope: {
        Args: {
          p_actor_id: string
          p_actor_type: Database["public"]["Enums"]["status_actor_type"]
          p_scope?: string
          p_viewer_profile_id: string
        }
        Returns: {
          story: Json
        }[]
      }
      status_list_feed: {
        Args: { p_limit?: number; p_viewer_profile_id: string }
        Returns: {
          active_story_count: number
          actor_id: string
          actor_type: Database["public"]["Enums"]["status_actor_type"]
          avatar_file_id: string
          commercial_profile_id: string
          display_name: string
          has_unseen: boolean
          latest_story_at: string
          profile_id: string
          unseen_story_count: number
        }[]
      }
      status_list_story_viewers: {
        Args: { p_owner_profile_id: string; p_story_id: string }
        Returns: {
          avatar_file_id: string
          display_name: string
          profile_id: string
          viewed_at: string
        }[]
      }
      status_register_story_view: {
        Args: { p_story_id: string; p_viewer_profile_id: string }
        Returns: {
          created: boolean
          viewed: boolean
          viewed_at: string
        }[]
      }
      status_reject_follow_request: {
        Args: { p_follow_id: string; p_target_owner_profile_id: string }
        Returns: {
          accepted_at: string | null
          created_at: string
          follower_actor_type: Database["public"]["Enums"]["status_actor_type"]
          follower_commercial_profile_id: string | null
          follower_profile_id: string | null
          id: string
          rejected_at: string | null
          requested_at: string
          responded_at: string | null
          state: Database["public"]["Enums"]["status_follow_state"]
          target_actor_type: Database["public"]["Enums"]["status_actor_type"]
          target_commercial_profile_id: string | null
          target_profile_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "status_follows"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      status_request_follow: {
        Args: {
          p_follower_actor_type: Database["public"]["Enums"]["status_actor_type"]
          p_follower_commercial_profile_id?: string
          p_follower_profile_id?: string
          p_target_actor_type?: Database["public"]["Enums"]["status_actor_type"]
          p_target_commercial_profile_id?: string
          p_target_profile_id?: string
        }
        Returns: {
          accepted_at: string | null
          created_at: string
          follower_actor_type: Database["public"]["Enums"]["status_actor_type"]
          follower_commercial_profile_id: string | null
          follower_profile_id: string | null
          id: string
          rejected_at: string | null
          requested_at: string
          responded_at: string | null
          state: Database["public"]["Enums"]["status_follow_state"]
          target_actor_type: Database["public"]["Enums"]["status_actor_type"]
          target_commercial_profile_id: string | null
          target_profile_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "status_follows"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      status_story_actor_payload: {
        Args: {
          p_actor_commercial_profile_id: string
          p_actor_profile_id: string
          p_actor_type: Database["public"]["Enums"]["status_actor_type"]
        }
        Returns: Json
      }
      status_story_media_payload: {
        Args: { p_story_id: string }
        Returns: Json
      }
      status_story_payload: {
        Args: { p_story_id: string; p_viewer_profile_id?: string }
        Returns: Json
      }
      status_unfollow: {
        Args: {
          p_follow_id?: string
          p_follower_actor_type: Database["public"]["Enums"]["status_actor_type"]
          p_follower_commercial_profile_id?: string
          p_follower_profile_id?: string
        }
        Returns: boolean
      }
      status_user_can_view_story: {
        Args: { p_story_id: string; p_user_id?: string }
        Returns: boolean
      }
      status_user_follows_actor: {
        Args: {
          p_actor_commercial_profile_id: string
          p_actor_profile_id: string
          p_actor_type: Database["public"]["Enums"]["status_actor_type"]
          p_viewer_profile_id: string
        }
        Returns: boolean
      }
      status_users_are_blocked: {
        Args: { p_user_a: string; p_user_b: string }
        Returns: boolean
      }
      sync_calendar_visibility_from_shares: {
        Args: { p_calendar_id: string }
        Returns: undefined
      }
      sync_chat_identities_for_user: {
        Args: { p_user_id?: string }
        Returns: {
          identity_id: string
          identity_type: Database["public"]["Enums"]["chat_identity_type"]
          out_commercial_profile_id: string
          out_profile_id: string
        }[]
      }
      sync_chat_identity_for_commercial_profile: {
        Args: { p_commercial_profile_id: string }
        Returns: string
      }
      sync_chat_identity_for_profile: {
        Args: { p_profile_id: string }
        Returns: string
      }
      sync_profile_contact_from_auth: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      transfer_chat_group_ownership: {
        Args: {
          p_conversation_id: string
          p_current_owner_identity_id: string
          p_new_owner_identity_id: string
        }
        Returns: boolean
      }
      update_chat_group: {
        Args: {
          p_actor_identity_id: string
          p_conversation_id: string
          p_description?: string
          p_image_file_id?: string
          p_name?: string
          p_posting_policy?: Database["public"]["Enums"]["chat_group_posting_policy"]
        }
        Returns: boolean
      }
      verify_account_security_pin: {
        Args: { p_pin_digest: string; p_user_id: string }
        Returns: string
      }
    }
    Enums: {
      calendar_attendee_kind: "beeapp_user" | "external"
      calendar_attendee_status: "pending" | "accepted" | "declined" | "removed"
      calendar_conference_provider:
        | "agora"
        | "external"
        | "google_meet"
        | "microsoft_teams"
      calendar_conference_status: "active" | "revoked"
      calendar_event_kind: "virtual" | "in_person" | "hybrid"
      calendar_event_source: "beeapp" | "google" | "microsoft" | "detached"
      calendar_event_status: "confirmed" | "cancelled"
      calendar_external_calendar_access: "read_write" | "read_only"
      calendar_integration_status:
        | "active"
        | "reauth_required"
        | "revoked"
        | "error"
        | "disconnected"
      calendar_invitee_request_status:
        | "pending_organizer_approval"
        | "approved"
        | "rejected"
        | "cancelled"
      calendar_provider: "google" | "microsoft"
      calendar_recurrence_exception_kind: "cancelled" | "modified"
      calendar_reminder_channel: "push" | "in_app"
      calendar_reminder_status: "pending" | "sent" | "cancelled" | "failed"
      calendar_share_permission: "viewer" | "editor"
      calendar_sync_conflict_status:
        | "open"
        | "beeapp_won"
        | "resolved"
        | "ignored"
      calendar_sync_job_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
      calendar_sync_job_type:
        | "initial_import"
        | "pull"
        | "push"
        | "delete_external"
        | "refresh_calendar_list"
        | "manual_sync"
        | "retry"
      calendar_sync_run_status:
        | "running"
        | "completed"
        | "completed_with_errors"
        | "failed"
        | "cancelled"
      calendar_sync_visibility: "visible" | "hidden"
      calendar_visibility: "private" | "shared"
      call_event_type:
        | "created"
        | "accepted"
        | "joined"
        | "declined"
        | "missed"
        | "cancelled"
        | "left"
        | "kicked"
        | "ended"
        | "token_refreshed"
        | "failed"
      call_participant_status:
        | "invited"
        | "joined"
        | "declined"
        | "missed"
        | "left"
        | "kicked"
      call_status:
        | "starting"
        | "ringing"
        | "active"
        | "ended"
        | "cancelled"
        | "failed"
      call_type: "voice" | "video"
      chat_conversation_type: "direct" | "group"
      chat_group_posting_policy: "all_members" | "admins_only"
      chat_identity_type: "profile" | "commercial_profile"
      chat_invite_status:
        | "pending"
        | "accepted"
        | "declined"
        | "cancelled"
        | "expired"
      chat_message_type:
        | "text"
        | "image"
        | "video"
        | "audio"
        | "document"
        | "quotation"
        | "order"
        | "reservation"
        | "invoice"
        | "link"
        | "system"
        | "location"
      chat_notification_status:
        | "pending"
        | "created"
        | "sent"
        | "failed"
        | "skipped"
      chat_participant_role: "owner" | "admin" | "member"
      chat_sync_event_type:
        | "conversation.upsert"
        | "conversation.removed"
        | "message.created"
        | "reaction.created"
        | "reaction.deleted"
        | "participant.upsert"
        | "participant.removed"
        | "invite.upsert"
      commerce_dispute_event_type:
        | "opened"
        | "evidence_added"
        | "under_review"
        | "resolution_proposed"
        | "resolved_for_customer"
        | "resolved_for_business"
        | "closed"
        | "system_note"
      commerce_dispute_status:
        | "opened"
        | "under_review"
        | "resolved_for_customer"
        | "resolved_for_business"
        | "closed"
      commerce_inventory_hold_status:
        | "active"
        | "consumed"
        | "released"
        | "expired"
      commerce_payment_proof_event_type:
        | "submitted"
        | "confirmed"
        | "rejected"
        | "replaced"
        | "signed_url_requested"
        | "system_note"
      commerce_payment_proof_status:
        | "submitted"
        | "confirmed"
        | "rejected"
        | "replaced"
      commerce_request_event_type:
        | "created"
        | "submitted"
        | "status_changed"
        | "proposal_created"
        | "proposal_accepted"
        | "payment_requested"
        | "payment_proof_submitted"
        | "payment_proof_confirmed"
        | "payment_proof_rejected"
        | "reservation_hold_created"
        | "reservation_hold_expired"
        | "reservation_confirmed"
        | "completed"
        | "rejected"
        | "cancelled"
        | "expired"
        | "dispute_opened"
        | "dispute_resolved"
        | "system_note"
      commerce_request_proposal_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "superseded"
        | "expired"
        | "withdrawn"
      commerce_request_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "proposal_sent"
        | "accepted"
        | "payment_pending"
        | "payment_submitted"
        | "confirmed"
        | "completed"
        | "rejected"
        | "cancelled"
        | "expired"
        | "disputed"
      commerce_request_type:
        | "product_order"
        | "service_request"
        | "booking_request"
        | "mixed_request"
      commerce_reservation_event_type:
        | "created"
        | "proposal_selected"
        | "hold_created"
        | "hold_expired"
        | "payment_pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "rejected"
        | "expired"
        | "no_show"
        | "calendar_projection_created"
        | "calendar_projection_updated"
        | "calendar_projection_failed"
        | "system_note"
      commerce_reservation_status:
        | "proposed"
        | "hold"
        | "payment_pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "rejected"
        | "expired"
        | "no_show"
      commercial_catalog_status: "published" | "paused" | "archived"
      commercial_delivery_fee_mode:
        | "not_offered"
        | "free"
        | "fixed"
        | "to_be_confirmed"
      commercial_offer_image_status: "active" | "archived"
      commercial_offer_kind: "product" | "service"
      commercial_offer_modality_status: "active" | "archived"
      commercial_offer_status: "published" | "paused" | "archived"
      commercial_offer_type: "services" | "products" | "mixed"
      commercial_payment_method_status: "active" | "archived"
      commercial_payment_method_type:
        | "nequi"
        | "daviplata"
        | "breb"
        | "cash_on_delivery"
        | "bank_account"
      commercial_pricing_strategy:
        | "fixed"
        | "starting_at"
        | "free"
        | "to_be_confirmed"
      commercial_profile_modality:
        | "at_establishment"
        | "in_person"
        | "virtual"
        | "home_visit"
        | "delivery"
        | "pickup"
        | "phone_call"
        | "buddy_chat"
      commercial_publication_status:
        | "published"
        | "paused"
        | "archived"
        | "suspended"
      commercial_service_payment_policy:
        | "not_required"
        | "required_before_confirmation"
        | "required_after_service"
        | "to_be_agreed"
      commercial_verification_document_status:
        | "active"
        | "replaced"
        | "archived"
      commercial_verification_event_type:
        | "draft_created"
        | "document_added"
        | "submitted_for_review"
        | "requires_correction"
        | "verified"
        | "rejected"
        | "suspended"
        | "document_replaced"
        | "system_note"
      commercial_verification_status:
        | "not_requested"
        | "draft"
        | "pending_review"
        | "requires_correction"
        | "verified"
        | "rejected"
        | "suspended"
      file_kind:
        | "image"
        | "video"
        | "audio"
        | "document"
        | "spreadsheet"
        | "presentation"
        | "archive"
        | "other"
      file_share_permission: "viewer" | "editor"
      file_status: "uploading" | "ready" | "failed" | "trashed"
      integration_capability:
        | "calendar"
        | "mail"
        | "contacts"
        | "storage"
        | "messaging"
        | "tasks"
        | "crm"
        | "analytics"
        | "other"
      integration_connection_status:
        | "pending"
        | "connected"
        | "reauth_required"
        | "revoked"
        | "error"
        | "disconnected"
      integration_event_type:
        | "authorization_started"
        | "authorization_succeeded"
        | "authorization_denied"
        | "authorization_failed"
        | "scopes_upgraded"
        | "token_refreshed"
        | "token_refresh_failed"
        | "reauth_required"
        | "revoked"
        | "disconnected"
      integration_notification_status:
        | "pending"
        | "sent"
        | "failed"
        | "cancelled"
      integration_provider:
        | "google"
        | "microsoft"
        | "slack"
        | "meta"
        | "dropbox"
        | "notion"
        | "other"
      mail_action_status:
        | "pending"
        | "processing"
        | "succeeded"
        | "failed"
        | "cancelled"
      mail_action_type:
        | "mark_read"
        | "mark_unread"
        | "archive"
        | "unarchive"
        | "move_to_trash"
        | "restore_from_trash"
        | "move_to_spam"
        | "mark_not_spam"
        | "send"
        | "save_draft"
        | "discard_draft"
      mail_attachment_source: "provider" | "storage" | "forwarded"
      mail_draft_status: "active" | "sending" | "sent" | "discarded"
      mail_folder: "inbox" | "sent" | "drafts" | "archived" | "spam" | "trash"
      mail_message_direction: "inbound" | "outbound"
      mail_message_status:
        | "received"
        | "sent"
        | "sending"
        | "send_failed"
        | "draft"
        | "trashed"
        | "permanently_deleted"
      mail_recipient_kind: "from" | "to" | "cc" | "bcc" | "reply_to"
      mail_sync_status:
        | "pending"
        | "running"
        | "succeeded"
        | "failed"
        | "partial"
      mail_sync_trigger:
        | "initial"
        | "manual"
        | "scheduled"
        | "webhook"
        | "recovery"
      mail_webhook_provider: "gmail_pubsub" | "microsoft_graph"
      mail_webhook_status: "active" | "expired" | "failed" | "disabled"
      note_share_permission: "viewer"
      note_template_scope: "global"
      profile_role: "USER" | "ADMIN" | "SUPERADMIN"
      social_platform:
        | "instagram"
        | "facebook"
        | "linkedin"
        | "tiktok"
        | "youtube"
        | "threads"
        | "website"
      status_actor_type: "profile" | "commercial_profile"
      status_follow_state: "pending" | "accepted" | "rejected"
      status_story_archive_reason: "expired" | "manual"
      status_story_kind: "image" | "video" | "gif" | "text"
      storage_notification_type:
        | "file_shared"
        | "upload_success"
        | "upload_failed"
        | "storage_warning_80"
        | "storage_warning_90"
        | "storage_full"
        | "file_trashed"
        | "file_restored"
        | "file_deleted"
        | "share_revoked"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      calendar_attendee_kind: ["beeapp_user", "external"],
      calendar_attendee_status: ["pending", "accepted", "declined", "removed"],
      calendar_conference_provider: [
        "agora",
        "external",
        "google_meet",
        "microsoft_teams",
      ],
      calendar_conference_status: ["active", "revoked"],
      calendar_event_kind: ["virtual", "in_person", "hybrid"],
      calendar_event_source: ["beeapp", "google", "microsoft", "detached"],
      calendar_event_status: ["confirmed", "cancelled"],
      calendar_external_calendar_access: ["read_write", "read_only"],
      calendar_integration_status: [
        "active",
        "reauth_required",
        "revoked",
        "error",
        "disconnected",
      ],
      calendar_invitee_request_status: [
        "pending_organizer_approval",
        "approved",
        "rejected",
        "cancelled",
      ],
      calendar_provider: ["google", "microsoft"],
      calendar_recurrence_exception_kind: ["cancelled", "modified"],
      calendar_reminder_channel: ["push", "in_app"],
      calendar_reminder_status: ["pending", "sent", "cancelled", "failed"],
      calendar_share_permission: ["viewer", "editor"],
      calendar_sync_conflict_status: [
        "open",
        "beeapp_won",
        "resolved",
        "ignored",
      ],
      calendar_sync_job_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ],
      calendar_sync_job_type: [
        "initial_import",
        "pull",
        "push",
        "delete_external",
        "refresh_calendar_list",
        "manual_sync",
        "retry",
      ],
      calendar_sync_run_status: [
        "running",
        "completed",
        "completed_with_errors",
        "failed",
        "cancelled",
      ],
      calendar_sync_visibility: ["visible", "hidden"],
      calendar_visibility: ["private", "shared"],
      call_event_type: [
        "created",
        "accepted",
        "joined",
        "declined",
        "missed",
        "cancelled",
        "left",
        "kicked",
        "ended",
        "token_refreshed",
        "failed",
      ],
      call_participant_status: [
        "invited",
        "joined",
        "declined",
        "missed",
        "left",
        "kicked",
      ],
      call_status: [
        "starting",
        "ringing",
        "active",
        "ended",
        "cancelled",
        "failed",
      ],
      call_type: ["voice", "video"],
      chat_conversation_type: ["direct", "group"],
      chat_group_posting_policy: ["all_members", "admins_only"],
      chat_identity_type: ["profile", "commercial_profile"],
      chat_invite_status: [
        "pending",
        "accepted",
        "declined",
        "cancelled",
        "expired",
      ],
      chat_message_type: [
        "text",
        "image",
        "video",
        "audio",
        "document",
        "quotation",
        "order",
        "reservation",
        "invoice",
        "link",
        "system",
        "location",
      ],
      chat_notification_status: [
        "pending",
        "created",
        "sent",
        "failed",
        "skipped",
      ],
      chat_participant_role: ["owner", "admin", "member"],
      chat_sync_event_type: [
        "conversation.upsert",
        "conversation.removed",
        "message.created",
        "reaction.created",
        "reaction.deleted",
        "participant.upsert",
        "participant.removed",
        "invite.upsert",
      ],
      commerce_dispute_event_type: [
        "opened",
        "evidence_added",
        "under_review",
        "resolution_proposed",
        "resolved_for_customer",
        "resolved_for_business",
        "closed",
        "system_note",
      ],
      commerce_dispute_status: [
        "opened",
        "under_review",
        "resolved_for_customer",
        "resolved_for_business",
        "closed",
      ],
      commerce_inventory_hold_status: [
        "active",
        "consumed",
        "released",
        "expired",
      ],
      commerce_payment_proof_event_type: [
        "submitted",
        "confirmed",
        "rejected",
        "replaced",
        "signed_url_requested",
        "system_note",
      ],
      commerce_payment_proof_status: [
        "submitted",
        "confirmed",
        "rejected",
        "replaced",
      ],
      commerce_request_event_type: [
        "created",
        "submitted",
        "status_changed",
        "proposal_created",
        "proposal_accepted",
        "payment_requested",
        "payment_proof_submitted",
        "payment_proof_confirmed",
        "payment_proof_rejected",
        "reservation_hold_created",
        "reservation_hold_expired",
        "reservation_confirmed",
        "completed",
        "rejected",
        "cancelled",
        "expired",
        "dispute_opened",
        "dispute_resolved",
        "system_note",
      ],
      commerce_request_proposal_status: [
        "pending",
        "accepted",
        "rejected",
        "superseded",
        "expired",
        "withdrawn",
      ],
      commerce_request_status: [
        "draft",
        "submitted",
        "under_review",
        "proposal_sent",
        "accepted",
        "payment_pending",
        "payment_submitted",
        "confirmed",
        "completed",
        "rejected",
        "cancelled",
        "expired",
        "disputed",
      ],
      commerce_request_type: [
        "product_order",
        "service_request",
        "booking_request",
        "mixed_request",
      ],
      commerce_reservation_event_type: [
        "created",
        "proposal_selected",
        "hold_created",
        "hold_expired",
        "payment_pending",
        "confirmed",
        "completed",
        "cancelled",
        "rejected",
        "expired",
        "no_show",
        "calendar_projection_created",
        "calendar_projection_updated",
        "calendar_projection_failed",
        "system_note",
      ],
      commerce_reservation_status: [
        "proposed",
        "hold",
        "payment_pending",
        "confirmed",
        "completed",
        "cancelled",
        "rejected",
        "expired",
        "no_show",
      ],
      commercial_catalog_status: ["published", "paused", "archived"],
      commercial_delivery_fee_mode: [
        "not_offered",
        "free",
        "fixed",
        "to_be_confirmed",
      ],
      commercial_offer_image_status: ["active", "archived"],
      commercial_offer_kind: ["product", "service"],
      commercial_offer_modality_status: ["active", "archived"],
      commercial_offer_status: ["published", "paused", "archived"],
      commercial_offer_type: ["services", "products", "mixed"],
      commercial_payment_method_status: ["active", "archived"],
      commercial_payment_method_type: [
        "nequi",
        "daviplata",
        "breb",
        "cash_on_delivery",
        "bank_account",
      ],
      commercial_pricing_strategy: [
        "fixed",
        "starting_at",
        "free",
        "to_be_confirmed",
      ],
      commercial_profile_modality: [
        "at_establishment",
        "in_person",
        "virtual",
        "home_visit",
        "delivery",
        "pickup",
        "phone_call",
        "buddy_chat",
      ],
      commercial_publication_status: [
        "published",
        "paused",
        "archived",
        "suspended",
      ],
      commercial_service_payment_policy: [
        "not_required",
        "required_before_confirmation",
        "required_after_service",
        "to_be_agreed",
      ],
      commercial_verification_document_status: [
        "active",
        "replaced",
        "archived",
      ],
      commercial_verification_event_type: [
        "draft_created",
        "document_added",
        "submitted_for_review",
        "requires_correction",
        "verified",
        "rejected",
        "suspended",
        "document_replaced",
        "system_note",
      ],
      commercial_verification_status: [
        "not_requested",
        "draft",
        "pending_review",
        "requires_correction",
        "verified",
        "rejected",
        "suspended",
      ],
      file_kind: [
        "image",
        "video",
        "audio",
        "document",
        "spreadsheet",
        "presentation",
        "archive",
        "other",
      ],
      file_share_permission: ["viewer", "editor"],
      file_status: ["uploading", "ready", "failed", "trashed"],
      integration_capability: [
        "calendar",
        "mail",
        "contacts",
        "storage",
        "messaging",
        "tasks",
        "crm",
        "analytics",
        "other",
      ],
      integration_connection_status: [
        "pending",
        "connected",
        "reauth_required",
        "revoked",
        "error",
        "disconnected",
      ],
      integration_event_type: [
        "authorization_started",
        "authorization_succeeded",
        "authorization_denied",
        "authorization_failed",
        "scopes_upgraded",
        "token_refreshed",
        "token_refresh_failed",
        "reauth_required",
        "revoked",
        "disconnected",
      ],
      integration_notification_status: [
        "pending",
        "sent",
        "failed",
        "cancelled",
      ],
      integration_provider: [
        "google",
        "microsoft",
        "slack",
        "meta",
        "dropbox",
        "notion",
        "other",
      ],
      mail_action_status: [
        "pending",
        "processing",
        "succeeded",
        "failed",
        "cancelled",
      ],
      mail_action_type: [
        "mark_read",
        "mark_unread",
        "archive",
        "unarchive",
        "move_to_trash",
        "restore_from_trash",
        "move_to_spam",
        "mark_not_spam",
        "send",
        "save_draft",
        "discard_draft",
      ],
      mail_attachment_source: ["provider", "storage", "forwarded"],
      mail_draft_status: ["active", "sending", "sent", "discarded"],
      mail_folder: ["inbox", "sent", "drafts", "archived", "spam", "trash"],
      mail_message_direction: ["inbound", "outbound"],
      mail_message_status: [
        "received",
        "sent",
        "sending",
        "send_failed",
        "draft",
        "trashed",
        "permanently_deleted",
      ],
      mail_recipient_kind: ["from", "to", "cc", "bcc", "reply_to"],
      mail_sync_status: [
        "pending",
        "running",
        "succeeded",
        "failed",
        "partial",
      ],
      mail_sync_trigger: [
        "initial",
        "manual",
        "scheduled",
        "webhook",
        "recovery",
      ],
      mail_webhook_provider: ["gmail_pubsub", "microsoft_graph"],
      mail_webhook_status: ["active", "expired", "failed", "disabled"],
      note_share_permission: ["viewer"],
      note_template_scope: ["global"],
      profile_role: ["USER", "ADMIN", "SUPERADMIN"],
      social_platform: [
        "instagram",
        "facebook",
        "linkedin",
        "tiktok",
        "youtube",
        "threads",
        "website",
      ],
      status_actor_type: ["profile", "commercial_profile"],
      status_follow_state: ["pending", "accepted", "rejected"],
      status_story_archive_reason: ["expired", "manual"],
      status_story_kind: ["image", "video", "gif", "text"],
      storage_notification_type: [
        "file_shared",
        "upload_success",
        "upload_failed",
        "storage_warning_80",
        "storage_warning_90",
        "storage_full",
        "file_trashed",
        "file_restored",
        "file_deleted",
        "share_revoked",
      ],
    },
  },
} as const
