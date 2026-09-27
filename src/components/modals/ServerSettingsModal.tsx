"use client";

import { useOverlayDismiss } from "@/hooks/useOverlayDismiss";

import { useCallback, useEffect, useState } from "react";
import type { ServerPermissionKey, ServerRole } from "@/lib/supabase/types";
import {
  catalystLevel,
  sanitizeVanity,
  vanityError,
  EMOJI_SLOTS_BONUS,
} from "@/lib/catalysts";
import { useApp } from "@/contexts/AppContext";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { IconFriends, IconCopy, IconTrash, IconSettings, IconLink, IconShield, IconPalette, IconAlert, IconEmoji, IconHash, IconVideo, IconEdit, IconPlus, IconChevron, IconGripVertical } from "@/components/icons";
import { RoleManager } from "@/components/modals/RoleManager";
import { AuditLogPanel } from "@/components/modals/AuditLogPanel";
import { SheetCloseButton } from "@/components/ui/Sheet";
import { Toggle } from "@/components/discord/settings/SettingsPrimitives";
import { SpaceTile } from "@/components/discord/ServerList";
import { RolePicker } from "@/components/ui/RolePicker";
import { getInviteUrl, displayName } from "@/lib/utils";
import { safeImageUrl } from "@/lib/safe-url";
import { SendInvitePanel } from "@/components/modals/SendInvitePanel";
import { Avatar } from "@/components/ui/Avatar";
import { useSubscription } from "@/hooks/useSubscription";

interface ServerSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onEditChannel?: (channel: { id: string; name: string; type: string }) => void;
}

type Section = "overview" | "invite" | "channels" | "members" | "roles" | "bans" | "audit" | "emoji" | "appearance" | "danger";

const NAV: { id: Section; label: string; icon: typeof IconSettings; tint: string; ownerOnly?: boolean; permission?: ServerPermissionKey }[] = [
  { id: "overview", label: "Overview", icon: IconSettings, tint: "linear-gradient(180deg,#9a9aa3,#6f6f78)" },
  { id: "invite", label: "Invites", icon: IconLink, tint: "linear-gradient(180deg,#3d9bff,#0a6fe8)" },
  { id: "channels", label: "Channels", icon: IconHash, tint: "linear-gradient(180deg,#4fd0e6,#1f9fb8)", permission: "manage_channels" },
  { id: "members", label: "Members", icon: IconFriends, tint: "linear-gradient(180deg,#4fd88b,#22a95b)", permission: "manage_roles" },
  { id: "roles", label: "Roles", icon: IconShield, tint: "linear-gradient(180deg,#ffb147,#f08a0b)", permission: "manage_roles" },
  { id: "bans", label: "Bans", icon: IconAlert, tint: "linear-gradient(180deg,#ff6961,#e5352b)", permission: "ban" },
  { id: "audit", label: "Audit Log", icon: IconHash, tint: "linear-gradient(180deg,#7d7aff,#5451d6)", permission: "view_audit_log" },
  { id: "emoji", label: "Emoji", icon: IconEmoji, tint: "linear-gradient(180deg,#ffd84d,#f5b800)", ownerOnly: true },
  { id: "appearance", label: "Appearance", icon: IconPalette, tint: "linear-gradient(180deg,#ff7a93,#ec4263)", ownerOnly: true },
  { id: "danger", label: "Danger Zone", icon: IconAlert, tint: "linear-gradient(180deg,#ff6961,#e5352b)", ownerOnly: true },
];

