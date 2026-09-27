"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useApp } from "@/contexts/AppContext";
import { Avatar } from "@/components/ui/Avatar";
import { displayName } from "@/lib/utils";
import { statusLabel } from "@/lib/presence";
import {
  STATUS_DURATION_PRESETS,
  activeStatusNote,
  expiresAtForDuration,
  presetForExpiresAt,
  statusExpiryLabel,
  type StatusDurationId,
} from "@/lib/presence";
import type { UserStatus } from "@/lib/supabase/types";

const STATUS_DOT_BG: Record<UserStatus, string> = {
  online: "bg-status-online",
  idle: "bg-status-idle",
  dnd: "bg-status-dnd",
  offline: "bg-status-offline",
};

const STATUS_OPTIONS: { status: UserStatus; label: string }[] = [
  { status: "online", label: "Online" },
  { status: "idle", label: "Idle" },
  { status: "dnd", label: "Do Not Disturb" },
  { status: "offline", label: "Invisible" },
];

function accountLabel(a: { display_name: string | null; username: string | null; email: string | null }): string {
  return a.display_name || a.username || a.email?.split("@")[0] || "Account";
}

interface UserPanelPopupProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenProfile?: () => void;
}

export function UserPanelPopup({ anchorRef, onClose, onOpenSettings, onOpenProfile }: UserPanelPopupProps) {
  const {
    profile, user, updateProfile, presenceMap,
    savedSessions, switchAccount, removeSavedAccount, beginAddAccount,
  } = useApp();
  const [changing, setChanging] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);

  const [customNote, setCustomNote] = useState(() => profile?.status_note ?? "");
  const [customDuration, setCustomDuration] = useState<StatusDurationId>(() =>
    presetForExpiresAt(profile?.status_expires_at),
  );
  const [savingCustom, setSavingCustom] = useState(false);
  const [pos, setPos] = useState<{ left: number; bottom: number }>({ left: 0, bottom: 0 });

  const name = profile ? displayName(profile) : user?.email?.split("@")[0] ?? "You";
  const currentUserId = profile?.id ?? user?.id ?? null;
  const currentStatus: UserStatus = profile ? presenceMap.get(profile.id) ?? profile.status : "online";
  const statusText = statusLabel(currentStatus);

  const accounts = (() => {
    const others = savedSessions.filter((s) => s.user_id !== currentUserId);
    const saved = savedSessions.find((s) => s.user_id === currentUserId);
    const current = currentUserId
      ? {
          user_id: currentUserId,
          email: saved?.email ?? user?.email ?? null,
          display_name: saved?.display_name ?? (profile ? displayName(profile) : null),
          username: saved?.username ?? profile?.username ?? null,
          avatar_url: profile?.avatar_url ?? saved?.avatar_url ?? null,
        }
      : null;
    return { current, others };
  })();

  const handleSwitch = useCallback(async (acct: typeof savedSessions[number]) => {
    if (switchingId) return;
    setSwitchingId(acct.user_id);
    try {
      const err = await switchAccount(acct);
      if (!err) onClose();
    } finally {
      setSwitchingId(null);
    }
  }, [switchAccount, switchingId, onClose]);

  const setStatus = useCallback(
    async (status: UserStatus) => {
      if (changing) return;
      setChanging(true);
      try {
        await updateProfile({ status } as any);
      } finally {
        setChanging(false);
      }
    },
    [changing, updateProfile],
  );

  const saveCustomStatus = useCallback(async () => {
    if (savingCustom) return;
    const note = customNote.trim();
    setSavingCustom(true);
    try {
      await updateProfile({
        status_note: note || null,
        status_expires_at: note ? expiresAtForDuration(customDuration) : null,
      } as any);
    } finally {
      setSavingCustom(false);
    }
  }, [savingCustom, customNote, customDuration, updateProfile]);

  const clearCustomStatus = useCallback(async () => {
    if (savingCustom) return;
    setSavingCustom(true);
    try {
      await updateProfile({ status_note: null, status_expires_at: null } as any);
      setCustomNote("");
      setCustomDuration("never");
    } finally {
      setSavingCustom(false);
    }
  }, [savingCustom, updateProfile]);

  const liveNote = activeStatusNote(profile);

  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setPos({ left: r.left + 4, bottom: window.innerHeight - r.top + 8 });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [anchorRef]);

  const content = (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div
        className="glass-thick popover-pop fixed z-40 w-[300px] max-h-[calc(100vh-100px)] overflow-y-auto rounded-[20px] p-1.5"
        style={{ left: pos.left, bottom: pos.bottom, ["--popover-origin" as string]: "bottom left" }}
      >
        {}
        <div
          className="relative h-20 overflow-hidden rounded-[15px]"
          style={{
            background: profile?.accent_color
              ? `linear-gradient(135deg, ${profile.accent_color}, ${profile.accent_color_2 ?? profile.accent_color})`
              : "linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--brand) 55%, #000))",
          }}
        >
          {profile?.banner_url && (
            <img
              src={profile.banner_url}
              alt=""
              className="h-full w-full object-cover opacity-60"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
        </div>

        <div className="relative -mt-10 mb-1.5 flex px-3">
          <div className="relative">
            <Avatar profile={profile ?? { display_name: name }} size="lg" className="ring-[5px] ring-bg-elevated" />
            <span
              className={`absolute bottom-0.5 right-0.5 h-[18px] w-[18px] rounded-full border-[3px] border-bg-elevated ${STATUS_DOT_BG[currentStatus]}`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-2.5 pb-3">
          <div className="min-w-0">
            <p className="truncate text-[17px] font-semibold tracking-[-0.015em] text-text-normal">{name}</p>
            <p className="truncate text-[12.5px] text-text-muted">{statusText}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onOpenProfile && (
              <button
                onClick={() => {
                  onClose();
                  onOpenProfile();
                }}
                className="btn btn-gray btn-sm"
              >
                View profile
              </button>
            )}
            <button
              onClick={onOpenSettings}
              className="tool-btn bg-fill-secondary"
              aria-label="Settings"
            >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            </button>
          </div>
        </div>

        <div className="mx-1 mb-1.5 rounded-[14px] bg-fill-tertiary p-2.5">
          <input
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="Set a custom status"
            maxLength={128}
            className="field min-h-0 bg-bg-elevated px-3 py-2 text-[13.5px]"
          />
          <div className="mt-1.5 flex flex-wrap gap-1" role="group" aria-label="Clear custom status after">
            {STATUS_DURATION_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setCustomDuration(preset.id)}
                aria-pressed={customDuration === preset.id}
                className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                  customDuration === preset.id
                    ? "bg-brand text-brand-foreground"
                    : "bg-fill-secondary text-text-muted hover:text-text-normal"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              disabled={savingCustom}
              onClick={() => void saveCustomStatus()}
              className="btn btn-filled btn-sm flex-1"
            >
              {savingCustom ? "Saving…" : "Set Status"}
            </button>
            {(liveNote || customNote.trim()) && (
              <button
                type="button"
                disabled={savingCustom}
                onClick={() => void clearCustomStatus()}
                className="btn btn-gray btn-sm"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="px-1 py-1">
          <p className="section-label px-2.5 pb-1 pt-1 text-[11px]">
            Status
          </p>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.status}
              type="button"
              disabled={changing}
              onClick={() => void setStatus(opt.status)}
              className={`flex h-9 w-full items-center gap-2.5 rounded-[9px] px-2.5 text-left text-[14px] transition-colors hover:bg-interactive-hover ${
                currentStatus === opt.status ? "bg-interactive-selected" : ""
              } ${changing ? "opacity-50" : ""}`}
            >
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT_BG[opt.status]}`} />
              <span className="flex-1 text-text-normal">{opt.label}</span>
              {currentStatus === opt.status && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-brand">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>

        <div className="mx-2.5 my-1 h-px bg-hairline" />
        <div className="px-1 py-1">
          <div className="mb-1 flex items-center justify-between px-2.5">
            <span className="section-label px-0 text-[11px]">Accounts</span>
            <button
              type="button"
              onClick={() => setManaging((m) => !m)}
              className="text-[12.5px] font-semibold text-brand transition-opacity hover:opacity-80"
            >
              {managing ? "Done" : "Manage"}
            </button>
          </div>

          <div className="flex flex-col gap-0.5">
            {accounts.current && (
              <div className="flex items-center gap-2.5 rounded-[10px] bg-interactive-hover px-2.5 py-1.5">
                <span className="relative shrink-0">
                  <Avatar
                    size="sm"
                    profile={{ display_name: accountLabel(accounts.current), avatar_url: accounts.current.avatar_url }}
                    className="h-7 w-7 text-xs"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-bg-secondary ${STATUS_DOT_BG[currentStatus]}`}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-text-normal">{accountLabel(accounts.current)}</span>
                  <span className="block truncate text-[11px] text-text-muted">{accounts.current.email}</span>
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-brand">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}

            {accounts.others.map((acct) => {
              const display = accountLabel(acct);
              const busy = switchingId === acct.user_id;
              return (
                <div
                  key={acct.user_id}
                  className="group flex items-center gap-2.5 rounded-[10px] px-2.5 py-1.5 transition-colors hover:bg-interactive-hover"
                >
                  <button
                    type="button"
                    disabled={busy || managing}
                    onClick={() => void handleSwitch(acct)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left disabled:cursor-default"
                  >
                    <Avatar
                      size="sm"
                      profile={{ display_name: display, avatar_url: acct.avatar_url }}
                      className="h-7 w-7 text-xs"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-text-normal">{display}</span>
                      <span className="block truncate text-[11px] text-text-muted">{acct.email}</span>
                    </span>
                    {busy && (
                      <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-text-muted/40 border-t-text-muted" />
                    )}
                  </button>
                  {managing && (
                    <button
                      type="button"
                      aria-label={`Remove ${display}`}
                      title="Remove this account"
                      onClick={() => removeSavedAccount(acct.user_id)}
                      className="shrink-0 rounded p-1 text-status-dnd transition-colors hover:bg-status-dnd/15"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <circle cx="12" cy="12" r="9" /><path d="M8 12h8" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => { beginAddAccount(); onClose(); }}
              className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-1.5 text-left transition-colors hover:bg-interactive-hover"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fill-secondary text-brand">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              <span className="text-[14px] text-brand">Add account</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
