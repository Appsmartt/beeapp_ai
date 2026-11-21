'use client';

import { Crown, UserPlus, X } from 'lucide-react';
import { GroupMember } from '@/lib/client/chats';

interface MemberListSectionProps {
  members: GroupMember[];
  canManage: boolean;
  canTransferOwnership?: boolean;
  onAdd: () => void;
  onRemove: (memberId: string) => void;
  onToggleRole?: (member: GroupMember) => void;
  onTransferOwnership?: (member: GroupMember) => void;
}

const ROLE_LABEL: Record<GroupMember['role'], string> = {
  owner: 'Propietario',
  admin: 'Admin',
  member: 'Miembro',
};

export default function MemberListSection({
  members,
  canManage,
  canTransferOwnership = false,
  onAdd,
  onRemove,
  onToggleRole,
  onTransferOwnership,
}: MemberListSectionProps) {
  const ordered = [...members].sort((a, b) => Number(!!b.isCurrentUser) - Number(!!a.isCurrentUser));

  return (
    <div className="space-y-2 py-2">
      <div className="flex items-center justify-between py-1">
        <h3 className="text-sm font-semibold text-neutral-900">
          Miembros ({members.length})
        </h3>

        {canManage ? (
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-1.5 text-xs font-normal text-brand-primary hover:underline"
          >
            <UserPlus className="h-4 w-4" />
            <span>Agregar</span>
          </button>
        ) : null}
      </div>

      <div className="divide-y divide-neutral-100">
        {ordered.map((member) => (
          <div key={member.id} className="flex items-center gap-3 py-2.5">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-brand-primary"
              style={{ backgroundColor: member.color }}
            >
              {member.initials}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-normal text-neutral-900">
                {member.name}
                {member.isCurrentUser ? ' · Tú' : ''}
              </p>
              <p className="text-xs font-normal text-neutral-500">{ROLE_LABEL[member.role] || 'Miembro'}</p>
            </div>

            {canManage && !member.isCurrentUser && member.role !== 'owner' ? (
              <div className="flex shrink-0 items-center gap-1">
                {onToggleRole ? (
                  <button
                    type="button"
                    onClick={() => onToggleRole(member)}
                    className="rounded-lg px-2 py-1 text-[11px] font-medium text-brand-primary hover:bg-brand-primary/10"
                  >
                    {member.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                  </button>
                ) : null}
                {canTransferOwnership && onTransferOwnership ? (
                  <button
                    type="button"
                    onClick={() => onTransferOwnership(member)}
                    title={`Transferir propiedad a ${member.name}`}
                    className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50"
                  >
                    <Crown className="h-4 w-4" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onRemove(member.id)}
                  className="shrink-0 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                  title={`Quitar a ${member.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