export function ServerSettingsModal({ open, onClose, onEditChannel }: ServerSettingsModalProps) {
  const {
    activeServer,
    updateServer,
    deleteServer,
    user,
    serverRoles,
    channels,
    categories,
    members,
    serverPermissions,
    createChannel,
    renameChannel,
    deleteChannel,
    setMemberRoles,
    kickMember,
    banMember,
    unbanMember,
    serverBans,
    catalystCounts,
  } = useApp();
  const { upload } = useMediaUpload();
  const [section, setSection] = useState<Section>("overview");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [vanity, setVanity] = useState("");
  const [vanitySaved, setVanitySaved] = useState(false);
  const [discoverable, setDiscoverable] = useState(false);
  const [discoverableError, setDiscoverableError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelType, setChannelType] = useState<"text" | "voice">("text");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [customEmoji, setCustomEmoji] = useState<
    { id: number; name: string; url: string; uploader_id: string | null }[]
  >([]);
  const [emojiName, setEmojiName] = useState("");
  const [emojiFile, setEmojiFile] = useState<File | null>(null);
  const [emojiUploading, setEmojiUploading] = useState(false);
  const { plan, entitlements } = useSubscription(user?.id);

  useEffect(() => {
    if (!activeServer) return;
    setName(activeServer.name);
    setDescription(activeServer.description ?? "");
    setVanity(activeServer.vanity_code ?? "");
    setVanitySaved(false);
    setDiscoverable(activeServer.discoverable ?? false);
    setSection("overview");
  }, [activeServer, open]);

  useEffect(() => {
    if (!open || !activeServer) return;
    import("@/lib/supabase/client").then((mod) => {
      mod.getSupabaseClient()
        .from("custom_emoji")
        .select("id, name, url, uploader_id")
        .eq("server_id", activeServer.id)
        .order("name")
        .then(({ data }) => setCustomEmoji(data ?? []));
    });
  }, [activeServer, open]);

  // Topmost-only Escape + scroll lock via the shared overlay hook.
  useOverlayDismiss(onClose, open);

  if (!open || !activeServer) return null;
  const isOwner = activeServer.owner_id === user?.id;
  const canManageChannels = isOwner || serverPermissions.manage_channels;
  const canManageRoles = isOwner || serverPermissions.manage_roles;
  const canBan = isOwner || serverPermissions.ban;
  const canViewAuditLog = isOwner || serverPermissions.view_audit_log;
  const catalystCount = catalystCounts[activeServer.id] ?? 0;
  const catalystLvl = catalystLevel(catalystCount);
  const inviteCode = activeServer.vanity_code || activeServer.invite_code;
  const inviteUrl = inviteCode ? getInviteUrl(inviteCode) : null;
  const navItems = NAV.filter((n) => {
    if (n.ownerOnly && !isOwner) return false;
    if (n.permission && !(isOwner || serverPermissions[n.permission])) return false;
    return true;
  });

  async function toggleDiscoverable() {
    if (!activeServer || !isOwner) return;
    const next = !discoverable;
    setDiscoverable(next);
    setDiscoverableError(null);
    setLoading(true);
    const err = await updateServer(activeServer.id, { discoverable: next });
    setLoading(false);
    if (err) {
      setDiscoverable(!next);
      setDiscoverableError(err);
    }
  }

  async function saveOverview() {
    setLoading(true);
    setError(null);
    const err = await updateServer(activeServer!.id, { name, description });
    if (err) setError(err);
    else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setLoading(false);
  }

  async function saveVanity() {
    if (!activeServer || !isOwner || catalystLvl.level < 1) return;
    const clean = sanitizeVanity(vanity);
    const errMsg = clean ? vanityError(clean) : null;
    if (vanity.trim() && errMsg) {
      setError(errMsg);
      return;
    }
    setLoading(true);
    setError(null);
    const err = await updateServer(activeServer.id, { vanity_code: clean || null });
    setLoading(false);
    if (err) {
      setError(/duplicate|unique/i.test(err) ? "That vanity is taken." : err);
    } else {
      setVanity(clean);
      setVanitySaved(true);
      setTimeout(() => setVanitySaved(false), 2000);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${activeServer!.name}" permanently? This cannot be undone.`)) return;
    setLoading(true);
    const err = await deleteServer(activeServer!.id);
    if (err) setError(err);
    else onClose();
    setLoading(false);
  }

  async function handleIcon(file: File) {
    const res = await upload(file);
    if (res) await updateServer(activeServer!.id, { icon_url: res.url });
  }

  async function handleBanner(file: File) {
    const res = await upload(file);
    if (res) await updateServer(activeServer!.id, { banner_url: res.url });
  }

  async function handleEmojiUpload() {
    if (!emojiFile || !emojiName.trim() || !activeServer) return;

    const lvl = catalystLevel(catalystCounts[activeServer.id] ?? 0).level;
    const baseSlots = entitlements.customEmojiSlots;
    const slotLimit = typeof baseSlots === "number" && lvl >= 2 ? baseSlots + EMOJI_SLOTS_BONUS : baseSlots;
    if (typeof slotLimit === "number" && customEmoji.length >= slotLimit) {
      setError(`This space allows up to ${slotLimit} custom emoji. Delete one first or upgrade.`);
      return;
    }
    setEmojiUploading(true);
    setError(null);
    try {
      const res = await upload(emojiFile);
      if (!res) { setError("Upload failed"); return; }
      const supabase = (await import("@/lib/supabase/client")).getSupabaseClient();
      const { error: dbErr } = await supabase.from("custom_emoji").insert({
        server_id: activeServer.id,
        name: emojiName.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"),
        url: res.url,
        uploader_id: user?.id ?? null,
      });
      if (dbErr) { setError(dbErr.message); return; }
      setCustomEmoji((prev) => [...prev, { id: Date.now(), name: emojiName.trim(), url: res.url, uploader_id: user?.id ?? null }]);
      setEmojiName("");
      setEmojiFile(null);
    } finally {
      setEmojiUploading(false);
    }
  }

  async function handleDeleteEmoji(id: number) {
    const supabase = (await import("@/lib/supabase/client")).getSupabaseClient();
    await supabase.from("custom_emoji").delete().eq("id", id);
    setCustomEmoji((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleCreateChannel() {
    if (!channelName.trim()) return;
    setLoading(true);
    setError(null);
    const err = await createChannel({ name: channelName.trim(), type: channelType });
    if (err) setError(err);
    else setChannelName("");
    setLoading(false);
  }

  function startRename(channel: { id: string; name: string }) {
    setRenamingId(channel.id);
    setRenameValue(channel.name);
  }

  async function handleRenameChannel() {
    if (!renamingId || !renameValue.trim()) return;
    setLoading(true);
    setError(null);
    const err = await renameChannel(renamingId, renameValue.trim());
    if (err) setError(err);
    else setRenamingId(null);
    setLoading(false);
  }

  async function handleDeleteChannel(channel: { id: string; name: string }) {
    if (!confirm(`Delete #${channel.name}? All messages in this channel will be permanently removed.`)) return;
    setLoading(true);
    setError(null);
    const err = await deleteChannel(channel.id);
    if (err) setError(err);
    setLoading(false);
  }

  async function handleToggleRole(memberUserId: string, roleId: string) {
    const member = members.find((m) => m.user_id === memberUserId);
    const current = member?.role_ids && member.role_ids.length > 0
      ? member.role_ids
      : member?.role_id
        ? [member.role_id]
        : [];
    const next = current.includes(roleId)
      ? current.filter((id) => id !== roleId)
      : [...current, roleId];
    setLoading(true);
    setError(null);
    const err = await setMemberRoles(memberUserId, next);
    if (err) setError(err);
    setLoading(false);
  }

  async function handleKickMember(memberUserId: string, memberName: string) {
    if (!confirm(`Kick ${memberName} from this space?`)) return;
    setLoading(true);
    setError(null);
    const err = await kickMember(memberUserId);
    if (err) setError(err);
    setLoading(false);
  }

  async function handleBanMember(memberUserId: string, memberName: string) {
    const reason = prompt(`Ban ${memberName}? You can add a reason (optional).`) ?? "";
    if (reason === null) return;
    setLoading(true);
    setError(null);
    const err = await banMember(memberUserId, reason || undefined);
    if (err) setError(err);
    setLoading(false);
  }

  function renderChannelRow(c: { id: string; name: string; type: string }) {
    return (
      <li key={c.id} className="rounded-[14px] bg-fill-tertiary flex items-center gap-2 px-3 py-2">
        {c.type === "voice" ? (
          <IconVideo size={16} className="shrink-0 text-text-muted" />
        ) : (
          <IconHash size={16} className="shrink-0 text-text-muted" />
        )}
        {renamingId === c.id ? (
          <>
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleRenameChannel();
                if (e.key === "Escape") setRenamingId(null);
              }}
              autoFocus
              className="field min-w-0 flex-1 text-[14px] min-h-0 py-1.5"
            />
            <button
              type="button"
              onClick={() => void handleRenameChannel()}
              disabled={loading || !renameValue.trim()}
              className="btn btn-filled btn-sm"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setRenamingId(null)}
              className="rounded bg-bg-accent px-3 py-1 text-xs text-text-muted"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
            {onEditChannel && (
              <button
                type="button"
                onClick={() => onEditChannel(c)}
                className="rounded p-1 text-text-muted transition-colors hover:text-text-normal"
                aria-label={`Edit ${c.name}`}
              >
                <IconSettings size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={() => startRename(c)}
              className="rounded p-1 text-text-muted transition-colors hover:text-text-normal"
              aria-label={`Rename ${c.name}`}
            >
              <IconEdit size={16} />
            </button>
            <button
              type="button"
              onClick={() => void handleDeleteChannel(c)}
              className="rounded p-1 text-text-muted transition-colors hover:text-status-dnd"
              aria-label={`Delete ${c.name}`}
            >
              <IconTrash size={16} />
            </button>
          </>
        )}
      </li>
    );
  }

  function copyInvite() {
    if (!inviteUrl) return;
    void navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
    <button type="button" aria-label="Close" tabIndex={-1} className="overlay-fade absolute inset-0 cursor-default bg-overlay-scrim" onClick={onClose} />
    <div role="dialog" aria-modal="true" aria-label="Space settings" className="modal-pop relative flex h-[94vh] w-full max-w-[1040px] flex-col overflow-hidden rounded-t-[24px] bg-bg-primary shadow-elev-4 ring-1 ring-glass-border sm:h-[min(90vh,820px)] sm:rounded-[24px]">
      <header className="flex h-[68px] shrink-0 items-center justify-between gap-3 px-5 hairline-b">
        <div className="flex min-w-0 items-center gap-3">
          <SpaceTile server={activeServer} size={40} />
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-semibold tracking-[-0.015em]">{activeServer.name}</h1>
            <p className="text-[12.5px] text-text-muted">Space settings</p>
          </div>
        </div>
        <SheetCloseButton onClick={onClose} />
      </header>

      {/* Mobile section picker. This used to live inside the desktop-only
          <nav> below (hidden + md:flex), so on small screens there was no way
          to switch sections at all. */}
      <div className="shrink-0 bg-bg-secondary px-4 py-2 hairline-b md:hidden">
        <label className="sr-only" htmlFor="space-settings-section">
          Settings section
        </label>
        <select
          id="space-settings-section"
          value={section}
          onChange={(e) => setSection(e.target.value as Section)}
          className="field w-full text-[14px]"
        >
          {navItems.map((n) => (
            <option key={n.id} value={n.id}>{n.label}</option>
          ))}
        </select>
      </div>

      <div className="flex min-h-0 flex-1">
        <nav aria-label="Space settings sections" className="hidden w-[240px] shrink-0 flex-col overflow-y-auto bg-bg-secondary p-3 md:flex">
          <div className="rounded-[14px] bg-bg-primary p-1 shadow-[0_0_0_1px_var(--panel-border)]">
          {navItems.map((n) => {
            const Icon = n.icon;
            const active = section === n.id;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => setSection(n.id)}
                aria-current={active ? "page" : undefined}
                className={`flex w-full items-center gap-2.5 rounded-[10px] px-2 py-[7px] text-left text-[14px] transition-colors ${
                  active ? "bg-brand font-medium text-brand-foreground" : n.id === "danger" ? "text-status-dnd hover:bg-interactive-hover" : "text-text-normal hover:bg-interactive-hover"
                }`}
              >
                <span className="icon-tile h-[26px] w-[26px] rounded-[7px]" style={{ background: n.tint }}>
                  <Icon size={15} strokeWidth={2.2} />
                </span>
                {n.label}
              </button>
            );
          })}
          </div>
        </nav>

        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="mx-auto max-w-2xl">
            {section === "overview" && (
              <div className="space-y-5">
                <h2 className="title-2">Overview</h2>
                <p className="text-sm text-text-muted">Basic information about your space.</p>
                <label className="block">
                  <span className="text-xs uppercase font-semibold tracking-[0.04em] text-text-muted">Space name</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!isOwner}
                    className="field mt-1 w-full text-[14px]"
                  />
                </label>
                <label className="block">
                  <span className="text-xs uppercase font-semibold tracking-[0.04em] text-text-muted">Description</span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={!isOwner}
                    rows={4}
                    placeholder="Tell people what this space is about"
                    className="field mt-1 w-full resize-none text-[14px]"
                  />
                </label>
                <div>
                  <span className="text-xs uppercase font-semibold tracking-[0.04em] text-text-muted">
                    Vanity invite code{" "}
                    <span className="ml-1 rounded bg-brand/20 px-1.5 py-px text-[10px] font-bold text-brand">
                      Level 1
                    </span>
                  </span>
                  {catalystLvl.level >= 1 ? (
                    <>
                      <div className="mt-1 flex gap-2">
                        <input
                          value={vanity}
                          onChange={(e) => setVanity(sanitizeVanity(e.target.value))}
                          disabled={!isOwner}
                          placeholder="e.g. my-cool-space"
                          maxLength={24}
                          className="field min-w-0 flex-1 text-[14px]"
                        />
                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => void saveVanity()}
                            disabled={loading}
                            className="btn btn-filled shrink-0"
                          >
                            {vanitySaved ? "Saved" : "Set"}
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-text-muted">
                        {activeServer.vanity_code
                          ? `Invite link: ${getInviteUrl(activeServer.vanity_code)}`
                          : "Boost this space to Level 1 to claim a custom link. Clear and save to release it."}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-xs text-text-muted">
                      Boost this space to Level 1 (1 catalyst) to unlock a custom invite link.
                    </p>
                  )}
                </div>
                <div className="rounded-[14px] bg-fill-tertiary p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-normal">Space Discovery</p>
                      <p className="mt-1 text-xs leading-relaxed text-text-muted">
                        List this space publicly so anyone can find and join it from Discover.
                        It appears under <span className="font-medium">Popular</span> by member
                        count, and under <span className="font-medium">New</span> by when it was
                        created.
                      </p>
                    </div>
                    <Toggle
                      checked={discoverable}
                      label="Make space discoverable"
                      disabled={!isOwner || loading}
                      onChange={() => void toggleDiscoverable()}
                    />
                  </div>
                  {discoverable && (
                    <p className="mt-3 text-xs text-text-muted">
                      Anyone can see this space&apos;s name, description and member count in
                      Discover, and join without an invite.
                    </p>
                  )}
                  {discoverableError && (
                    <p className="mt-2 text-xs text-status-dnd">{discoverableError}</p>
                  )}
                  {!isOwner && (
                    <p className="mt-2 text-xs text-text-muted">Only the space owner can change this.</p>
                  )}
                </div>

                {isOwner && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void saveOverview()}
                    className="btn btn-filled"
                  >
                    Save Changes
                  </button>
                )}
                {saved && <p className="text-sm text-status-online">Saved!</p>}
              </div>
            )}

            {section === "invite" && (
              <div className="space-y-5">
                <h2 className="title-2">Invites</h2>
                <p className="text-sm text-text-muted">Share this link to invite people to your space.</p>
                {inviteUrl ? (
                  <>
                    <div className="rounded-[14px] bg-fill-tertiary p-5">
                      <p className="break-all font-mono text-sm">{inviteUrl}</p>
                      <button
                        type="button"
                        onClick={copyInvite}
                        className="btn btn-filled mt-4"
                      >
                        <IconCopy size={16} /> {copied ? "Copied!" : "Copy Invite Link"}
                      </button>
                      <p className="mt-3 text-xs text-text-muted">
                        Paste this link in chat to show a rich invite preview with Join Space button.
                      </p>
                    </div>
                    <div>
                      <h3 className="mb-3 text-sm font-bold uppercase text-text-muted">Send to friends</h3>
                      <SendInvitePanel inviteUrl={inviteUrl} serverName={activeServer.name} />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-text-muted">Invite code not available — run migration 0004.</p>
                )}
              </div>
            )}

            {section === "channels" && canManageChannels && (
              <div className="space-y-5">
                <h2 className="title-2">Channels</h2>
                <p className="text-sm text-text-muted">Create, rename, and delete text and voice channels.</p>
                <div className="space-y-4">
                  {categories.map((cat) => {
                    const catChannels = channels.filter((c) => c.category_id === cat.id);
                    if (catChannels.length === 0) return null;
                    return (
                      <div key={cat.id}>
                        <h3 className="mb-2 text-sm font-bold uppercase text-text-muted">{cat.name}</h3>
                        <ul className="space-y-2">{catChannels.map((c) => renderChannelRow(c))}</ul>
                      </div>
                    );
                  })}
                  {(() => {
                    const uncategorized = channels.filter((c) => !c.category_id);
                    if (uncategorized.length === 0) return null;
                    return (
                      <div>
                        <h3 className="mb-2 text-sm font-bold uppercase text-text-muted">Uncategorized</h3>
                        <ul className="space-y-2">{uncategorized.map((c) => renderChannelRow(c))}</ul>
                      </div>
                    );
                  })()}
                  {channels.length === 0 && <p className="text-sm text-text-muted">No channels yet.</p>}
                </div>
                <div className="rounded-[14px] bg-fill-tertiary flex flex-wrap items-end gap-3 p-4">
                  <label className="min-w-[160px] flex-1">
                    <span className="text-xs uppercase font-semibold tracking-[0.04em] text-text-muted">Channel name</span>
                    <input
                      value={channelName}
                      onChange={(e) => setChannelName(e.target.value.replace(/\s+/g, "-"))}
                      placeholder="new-channel"
                      className="field mt-1 w-full text-[14px]"
                    />
                  </label>
                  <label>
                    <span className="text-xs uppercase font-semibold tracking-[0.04em] text-text-muted">Type</span>
                    <select
                      value={channelType}
                      onChange={(e) => setChannelType(e.target.value as "text" | "voice")}
                      className="field mt-1 text-[14px]"
                    >
                      <option value="text">Text</option>
                      <option value="voice">Voice</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleCreateChannel()}
                    disabled={loading || !channelName.trim()}
                    className="btn btn-filled"
                  >
                    <IconPlus size={16} /> Create Channel
                  </button>
                </div>
              </div>
            )}

            {section === "members" && canManageRoles && (
              <div className="space-y-5">
                <h2 className="title-2">Members</h2>
                <p className="text-sm text-text-muted">Manage members, assign roles, and moderate the space.</p>
                <ul className="space-y-2">
                  {members.map((m) => {
                    const memberRoleIds = m.role_ids && m.role_ids.length > 0
                      ? m.role_ids
                      : m.role_id
                        ? [m.role_id]
                        : [];
                    const topMemberRole =
                      [...serverRoles]
                        .filter((r) => memberRoleIds.includes(r.id))
                        .sort((a, b) => b.position - a.position)[0] ?? null;
                    const memberName = m.profile ? displayName(m.profile) : "Unknown member";
                    const isSelf = m.user_id === user?.id;
                    return (
                      <li key={m.user_id} className="rounded-[14px] bg-fill-tertiary flex items-center gap-3 p-3">
                        <Avatar profile={m.profile} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium" style={topMemberRole?.color ? { color: topMemberRole.color } : undefined}>
                            {memberName}
                          </p>
                          <p className="truncate text-xs text-text-muted">
                            {m.role === "owner"
                              ? "Owner"
                              : memberRoleIds.length > 0
                                ? memberRoleIds
                                    .map((id) => serverRoles.find((r) => r.id === id)?.name)
                                    .filter(Boolean)
                                    .join(", ")
                                : "Member"}
                          </p>
                        </div>
                        {!isSelf && (
                          <div className="flex shrink-0 items-center gap-2">
                            <RolePicker
                              roles={serverRoles.filter((r) => !r.is_default)}
                              selected={memberRoleIds}
                              onToggle={(roleId) => void handleToggleRole(m.user_id, roleId)}
                              disabled={loading || m.role === "owner"}
                              align="right"
                              compact
                            />
                            {serverPermissions.ban && (
                              <button
                                type="button"
                                onClick={() => void handleBanMember(m.user_id, memberName)}
                                className="btn btn-destructive btn-sm"
                              >
                                Ban
                              </button>
                            )}
                            {serverPermissions.kick && (
                              <button
                                type="button"
                                onClick={() => void handleKickMember(m.user_id, memberName)}
                                className="btn btn-destructive btn-sm"
                              >
                                Kick
                              </button>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                  {members.length === 0 && <p className="text-sm text-text-muted">No members found.</p>}
                </ul>
              </div>
            )}

            {section === "roles" && canManageRoles && (
              <RoleManager />
            )}

            {section === "bans" && canBan && (
              <div className="space-y-4">
                <div>
                  <h2 className="title-2 text-text-normal">Bans</h2>
                  <p className="mt-1 text-sm text-text-muted">
                    Banned users cannot rejoin. Unbanning lets them back with a fresh invite.
                  </p>
                </div>
                {error && <p className="rounded-md bg-status-dnd/10 px-3 py-2 text-[13px] text-status-dnd">{error}</p>}
                {serverBans.length === 0 ? (
                  <p className="rounded-lg border border-divider bg-bg-secondary px-4 py-6 text-center text-sm text-text-muted">
                    Nobody is banned from this space.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {serverBans.map((b) => (
                      <li
                        key={b.user_id}
                        className="rounded-[14px] bg-fill-tertiary flex items-center gap-3 px-3 py-2"
                      >
                        <Avatar
                          profile={b.profile ?? { display_name: "Banned user" }}
                          size="sm"
                          className="h-8 w-8 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text-normal">
                            {b.profile ? displayName(b.profile) : "Banned user"}
                          </p>
                          {b.reason && <p className="truncate text-xs text-text-muted">{b.reason}</p>}
                        </div>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => {
                            if (confirm("Unban this user? They will still need an invite to return.")) {
                              setLoading(true);
                              setError(null);
                              void unbanMember(b.user_id).then((err) => {
                                if (err) setError(err);
                                setLoading(false);
                              });
                            }
                          }}
                          className="btn btn-gray btn-sm shrink-0"
                        >
                          Unban
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {section === "audit" && canViewAuditLog && (
              <AuditLogPanel serverId={activeServer.id} members={members} />
            )}

            {section === "emoji" && isOwner && (
              <div className="space-y-5">
                <h2 className="title-2">Custom Emoji</h2>
                <p className="text-sm text-text-muted">
                  Add custom emoji for members to use in chat.
                  {typeof entitlements.customEmojiSlots === "number"
                    ? ` Your plan: ${customEmoji.length}/${entitlements.customEmojiSlots} slots used.`
                    : " Your plan: unlimited slots."}
                  {catalystLvl.level >= 2 && (
                    <> <span className="font-medium text-brand">+{EMOJI_SLOTS_BONUS} from Level {catalystLvl.level}.</span></>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {customEmoji.map((e) => (
                    <div key={e.id} className="rounded-[14px] bg-fill-tertiary group relative flex items-center gap-2 px-3 py-2 text-sm">
                      <img src={safeImageUrl(e.url) || undefined} alt={e.name} className="h-6 w-6 object-contain" />
                      <span>:{e.name}:</span>
                      <button
                        type="button"
                        onClick={() => void handleDeleteEmoji(e.id)}
                        className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-status-dnd text-white text-xs group-hover:flex"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                {(typeof entitlements.customEmojiSlots !== "number" ||
                  customEmoji.length <
                    entitlements.customEmojiSlots + (catalystLvl.level >= 2 ? EMOJI_SLOTS_BONUS : 0)) && (
                  <div className="rounded-[14px] bg-fill-tertiary flex flex-wrap items-end gap-3 p-4">
                    <label className="flex-1">
                      <span className="text-xs uppercase font-semibold tracking-[0.04em] text-text-muted">Name</span>
                      <input
                        value={emojiName}
                        onChange={(e) => setEmojiName(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 32))}
                        placeholder="my_emoji"
                        className="field mt-1 w-full text-[14px]"
                      />
                    </label>
                    <label className="max-w-40">
                      <span className="text-xs uppercase font-semibold tracking-[0.04em] text-text-muted">Image</span>
                      <input
                        type="file"
                        accept="image/png,image/gif,image/webp,image/jpeg"
                        onChange={(e) => setEmojiFile(e.target.files?.[0] ?? null)}
                        className="mt-1 block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-brand file:px-2 file:py-1 file:text-xs file:text-white"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void handleEmojiUpload()}
                      disabled={emojiUploading || !emojiName.trim() || !emojiFile}
                      className="btn btn-filled"
                    >
                      {emojiUploading ? "Uploading..." : "Upload"}
                    </button>
                  </div>
                )}
                {plan === "free" && (
                  <p className="text-sm text-text-muted">Upgrade to a paid plan to add custom emoji.</p>
                )}
              </div>
            )}

            {section === "appearance" && isOwner && (
              <div className="space-y-5">
                <h2 className="title-2">Appearance</h2>
                <p className="text-sm text-text-muted">Customize how your space looks in invites and the sidebar.</p>
                <label className="rounded-[14px] bg-fill-tertiary flex cursor-pointer items-center justify-between p-4 hover:bg-interactive-hover">
                  <div>
                    <p className="font-medium">Space icon</p>
                    <p className="text-xs text-text-muted">Recommended 512×512</p>
                  </div>
                  <input type="file" accept="image/*" className="text-sm" onChange={(e) => e.target.files?.[0] && void handleIcon(e.target.files[0])} />
                </label>
                <label className="rounded-[14px] bg-fill-tertiary flex cursor-pointer items-center justify-between p-4 hover:bg-interactive-hover">
                  <div>
                    <p className="font-medium">Space banner</p>
                    <p className="text-xs text-text-muted">Shown on invite previews</p>
                  </div>
                  <input type="file" accept="image/*" className="text-sm" onChange={(e) => e.target.files?.[0] && void handleBanner(e.target.files[0])} />
                </label>
              </div>
            )}

            {section === "danger" && isOwner && (
              <div className="space-y-5">
                <h2 className="title-2 text-status-dnd">Danger Zone</h2>
                <div className="rounded-lg border border-status-dnd/30 bg-status-dnd/5 p-5">
                  <p className="font-medium">Delete this space</p>
                  <p className="mt-1 text-sm text-text-muted">Permanently delete all channels, messages, and members. This cannot be undone.</p>
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={loading}
                    className="btn btn-danger mt-4"
                  >
                    <IconTrash size={16} /> Delete Space
                  </button>
                </div>
              </div>
            )}

            {error && <p className="mt-4 text-sm text-status-dnd">{error}</p>}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
