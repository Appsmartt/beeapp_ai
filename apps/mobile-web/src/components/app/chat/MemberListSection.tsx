'use client';

import { UserPlus, X } from 'lucide-react';
import { GroupMember } from '@/mocks/chats';

interface MemberListSectionProps {
  members: GroupMember[];
  canManage: boolean;
  onAdd: () => void;
  onRemove: (memberId: string) => void;
}

const ROLE_LABEL: Record<GroupMember['role'], string> = {
  admin: 'Admin',
  member: 'Miembro',
};

export default function MemberListSection({
  members,
  canManage,
  onAdd,
  onRemove,
}: MemberListSectionProps) {
  const ordered = [...members].sort((a, b) => Number(!!b.isCurrentUser) - Number(!!a.isCurrentUser));

  return (
    <div className="py-2 space-y-2">
      <div className="flex items-center justify-between py-1">
        <h3 className="text-sm font-semibold text-neutral-900">
          Miembros ({members.length})
        </h3>

        {canManage && (
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-1.5 text-xs font-normal text-brand-primary hover:underline"
          >
            <UserPlus className="w-4 h-4" />
            <span>Agregar</span>
          </button>
        )}
      </div>

      <div className="divide-y divide-neutral-100">
        {ordered.map((member) => (
          <div key={member.id} className="py-2.5 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-xs text-brand-primary shrink-0"
              style={{ backgroundColor: member.color }}
            >
              {member.initials}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-normal text-neutral-900 truncate">
                {member.name}
                {member.isCurrentUser ? ' · Tú' : ''}
              </p>
              <p className="text-xs font-normal text-neutral-500">{ROLE_LABEL[member.role]}</p>
            </div>

            {canManage && member.role !== 'admin' && (
              <button
                type="button"
                onClick={() => onRemove(member.id)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 shrink-0"
                title={`Quitar a ${member.name}`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
