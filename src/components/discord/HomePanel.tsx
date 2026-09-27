"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Avatar } from "@/components/ui/Avatar";
import { displayName } from "@/lib/utils";
import { activeStatusNote, statusLabel } from "@/lib/presence";
import { IconFriends, IconNotes, IconCrown, IconSparkle, IconSearch, IconSquarePen, IconClose } from "@/components/icons";
import { NotificationBell } from "./NotificationBell";
import { CallIndicator } from "./CallIndicator";
import { CreateGroupChatModal } from "@/components/modals/CreateGroupChatModal";
import type { GroupChatWithMembers, Profile } from "@/lib/supabase/types";

const STATUS_BG = {
  online: "bg-status-online",
  idle: "bg-status-idle",
  dnd: "bg-status-dnd",
  offline: "bg-status-offline",
} as const;

interface HomePanelProps {
  onOpenSettings: () => void;
  onOpenProfile?: () => void;
  onFriendClick?: (friendId: string) => void;
  onGroupContext?: (group: GroupChatWithMembers, x: number, y: number) => void;
  onOpenSubscription?: () => void;
  onOpenShop?: () => void;
}

/** Short relative stamp for the conversation list, as Messages shows it. */
function listTime(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const d = new Date(t);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  if (now.getTime() - t < 6 * 86_400_000) return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, { month: "numeric", day: "numeric", year: "2-digit" });
}

