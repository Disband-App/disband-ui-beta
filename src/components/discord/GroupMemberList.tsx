"use client";

import { Avatar } from "@/components/ui/Avatar";
import { displayName } from "@/lib/utils";
import type { Profile } from "@/lib/supabase/types";

interface GroupMemberListProps {
  members: Profile[];
  ownerId: string;
  inCallUserIds?: Set<string>;
  currentUserId?: string | null;
  onMemberClick?: (profile: Profile) => void;
  onMemberContext?: (profile: Profile, x: number, y: number) => void;
}

export function GroupMemberList({
  members,
  ownerId,
  inCallUserIds,
  currentUserId,
  onMemberClick,
  onMemberContext,
}: GroupMemberListProps) {
  const inCall = members.filter((m) => inCallUserIds?.has(m.id));
  const notInCall = members.filter((m) => !inCallUserIds?.has(m.id));

  function Row({ m }: { m: Profile }) {
    const inVoice = inCallUserIds?.has(m.id);
    return (
      <button
        type="button"
        onClick={() => onMemberClick?.(m)}
        onContextMenu={(e) => {
          e.preventDefault();
          onMemberContext?.(m, e.clientX, e.clientY);
        }}
        className="nav-row gap-2.5 px-2.5 py-[5px]"
      >
        <div className="relative shrink-0">
          <Avatar profile={m} size="sm" />
          {inVoice && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[2.5px] border-bg-primary bg-status-online" />
          )}
        </div>
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="truncate text-[14px] font-medium text-text-normal">{displayName(m)}</span>
          {m.id === ownerId && <span className="pill shrink-0 bg-fill-tertiary px-1.5 py-0 text-[10px] text-text-muted">Owner</span>}
          {m.id === currentUserId && <span className="pill shrink-0 bg-brand/15 px-1.5 py-0 text-[10px] text-brand">You</span>}
        </span>
        {inVoice && <span className="ml-auto shrink-0 text-[11px] font-semibold text-status-online">In call</span>}
      </button>
    );
  }

  return (
    <aside className="flex min-h-0 w-[248px] shrink-0 flex-col">
      <div className="flex h-[58px] shrink-0 items-center gap-2 px-5 hairline-b">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">People</h2>
        <span className="pill bg-fill-tertiary text-text-muted">{members.length}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-4 pt-1">
        {inCall.length > 0 && (
          <section className="mb-2">
            <p className="section-label px-2.5 pb-1.5 pt-4 text-[11.5px] text-status-online">
              In voice · {inCall.length}
            </p>
            {inCall.map((m) => <Row key={m.id} m={m} />)}
          </section>
        )}
        <section>
          <p className="section-label px-2.5 pb-1.5 pt-4 text-[11.5px]">
            Members
          </p>
          {notInCall.map((m) => <Row key={m.id} m={m} />)}
        </section>
      </div>
    </aside>
  );
}
