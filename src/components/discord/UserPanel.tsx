"use client";

import { useState, useCallback, useRef } from "react";
import { useApp } from "@/contexts/AppContext";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionBadge } from "@/components/ui/SubscriptionBadge";
import { Tooltip } from "./Tooltip";
import {
  IconHeadphones,
  IconHeadphonesOff,
  IconMic,
  IconMicOff,
  IconSettings,
} from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { displayName } from "@/lib/utils";
import { statusLabel, activeStatusNote } from "@/lib/presence";
import { UserPanelPopup } from "./UserPanelPopup";
import type { UserStatus } from "@/lib/supabase/types";

const STATUS_BG: Record<UserStatus, string> = {
  online: "bg-status-online",
  idle: "bg-status-idle",
  dnd: "bg-status-dnd",
  offline: "bg-status-offline",
};

interface UserPanelProps {
  onOpenSettings: () => void;
  onOpenProfile?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export function UserPanel({ onOpenSettings, onOpenProfile, onContextMenu }: UserPanelProps) {
  const { profile, user, micMuted, deafened, setMicMuted, setDeafened, presenceMap, voiceJoinedChannelId } = useApp();
  const { plan } = useSubscription(profile?.id);
  const [popupOpen, setPopupOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const name = profile
    ? displayName(profile)
    : user?.email?.split("@")[0] ?? "You";
  const status: UserStatus = profile ? presenceMap.get(profile.id) ?? profile.status : "online";
  const statusLabelText = statusLabel(status);

  const liveNote = activeStatusNote(profile);

  const handleAvatarClick = useCallback(() => {
    setPopupOpen((prev) => !prev);
  }, []);

  return (
    <div className="shrink-0 p-2 pt-1">
    <div
      ref={panelRef}
      className="flex h-[54px] items-center gap-0.5 rounded-[14px] bg-fill-tertiary pl-1.5 pr-1"
      onContextMenu={onContextMenu}
    >
      {popupOpen && (
        <UserPanelPopup
          anchorRef={panelRef}
          onClose={() => setPopupOpen(false)}
          onOpenSettings={onOpenSettings}
          onOpenProfile={onOpenProfile}
        />
      )}
      <button
        type="button"
        onClick={handleAvatarClick}
        title="View your profile"
        aria-expanded={popupOpen}
        className="press flex min-w-0 flex-1 items-center gap-2.5 rounded-[10px] p-1 text-left transition-colors hover:bg-interactive-hover"
      >
        <div className="relative shrink-0">
          <Avatar profile={profile ?? { display_name: name }} size="sm" className="h-9 w-9" />
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[2.5px] border-bg-secondary ${STATUS_BG[status]}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[13.5px] font-semibold leading-tight text-text-normal">{name}</p>
            <SubscriptionBadge plan={plan} tooltip />
          </div>
          <p title={liveNote ? "Click to edit your status" : undefined} className="mt-0.5 truncate text-[12px] leading-tight text-text-muted">
            {liveNote ?? statusLabelText}
          </p>
        </div>
      </button>

      {/* Mic/deafen controls always visible — work anywhere via app state */}
      <Tooltip label={micMuted ? "Unmute" : "Mute"} side="top">
        <button
          type="button"
          aria-pressed={micMuted}
          aria-label={micMuted ? "Unmute" : "Mute"}
          onClick={() => setMicMuted(!micMuted)}
          className={`tool-btn h-8 w-8 ${micMuted ? "bg-status-dnd/14 text-status-dnd hover:bg-status-dnd/20 hover:text-status-dnd" : ""}`}
        >
          {micMuted ? <IconMicOff size={18} /> : <IconMic size={18} />}
        </button>
      </Tooltip>

      <Tooltip label={deafened ? "Undeafen" : "Deafen"} side="top">
        <button
          type="button"
          aria-pressed={deafened}
          aria-label={deafened ? "Undeafen" : "Deafen"}
          onClick={() => {
            const next = !deafened;
            setDeafened(next);
            if (next) setMicMuted(true);
          }}
          className={`tool-btn h-8 w-8 ${deafened ? "bg-status-dnd/14 text-status-dnd hover:bg-status-dnd/20 hover:text-status-dnd" : ""}`}
        >
          {deafened ? <IconHeadphonesOff size={18} /> : <IconHeadphones size={18} />}
        </button>
      </Tooltip>

      <Tooltip label="Settings" side="top">
        <button
          type="button"
          aria-label="Settings"
          onClick={onOpenSettings}
          className="tool-btn h-8 w-8 [&_svg]:transition-transform [&_svg]:duration-700 [&_svg]:ease-spring hover:[&_svg]:rotate-90"
        >
          <IconSettings size={18} />
        </button>
      </Tooltip>
    </div>
    </div>
  );
}
