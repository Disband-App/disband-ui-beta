import type {
  Channel,
  ChannelCategory,
  Friendship,
  GroupChatWithMembers,
  Profile,
  Server,
  ServerMember,
  ServerRole,
  UserStatus,
} from "@/lib/supabase/types";
import type { MessageReaction } from "@/lib/messages";

// Fixed sample data for the design preview. Everything is fictional; ids are
// readable strings so the state in React DevTools is easy to follow.

const NOW = Date.now();
const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();

function person(
  id: string,
  display_name: string,
  username: string,
  status: UserStatus,
  extra: Partial<Profile> = {},
): Profile {
  return {
    id,
    username,
    display_name,
    avatar_url: null,
    bio: null,
    status,
    preferred_status: status,
    banner_url: null,
    accent_color: null,
    accent_color_2: null,
    theme: "auto",
    avatar_crop: null,
    show_owner_badge: false,
    show_staff_badge: false,
    show_og_badge: false,
    show_bounty_badge: false,
    created_at: minutesAgo(60 * 24 * 400),
    updated_at: minutesAgo(60),
    ...extra,
  };
}

export const ME = person("u-me", "Maya Chen", "maya", "online", {
  accent_color: "#0a84ff",
  accent_color_2: "#5e5ce6",
  bio: "Product designer. Night walks, film cameras, too many synths.",
  pronouns: "she/her",
  status_note: "Sketching the new onboarding",
});

export const PEOPLE: Record<string, Profile> = {
  jordan: person("u-jordan", "Jordan Lee", "jordanl", "online", { accent_color: "#ff9f0a", accent_color_2: "#ff375f", pronouns: "he/him" }),
  priya: person("u-priya", "Priya Patel", "priya", "idle", { accent_color: "#30d158", accent_color_2: "#40c8e0" }),
  sam: person("u-sam", "Sam Rivera", "samr", "online"),
  theo: person("u-theo", "Theo Martin", "theo", "dnd", { accent_color: "#bf5af2", accent_color_2: "#5e5ce6", status_note: "Heads down until 6" }),
  ava: person("u-ava", "Ava Brooks", "avab", "online", { accent_color: "#ff375f", accent_color_2: "#ff375f" }),
  noah: person("u-noah", "Noah Kim", "noahk", "offline"),
  lena: person("u-lena", "Lena Fischer", "lena", "online", { accent_color: "#40c8e0", accent_color_2: "#0a84ff" }),
  kai: person("u-kai", "Kai Nakamura", "kai", "idle"),
};

const P = PEOPLE;

export const FRIENDS: Profile[] = [P.jordan, P.priya, P.sam, P.theo, P.ava, P.noah, P.lena];

export const PENDING_INCOMING: Friendship[] = [
  {
    id: "f-kai",
    requester_id: P.kai.id,
    addressee_id: ME.id,
    status: "pending",
    created_at: minutesAgo(40),
    requester: P.kai,
    addressee: ME,
  },
];

export const SERVERS: Server[] = [
  { id: "s-owls", name: "Night Owls", icon_url: null, banner_url: null, description: "Late-night games, clips and bad takes.", owner_id: ME.id, verified: true, created_at: minutesAgo(60 * 24 * 300) },
  { id: "s-design", name: "Design Club", icon_url: null, banner_url: null, description: "Critique, inspiration and type nerdery.", owner_id: P.lena.id, created_at: minutesAgo(60 * 24 * 200) },
  { id: "s-trail", name: "Trailheads", icon_url: null, banner_url: null, description: "Weekend hikes around the bay.", owner_id: P.priya.id, created_at: minutesAgo(60 * 24 * 120) },
  { id: "s-synth", name: "Synth Lab", icon_url: null, banner_url: null, description: "Patches, loops and gear talk.", owner_id: P.theo.id, created_at: minutesAgo(60 * 24 * 90) },
  { id: "s-study", name: "Study Hall", icon_url: null, banner_url: null, description: "Quiet focus sessions.", owner_id: P.sam.id, created_at: minutesAgo(60 * 24 * 30) },
];

export const CATEGORIES: ChannelCategory[] = [
  { id: "c-hang", server_id: "s-owls", name: "Hangout", position: 0 },
  { id: "c-games", server_id: "s-owls", name: "Games", position: 1 },
  { id: "c-voice", server_id: "s-owls", name: "Voice", position: 2 },
  { id: "c-d-main", server_id: "s-design", name: "Studio", position: 0 },
  { id: "c-t-main", server_id: "s-trail", name: "Planning", position: 0 },
  { id: "c-s-main", server_id: "s-synth", name: "Lab", position: 0 },
  { id: "c-st-main", server_id: "s-study", name: "Rooms", position: 0 },
];

function channel(id: string, server_id: string, category_id: string | null, name: string, position: number, type: "text" | "voice" = "text"): Channel {
  return { id, server_id, category_id, name, type, position, created_at: minutesAgo(60 * 24 * 100) };
}

