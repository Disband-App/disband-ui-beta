"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Avatar } from "@/components/ui/Avatar";
import { displayName } from "@/lib/utils";
import { IconFriends, IconSearch, IconClose, IconUserPlus, IconCheck } from "@/components/icons";
import { Segmented } from "@/components/ui/Segmented";
import type { Profile, UserStatus } from "@/lib/supabase/types";
import type { PresenceMap } from "@/lib/presence";
import { activeStatusNote } from "@/lib/presence";

type FriendsTab = "online" | "all" | "pending" | "blocked";

const STATUS_DOT: Record<UserStatus, string> = {
  online: "bg-status-online",
  idle: "bg-status-idle",
  dnd: "bg-status-dnd",
  offline: "bg-status-offline",
};

const STATUS_LABEL: Record<UserStatus, string> = {
  online: "Online",
  idle: "Away",
  dnd: "Do Not Disturb",
  offline: "Offline",
};

function StatusAvatar({ profile, presence }: { profile: Profile; presence: PresenceMap }) {
  const live = presence.get(profile.id) ?? "offline";
  return (
    <div className="relative shrink-0">
      <Avatar profile={profile} size="md" />
      <span
        className={`absolute -bottom-0.5 -right-0.5 h-[14px] w-[14px] rounded-full border-[2.5px] border-bg-secondary ${
          STATUS_DOT[live]
        }`}
      />
    </div>
  );
}

function RowAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className="press flex h-9 w-9 items-center justify-center rounded-full bg-fill-tertiary text-brand transition-colors hover:bg-fill-secondary"
    >
      {children}
    </button>
  );
}

