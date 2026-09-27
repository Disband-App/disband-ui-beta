"use client";

import { useApp } from "@/contexts/AppContext";
import { Avatar } from "@/components/ui/Avatar";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { UserBadges } from "@/components/ui/UserBadges";
import { IconClose, IconPhone, IconUser } from "@/components/icons";
import { displayName } from "@/lib/utils";
import {
  activeStatusNote,
  presenceStatusFor,
  statusExpiryLabel,
} from "@/lib/presence";
import { getAccentBackground } from "@/lib/profileColor";
import { safeImageUrl } from "@/lib/safe-url";
import { useEffect, useRef, useState } from "react";
import type { Profile } from "@/lib/supabase/types";

function BioPreview({ bio, onMore }: { bio: string; onMore: () => void }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [truncated, setTruncated] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (el) setTruncated(el.scrollHeight > el.clientHeight + 1);
  }, [bio]);
  return (
    <div>
      <p ref={ref} className="line-clamp-4 whitespace-pre-wrap text-[14px] leading-snug">
        {bio}
      </p>
      {truncated && (
        <button
          type="button"
          onClick={onMore}
          className="mt-0.5 text-xs font-semibold text-brand hover:underline"
        >
          more
        </button>
      )}
    </div>
  );
}

interface DmProfileRailProps {
  friend: Profile;
  onClose: () => void;
  onVoiceCall: () => void;
  onOpenFullProfile: () => void;
}

export function DmProfileRail({ friend, onClose, onVoiceCall, onOpenFullProfile }: DmProfileRailProps) {
  const { presenceMap } = useApp();
  const [bannerFailed, setBannerFailed] = useState(false);
  const live = presenceStatusFor(friend, presenceMap);
  const note = activeStatusNote(friend);
  const bannerUrl = safeImageUrl(friend.banner_url);

  // Laid out like an iOS contact card: banner, a centred avatar and name,
  // a row of action tiles, then the details as a grouped list.
  return (
    <aside
      aria-label={`${displayName(friend)}'s profile`}
      className="view-slide flex min-h-0 w-[288px] shrink-0 flex-col overflow-y-auto border-l border-hairline"
    >
      <div className="relative m-2.5 mb-0 h-24 shrink-0 overflow-hidden rounded-[16px]" style={{ background: getAccentBackground(friend) }}>
        {bannerUrl && !bannerFailed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bannerUrl}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setBannerFailed(true)}
          />
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Hide profile panel"
          className="press absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition-colors hover:bg-black/45"
        >
          <IconClose size={14} strokeWidth={2.6} />
        </button>
      </div>

      <div className="flex flex-col items-center px-4 pb-5 text-center">
        <div className="relative -mt-11 mb-2.5 w-fit">
          <Avatar profile={friend} size="lg" className="ring-4 ring-bg-primary" />
          <span className="absolute bottom-0.5 right-0.5 rounded-full bg-bg-primary p-[3px]">
            <StatusIndicator status={live} size="md" />
          </span>
        </div>

        <h2 className="title-2">{displayName(friend)}</h2>
        <div className="mt-0.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          {friend.username && (
            <p className="text-[13px] text-text-muted">@{friend.username}</p>
          )}
          {friend.pronouns?.trim() && (
            <span className="pill bg-fill-tertiary py-px text-text-muted">
              {friend.pronouns.trim()}
            </span>
          )}
        </div>

        <div className="mt-2">
          <UserBadges userId={friend.id} plan="free" size={16} variant="full" />
        </div>

        <div className="mt-4 grid w-full grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onVoiceCall}
            className="press flex flex-col items-center gap-1 rounded-[14px] bg-fill-tertiary py-2.5 text-[12px] font-medium text-brand transition-colors hover:bg-fill-secondary"
          >
            <IconPhone size={19} strokeWidth={2} />
            Call
          </button>
          <button
            type="button"
            onClick={onOpenFullProfile}
            className="press flex flex-col items-center gap-1 rounded-[14px] bg-fill-tertiary py-2.5 text-[12px] font-medium text-brand transition-colors hover:bg-fill-secondary"
          >
            <IconUser size={19} strokeWidth={2} />
            Profile
          </button>
        </div>

        <div className="list-group mt-4 w-full text-left">
          {note && (
            <div className="list-row items-start py-2.5">
              <div className="min-w-0">
                <p className="text-[11.5px] font-medium text-text-muted">Status</p>
                <p className="break-words text-[14px] leading-snug">{note}</p>
                <p className="mt-0.5 text-[11.5px] text-text-muted">
                  {statusExpiryLabel(friend.status_expires_at)}
                </p>
              </div>
            </div>
          )}
          {friend.bio?.trim() && (
            <div className="list-row items-start py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] font-medium text-text-muted">About</p>
                <BioPreview bio={friend.bio.trim()} onMore={onOpenFullProfile} />
              </div>
            </div>
          )}
          <div className="list-row py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-medium text-text-muted">Presence</p>
              <StatusIndicator status={live} size="sm" showLabel className="mt-0.5 [&>span:last-child]:text-text-normal" />
            </div>
          </div>
          <div className="list-row py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-medium text-text-muted">Member since</p>
              <p className="text-[14px]">
                {new Date(friend.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