export const CHANNELS: Channel[] = [
  channel("ch-general", "s-owls", "c-hang", "general", 0),
  channel("ch-intros", "s-owls", "c-hang", "introductions", 1),
  channel("ch-clips", "s-owls", "c-hang", "clips-and-screens", 2),
  channel("ch-lfg", "s-owls", "c-games", "looking-for-group", 0),
  channel("ch-patch", "s-owls", "c-games", "patch-notes", 1),
  channel("ch-lounge", "s-owls", "c-voice", "Lounge", 0, "voice"),
  channel("ch-late", "s-owls", "c-voice", "Late Night", 1, "voice"),
  channel("ch-d-crit", "s-design", "c-d-main", "critique", 0),
  channel("ch-d-type", "s-design", "c-d-main", "typography", 1),
  channel("ch-d-voice", "s-design", "c-d-main", "Studio Call", 2, "voice"),
  channel("ch-t-plan", "s-trail", "c-t-main", "this-weekend", 0),
  channel("ch-t-gear", "s-trail", "c-t-main", "gear", 1),
  channel("ch-s-patch", "s-synth", "c-s-main", "patches", 0),
  channel("ch-s-loops", "s-synth", "c-s-main", "loops", 1),
  channel("ch-st-focus", "s-study", "c-st-main", "focus-room", 0),
];

export const ROLES: ServerRole[] = [
  { id: "r-mod", server_id: "s-owls", name: "Moderators", color: "#ff9f0a", permissions: { kick: true, ban: true, manage_messages: true }, position: 2, is_default: false, created_at: minutesAgo(9999) },
  { id: "r-regular", server_id: "s-owls", name: "Regulars", color: "#40c8e0", permissions: {}, position: 1, is_default: false, created_at: minutesAgo(9999) },
  { id: "r-everyone", server_id: "s-owls", name: "everyone", color: "#8e8e93", permissions: { send_messages: true, add_reactions: true, attach_files: true }, position: 0, is_default: true, created_at: minutesAgo(9999) },
];

function member(profile: Profile, role: ServerMember["role"], roleIds: string[] = []): ServerMember & { profile: Profile } {
  return { server_id: "s-owls", user_id: profile.id, role, role_id: roleIds[0] ?? null, role_ids: roleIds, joined_at: minutesAgo(9999), profile };
}

export const MEMBERS = [
  member(ME, "owner", ["r-mod"]),
  member(P.jordan, "moderator", ["r-mod"]),
  member(P.priya, "member", ["r-regular"]),
  member(P.sam, "member", ["r-regular"]),
  member(P.theo, "member"),
  member(P.ava, "member", ["r-regular"]),
  member(P.noah, "member"),
  member(P.lena, "member"),
  member(P.kai, "member"),
];

export interface MockMessage {
  id: string;
  author_id: string | null;
  content: string;
  created_at: string;
  edited_at?: string | null;
  reply_to_id?: string | null;
  mentions?: string[];
  attachment_url?: string | null;
  attachment_type?: "image" | "video" | "gif" | "file" | "poll" | "audio" | null;
  attachment_name?: string | null;
  attachment_size?: number | null;
}

function msg(id: string, who: Profile | null, content: string, ago: number, extra: Partial<MockMessage> = {}): MockMessage {
  return { id, author_id: who?.id ?? null, content, created_at: minutesAgo(ago), ...extra };
}

export const CHANNEL_MESSAGES: Record<string, MockMessage[]> = {
  "ch-general": [
    msg("m1", P.jordan, "anyone still up? the new co-op mode dropped an hour ago", 190),
    msg("m2", P.ava, "been playing since it went live. the lighthouse level is unreal", 186),
    msg("m3", P.ava, "the fog rolls in when you climb and you can hear it before you see it", 185),
    msg("m4", P.sam, "ok that sells it. downloading", 170),
    msg("m5", ME, "Jordan did you ever fix the audio crackle from last week?", 96, { mentions: [P.jordan.id] }),
    msg("m6", P.jordan, "yeah — it was the sample rate. my interface was on 44.1 and the game wanted 48", 94, { reply_to_id: "m5" }),
    msg("m7", P.jordan, "switched it in audio settings and it's been clean since", 93),
    msg("m8", P.theo, "classic. same thing bit me on the synth rig", 80),
    msg("m9", P.lena, "posting the schedule for saturday so nobody has to scroll for it:\n\n**Saturday**\n- 8pm lobby opens in *Lounge*\n- 8:30 first run, three-player squads\n- 10pm clips thread", 42),
    msg("m10", P.priya, "🔥🔥", 40),
    msg("m11", ME, "I'll bring the snacks. Also made a quick overlay for the stream, here's the export command if anyone wants it:\n```\nffmpeg -i overlay.mov -c:v prores_ks -profile:v 4 overlay.mxf\n```", 12),
    msg("m12", P.sam, "legend", 9),
    msg("m13", P.ava, "@maya the overlay looks so clean. which font is that?", 3, { mentions: [ME.id] }),
  ],
  "ch-intros": [
    msg("i1", null, "Kai Nakamura joined the space.", 300),
    msg("i2", P.kai, "hey all — kai, mostly play support, usually on after 9", 298),
    msg("i3", P.jordan, "welcome! grab a role in #looking-for-group", 290),
  ],
  "ch-lfg": [
    msg("l1", P.sam, "need one more for ranked, gold-ish", 25),
    msg("l2", P.theo, "in 10", 22),
  ],
  "ch-d-crit": [
    msg("d1", P.lena, "Two directions for the event poster — left is the grid version, right is the loose collage. Honest takes please.", 70),
    msg("d2", ME, "Grid. The collage is fun but the date gets lost.", 64),
    msg("d3", P.priya, "agree with Maya, maybe pull the orange from the collage into the grid version though", 60),
  ],
  "ch-t-plan": [
    msg("t1", P.priya, "Mt. Tam loop on Saturday? 7 miles, meet at 8", 400),
    msg("t2", P.lena, "in, I can drive two", 390),
  ],
};