function ShortcutTile({
  icon,
  label,
  tint,
  active,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tint: string;
  active?: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={`press relative flex flex-col items-start gap-2 rounded-[14px] p-2.5 text-left transition-colors ${
        active ? "bg-brand/14" : "bg-fill-tertiary hover:bg-fill-secondary"
      }`}
    >
      <span className="icon-tile" style={{ background: tint }}>
        {icon}
      </span>
      <span className="w-full truncate text-[13px] font-semibold text-text-normal">{label}</span>
      {badge ? (
        <span key={badge} className="count-badge badge-pop absolute right-2 top-2">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </button>
  );
}

/** Group avatar: two members overlapped, the way Messages draws a group. */
function GroupAvatar({ members }: { members: Profile[] }) {
  const [a, b] = members;
  if (!a) return <span className="h-10 w-10 rounded-full bg-fill" />;
  if (!b) return <Avatar profile={a} size="md" />;
  return (
    <span className="relative block h-10 w-10 shrink-0">
      <span className="absolute left-0 top-0">
        <Avatar profile={a} size="sm" className="h-[26px] w-[26px] text-[11px]" />
      </span>
      <span className="absolute bottom-0 right-0 rounded-full ring-2 ring-bg-secondary">
        <Avatar profile={b} size="sm" className="h-[26px] w-[26px] text-[11px]" />
      </span>
    </span>
  );
}

export function HomePanel({
  onOpenSettings: _onOpenSettings,
  onOpenProfile: _onOpenProfile,
  onGroupContext,
  onOpenSubscription,
  onOpenShop,
}: HomePanelProps) {
  const {
    pendingIncoming,
    dmListEntries,
    groupChats,
    groupCallCounts,
    activeGroupChatId,
    activeDmThreadId,
    viewMode,
    openDmWithFriend,
    selectDmThread,
    selectGroupChat,
    setViewHome,
    setViewNotes,
    presenceMap,
    getGroupUnreadCount,
    tetherProfile,
    subscriptionPlan,
  } = useApp();
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [query, setQuery] = useState("");

  const onFriends = viewMode === "home";

  // Aero users get a pinned Tether row so the assistant is discoverable: it
  // opens a real DM thread (migration 0102) where every message is an ask.
  // Once the thread exists it shows up in dmListEntries on its own.
  const tetherThreadId = tetherProfile
    ? dmListEntries.find((e) => e.threadId && e.friend.id === tetherProfile.id)?.threadId ?? null
    : null;
  const showTetherRow = subscriptionPlan === "aero" && tetherProfile && !tetherThreadId;

  const q = query.trim().toLowerCase();
  const visibleGroups = useMemo(
    () => (q ? groupChats.filter((g) => g.name.toLowerCase().includes(q) || g.members.some((m) => displayName(m).toLowerCase().includes(q))) : groupChats),
    [groupChats, q],
  );
  const visibleDms = useMemo(
    () => (q ? dmListEntries.filter((e) => displayName(e.friend).toLowerCase().includes(q) || (e.friend.username ?? "").includes(q)) : dmListEntries),
    [dmListEntries, q],
  );

  async function openDmEntry(entry: (typeof dmListEntries)[number]) {
    if (entry.threadId) {
      await selectDmThread(entry.threadId);
      return;
    }
    await openDmWithFriend(entry.friend.id);
  }

  return (
    <aside className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-1 px-4 pb-1 pt-3.5">
        <h2 className="large-title min-w-0 flex-1 truncate text-[26px]">Messages</h2>
        <NotificationBell />
        <button
          type="button"
          onClick={() => setCreateGroupOpen(true)}
          title="New group"
          aria-label="New group"
          className="tool-btn text-brand hover:text-brand"
        >
          <IconSquarePen size={18} />
        </button>
      </header>

      <div className="shrink-0 px-3 pb-2 pt-1.5">
        <label className="search-field">
          <IconSearch size={15} className="shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search conversations"
          />
          {query && (
            <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="flex h-4 w-4 items-center justify-center rounded-full bg-text-muted/60 text-bg-secondary">
              <IconClose size={10} strokeWidth={3} />
            </button>
          )}
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {!q && (
          <nav aria-label="Shortcuts" className="grid grid-cols-2 gap-1.5 px-1 pb-3 pt-0.5">
            <ShortcutTile
              icon={<IconFriends size={16} strokeWidth={2} />}
              label="Friends"
              tint="linear-gradient(180deg, #3d9bff, #0a6fe8)"
              active={onFriends}
              badge={pendingIncoming.length}
              onClick={() => setViewHome()}
            />
            <ShortcutTile
              icon={<IconNotes size={16} strokeWidth={2} />}
              label="Notes"
              tint="linear-gradient(180deg, #ffcf3d, #f5a300)"
              active={viewMode === "notes"}
              onClick={() => void setViewNotes()}
            />
            <ShortcutTile
              icon={<IconCrown size={16} strokeWidth={2} />}
              label="Aero"
              tint="linear-gradient(180deg, #b986ff, #8a5cf5)"
              onClick={() => onOpenSubscription?.()}
            />
            <ShortcutTile
              icon={<IconSparkle size={16} strokeWidth={2} />}
              label="Shop"
              tint="linear-gradient(180deg, #ff7a93, #ec4263)"
              onClick={() => onOpenShop?.()}
            />
          </nav>
        )}

        {visibleGroups.length > 0 && (
          <p className="section-label px-3 pb-1 pt-1">Groups</p>
        )}
        {visibleGroups.map((g) => {
          const inCallCount = groupCallCounts.get(g.id) ?? 0;
          const unreadCount = getGroupUnreadCount(g.id);
          const active = viewMode === "group" && activeGroupChatId === g.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => void selectGroupChat(g.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                onGroupContext?.(g, e.clientX, e.clientY);
              }}
              data-active={active ? "true" : undefined}
              className="nav-row gap-3 py-2 pl-1"
            >
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${unreadCount > 0 ? "bg-brand" : "bg-transparent"}`} aria-hidden />
              <span className="relative -ml-1.5">
                <GroupAvatar members={g.members} />
                {inCallCount > 0 && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[2.5px] border-bg-secondary bg-status-online" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className={`min-w-0 flex-1 truncate text-[14.5px] ${unreadCount > 0 ? "font-bold" : "font-semibold"}`}>{g.name}</span>
                  {unreadCount > 0 && (
                    <span key={unreadCount} className="count-badge badge-pop bg-brand text-brand-foreground">{unreadCount > 99 ? "99+" : unreadCount}</span>
                  )}
                </span>
                <span className="block truncate text-[12.5px] text-text-muted">
                  {inCallCount > 0 ? `${inCallCount} in voice now` : `${g.members.length} people`}
                </span>
              </span>
            </button>
          );
        })}

        <div className="flex items-center justify-between px-3 pb-1 pt-3">
          <p className="section-label px-0">Direct messages</p>
        </div>
        {showTetherRow && tetherProfile && !q && (
          <button
            key="tether-dm"
            type="button"
            onClick={() => void openDmWithFriend(tetherProfile.id)}
            title="Message Tether directly"
            className="nav-row gap-3 py-2 pl-1"
          >
            <span className="h-2.5 w-2.5 shrink-0" aria-hidden />
            <span className="relative -ml-1.5">
              <Avatar profile={tetherProfile} size="md" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-[14.5px] font-semibold">{displayName(tetherProfile)}</span>
                <span className="pill bg-super/15 px-1.5 py-0 text-[10px] uppercase tracking-wide text-super">Aero</span>
              </span>
              <span className="block truncate text-[12.5px] text-text-muted">Ask anything</span>
            </span>
          </button>
        )}
        {visibleDms.map((entry) => {
          const active = viewMode === "dm" && !!entry.threadId && activeDmThreadId === entry.threadId;
          const status = presenceMap.get(entry.friend.id) ?? "offline";
          const note = activeStatusNote(entry.friend);
          const unread = entry.unreadCount > 0;
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => void openDmEntry(entry)}
              data-active={active ? "true" : undefined}
              className="nav-row gap-3 py-2 pl-1"
            >
              {/* The blue dot of an unread thread, leading the row. */}
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full transition-colors ${unread ? "bg-brand" : "bg-transparent"}`} aria-hidden />
              <span className="relative -ml-1.5">
                <Avatar profile={entry.friend} size="md" />
                <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[2.5px] border-bg-secondary ${STATUS_BG[status]}`} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className={`min-w-0 flex-1 truncate text-[14.5px] ${unread ? "font-bold" : "font-semibold"}`}>
                    {displayName(entry.friend)}
                  </span>
                  <span className={`shrink-0 text-[11.5px] ${unread ? "font-semibold text-brand" : "text-text-muted"}`}>
                    {entry.sortAt ? listTime(entry.sortAt) : ""}
                  </span>
                </span>
                <span className={`block truncate text-[12.5px] ${unread ? "text-text-normal" : "text-text-muted"}`}>
                  {unread
                    ? `${entry.unreadCount} new message${entry.unreadCount === 1 ? "" : "s"}`
                    : note ?? statusLabel(status)}
                </span>
              </span>
            </button>
          );
        })}
        {dmListEntries.length === 0 && !q && (
          <p className="px-4 py-3 text-[13px] text-text-muted">Add friends to start chatting.</p>
        )}
        {q && visibleDms.length === 0 && visibleGroups.length === 0 && (
          <p className="px-4 py-6 text-center text-[13px] text-text-muted">No results for &ldquo;{query.trim()}&rdquo;</p>
        )}
      </div>

      <CallIndicator />
      <CreateGroupChatModal open={createGroupOpen} onClose={() => setCreateGroupOpen(false)} />
    </aside>
  );
}
