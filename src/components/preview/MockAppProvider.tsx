"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { AppContext, type AppContextValue } from "@/contexts/AppContext";
import type { MessageReaction, MessageSendOptions, MessageContext } from "@/lib/messages";
import type { Note, ServerPermissionKey, ViewMode } from "@/lib/supabase/types";
import {
  CATEGORIES,
  CHANNEL_MESSAGES,
  CHANNELS,
  DM_THREADS,
  FRIENDS,
  GROUPS,
  ME,
  MEMBERS,
  PEOPLE,
  PENDING_INCOMING,
  PRESENCE,
  REACTIONS,
  ROLES,
  SERVERS,
  UNREAD_CHANNELS,
  UNREAD_SERVERS,
  VOICE_PRESENCE,
  type MockMessage,
} from "./mockData";

// Local-state stand-in for AppProvider, for the design preview only. It
// covers navigation, sending, editing, reactions and mute/deafen so the real
// shell can be clicked through; anything else resolves to a harmless no-op.

const ALL_PERMISSIONS: Record<ServerPermissionKey, boolean> = {
  kick: true, ban: true, manage_roles: true, manage_server: true, manage_channels: true,
  manage_messages: true, manage_emojis: true, mention_everyone: true, send_messages: true,
  add_reactions: true, attach_files: true, timeout_members: true, pin_messages: true,
  view_audit_log: true, create_invites: true,
};

const everyone = [ME, ...Object.values(PEOPLE)];
const byId = new Map(everyone.map((p) => [p.id, p]));

function hydrate(m: MockMessage) {
  return {
    attachment_url: null,
    attachment_type: null,
    attachment_key: null,
    attachment_name: null,
    attachment_size: null,
    reply_to_id: null,
    mentions: [],
    edited_at: null,
    display_id: 0,
    ...m,
    author: m.author_id ? byId.get(m.author_id) : undefined,
  };
}

let seq = 0;
const newId = (prefix: string) => `${prefix}-${Date.now()}-${seq++}`;

