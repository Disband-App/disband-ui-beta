"use client";

import { useOverlayDismiss } from "@/hooks/useOverlayDismiss";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { AccentPresetGrid, ProfilePreview } from "./settings/ProfilePreview";
import {
  SettingsSection,
  SettingRow,
  Toggle,
  settingsInputClass,
  Hint,
} from "./settings/SettingsPrimitives";
import { MicTest } from "./settings/MicTest";
import { useBadges } from "@/lib/badge-store";
import { BadgeGlyph } from "@/lib/badge-icons";
import { GiftModal } from "@/components/gift/GiftModal";
import { giftUrl } from "@/lib/gifts";
import { AvatarCropModal } from "@/components/modals/AvatarCropModal";
import { Avatar } from "@/components/ui/Avatar";
import {
  IconBell,
  IconDownload,
  IconUser,
  IconLock,
  IconCrown,
  IconGift,
  IconBot,
  IconAuto,
  IconWand,
  IconWaveform,
  IconText,
  IconBug,
  IconLeave,
} from "@/components/icons";
import { SheetCloseButton } from "@/components/ui/Sheet";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";
import { MfaSettingsPanel } from "@/components/auth/MfaSettingsPanel";
import { UsernameAvailabilityInput } from "@/components/discord/UsernameAvailabilityInput";
import { PlatformModerationPanel } from "@/components/discord/PlatformModerationPanel";
import { OfficialBroadcastPanel } from "@/components/discord/OfficialBroadcastPanel";
import { AccountRestrictionsPanel } from "@/components/discord/AccountRestrictionsPanel";
import { BotsPanel } from "./settings/BotsPanel";
import { MyReferralCard } from "@/components/referrals/MyReferralCard";
import Link from "next/link";
import { requestNotificationPermissionFromGesture } from "@/lib/notifications";
import { useAudioDevices } from "@/hooks/useAudioDevices";
import { getDisbandUserMedia } from "@/lib/media";
import {
  getPreferredAudioInputId,
  getPreferredAudioOutputId,
  getPreferredVideoInputId,
  setPreferredAudioInputId,
  setPreferredAudioOutputId,
  setPreferredVideoInputId,
} from "@/lib/audio-settings";
import {
  DEFAULT_ACCENT,
  getAvatarStyle,
  getProfilePanelMutedColor,
  getProfilePanelStyle,
  isProfileGradient,
  usesCustomAccent,
  type ProfileAccentFields,
} from "@/lib/profileColor";
import type { AvatarCrop } from "@/lib/utils";
import type { UserStatus, Profile } from "@/lib/supabase/types";
import {
  STATUS_DURATION_PRESETS,
  expiresAtForDuration,
  presetForExpiresAt,
  type StatusDurationId,
} from "@/lib/presence";
import { SubscriptionBadge } from "@/components/ui/SubscriptionBadge";
import { SubscriptionModal } from "@/components/subscription/SubscriptionModal";
import { PLANS } from "@/lib/subscription";
import { useSubscription } from "@/hooks/useSubscription";
import { ThemesPanel } from "@/components/discord/settings/ThemesPanel";
import { AppearancePanel } from "@/components/discord/settings/AppearancePanel";
import { getSupabaseClient } from "@/lib/supabase/client";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

// Each tab gets a coloured glyph tile, as rows do in the iOS Settings app.
const TABS = [
  { id: "profile" as const, label: "Profile", group: "Account", icon: IconUser, tint: "linear-gradient(180deg,#3d9bff,#0a6fe8)" },
  { id: "account" as const, label: "Account & Security", group: "Account", icon: IconLock, tint: "linear-gradient(180deg,#9a9aa3,#6f6f78)" },
  { id: "subscriptions" as const, label: "Subscription", group: "Account", icon: IconCrown, tint: "linear-gradient(180deg,#b986ff,#8a5cf5)" },
  { id: "referrals" as const, label: "Referrals", group: "Account", icon: IconGift, tint: "linear-gradient(180deg,#4fd88b,#22a95b)" },
  { id: "bots" as const, label: "Bots", group: "Account", icon: IconBot, tint: "linear-gradient(180deg,#7d7aff,#5451d6)" },
  { id: "appearance" as const, label: "Appearance", group: "App", icon: IconAuto, tint: "linear-gradient(180deg,#5e9cff,#2f6fe0)" },
  { id: "themes" as const, label: "Skins & CSS", group: "App", icon: IconWand, tint: "linear-gradient(180deg,#ff7a93,#ec4263)" },
  { id: "notifications" as const, label: "Notifications", group: "App", icon: IconBell, tint: "linear-gradient(180deg,#ff6961,#e5352b)" },
  { id: "voice" as const, label: "Voice & Video", group: "App", icon: IconWaveform, tint: "linear-gradient(180deg,#4fd88b,#22a95b)" },
  { id: "textMedia" as const, label: "Text & Media", group: "App", icon: IconText, tint: "linear-gradient(180deg,#ffb147,#f08a0b)" },
];

