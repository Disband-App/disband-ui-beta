"use client";

import { useOverlayDismiss } from "@/hooks/useOverlayDismiss";

import { useEffect, useState } from "react";
import { ProfileOverlay } from "@/components/shop/ProfileOverlay";
import { useApp } from "@/contexts/AppContext";
import { IconClose, IconMessage, IconPhone, IconSettings } from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { SubscriptionBadge } from "@/components/ui/SubscriptionBadge";
import { RolePicker } from "@/components/ui/RolePicker";
import { getProfilePanelMutedColor, getProfilePanelStyle, getAccentBackground } from "@/lib/profileColor";
import { displayName } from "@/lib/utils";
import { safeImageUrl } from "@/lib/safe-url";
import { presenceStatusFor, activeStatusNote, statusExpiryLabel } from "@/lib/presence";
import { roleIsGradientAnimated } from "@/lib/profileColor";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { UserBadges } from "@/components/ui/UserBadges";
import type { Profile, Server, ServerRole } from "@/lib/supabase/types";
import type { SubscriptionPlan } from "@/lib/subscription";

function MutualsSection({
  serverIds,
  friendIds,
  servers,
  friends,
  mutedColor,
}: {
  serverIds: string[];
  friendIds: string[];
  servers: Server[];
  friends: Profile[];
  mutedColor: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (key: string) => setOpen((prev) => (prev === key ? null : key));
  const row = "flex w-full items-center justify-between py-1 text-left";
  return (
    <div className="mt-4 w-full space-y-1 rounded-[14px] bg-[color-mix(in_srgb,currentColor_9%,transparent)] px-3 py-2 text-left">
      {serverIds.length > 0 && (
        <div>
          <button type="button" onClick={() => toggle("spaces")} className={row}>
            <span className="text-[11px] uppercase font-semibold tracking-[0.04em]" style={{ color: mutedColor }}>
              Mutual Spaces · {serverIds.length}
            </span>
            <span className={`text-xs text-text-muted transition-transform ${open === "spaces" ? "" : "-rotate-90"}`}>
              ▾
            </span>
          </button>
          {open === "spaces" && (
            <div className="flex flex-wrap gap-1.5 pb-1.5">
              {serverIds.map((id) => {
                const s = servers.find((x) => x.id === id);
                if (!s) return null;
                return (
                  <span key={id} className="rounded-full bg-[color-mix(in_srgb,currentColor_9%,transparent)] px-2.5 py-0.5 text-[12px] font-medium">
                    {s.name}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
      {friendIds.length > 0 && (
        <div>
          <button type="button" onClick={() => toggle("friends")} className={row}>
            <span className="text-[11px] uppercase font-semibold tracking-[0.04em]" style={{ color: mutedColor }}>
              Mutual Friends · {friendIds.length}
            </span>
            <span className={`text-xs text-text-muted transition-transform ${open === "friends" ? "" : "-rotate-90"}`}>
              ▾
            </span>
          </button>
          {open === "friends" && (
            <div className="flex flex-wrap items-center gap-1.5 pb-1.5">
              {friendIds.map((id) => {
                const f = friends.find((x) => x.id === id);
                if (!f) return null;
                return (
                  <span key={id} className="flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,currentColor_9%,transparent)] py-0.5 pl-0.5 pr-2.5 text-[12px] font-medium">
                    <Avatar profile={f} size="sm" className="h-5 w-5" />
                    {displayName(f)}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface UserProfileModalProps {
  profile: Profile | null;
  open: boolean;
  onClose: () => void;
  onMessage?: () => void;
  onAddFriend?: () => void;
  onAcceptFriend?: () => void;
  onDeclineFriend?: () => void;
  onVoiceCall?: () => void;
  onOpenSettings?: () => void;
  onRemoveFriend?: () => void;
  onBlock?: () => void;
  onUnblock?: () => void;
  isFriend?: boolean;
  isBlocked?: boolean;
  pendingIncoming?: boolean;
  pendingOutgoing?: boolean;
  isSelf?: boolean;
  plan?: SubscriptionPlan;
  isServerMember?: boolean;
  serverRoles?: ServerRole[];
  canManageRoles?: boolean;
  memberRoleIds?: string[];
  memberIsOwner?: boolean;
  onSetRoles?: (roleIds: string[]) => void;
}

function ProfileBanner({ profile }: { profile: Profile }) {  const [failed, setFailed] = useState(false);
  const url = safeImageUrl(profile.banner_url);
  const show = url && !failed;
  return (
    <div
      className="h-28 w-full overflow-hidden"
      style={{ background: getAccentBackground(profile) }}
    >
      {show && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url!} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      )}
    </div>
  );
}

export function UserProfileModal({
  profile,
  open,
  onClose,
  onMessage,
  onAddFriend,
  onAcceptFriend,
  onDeclineFriend,
  onVoiceCall,
  onOpenSettings,
  onRemoveFriend,
  onBlock,
  onUnblock,
  isFriend,
  isBlocked,
  pendingIncoming,
  pendingOutgoing,
  isSelf,
  plan,
  isServerMember,
  serverRoles,
  canManageRoles,
  memberRoleIds = [],
  memberIsOwner,
  onSetRoles,
}: UserProfileModalProps) {
  const { friends, presenceMap, servers, loadMutuals } = useApp();
  const [mutualServerIds, setMutualServerIds] = useState<string[]>([]);
  const [mutualFriendIds, setMutualFriendIds] = useState<string[]>([]);
  useEffect(() => {
    if (!open || !profile || profile.id === undefined) {
      setMutualServerIds([]);
      setMutualFriendIds([]);
      return;
    }
    let live = true;
    void loadMutuals(profile.id).then((m) => {
      if (!live) return;
      setMutualServerIds(m.serverIds);
      setMutualFriendIds(m.friendIds);
    });
    return () => {
      live = false;
    };
  }, [open, profile?.id, loadMutuals]);
  useOverlayDismiss(onClose, open);
  if (!open || !profile) return null;

  const friend = friends.some((f) => f.id === profile.id);
  const panelStyle = getProfilePanelStyle(profile);
  const mutedColor = getProfilePanelMutedColor(profile);
  const title = profile.display_name?.trim() || displayName(profile);
  const live = presenceStatusFor(profile, presenceMap);

  const memberRoles = (serverRoles ?? []).filter((r) => memberRoleIds.includes(r.id));
  const assignableRoles = (serverRoles ?? []).filter((r) => !r.is_default);

  const toggleRole = (roleId: string) => {
    if (!onSetRoles) return;
    const next = memberRoleIds.includes(roleId)
      ? memberRoleIds.filter((id) => id !== roleId)
      : [...memberRoleIds, roleId];
    // Every member implicitly holds @everyone, so it comes back in
    // memberRoleIds — sending it made the whole call fail as an invalid role,
    // which meant no role could be granted to anyone.
    const defaultIds = new Set((serverRoles ?? []).filter((r) => r.is_default).map((r) => r.id));
    onSetRoles(next.filter((id) => !defaultIds.has(id)));
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-overlay-scrim overlay-fade" onClick={onClose} aria-label="Close" />
      <div role="dialog" aria-modal="true" aria-label={title} className="fx-overlay-host modal-pop relative max-h-[calc(100vh-3rem)] w-full max-w-sm overflow-y-auto rounded-[22px] shadow-elev-4 ring-1 ring-glass-border" style={panelStyle}>
        {/* Artwork sits above the banner and below the readable profile content. */}
        <ProfileOverlay itemId={profile?.equipped_overlay_effect} />
        <ProfileBanner profile={profile} />

        <button
          type="button"
          onClick={onClose}
          className="press absolute right-3 top-3 z-10 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition-colors hover:bg-black/45"
          aria-label="Close profile"
        >
          <IconClose size={15} strokeWidth={2.6} />
        </button>

        {/* Laid out like an iOS Contact Poster: the person's own colours,
            identity centred, actions as a row of glass tiles. */}
        <div className="relative z-10 flex flex-col items-center px-5 pb-5 text-center">
          <div className="relative -mt-12 mb-3 w-fit">
            <Avatar profile={profile} size="lg" className="h-24 w-24 text-3xl ring-[5px] ring-[color-mix(in_srgb,currentColor_12%,transparent)]" />
            <span
              className="absolute -bottom-0.5 -right-0.5 rounded-full p-0.5"
              style={{ background: panelStyle.background }}
            >
              <StatusIndicator status={live} size="md" />
            </span>
          </div>

          <h2 className="font-display text-[26px] font-bold leading-tight tracking-[-0.022em]">
            {title}
          </h2>

          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            {isSelf && (
              <span className="rounded-full bg-[color-mix(in_srgb,currentColor_9%,transparent)] px-2 py-0.5 text-[11px] font-semibold">You</span>
            )}
            {profile.username && (
              <p className="text-sm" style={{ color: mutedColor }}>
                @{profile.username}
              </p>
            )}
          </div>

          {activeStatusNote(profile) && (
            <div className="mt-3 flex w-full items-start gap-2 rounded-[14px] bg-[color-mix(in_srgb,currentColor_9%,transparent)] px-3 py-2.5 text-left">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 opacity-70">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <div className="min-w-0">
                <p className="break-words text-[13px] leading-snug">{activeStatusNote(profile)}</p>
                <p className="mt-0.5 text-[11px] opacity-60">
                  {statusExpiryLabel(profile.status_expires_at)}
                </p>
              </div>
            </div>
          )}

          <div className="mt-2">
            <UserBadges userId={profile.id} plan={plan ?? "free"} size={17} variant="full" />
          </div>

          {profile.bio && (
            <p className="mt-3 max-h-44 w-full overflow-y-auto whitespace-pre-wrap text-[14px] leading-snug opacity-90">{profile.bio}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12px]" style={{ color: mutedColor }}>
            <StatusIndicator status={live} size="sm" showLabel className="[&>span:last-child]:text-inherit" />
            <span>
              Member since{" "}
              {new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </span>
          </div>

          {!isSelf && (mutualServerIds.length > 0 || mutualFriendIds.length > 0) && (
            <MutualsSection
              serverIds={mutualServerIds}
              friendIds={mutualFriendIds}
              servers={servers}
              friends={friends}
              mutedColor={mutedColor}
            />
          )}

          {isServerMember && (
            <div className="mt-4 w-full rounded-[14px] bg-[color-mix(in_srgb,currentColor_9%,transparent)] p-3 text-left">
              <p className="mb-1.5 text-[11px] uppercase font-semibold tracking-[0.04em]" style={{ color: mutedColor }}>
                Roles
              </p>
              {memberIsOwner ? (
                <p className="text-sm font-semibold">Space Owner</p>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5">
                  {memberRoles.map((role) => (
                    <span
                      key={role.id}
                      // Neutral chip with the role's colour as a dot: the chip
                      // sits on the person's own profile colours, where the
                      // role colour itself can vanish.
                      className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,currentColor_12%,transparent)] px-2.5 py-0.5 text-[12px] font-semibold"
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full ring-1 ring-white/40 ${roleIsGradientAnimated(role) ? "animate-role-gradient" : ""}`}
                        style={
                          role.gradient_to?.trim()
                            ? { backgroundImage: `linear-gradient(90deg, ${role.color}, ${role.gradient_to.trim()})`, backgroundSize: role.gradient_animated ? "200% 100%" : undefined }
                            : { backgroundColor: role.color }
                        }
                      />
                      {role.name}
                    </span>
                  ))}
                  {memberRoles.length === 0 && (!canManageRoles || isSelf) && (
                    <p className="text-xs" style={{ color: mutedColor }}>
                      No roles assigned.
                    </p>
                  )}
                  {canManageRoles && !isSelf && onSetRoles && (
                    <RolePicker
                      roles={assignableRoles}
                      selected={memberRoleIds}
                      onToggle={toggleRole}
                      compact
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {isSelf ? (
            onOpenSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="press mt-5 flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-[14px] font-semibold transition-colors bg-[color-mix(in_srgb,currentColor_12%,transparent)] ring-1 ring-inset ring-[color-mix(in_srgb,currentColor_10%,transparent)] hover:bg-[color-mix(in_srgb,currentColor_18%,transparent)]"
              >
                <IconSettings size={16} /> Edit profile
              </button>
            )
          ) : isBlocked ? (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <span className="rounded-full bg-[color-mix(in_srgb,currentColor_9%,transparent)] px-3.5 py-2 text-[13.5px] opacity-80">Blocked</span>
              {onUnblock && (
                <button
                  type="button"
                  onClick={onUnblock}
                  className="press rounded-full px-4 py-2 text-[13.5px] font-semibold transition-colors bg-[color-mix(in_srgb,currentColor_12%,transparent)] ring-1 ring-inset ring-[color-mix(in_srgb,currentColor_10%,transparent)] hover:bg-[color-mix(in_srgb,currentColor_18%,transparent)]"
                >
                  Unblock
                </button>
              )}
            </div>
          ) : (
            <div className="mt-5 flex w-full flex-wrap justify-center gap-2">
              {profile?.is_bot && (
                <p className="w-full rounded-[14px] bg-[color-mix(in_srgb,currentColor_9%,transparent)] px-3 py-2.5 text-[12.5px] opacity-80">
                  This is Disband's assistant — it can't be messaged, friended, called, or blocked.
                </p>
              )}
              {(isFriend || friend) && onMessage && !profile?.is_bot && (
                <button
                  type="button"
                  onClick={onMessage}
                  className="press flex min-w-[88px] flex-1 flex-col items-center gap-1 rounded-[16px] py-2.5 text-[12.5px] font-semibold transition-colors bg-[color-mix(in_srgb,currentColor_12%,transparent)] ring-1 ring-inset ring-[color-mix(in_srgb,currentColor_10%,transparent)] hover:bg-[color-mix(in_srgb,currentColor_18%,transparent)]"
                >
                  <IconMessage size={20} /> Message
                </button>
              )}
              {onVoiceCall && (isFriend || friend) && !profile?.is_bot && (
                <button
                  type="button"
                  onClick={onVoiceCall}
                  className="press flex min-w-[88px] flex-1 flex-col items-center gap-1 rounded-[16px] py-2.5 text-[12.5px] font-semibold transition-colors bg-[color-mix(in_srgb,currentColor_12%,transparent)] ring-1 ring-inset ring-[color-mix(in_srgb,currentColor_10%,transparent)] hover:bg-[color-mix(in_srgb,currentColor_18%,transparent)]"
                >
                  <IconPhone size={20} /> Call
                </button>
              )}
              {!friend && pendingIncoming && onAcceptFriend && onDeclineFriend && (
                <>
                  <button
                    type="button"
                    onClick={onAcceptFriend}
                    className="btn btn-filled"
                  >
                    Accept Friend Request
                  </button>
                  <button
                    type="button"
                    onClick={onDeclineFriend}
                    className="press rounded-full px-4 py-2 text-[13.5px] font-semibold transition-colors bg-[color-mix(in_srgb,currentColor_12%,transparent)] ring-1 ring-inset ring-[color-mix(in_srgb,currentColor_10%,transparent)] hover:bg-[color-mix(in_srgb,currentColor_18%,transparent)]"
                  >
                    Decline
                  </button>
                </>
              )}
              {!friend && !pendingIncoming && !pendingOutgoing && onAddFriend && !profile?.is_bot && (
                <button
                  type="button"
                  onClick={onAddFriend}
                  className="press rounded-full px-4 py-2 text-[13.5px] font-semibold transition-colors bg-[color-mix(in_srgb,currentColor_12%,transparent)] ring-1 ring-inset ring-[color-mix(in_srgb,currentColor_10%,transparent)] hover:bg-[color-mix(in_srgb,currentColor_18%,transparent)]"
                >
                  Add Friend
                </button>
              )}
              {!friend && pendingOutgoing && (
                <span className="rounded-full bg-[color-mix(in_srgb,currentColor_9%,transparent)] px-3.5 py-2 text-[13.5px] opacity-80">
                  Friend request sent
                </span>
              )}
              {((isFriend || friend) && onRemoveFriend && !profile?.is_bot) || (onBlock && !profile?.is_bot) ? (
                <span aria-hidden className="h-0 basis-full" />
              ) : null}
              {(isFriend || friend) && onRemoveFriend && !profile?.is_bot && (
                <button
                  type="button"
                  onClick={onRemoveFriend}
                  className="press rounded-full px-3.5 py-1.5 text-[13px] font-medium opacity-75 transition-opacity hover:opacity-100"
                >
                  Remove friend
                </button>
              )}
              {onBlock && !profile?.is_bot && (
                <button
                  type="button"
                  onClick={onBlock}
                  className="press rounded-full px-3.5 py-1.5 text-[13px] font-medium opacity-75 transition-opacity hover:opacity-100"
                >
                  Block
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