export function MockAppProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>("space");
  const [activeServerId, setActiveServerId] = useState<string | null>("s-owls");
  const [activeChannelId, setActiveChannelId] = useState<string | null>("ch-general");
  const [activeDmThreadId, setActiveDmThreadId] = useState<string | null>(null);
  const [activeGroupChatId, setActiveGroupChatId] = useState<string | null>(null);
  const [channelMessages, setChannelMessages] = useState(CHANNEL_MESSAGES);
  const [dmMessages, setDmMessages] = useState<Record<string, MockMessage[]>>(
    () => Object.fromEntries(DM_THREADS.map((t) => [t.id, t.messages])),
  );
  const [groupMessages, setGroupMessages] = useState<Record<string, MockMessage[]>>(
    () => Object.fromEntries(GROUPS.map((g) => [g.id, g.messages])),
  );
  const [notes, setNotes] = useState<Note[]>([]);
  const [reactions, setReactions] = useState<MessageReaction[]>(REACTIONS);
  const [micMuted, setMicMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [readThreads, setReadThreads] = useState<Set<string>>(new Set());
  const [profile, setProfile] = useState(ME);

  const append = useCallback(
    (
      setter: React.Dispatch<React.SetStateAction<Record<string, MockMessage[]>>>,
      key: string | null,
      content: string,
      options?: MessageSendOptions,
    ) => {
      if (!key) return Promise.resolve("Nothing selected");
      const id = newId("local");
      const attachment = options?.attachment;
      const entry: MockMessage & { sending?: boolean } = {
        id,
        author_id: ME.id,
        content,
        created_at: new Date().toISOString(),
        reply_to_id: options?.replyToId ?? null,
        attachment_url: attachment?.url ?? null,
        attachment_type: (attachment?.type as MockMessage["attachment_type"]) ?? null,
        sending: true,
      };
      setter((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), entry] }));
      // Settle the optimistic row the way a real insert echo would.
      window.setTimeout(() => {
        setter((prev) => ({
          ...prev,
          [key]: (prev[key] ?? []).map((m) => (m.id === id ? { ...m, sending: false } : m)),
        }));
      }, 450);
      return Promise.resolve(null);
    },
    [],
  );

  const edit = useCallback(
    (setter: React.Dispatch<React.SetStateAction<Record<string, MockMessage[]>>>, key: string | null, messageId: string, content: string) => {
      if (!key) return Promise.resolve("Nothing selected");
      setter((prev) => ({
        ...prev,
        [key]: (prev[key] ?? []).map((m) => (m.id === messageId ? { ...m, content, edited_at: new Date().toISOString() } : m)),
      }));
      return Promise.resolve(null);
    },
    [],
  );

  const remove = useCallback(
    (setter: React.Dispatch<React.SetStateAction<Record<string, MockMessage[]>>>, key: string | null, messageId: string) => {
      if (!key) return Promise.resolve();
      setter((prev) => ({ ...prev, [key]: (prev[key] ?? []).filter((m) => m.id !== messageId) }));
      return Promise.resolve();
    },
    [],
  );

  const value = useMemo(() => {
    const activeServer = SERVERS.find((s) => s.id === activeServerId) ?? null;
    const channels = CHANNELS.filter((c) => c.server_id === activeServerId);
    const activeChannel = channels.find((c) => c.id === activeChannelId) ?? null;
    const dmThreads = DM_THREADS.map((t) => ({ id: t.id, user_a: ME.id, user_b: t.friend.id, created_at: t.messages[0]?.created_at ?? "", friend: t.friend }));
    const dmUnreadFor = (threadId: string) =>
      readThreads.has(threadId) || (viewMode === "dm" && activeDmThreadId === threadId)
        ? 0
        : DM_THREADS.find((t) => t.id === threadId)?.unread ?? 0;
    const groupUnreadFor = (groupId: string) =>
      readThreads.has(groupId) || (viewMode === "group" && activeGroupChatId === groupId)
        ? 0
        : GROUPS.find((g) => g.id === groupId)?.unread ?? 0;

    const base: Partial<AppContextValue> = {
      ready: true,
      hydrated: true,
      configured: true,
      session: { access_token: "preview", user: { id: ME.id } } as unknown as Session,
      user: { id: ME.id, email: "maya@example.com" } as unknown as User,
      profile,
      tetherProfile: null,
      subscriptionPlan: "aero",
      servers: SERVERS,
      categories: CATEGORIES.filter((c) => c.server_id === activeServerId),
      channels,
      members: activeServerId === "s-owls" ? MEMBERS : MEMBERS.slice(0, 5),
      serverRoles: activeServerId === "s-owls" ? ROLES : [],
      messages: (channelMessages[activeChannelId ?? ""] ?? []).map(hydrate) as AppContextValue["messages"],
      dmThreads,
      dmMessages: (dmMessages[activeDmThreadId ?? ""] ?? []).map(hydrate) as AppContextValue["dmMessages"],
      notes,
      groupChats: GROUPS,
      groupMessages: (groupMessages[activeGroupChatId ?? ""] ?? []).map(hydrate) as AppContextValue["groupMessages"],
      messagesLoading: false,
      dmLoading: false,
      groupLoading: false,
      friendships: FRIENDS.map((f) => ({ id: `fr-${f.id}`, requester_id: ME.id, addressee_id: f.id, status: "accepted" as const, created_at: "", requester: ME, addressee: f })),
      friends: FRIENDS,
      pendingIncoming: PENDING_INCOMING,
      pendingOutgoing: [],
      notifications: [],
      voicePresence: VOICE_PRESENCE,
      viewMode,
      activeServerId,
      activeChannelId,
      activeDmThreadId,
      activeGroupChatId,
      activeChannel,
      activeServer,
      micMuted,
      deafened,
      setMicMuted,
      setDeafened,
      mfaRequired: false,
      savedSessions: [],
      addingAccount: false,
      platformBan: null,
      restrictions: [],
      blockedUserIds: new Set(),
      isBlocked: () => false,
      isBlockedEitherWay: () => false,
      groupCallCounts: new Map([["g-hike", 0]]),
      serverTimeouts: [],
      serverBans: [],
      serverFolders: [],
      serverListState: SERVERS.map((s, i) => ({ user_id: ME.id, server_id: s.id, position: i, folder_id: null, updated_at: "" })),
      getMemberColor: (m) => {
        const role = ROLES.find((r) => m.role_ids?.includes(r.id) && !r.is_default);
        return role?.color ?? null;
      },
      messageReactions: reactions,
      pinnedBySource: {},
      catalystCounts: { "s-owls": 3 },
      myCatalysts: [],
      customEmojiMap: {},
      voiceJoinedChannelId: null,
      dmUnreads: DM_THREADS.filter((t) => dmUnreadFor(t.id) > 0).map((t) => ({ threadId: t.id, friend: t.friend, count: dmUnreadFor(t.id) })),
      dmListEntries: DM_THREADS.map((t) => ({
        key: t.id,
        friend: t.friend,
        threadId: t.id,
        unreadCount: dmUnreadFor(t.id),
        sortAt: (dmMessages[t.id] ?? []).at(-1)?.created_at ?? "",
      })).sort((a, b) => (a.sortAt < b.sortAt ? 1 : -1)),
      serverUnreadIds: UNREAD_SERVERS.filter((id) => id !== activeServerId),
      getDmUnreadCount: dmUnreadFor,
      clearDmUnread: (id) => setReadThreads((s) => new Set(s).add(id)),
      channelUnreadMap: new Map(Object.entries(UNREAD_CHANNELS).map(([k, v]) => [k, v.unread])),
      getChannelUnreadCount: (id) => (id === activeChannelId ? 0 : UNREAD_CHANNELS[id]?.unread ?? 0),
      getChannelMentionCount: (id) => (id === activeChannelId ? 0 : UNREAD_CHANNELS[id]?.mentions ?? 0),
      groupUnreadMap: new Map(GROUPS.map((g) => [g.id, groupUnreadFor(g.id)])),
      getGroupUnreadCount: groupUnreadFor,
      clearGroupUnread: (id) => setReadThreads((s) => new Set(s).add(id)),
      presenceMap: PRESENCE,
      channelHasMore: false,
      dmHasMore: false,
      groupHasMore: false,
      notesHasMore: false,
      serverPermissions: ALL_PERMISSIONS,
      hasServerPermission: () => true,
      channelEffects: {},

      setViewHome: () => { setViewMode("home"); },
      setViewDiscover: () => { setViewMode("discover"); },
      setViewNotes: async () => { setViewMode("notes"); },
      selectServer: async (id) => {
        setActiveServerId(id);
        setViewMode("space");
        setActiveChannelId(CHANNELS.find((c) => c.server_id === id && c.type === "text")?.id ?? null);
      },
      selectChannel: (id) => { setActiveChannelId(id); },
      selectDmThread: async (id) => {
        setActiveDmThreadId(id);
        setViewMode("dm");
        setReadThreads((s) => new Set(s).add(id));
      },
      selectGroupChat: async (id) => {
        setActiveGroupChatId(id);
        setViewMode("group");
        setReadThreads((s) => new Set(s).add(id));
      },
      openDmWithFriend: async (friendId) => {
        const thread = DM_THREADS.find((t) => t.friend.id === friendId);
        if (thread) {
          setActiveDmThreadId(thread.id);
          setViewMode("dm");
        }
      },
      sendChannelMessage: (content, options) => append(setChannelMessages, activeChannelId, content, options),
      sendDmMessage: (content, options) => append(setDmMessages, activeDmThreadId, content, options),
      sendGroupMessage: (content, options) => append(setGroupMessages, activeGroupChatId, content, options),
      editChannelMessage: (id, content) => edit(setChannelMessages, activeChannelId, id, content),
      editDmMessage: (id, content) => edit(setDmMessages, activeDmThreadId, id, content),
      editGroupMessage: (id, content) => edit(setGroupMessages, activeGroupChatId, id, content),
      deleteMessage: (id) => remove(setChannelMessages, activeChannelId, id),
      deleteDmMessage: (id) => remove(setDmMessages, activeDmThreadId, id),
      deleteGroupMessage: (id) => remove(setGroupMessages, activeGroupChatId, id),
      sendNote: async (content) => {
        setNotes((prev) => [...prev, {
          id: newId("note"), user_id: ME.id, content, attachment_url: null, attachment_type: null,
          attachment_key: null, attachment_name: null, attachment_size: null, reply_to_id: null,
          pinned: false, created_at: new Date().toISOString(), edited_at: null,
        }]);
        return null;
      },
      toggleReaction: async (context: MessageContext, messageId: string, emoji: string) => {
        setReactions((prev) => {
          const mine = prev.find((r) => r.context_type === context && r.message_id === messageId && r.emoji === emoji && r.user_id === ME.id);
          if (mine) return prev.filter((r) => r !== mine);
          return [...prev, { id: newId("rx"), context_type: context, message_id: messageId, user_id: ME.id, emoji, created_at: new Date().toISOString() }];
        });
      },
      updateProfile: async (patch) => {
        setProfile((p) => ({ ...p, ...patch }));
        return null;
      },
      loadMutuals: async () => ({ serverIds: ["s-owls"], friendIds: [] }),
      signOut: async () => { window.location.assign("/home"); },
    };

    // Everything not modelled above is an async no-op, so a click on, say,
    // "Create role" does nothing instead of crashing the preview.
    return new Proxy(base, {
      get(target, prop) {
        if (prop in target) return target[prop as keyof typeof target];
        if (typeof prop === "symbol") return undefined;
        return async () => null;
      },
    }) as AppContextValue;
  }, [
    viewMode, activeServerId, activeChannelId, activeDmThreadId, activeGroupChatId,
    channelMessages, dmMessages, groupMessages, notes, reactions, micMuted, deafened,
    readThreads, profile, append, edit, remove,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
