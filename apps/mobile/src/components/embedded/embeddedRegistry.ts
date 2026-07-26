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
import ChatStoryScreen from '../../../app/(main)/chat/story';
import ChatCreateStoryScreen from '../../../app/(main)/chat/create-story';
import StorageScreen from '../../../app/(main)/storage/index';
import StoragePreviewScreen from '../../../app/(main)/storage/preview';
import StorageSignScreen from '../../../app/(main)/storage/sign';
import CalendarScreen from '../../../app/(main)/calendar/index';
import CalendarDetailScreen from '../../../app/(main)/calendar/detail';
import CalendarEditScreen from '../../../app/(main)/calendar/edit';
import ContactsScreen from '../../../app/(main)/contacts/index';
import ContactDetailScreen from '../../../app/(main)/contacts/detail';
import BeeServicesScreen from '../../../app/(main)/beeservices/index';
import BeeProductScreen from '../../../app/(main)/beeservices/product';
import BeeServiceScreen from '../../../app/(main)/beeservices/service';
import BeeSellerScreen from '../../../app/(main)/beeservices/seller';

/**
 * Screens that can render inside the embedded module host, keyed by the
 * exact route path the screens push. Any path not present here falls back
 * to real router navigation (closing the embedded module first).
 */
export const EMBEDDED_SCREENS: Record<string, ComponentType<any>> = {
  '/(main)/mail': MailInboxScreen,
  '/(main)/mail/detail': MailDetailScreen,
  '/(main)/mail/compose': MailComposeScreen,
  '/(main)/notes': NotesScreen,
  '/(main)/notes/edit': NoteEditScreen,
  '/(main)/chat': ChatListScreen,
  '/(main)/chat/conversation': ChatConversationScreen,
  '/(main)/chat/new': ChatNewScreen,
  '/(main)/chat/call': ChatCallScreen,
  '/(main)/chat/story': ChatStoryScreen,
  '/(main)/chat/create-story': ChatCreateStoryScreen,
  '/(main)/storage': StorageScreen,
  '/(main)/storage/preview': StoragePreviewScreen,
  '/(main)/storage/sign': StorageSignScreen,
  '/(main)/calendar': CalendarScreen,
  '/(main)/calendar/detail': CalendarDetailScreen,
  '/(main)/calendar/edit': CalendarEditScreen,
  '/(main)/contacts': ContactsScreen,
  '/(main)/contacts/detail': ContactDetailScreen,
  '/(main)/beeservices': BeeServicesScreen,
  '/(main)/beeservices/product': BeeProductScreen,
  '/(main)/beeservices/service': BeeServiceScreen,
  '/(main)/beeservices/seller': BeeSellerScreen,
};

/** Root path of each quick-access module (ids from MODULES_POOL). */
export const MODULE_ROOTS: Record<string, string> = {
  mail: '/(main)/mail',
  notes: '/(main)/notes',
  contacts: '/(main)/contacts',
  files: '/(main)/storage',
  calendar: '/(main)/calendar',
  chat: '/(main)/chat',
  beeservices: '/(main)/beeservices',
};