const NAV_GROUPS = ["Account", "App"] as const;

function formatBytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

const STATUSES: { id: UserStatus; label: string }[] = [
  { id: "online", label: "Online" },
  { id: "idle", label: "Away" },
  { id: "dnd", label: "Do Not Disturb" },
  { id: "offline", label: "Offline" },
];

type SettingsTab = (typeof TABS)[number]["id"];

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { profile, user, updateProfile, updatePassword, requestPasswordReset, signOut } = useApp();

  const myBadges = useBadges(profile?.id);
  const [gifting, setGifting] = useState(false);
  const [giftLink, setGiftLink] = useState<string | null>(null);
  const { upload, isUploading } = useMediaUpload();
  const [tab, setTab] = useState<SettingsTab>("profile");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [statusDuration, setStatusDuration] = useState<StatusDurationId>("never");
  const [accent1, setAccent1] = useState(DEFAULT_ACCENT);
  const [accent2, setAccent2] = useState("#eb459e");
  const [useDefaultAccent, setUseDefaultAccent] = useState(true);
  const [status, setStatus] = useState<UserStatus>("online");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null);
  const [showSubscription, setShowSubscription] = useState(false);
  const { subscription, plan: subPlan, entitlements, reload: reloadSubscription } = useSubscription(profile?.id);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [desktopNotifications, setDesktopNotifications] = useState(true);
  const [linkPreviews, setLinkPreviews] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");
  const [audioInput, setAudioInput] = useState("");
  const [audioOutput, setAudioOutput] = useState("");
  const [videoInput, setVideoInput] = useState("");
  const [mediaTestMessage, setMediaTestMessage] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const { inputs, outputs, cameras, loading: devicesLoading, refresh: refreshDevices } = useAudioDevices();

  useEffect(() => {
    if (!open) return;
    setAudioInput(getPreferredAudioInputId() ?? "");
    setAudioOutput(getPreferredAudioOutputId() ?? "");
    setVideoInput(getPreferredVideoInputId() ?? "");
    void refreshDevices();
  }, [open, refreshDevices]);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPermission(Notification.permission);
    } else {
      setNotifPermission("unsupported");
    }
  }, [open]);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setUsername(profile.username ?? "");
    setBio(profile.bio ?? "");
    setPronouns(profile.pronouns ?? "");
    setStatusNote(profile.status_note ?? "");
    setStatusDuration(presetForExpiresAt(profile.status_expires_at));
    const custom = usesCustomAccent(profile);
    setUseDefaultAccent(!custom);
    setAccent1(profile.accent_color ?? DEFAULT_ACCENT);
    setAccent2(profile.accent_color_2 ?? profile.accent_color ?? "#eb459e");
    setStatus(profile.preferred_status ?? profile.status);
    setSoundEnabled(profile.sound_enabled ?? true);
    setDesktopNotifications(profile.desktop_notifications_enabled ?? true);
    setLinkPreviews(profile.link_previews_enabled ?? true);
  }, [profile]);

  // Routed through the overlay Escape stack so nested layers (avatar crop,
  // subscription) close one per press instead of all at once.
  useOverlayDismiss(onClose, open);

  const exportHistory = useCallback(async () => {
    if (!profile?.id) return;
    setExporting(true);
    try {
      const supabase = getSupabaseClient();
      const [messages, dmMessages, groupMessages] = await Promise.all([
        supabase.from("messages").select("*, author:profiles(*)").eq("author_id", profile.id).order("created_at"),
        supabase.from("dm_messages").select("*, author:profiles(*)").eq("author_id", profile.id).order("created_at"),
        supabase.from("group_messages").select("*, author:profiles(*)").eq("author_id", profile.id).order("created_at"),
      ]);
      const data = {
        exported_at: new Date().toISOString(),
        user_id: profile.id,
        channel_messages: messages.data ?? [],
        dm_messages: dmMessages.data ?? [],
        group_messages: groupMessages.data ?? [],
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `disband-history-${profile.username ?? profile.id}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [profile]);

  const signOutEverywhere = useCallback(async () => {
    setSigningOutAll(true);
    setSettingsError(null);
    const { error: err } = await getSupabaseClient().auth.signOut({ scope: "others" });
    if (err) setSettingsError(err.message);
    setSigningOutAll(false);
  }, []);

  const copyUserId = useCallback(async () => {
    if (!profile?.id) return;
    try {
      await navigator.clipboard.writeText(profile.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1500);
    } catch {
      setSettingsError("Could not copy to the clipboard.");
    }
  }, [profile?.id]);

  if (!open) return null;

  const previewAccent: ProfileAccentFields = useDefaultAccent
    ? { accent_color: null, accent_color_2: null }
    : { accent_color: accent1, accent_color_2: accent2 };

  async function saveProfile() {
    setError(null);
    if (!useDefaultAccent && (!accent1.trim() || !accent2.trim())) {
      setError("Pick both profile colors, or use the default style.");
      return;
    }
    const sanitizedUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (sanitizedUsername.length < 2) {
      setError("Username must be at least 2 characters (letters, numbers, and underscores).");
      return;
    }
    if (!displayName.trim()) {
      setError("Enter a display name.");
      return;
    }
    setSaving(true);
    const err = await updateProfile({
      display_name: displayName.trim(),
      username: sanitizedUsername,
      bio: bio.trim() || null,
      pronouns: pronouns.trim() || null,
      status_note: statusNote.trim() || null,
      status_expires_at: statusNote.trim() ? expiresAtForDuration(statusDuration) : null,
      accent_color: useDefaultAccent ? null : accent1,
      accent_color_2: useDefaultAccent ? null : accent2,
      status,
    });
    setSaving(false);
    if (err) setError(err);
    else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  const profileDirty = !!profile && (
    displayName !== (profile.display_name ?? "") ||
    username !== (profile.username ?? "") ||
    bio !== (profile.bio ?? "") ||
    pronouns !== (profile.pronouns ?? "") ||
    statusNote !== (profile.status_note ?? "") ||
    statusDuration !== presetForExpiresAt(profile.status_expires_at) ||
    status !== (profile.preferred_status ?? profile.status) ||
    useDefaultAccent !== !usesCustomAccent(profile) ||
    (!useDefaultAccent &&
      (accent1 !== (profile.accent_color ?? DEFAULT_ACCENT) ||
        accent2 !== (profile.accent_color_2 ?? profile.accent_color ?? "#eb459e")))
  );

  function resetProfileEdits() {
    if (!profile) return;
    setError(null);
    setDisplayName(profile.display_name ?? "");
    setUsername(profile.username ?? "");
    setBio(profile.bio ?? "");
    setPronouns(profile.pronouns ?? "");
    setStatusNote(profile.status_note ?? "");
    setStatusDuration(presetForExpiresAt(profile.status_expires_at));
    const custom = usesCustomAccent(profile);
    setUseDefaultAccent(!custom);
    setAccent1(profile.accent_color ?? DEFAULT_ACCENT);
    setAccent2(profile.accent_color_2 ?? profile.accent_color ?? "#eb459e");
    setStatus(profile.preferred_status ?? profile.status);
  }

  function pickAvatar(file: File) {
    if (cropSource) URL.revokeObjectURL(cropSource);
    setCropSourceFile(file);
    setCropSource(URL.createObjectURL(file));
    setCropOpen(true);
  }

  async function saveAvatarCrop(crop: AvatarCrop) {
    if (!cropSourceFile) return;
    const res = await upload(cropSourceFile);
    if (res) {
      await updateProfile({ avatar_url: res.url, avatar_crop: crop });
    }
    setCropOpen(false);
    if (cropSource) URL.revokeObjectURL(cropSource);
    setCropSource(null);
    setCropSourceFile(null);
  }

  async function handleBanner(file: File) {
    const res = await upload(file);
    if (res) await updateProfile({ banner_url: res.url });
  }

  async function savePreference(
    patch: Partial<Pick<Profile, "sound_enabled" | "desktop_notifications_enabled" | "link_previews_enabled" | "theme">>,
  ) {
    setSettingsError(null);
    const err = await updateProfile(patch);
    if (err) setSettingsError(err);
  }

  async function enableDesktopNotifications() {
    const granted = await requestNotificationPermissionFromGesture();
    setNotifPermission(typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported");
    if (granted) {
      setDesktopNotifications(true);
      await savePreference({ desktop_notifications_enabled: true });
    }
  }

  async function testMediaAccess() {
    setMediaTestMessage(null);
    setSettingsError(null);
    try {
      const stream = await getDisbandUserMedia({ audio: true, video: true });
      stream.getTracks().forEach((track) => track.stop());
      setMediaTestMessage("Microphone and camera access granted.");
      await refreshDevices();
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Could not access microphone or camera.");
    }
  }

  const activeTab = TABS.find((t) => t.id === tab);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
        <button type="button" aria-label="Close" tabIndex={-1} className="absolute inset-0 cursor-default bg-overlay-scrim overlay-fade" onClick={onClose} />
        <div role="dialog" aria-modal="true" aria-label="Settings" className="modal-pop relative flex h-[92vh] w-full max-w-[980px] overflow-hidden rounded-t-[24px] bg-bg-primary shadow-elev-4 ring-1 ring-glass-border sm:h-[min(88vh,780px)] sm:rounded-[24px]">
          <nav aria-label="Settings sections" className="hidden w-[264px] shrink-0 flex-col overflow-y-auto bg-bg-secondary px-3 pb-3 pt-4 sm:flex">
            <h2 className="large-title mb-3 px-2 text-[26px]">Settings</h2>
            {profile && (
              // The account card at the top, like the Apple ID row.
              <button
                type="button"
                onClick={() => setTab("profile")}
                className="press mb-4 flex items-center gap-3 rounded-[14px] bg-bg-primary p-2.5 text-left shadow-[0_0_0_1px_var(--panel-border)] transition-colors hover:bg-interactive-hover"
              >
                <Avatar profile={profile} size="md" className="h-11 w-11" />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold leading-tight">
                    {profile.display_name || profile.username}
                  </p>
                  <p className="truncate text-[12px] text-text-muted">@{profile.username} · Disband account</p>
                </div>
              </button>
            )}

            {NAV_GROUPS.map((group) => (
              <div key={group} className="mb-4">
                <div className="overflow-hidden rounded-[14px] bg-bg-primary p-1 shadow-[0_0_0_1px_var(--panel-border)]">
                  {TABS.filter((t) => t.group === group).map((t) => {
                    const Icon = t.icon;
                    const active = tab === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTab(t.id)}
                        aria-current={active ? "page" : undefined}
                        className={`flex w-full items-center gap-2.5 rounded-[10px] px-2 py-[7px] text-left text-[14px] transition-colors duration-150 ${
                          active
                            ? "bg-brand font-medium text-brand-foreground"
                            : "text-text-normal hover:bg-interactive-hover"
                        }`}
                      >
                        <span className="icon-tile h-[26px] w-[26px] rounded-[7px]" style={{ background: t.tint }}>
                          <Icon size={15} strokeWidth={2.2} />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="mt-auto overflow-hidden rounded-[14px] bg-bg-primary p-1 shadow-[0_0_0_1px_var(--panel-border)]">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  window.location.href = "/bug-report";
                }}
                className="flex w-full items-center gap-2.5 rounded-[10px] px-2 py-[7px] text-left text-[14px] text-text-normal transition-colors hover:bg-interactive-hover"
              >
                <span className="icon-tile h-[26px] w-[26px] rounded-[7px]" style={{ background: "linear-gradient(180deg,#9a9aa3,#6f6f78)" }}>
                  <IconBug size={15} strokeWidth={2.2} />
                </span>
                Report a bug
              </button>
              <button
                type="button"
                onClick={() => void signOut()}
                className="flex w-full items-center gap-2.5 rounded-[10px] px-2 py-[7px] text-left text-[14px] text-status-dnd transition-colors hover:bg-status-dnd/10"
              >
                <span className="icon-tile h-[26px] w-[26px] rounded-[7px] bg-status-dnd/15 text-status-dnd shadow-none">
                  <IconLeave size={15} strokeWidth={2.2} />
                </span>
                Log out
              </button>
            </div>
          </nav>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex shrink-0 items-center justify-between gap-3 px-6 pb-2 pt-5">
              <div className="min-w-0 flex-1">
                <select
                  value={tab}
                  onChange={(e) => setTab(e.target.value as SettingsTab)}
                  aria-label="Settings section"
                  className="field w-full text-[17px] font-semibold sm:hidden"
                >
                  {TABS.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
                <h1 key={tab} className="large-title view-enter hidden truncate sm:block">{activeTab?.label ?? "Settings"}</h1>
              </div>
              <SheetCloseButton onClick={onClose} />
            </header>

            <div key={tab} className="view-enter min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-4">
              <div className="mx-auto max-w-[680px]">
              {tab === "profile" && (
                <div className="pb-20">
                  {profile && (
                    <div className="mb-6">
                      <p className="mb-2 text-[11px] uppercase font-semibold tracking-[0.04em] text-text-muted">
                        Preview
                      </p>
                      <ProfilePreview

                        profile={{
                          ...profile,
                          display_name: displayName,
                          username,
                          bio,
                          accent_color: useDefaultAccent ? null : accent1,
                          accent_color_2: useDefaultAccent ? null : accent2,
                        }}
                        displayName={displayName}
                        username={username}
                        bio={bio}
                        status={status}

                        onChangeAvatar={pickAvatar}
                        onChangeBanner={(file) => void handleBanner(file)}
                      />
                    </div>
                  )}

                  <SettingsSection
                    title="Identity"
                    description="How your name appears across Disband."
                  >
                    <SettingRow label="Display name" htmlFor="settings-display-name" stacked>
                      <input
                        id="settings-display-name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value.slice(0, 25))}
                        maxLength={25}
                        className={settingsInputClass}
                      />
                    </SettingRow>

                    <SettingRow
                      label="Username"
                      description="Lowercase letters, numbers, and underscores. Others use this to add you."
                      stacked
                    >
                      <UsernameAvailabilityInput
                        value={username}
                        onChange={setUsername}
                        currentUsername={profile?.username}
                      />
                    </SettingRow>

                    <SettingRow
                      label="About me"
                      description="Line breaks are allowed."
                      htmlFor="settings-bio"
                      stacked
                    >
                      <textarea
                        id="settings-bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value.slice(0, entitlements.maxBioLength))}
                        rows={3}
                        maxLength={entitlements.maxBioLength}
                        placeholder="Tell people about yourself."
                        className={`${settingsInputClass} resize-none`}
                      />
                      <p className="mt-1 text-right text-[12px] text-text-muted">
                        {bio.length}/{entitlements.maxBioLength}
                        {subPlan === "free" && (
                          <>
                            {" · "}
                            <button
                              type="button"
                              onClick={() => setTab("subscriptions")}
                              className="underline hover:text-text-normal"
                            >
                              more with a paid plan
                            </button>
                          </>
                        )}
                      </p>
                    </SettingRow>

                    <SettingRow label="Pronouns" stacked htmlFor="settings-pronouns">
                      <input
                        id="settings-pronouns"
                        value={pronouns}
                        onChange={(e) => setPronouns(e.target.value.slice(0, 40))}
                        maxLength={40}
                        placeholder="e.g. she/her, they/them"
                        className={settingsInputClass}
                      />
                    </SettingRow>

                    <SettingRow
                      label="Status note"
                      description="Shown under your profile picture — e.g. a tiny note about what you're up to."
                      stacked
                      htmlFor="settings-status-note"
                    >
                      <textarea
                        id="settings-status-note"
                        value={statusNote}
                        onChange={(e) => setStatusNote(e.target.value.slice(0, 60))}
                        rows={2}
                        maxLength={60}
                        placeholder="e.g. low-key lurking"
                        className={`${settingsInputClass} resize-none`}
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Clear status after">
                        <span className="mr-1 text-[12px] text-text-muted">Clear after:</span>
                        {STATUS_DURATION_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setStatusDuration(preset.id)}
                            aria-pressed={statusDuration === preset.id}
                            className={`rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors ${
                              statusDuration === preset.id
                                ? "bg-brand text-white"
                                : "bg-bg-tertiary text-text-muted hover:bg-interactive-hover hover:text-text-normal"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </SettingRow>
                  </SettingsSection>

                  <p className="mb-6 -mt-2 text-[12px] text-text-muted">
                    Hover your avatar or banner in the preview to change them.{" "}
                    {subPlan === "free"
                      ? "Animated avatars need a paid plan."
                      : "GIFs are supported for animated avatars on your plan."}
                  </p>

                  <SettingsSection
                    title="Profile colour"
                    description="Pick a preset, or set two colours yourself — the same colour twice gives a solid, two different colours give a gradient."
                    action={
                      !useDefaultAccent ? (
                        <button
                          type="button"
                          onClick={() => setUseDefaultAccent(true)}
                          className="btn btn-gray btn-sm"
                        >
                          Reset to default
                        </button>
                      ) : undefined
                    }
                  >
                    <SettingRow label="Presets" stacked>
                      <AccentPresetGrid
                        active={useDefaultAccent ? null : { from: accent1, to: accent2 }}
                        onPick={(from, to) => {
                          setUseDefaultAccent(false);
                          setAccent1(from);
                          setAccent2(to);
                        }}
                      />
                    </SettingRow>

                    <SettingRow
                      label="Custom colours"
                      description={
                        useDefaultAccent
                          ? "Currently using the default style."
                          : isProfileGradient(previewAccent)
                            ? "Gradient"
                            : "Solid colour"
                      }
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          aria-label="Colour 1"
                          value={accent1}
                          onChange={(e) => {
                            setUseDefaultAccent(false);
                            setAccent1(e.target.value);
                          }}
                          className="h-9 w-12 cursor-pointer rounded bg-bg-tertiary"
                        />
                        <input
                          type="color"
                          aria-label="Colour 2"
                          value={accent2}
                          onChange={(e) => {
                            setUseDefaultAccent(false);
                            setAccent2(e.target.value);
                          }}
                          className="h-9 w-12 cursor-pointer rounded bg-bg-tertiary"
                        />
                      </div>
                    </SettingRow>

                    <SettingRow label="Sidebar preview" stacked>
                      <div
                        className="overflow-hidden rounded-lg p-3"
                        style={getProfilePanelStyle(previewAccent)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold ring-2 ring-black/15"
                            style={getAvatarStyle(previewAccent)}
                          >
                            {(displayName || username || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-semibold leading-tight">
                              {displayName.trim() || username || "Display name"}
                            </p>
                            {username && (
                              <p
                                className="truncate text-[13px]"
                                style={{ color: getProfilePanelMutedColor(previewAccent) }}
                              >
                                @{username}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </SettingRow>
                  </SettingsSection>

                  <SettingsSection
                    title="Status"
                    description="Sets how you appear to everyone else."
                  >
                    <SettingRow label="Online status" stacked>
                      <div className="flex flex-wrap gap-2">
                        {STATUSES.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setStatus(s.id)}
                            aria-pressed={status === s.id}
                            className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                              status === s.id
                                ? "bg-brand text-white"
                                : "bg-bg-tertiary text-text-muted hover:text-text-normal"
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </SettingRow>
                  </SettingsSection>

                  {myBadges.length > 0 && (
                    <SettingsSection
                      title="Badges"
                      description="Awarded by Disband — these can't be changed from here."
                    >
                      <SettingRow label="Your badges" stacked>
                        <div className="flex flex-wrap gap-2">
                          {myBadges.map((b) => (
                            <span
                              key={b.key}
                              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-semibold"
                              style={{ backgroundColor: `${b.accent}2e`, color: b.accent }}
                              title={b.description}
                            >
                              <BadgeGlyph badgeKey={b.key} size={14} />
                              {b.name}
                            </span>
                          ))}
                        </div>
                      </SettingRow>
                    </SettingsSection>
                  )}

                  {error && <p className="text-sm text-status-dnd">{error}</p>}

                  {(profileDirty || saving || saved) && (
                    <div className="sticky bottom-0 -mx-6 mt-8 flex items-center justify-end gap-3 border-t border-divider bg-bg-primary/95 px-6 py-3 backdrop-blur">
                      <button
                        type="button"
                        onClick={resetProfileEdits}
                        disabled={!profileDirty || saving}
                        className="btn btn-gray"
                      >
                        Revert
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveProfile()}
                        disabled={saving || !profileDirty}
                        className="btn btn-filled"
                      >
                        {saving ? "Saving…" : profileDirty ? "Save Changes" : "Saved!"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {tab === "account" && (
                <div className="pb-20">
                  <SettingsSection
                    title="Account"
                    description="Your email and user identifier on Disband."
                  >
                    <SettingRow label="Email" stacked>
                      <p className="text-[14px] text-text-normal">{user?.email ?? "Not available"}</p>
                    </SettingRow>
                    <SettingRow
                      label="User ID"
                      description="Used for support requests. You can't change this."
                      stacked
                    >
                      <div className="flex items-center gap-2">
                        <code className="min-w-0 flex-1 truncate rounded-md border border-divider bg-bg-tertiary px-3 py-2 text-[12.5px] text-text-muted">
                          {profile?.id}
                        </code>
                        <button
                          type="button"
                          onClick={() => void copyUserId()}
                          className="btn btn-gray btn-sm shrink-0"
                        >
                          {copiedId ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </SettingRow>
                  </SettingsSection>

                  <SettingsSection
                    title="Password & security"
                    description="Keep your account protected."
                  >
                    <SettingRow
                      label="Change password"
                      description="Set a new password while you are logged in."
                      stacked
                    >
                      <NewPasswordForm submitLabel="Update password" onSubmit={updatePassword} />
                    </SettingRow>
                    {user?.email && (
                      <SettingRow
                        label="Email reset link"
                        description={`Prefer to reset from your inbox? We can send a link to ${user.email}.`}
                        stacked
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSettingsError(null);
                            setResetEmailSent(false);
                            void (async () => {
                              const err = await requestPasswordReset(user.email!);
                              if (err) setSettingsError(err);
                              else setResetEmailSent(true);
                            })();
                          }}
                          className="btn btn-gray btn-sm"
                        >
                          Send reset email
                        </button>
                        {resetEmailSent && (
                          <p className="mt-2 text-[13px] text-status-online">Reset link sent. Check your inbox.</p>
                        )}
                      </SettingRow>
                    )}
                  </SettingsSection>

                  <div className="mb-8">
                    <MfaSettingsPanel />
                  </div>

                  <SettingsSection
                    title="Sessions"
                    description="Manage where your account is signed in."
                  >
                    <SettingRow
                      label="Sign out everywhere"
                      description="Ends every other session on this account. You'll stay signed in here."
                    >
                      <button
                        type="button"
                        onClick={() => void signOutEverywhere()}
                        disabled={signingOutAll}
                        className="btn btn-destructive btn-sm"
                      >
                        {signingOutAll ? "Signing out…" : "Sign out everywhere"}
                      </button>
                    </SettingRow>
                  </SettingsSection>

                  <PlatformModerationPanel />

                  <AccountRestrictionsPanel />

                  <OfficialBroadcastPanel />

                  {settingsError && <p className="text-sm text-status-dnd">{settingsError}</p>}
                </div>
              )}

              {tab === "appearance" && (
                <AppearancePanel
                  plan={subPlan}
                  onSaveTheme={(next) => void savePreference({ theme: next })}
                />
              )}

              {tab === "themes" && <ThemesPanel />}

              {tab === "notifications" && (
                <div className="space-y-4">
                  <p className="text-sm text-text-muted">Control sounds and desktop alerts when you are away from Disband.</p>
                  <SettingRow
                    label="Message sounds"
                    description="Play a ping for @mentions and incoming DMs when the app is in the background."
                  >
                    <Toggle
                      checked={soundEnabled}
                      onChange={(next) => {
                        setSoundEnabled(next);
                        void savePreference({ sound_enabled: next });
                      }}
                      label="Message sounds"
                    />
                  </SettingRow>
                  <SettingRow
                    label="Desktop notifications"
                    description="Show OS notifications for mentions, messages, and calls when Disband is not focused."
                  >
                    <Toggle
                      checked={desktopNotifications}
                      onChange={(next) => {
                        setDesktopNotifications(next);
                        void savePreference({ desktop_notifications_enabled: next });
                      }}
                      label="Desktop notifications"
                    />
                  </SettingRow>
                  {notifPermission !== "granted" && notifPermission !== "unsupported" && (
                    <button
                      type="button"
                      onClick={() => void enableDesktopNotifications()}
                      className="btn btn-filled"
                    >
                      <IconBell size={16} />
                      Enable browser notifications
                    </button>
                  )}
                  {notifPermission === "denied" && (
                    <p className="text-xs text-text-muted">
                      Notifications are blocked in your browser. Allow them in site settings to receive desktop alerts.
                    </p>
                  )}
                  {settingsError && <p className="text-sm text-status-dnd">{settingsError}</p>}
                </div>
              )}

              {tab === "voice" && (
                <div className="space-y-6">
                  <SettingsSection
                    title="Devices"
                    description="Choose your microphone, speaker, and camera for voice channels and calls. Device lists populate after permission is granted."
                  >
                    <SettingRow label="Input device" stacked>
                      <select
                        value={audioInput}
                        disabled={devicesLoading}
                        onChange={(e) => {
                          setAudioInput(e.target.value);
                          setPreferredAudioInputId(e.target.value);
                        }}
                        className={settingsInputClass}
                      >
                        <option value="">System default</option>
                        {inputs.map((device) => (
                          <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
                        ))}
                      </select>
                    </SettingRow>
                    <SettingRow label="Output device" stacked>
                      <select
                        value={audioOutput}
                        disabled={devicesLoading}
                        onChange={(e) => {
                          setAudioOutput(e.target.value);
                          setPreferredAudioOutputId(e.target.value);
                        }}
                        className={settingsInputClass}
                      >
                        <option value="">System default</option>
                        {outputs.map((device) => (
                          <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
                        ))}
                      </select>
                    </SettingRow>
                    <SettingRow label="Camera" stacked>
                      <select
                        value={videoInput}
                        disabled={devicesLoading}
                        onChange={(e) => {
                          setVideoInput(e.target.value);
                          setPreferredVideoInputId(e.target.value);
                        }}
                        className={settingsInputClass}
                      >
                        <option value="">System default</option>
                        {cameras.map((device) => (
                          <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
                        ))}
                      </select>
                    </SettingRow>
                  </SettingsSection>

                  <SettingsSection
                    title="Microphone test"
                    description="Confirm your microphone hears you before joining a call."
                  >
                    <SettingRow
                      label="Live input level"
                      description="Speak and watch the meter move."
                      stacked
                    >
                      <MicTest deviceId={audioInput} />
                    </SettingRow>
                  </SettingsSection>

                  <SettingsSection
                    title="Access"
                    description="Grant permission once so devices can be listed and tested."
                  >
                    <SettingRow label="Microphone & camera access">
                      <button
                        type="button"
                        onClick={() => void testMediaAccess()}
                        className="btn btn-filled"
                      >
                        Allow microphone & camera
                      </button>
                    </SettingRow>
                  </SettingsSection>

                  {mediaTestMessage && <p className="text-sm text-status-online">{mediaTestMessage}</p>}
                  {settingsError && <p className="text-sm text-status-dnd">{settingsError}</p>}
                </div>
              )}

              {tab === "subscriptions" && (
                <div className="space-y-4">
                  <p className="text-sm text-text-muted">
                    Upgrade your plan for larger uploads, higher quality video, exclusive themes, and more.
                  </p>

                  <div className="rounded-[14px] bg-fill-tertiary p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase text-text-muted">Current Plan</p>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold capitalize">{subPlan}</span>
                          <SubscriptionBadge plan={subPlan} />
                        </div>
                        {subscription?.status === "active" && (
                          <div className="space-y-0.5 pt-1">
                            {subscription.current_period_end && (
                              <p className="text-xs text-text-muted">
                                Renews {new Date(subscription.current_period_end).toLocaleDateString("en-US", {
                                  year: "numeric", month: "long", day: "numeric",
                                })}
                              </p>
                            )}
                            <Hint tone="online">Active</Hint>
                          </div>
                        )}
                        {subscription?.status === "past_due" && (
                          <p className="text-xs text-status-dnd">Payment failed</p>
                        )}
                        {subscription?.status === "canceled" && (
                          <p className="text-xs text-text-muted">Canceled</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => setShowSubscription(true)}
                          className="btn btn-filled btn-sm"
                        >
                          {subPlan === "free" ? "Upgrade" : "Manage"}
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void reloadSubscription()}
                    className="text-xs text-text-muted hover:text-text-normal underline underline-offset-2"
                  >
                    Refresh subscription
                  </button>

                  <SettingsSection
                    title="What your plan includes"
                    description="Limits that apply to your account right now."
                  >
                    <SettingRow label="Max file upload">
                      <span className="text-[13px] font-semibold text-text-normal">
                        {formatBytes(entitlements.maxUploadBytes)}
                      </span>
                    </SettingRow>
                    <SettingRow label="Video quality">
                      <span className="text-[13px] font-semibold text-text-normal">
                        {entitlements.videoQuality}
                      </span>
                    </SettingRow>
                    <SettingRow label="Animated avatar">
                      <span className="text-[13px] font-semibold text-text-normal">
                        {entitlements.animatedAvatar ? "Included" : "—"}
                      </span>
                    </SettingRow>
                  </SettingsSection>
                  {entitlements.historyExport && (
                    <button
                      type="button"
                      onClick={exportHistory}
                      disabled={exporting}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-divider bg-bg-secondary p-4 text-sm text-text-muted hover:bg-bg-accent disabled:opacity-50"
                    >
                      <IconDownload size={16} />
                      {exporting ? "Exporting..." : "Export Message History (JSON)"}
                    </button>
                  )}
                </div>
              )}

              {tab === "referrals" && (
                <div className="space-y-4">
                  <p className="text-sm text-text-muted">
                    Share your code and earn when friends join with it.
                  </p>
                  <MyReferralCard />
                  <div className="rounded-[14px] bg-fill-tertiary flex flex-col gap-1.5 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[13px] font-medium text-text-normal">Live leaderboard</p>
                      <p className="mt-0.5 text-[12px] text-text-muted">
                        See who's verified the most referrals — the December winner takes home a $100
                        Visa card.
                      </p>
                    </div>
                    <Link
                      href="/leaderboards/referrals"
                      className="btn btn-filled btn-sm shrink-0"
                    >
                      View leaderboard
                    </Link>
                  </div>
                </div>
              )}

              {tab === "bots" && <BotsPanel />}

              {tab === "textMedia" && (
                <div className="space-y-4">
                  <p className="text-sm text-text-muted">Choose how links and media appear in chat.</p>
                  <SettingRow
                    label="Link previews"
                    description="Show rich embeds with title, description, and image for URLs in messages."
                  >
                    <Toggle
                      checked={linkPreviews}
                      onChange={(next) => {
                        setLinkPreviews(next);
                        void savePreference({ link_previews_enabled: next });
                      }}
                      label="Link previews"
                    />
                  </SettingRow>
                  {settingsError && <p className="text-sm text-status-dnd">{settingsError}</p>}
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {cropSource && (
        <AvatarCropModal
          open={cropOpen}
          imageUrl={cropSource}
          onClose={() => {
            setCropOpen(false);
            URL.revokeObjectURL(cropSource);
            setCropSource(null);
          }}
          onSave={(crop) => void saveAvatarCrop(crop)}
        />
      )}

      <SubscriptionModal
        open={showSubscription}
        onClose={() => setShowSubscription(false)}
        userId={profile?.id}
      />

      {gifting && (
        <GiftModal
          onClose={() => setGifting(false)}
          onPurchased={(code) => {
            setGiftLink(giftUrl(code, window.location.origin));
            setGifting(false);
          }}
        />
      )}
    </>
  );
}