function IconMessage({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function IconMore({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

interface FriendsPanelProps {
  onOpenProfile: (profile: Profile) => void;
  onFriendContext: (profile: Profile, x: number, y: number) => void;
}

export function FriendsPanel({ onOpenProfile, onFriendContext }: FriendsPanelProps) {
  const {
    friends,
    friendships,
    pendingIncoming,
    pendingOutgoing,
    blockedUserIds,
    sendFriendRequest,
    respondFriendRequest,
    unblockUser,
    openDmWithFriend,
    presenceMap,
  } = useApp();

  const [tab, setTab] = useState<FriendsTab>("online");
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addValue, setAddValue] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const pendingCount = pendingIncoming.length;
  // Search applies to every tab (previously the box only showed on some
  // tabs, so pending/blocked lists couldn't be filtered at all).
  const matchQuery = (p: Profile | null | undefined) => {
    const q = query.trim().toLowerCase();
    if (!q || !p) return !q;
    return displayName(p).toLowerCase().includes(q) || (p.username ?? "").toLowerCase().includes(q);
  };
  const visiblePendingIncoming = pendingIncoming.filter((f) => matchQuery(f.requester));
  const visiblePendingOutgoing = pendingOutgoing.filter((f) => matchQuery(f.addressee));

  const blocked = useMemo(
    () =>
      friendships
        .filter((f) => f.status === "blocked" && blockedUserIds.has(f.addressee_id))
        .map((f) => f.addressee)
        .filter((p): p is Profile => !!p)
        .sort((a, b) => displayName(a).localeCompare(displayName(b))),
    [friendships, blockedUserIds],
  );
  const visibleBlocked = blocked.filter((p) => matchQuery(p));

  const visible = useMemo(() => {
    const base = tab === "online" ? friends.filter((f) => (presenceMap.get(f.id) ?? "offline") !== "offline") : friends;
    const q = query.trim().toLowerCase();
    const filtered = q
      ? base.filter(
          (f) =>
            displayName(f).toLowerCase().includes(q) || (f.username ?? "").toLowerCase().includes(q),
        )
      : base;
    return [...filtered].sort((a, b) => displayName(a).localeCompare(displayName(b)));
  }, [friends, tab, query, presenceMap]);

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = addValue.trim();
    if (!name || sending) return;
    setSending(true);
    setAddError(null);
    setAddSuccess(null);
    const err = await sendFriendRequest(name);
    if (err) {
      setAddError(err);
    } else {
      setAddSuccess(`Friend request sent to ${name}.`);
      setAddValue("");
    }
    setSending(false);
  }

  const heading =
    tab === "pending"
      ? `Pending — ${pendingIncoming.length + pendingOutgoing.length}`
      : tab === "blocked"
        ? `Blocked — ${blocked.length}`
        : tab === "online"
          ? `Online — ${visible.length}`
          : `All friends — ${visible.length}`;

  return (
    <main className="view-enter flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-bg-primary">
      <header className="shrink-0 px-6 pb-3 pt-5">
        <div className="flex items-center gap-3">
          <h1 className="large-title min-w-0 flex-1 truncate">Friends</h1>
          <button
            type="button"
            onClick={() => {
              setAddOpen((v) => !v);
              setAddError(null);
              setAddSuccess(null);
            }}
            aria-expanded={addOpen}
            className={`btn btn-sm ${addOpen ? "btn-gray" : "btn-filled"}`}
          >
            {addOpen ? <IconClose size={15} strokeWidth={2.4} /> : <IconUserPlus size={15} strokeWidth={2.2} />}
            {addOpen ? "Done" : "Add friend"}
          </button>
        </div>

        {!addOpen && (
          <Segmented
            className="mt-4 max-w-md"
            ariaLabel="Filter friends"
            value={tab}
            onChange={(t) => setTab(t)}
            options={(["online", "all", "pending", "blocked"] as const).map((t) => ({
              id: t,
              label: (
                <>
                  <span className="capitalize">{t}</span>
                  {t === "pending" && pendingCount > 0 && (
                    <span key={pendingCount} className="count-badge badge-pop h-4 min-w-4 px-1 text-[10px]">
                      {pendingCount > 99 ? "99+" : pendingCount}
                    </span>
                  )}
                </>
              ),
            }))}
          />
        )}
      </header>

      {addOpen && (
        <div className="view-enter shrink-0 px-6 pb-5">
          <div className="max-w-xl rounded-[18px] bg-bg-secondary p-5 shadow-[0_0_0_1px_var(--panel-border)]">
            <h2 className="text-[16px] font-semibold text-text-normal">Add a friend</h2>
            <p className="mt-1 text-[13.5px] text-text-muted">
              Find people by their Disband username.
            </p>
            <form onSubmit={submitAdd} className="mt-4 flex gap-2">
              <label className="field flex min-w-0 flex-1 items-center gap-1 py-0">
                <span className="text-text-muted">@</span>
                <input
                  autoFocus
                  value={addValue}
                  onChange={(e) => {
                    setAddValue(e.target.value);
                    setAddError(null);
                    setAddSuccess(null);
                  }}
                  placeholder="username"
                  className="min-w-0 flex-1 bg-transparent py-2 outline-none"
                />
              </label>
              <button
                type="submit"
                disabled={!addValue.trim() || sending}
                className="btn btn-filled h-10 shrink-0"
              >
                {sending ? "Sending…" : "Send request"}
              </button>
            </form>
            {addError && <p className="shake mt-2.5 text-[13px] text-status-dnd">{addError}</p>}
            {addSuccess && <p className="mt-2.5 flex items-center gap-1.5 text-[13px] text-status-online"><IconCheck size={14} strokeWidth={2.6} />{addSuccess}</p>}
          </div>
        </div>
      )}

      {!addOpen && (
        <div className="shrink-0 px-6 pb-1">
          <label className="search-field max-w-md">
            <IconSearch size={15} className="shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === "online" ? "Search online friends" : "Search friends"}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="flex h-4 w-4 items-center justify-center rounded-full bg-text-muted/60 text-bg-primary"
              >
                <IconClose size={10} strokeWidth={3} />
              </button>
            )}
          </label>
        </div>
      )}

      {!addOpen && (
        <div key={tab} className="view-enter min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          <p className="section-label sticky top-0 z-10 bg-bg-primary/90 px-4 pb-2 pt-4 backdrop-blur">
            {heading}
          </p>

          {tab === "pending" ? (
            visiblePendingIncoming.length === 0 && visiblePendingOutgoing.length === 0 ? (
              <p className="px-4 py-10 text-center text-[13.5px] text-text-muted">
                {query.trim()
                  ? `No pending requests match “${query.trim()}”.`
                  : "There are no pending friend requests."}
              </p>
            ) : (
              <PendingList
                incoming={visiblePendingIncoming}
                outgoing={visiblePendingOutgoing}
                onRespond={respondFriendRequest}
                onOpenProfile={onOpenProfile}
              />
            )
          ) : tab === "blocked" ? (
            visibleBlocked.length === 0 ? (
              <p className="px-4 py-10 text-center text-[13.5px] text-text-muted">
                {query.trim()
                  ? `No blocked users match “${query.trim()}”.`
                  : "You haven’t blocked anyone."}
              </p>
            ) : (
              <ul className="list-group" style={{ ["--row-inset" as string]: "68px" }}>
                {visibleBlocked.map((person) => (
                  <li
                    key={person.id}
                    className="list-row"
                  >
                    <Avatar profile={person} size="md" className="opacity-60" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-text-normal">
                        {displayName(person)}
                      </p>
                      <p className="truncate text-[13px] text-text-muted">Blocked</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void unblockUser(person.id)}
                      className="btn btn-gray btn-sm shrink-0"
                    >
                      Unblock
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : visible.length === 0 ? (
            <EmptyState
              query={query}
              tab={tab}
              totalFriends={friends.length}
              onAdd={() => setAddOpen(true)}
            />
          ) : (
            <ul className="list-group stagger" style={{ ["--row-inset" as string]: "68px" }}>
              {visible.map((friend, i) => (
                <li key={friend.id} className="list-row p-0" style={{ ["--i" as string]: Math.min(i, 10) }}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenProfile(friend)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpenProfile(friend);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onFriendContext(friend, e.clientX, e.clientY);
                    }}
                    className="group flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-interactive-hover active:bg-interactive-selected"
                  >
                    <StatusAvatar profile={friend} presence={presenceMap} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-text-normal">
                        {displayName(friend)}
                        {friend.username && (
                          <span className="ml-1.5 text-sm font-normal text-text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                            @{friend.username}
                          </span>
                        )}
                      </p>
                      {(friend.pronouns || activeStatusNote(friend)) && (
                        <p className="truncate text-[12.5px] text-text-muted">
                          <span className="font-medium text-text-normal/80">{friend.pronouns}</span>
                          {friend.pronouns && activeStatusNote(friend) && (
                            <span className="mx-1 text-text-muted/40">·</span>
                          )}
                          <span>{activeStatusNote(friend)}</span>
                        </p>
                      )}
                      {!activeStatusNote(friend) && !friend.pronouns && (
                        <p className="truncate text-[12.5px] text-text-muted">
                          {STATUS_LABEL[presenceMap.get(friend.id) ?? "offline"]}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <RowAction label="Message" onClick={() => void openDmWithFriend(friend.id)}>
                        <IconMessage />
                      </RowAction>
                      <RowAction
                        label="More"
                        onClick={(e) => {
                          // Anchor to the clicked button itself: the old code
                          // read document.activeElement, which mispositions
                          // the menu for keyboard users and focus jumps.
                          const rect = e.currentTarget.getBoundingClientRect();
                          onFriendContext(friend, rect.left, rect.bottom + 4);
                        }}
                      >
                        <IconMore />
                      </RowAction>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}

function EmptyState({
  query,
  tab,
  totalFriends,
  onAdd,
}: {
  query: string;
  tab: FriendsTab;
  totalFriends: number;
  onAdd: () => void;
}) {
  if (query) {
    return (
      <p className="px-4 py-10 text-center text-[13.5px] text-text-muted">
        No friends match &ldquo;{query}&rdquo;.
      </p>
    );
  }
  if (totalFriends === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-fill-tertiary text-text-muted"><IconFriends size={30} /></span>
        <h2 className="title-2">No friends yet</h2>
        <p className="mt-1 max-w-sm text-[13.5px] text-text-muted">
          Add someone by their username to start sending messages and calls.
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="btn btn-filled mt-5"
        >
          Add a friend
        </button>
      </div>
    );
  }
  return (
    <p className="px-4 py-10 text-center text-[13.5px] text-text-muted">
      {tab === "online"
        ? "Nobody's online right now."
        : "No friends to show."}
    </p>
  );
}

function PendingList({
  incoming,
  outgoing,
  onRespond,
  onOpenProfile,
}: {
  incoming: ReturnType<typeof useApp>["pendingIncoming"];
  outgoing: ReturnType<typeof useApp>["pendingOutgoing"];
  onRespond: (id: string, accept: boolean) => Promise<void>;
  onOpenProfile: (profile: Profile) => void;
}) {
  const { presenceMap } = useApp();
  if (incoming.length === 0 && outgoing.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-[13.5px] text-text-muted">No pending requests.</p>
    );
  }

  return (
    <ul className="list-group" style={{ ["--row-inset" as string]: "68px" }}>
      {incoming.map((f) => (
        <li
          key={f.id}
          className="list-row"
        >
          {f.requester && <StatusAvatar profile={f.requester} presence={presenceMap} />}
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => f.requester && onOpenProfile(f.requester)}
              className="block truncate text-[15px] font-semibold text-text-normal hover:underline"
            >
              {f.requester ? displayName(f.requester) : "Unknown user"}
            </button>
            <p className="text-[12.5px] text-text-muted">Wants to be friends</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => void onRespond(f.id, false)} className="btn btn-gray btn-sm">
              Ignore
            </button>
            <button type="button" onClick={() => void onRespond(f.id, true)} className="btn btn-filled btn-sm">
              Accept
            </button>
          </div>
        </li>
      ))}

      {outgoing.map((f) => (
        <li
          key={f.id}
          className="list-row"
        >
          {f.addressee && <StatusAvatar profile={f.addressee} presence={presenceMap} />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-text-normal">
              {f.addressee ? displayName(f.addressee) : "…"}
            </p>
            <p className="text-[12.5px] text-text-muted">Request sent</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => void onRespond(f.id, false)} className="btn btn-gray btn-sm">
              Cancel
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ActiveNowPanel() {
  const { friends, dmListEntries, presenceMap } = useApp();

  const active = useMemo(() => {
    const inDm = new Set(dmListEntries.map((e) => e.friend.id));
    return friends
      .filter((f) => {
        const live = presenceMap.get(f.id) ?? "offline";
        return live === "online" || live === "idle" || live === "dnd";
      })
      .sort((a, b) => Number(inDm.has(b.id)) - Number(inDm.has(a.id)))
      .slice(0, 12);
  }, [friends, dmListEntries, presenceMap]);

  return (
    <aside className="hidden w-[300px] shrink-0 flex-col overflow-hidden border-l border-hairline xl:flex">
      <div className="flex shrink-0 items-center px-5 pb-2 pt-6">
        <h2 className="title-2">Active now</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
        {active.length === 0 ? (
          <div className="mx-2 mt-2 rounded-[16px] bg-fill-tertiary p-4">
            <p className="text-[14px] font-semibold text-text-normal">It&rsquo;s quiet for now</p>
            <p className="mt-1 text-[13px] leading-relaxed text-text-muted">
              When friends come online, they&rsquo;ll show up here.
            </p>
          </div>
        ) : (
          <ul className="stagger space-y-0.5 pt-1">
            {active.map((f, i) => (
              <li key={f.id} style={{ ["--i" as string]: i }} className="flex items-center gap-3 rounded-[12px] px-2 py-2 transition-colors hover:bg-interactive-hover">
                <StatusAvatar profile={f} presence={presenceMap} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-normal">
                    {displayName(f)}
                  </p>
                  <p className="truncate text-[13px] text-text-muted">{STATUS_LABEL[presenceMap.get(f.id) ?? "offline"]}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