export interface MockThread {
  id: string;
  friend: Profile;
  messages: MockMessage[];
  unread: number;
}

export const DM_THREADS: MockThread[] = [
  {
    id: "t-jordan",
    friend: P.jordan,
    unread: 0,
    messages: [
      msg("dj1", P.jordan, "did you see the build notes for 2.4?", 55),
      msg("dj2", ME, "Just now. The new sheet animations are so much nicer", 52),
      msg("dj3", P.jordan, "right? the spring on the menus feels like a phone", 51),
      msg("dj4", P.jordan, "want to hop on a call later and go through the rest", 50),
      msg("dj5", ME, "Yes! After 7 works", 47),
      msg("dj6", P.jordan, "👍", 46),
    ],
  },
  {
    id: "t-ava",
    friend: P.ava,
    unread: 2,
    messages: [
      msg("da1", P.ava, "found the film lab you mentioned", 30),
      msg("da2", P.ava, "they do push processing too!", 29),
    ],
  },
  {
    id: "t-theo",
    friend: P.theo,
    unread: 0,
    messages: [msg("dt1", P.theo, "sending you the patch file tonight", 600)],
  },
  {
    id: "t-sam",
    friend: P.sam,
    unread: 0,
    messages: [msg("ds1", ME, "thanks for the ride today", 60 * 26)],
  },
];

export const GROUPS: (GroupChatWithMembers & { messages: MockMessage[]; unread: number })[] = [
  {
    id: "g-hike",
    name: "Saturday Hike",
    owner_id: P.priya.id,
    icon_url: null,
    created_at: minutesAgo(9999),
    members: [ME, P.priya, P.lena, P.sam],
    unread: 3,
    messages: [
      msg("gh1", P.priya, "forecast says clear until 2", 20),
      msg("gh2", P.lena, "perfect, sunrise start then?", 18),
      msg("gh3", P.sam, "sunrise is 6:48 😭", 17),
    ],
  },
  {
    id: "g-film",
    name: "Film Club",
    owner_id: ME.id,
    icon_url: null,
    created_at: minutesAgo(9999),
    members: [ME, P.ava, P.theo],
    unread: 0,
    messages: [msg("gf1", P.theo, "next pick is mine. no complaints allowed", 200)],
  },
];

export const REACTIONS: MessageReaction[] = [
  { id: "r1", context_type: "channel", message_id: "m2", user_id: P.sam.id, emoji: "🔥", created_at: minutesAgo(180) },
  { id: "r2", context_type: "channel", message_id: "m2", user_id: P.jordan.id, emoji: "🔥", created_at: minutesAgo(180) },
  { id: "r3", context_type: "channel", message_id: "m6", user_id: ME.id, emoji: "🙏", created_at: minutesAgo(90) },
  { id: "r4", context_type: "channel", message_id: "m9", user_id: ME.id, emoji: "📌", created_at: minutesAgo(40) },
  { id: "r5", context_type: "channel", message_id: "m9", user_id: P.sam.id, emoji: "📌", created_at: minutesAgo(40) },
  { id: "r6", context_type: "channel", message_id: "m9", user_id: P.theo.id, emoji: "👍", created_at: minutesAgo(40) },
  { id: "r7", context_type: "channel", message_id: "m11", user_id: P.jordan.id, emoji: "🙌", created_at: minutesAgo(10) },
  { id: "r8", context_type: "dm", message_id: "dj3", user_id: ME.id, emoji: "😂", created_at: minutesAgo(50) },
];

export const PRESENCE = new Map<string, UserStatus>(
  [ME, ...Object.values(PEOPLE)].map((p) => [p.id, p.status]),
);

export const VOICE_PRESENCE = [
  { channel_id: "ch-lounge", user_id: P.jordan.id, joined_at: minutesAgo(34), muted: false, deafened: false, profile: P.jordan },
  { channel_id: "ch-lounge", user_id: P.ava.id, joined_at: minutesAgo(30), muted: true, deafened: false, profile: P.ava },
];

export const UNREAD_CHANNELS: Record<string, { unread: number; mentions: number }> = {
  "ch-lfg": { unread: 2, mentions: 0 },
  "ch-clips": { unread: 5, mentions: 1 },
};

export const UNREAD_SERVERS = ["s-design", "s-trail"];
