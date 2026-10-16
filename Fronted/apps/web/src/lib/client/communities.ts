export const CURRENT_USER_ID = 'me';

export type ReactionType = 'like' | 'love' | 'laugh';

export interface CommunityMember {
  id: string;
  name: string;
  role: 'admin' | 'member';
  initials: string;
  color: string;
  isCurrentUser?: boolean;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  text: string;
  timestamp: string;
  reactions: Record<ReactionType, number>;
  myReactions: ReactionType[];
}

export interface CommunityItem {
  id: string;
  name: string;
  description: string;
  category: string;
  initials: string;
  color: string;
  creatorId: string;
  membersCount: number;
  isAdmin: boolean;
  unreadCount: number;
  posts: CommunityPost[];
  members: CommunityMember[];
}

export { loadCommunityCategoryLabels } from '@/lib/client/publicAppSettings';
