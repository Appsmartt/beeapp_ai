import { ComponentType } from 'react';
import MailInboxScreen from '../../../app/(main)/mail/index';
import MailDetailScreen from '../../../app/(main)/mail/detail';
import MailComposeScreen from '../../../app/(main)/mail/compose';
import NotesScreen from '../../../app/(main)/notes/index';
import NoteEditScreen from '../../../app/(main)/notes/edit';
import ChatListScreen from '../../../app/(main)/chat/index';
import ChatConversationScreen from '../../../app/(main)/chat/conversation';
import ChatNewScreen from '../../../app/(main)/chat/new';
import ChatCallScreen from '../../../app/(main)/chat/call';
import AiSettingsRoute from '../../../app/(main)/chat/ai-settings';
import ChatProfileRoute from '../../../app/(main)/chat/chat-profile';
import CommunityRoute from '../../../app/(main)/chat/community';
import CommunityProfileRoute from '../../../app/(main)/chat/community-profile';
import StorageScreen from '../../../app/(main)/storage/index';
import StoragePreviewScreen from '../../../app/(main)/storage/preview';
import StorageSignScreen from '../../../app/(main)/storage/sign';
import CalendarScreen from '../../../app/(main)/calendar/index';
import CalendarDetailScreen from '../../../app/(main)/calendar/detail';
import CalendarEditScreen from '../../../app/(main)/calendar/edit';
// Contactos ya no es un módulo: solo su detalle sigue registrado, porque se
// abre desde la pestaña Contactos del módulo de Chat
import ContactDetailScreen from '../../../app/(main)/contacts/detail';
import AllModulesOverview from '../home/AllModulesOverview';
import { OVERVIEW_MODULE_ID } from '../home/homeModules';

/** Virtual path of the cross-module overview: it has no real route file */
export const OVERVIEW_PATH = '/(main)/overview';

/**
 * Screens that can render inside the embedded module host, keyed by the
 * exact route path the screens push. Any path not present here falls back
 * to real router navigation (closing the embedded module first).
 */
export const EMBEDDED_SCREENS: Record<string, ComponentType<any>> = {
  // Overview root: can push the detail screens of ANY module below
  [OVERVIEW_PATH]: AllModulesOverview,
  '/(main)/mail': MailInboxScreen,
  '/(main)/mail/detail': MailDetailScreen,
  '/(main)/mail/compose': MailComposeScreen,
  '/(main)/notes': NotesScreen,
  '/(main)/notes/edit': NoteEditScreen,
  '/(main)/chat': ChatListScreen,
  '/(main)/chat/conversation': ChatConversationScreen,
  '/(main)/chat/new': ChatNewScreen,
  '/(main)/chat/call': ChatCallScreen,
  '/(main)/chat/ai-settings': AiSettingsRoute,
  '/(main)/chat/chat-profile': ChatProfileRoute,
  '/(main)/chat/community': CommunityRoute,
  '/(main)/chat/community-profile': CommunityProfileRoute,
  '/(main)/storage': StorageScreen,
  '/(main)/storage/preview': StoragePreviewScreen,
  '/(main)/storage/sign': StorageSignScreen,
  '/(main)/calendar': CalendarScreen,
  '/(main)/calendar/detail': CalendarDetailScreen,
  '/(main)/calendar/edit': CalendarEditScreen,
  '/(main)/contacts/detail': ContactDetailScreen,
};

/** Root path of each quick-access module (ids from MODULES_POOL). */
export const MODULE_ROOTS: Record<string, string> = {
  [OVERVIEW_MODULE_ID]: OVERVIEW_PATH,
  mail: '/(main)/mail',
  notes: '/(main)/notes',
  files: '/(main)/storage',
  calendar: '/(main)/calendar',
  chat: '/(main)/chat',
};
