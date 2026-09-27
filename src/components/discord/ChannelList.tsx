"use client";

import { useEffect, useRef, useState } from "react";
import { NotificationBell } from "./NotificationBell";
import { CallIndicator } from "./CallIndicator";
import { Tooltip } from "./Tooltip";
import { Segmented } from "@/components/ui/Segmented";
import {
  IconChevron,
  IconClose,
  IconHash,
  IconHeadphonesOff,
  IconMicOff,
  IconPlus,
  IconSpeaker,
  IconVerified,
} from "@/components/icons";
import { displayName } from "@/lib/utils";
import { getAvatarStyle } from "@/lib/profileColor";
import { safeImageUrl } from "@/lib/safe-url";
import type { PresenceMember } from "@/hooks/useServerVoicePresence";
import type { Channel, ChannelCategory, ChannelType, Profile } from "@/lib/supabase/types";
import {
  getCollapsedCategories,
  setCategoryCollapsed,
  UNCATEGORIZED_KEY,
} from "@/lib/collapsed-categories";

interface ChannelListProps {
  title: string;
  categories: ChannelCategory[];
  channels: Channel[];
  activeChannelId: string | null;
  canManageChannels: boolean;
  voicePresence: Map<string, PresenceMember[]>;

  voiceStartTimes: Map<string, number>;
  onSelectChannel: (id: string) => void;
  onOpenSettings: () => void;
  onOpenProfile?: () => void;
  onOpenServerSettings?: () => void;
  onChannelContext?: (channel: Channel, x: number, y: number) => void;
  onCategoryContext?: (category: ChannelCategory, x: number, y: number) => void;
  showServerHeader?: boolean;
  verified?: boolean;
  onMoveChannel?: (channelId: string, categoryId: string | null, index: number) => void;
  onMoveCategory?: (categoryId: string, index: number) => void;
  onCreateChannel?: (name: string, type: ChannelType, categoryId: string | null) => Promise<string | null>;
  onCreateCategory?: (name: string) => Promise<string | null>;

  getUnreadCount?: (channelId: string) => number;

  getMentionCount?: (channelId: string) => number;

  catalystCount?: number;
  onOpenCatalysts?: () => void;
  /** Server banner shown behind the header title with a fade. Null = plain header. */
  bannerUrl?: string | null;
}

function MiniAvatar({ profile }: { profile?: Profile }) {
  const name = profile ? displayName(profile) : "?";
  const accent = getAvatarStyle(profile ?? {});
  return (
    <span
      className="relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full text-[9px] font-bold"
      style={accent}
    >
      {profile?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={safeImageUrl(profile.avatar_url) || undefined} alt="" className="h-full w-full" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </span>
  );
}

function formatCallDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ChannelList({
  title,
  categories,
  channels,
  activeChannelId,
  canManageChannels,
  voicePresence,
  voiceStartTimes,
  onSelectChannel,
  onOpenSettings,
  onOpenProfile,
  onOpenServerSettings,
  onChannelContext,
  onCategoryContext,
  showServerHeader = true,
  verified,
  onMoveChannel,
  onMoveCategory,
  onCreateChannel,
  onCreateCategory,
  getUnreadCount,
  getMentionCount,
  catalystCount,
  onOpenCatalysts,
  bannerUrl,
}: ChannelListProps) {

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => getCollapsedCategories());

  const toggleCollapsed = (key: string) => {
    setCollapsed((prev) => {
      const next = !prev[key];
      setCategoryCollapsed(key, next);
      return { ...prev, [key]: next };
    });
  };
  const [dragChannelId, setDragChannelId] = useState<string | null>(null);
  const [dragCategoryId, setDragCategoryId] = useState<string | null>(null);
  const [dragGhost, setDragGhost] = useState<{ kind: "channel" | "category"; id: string; label: string; x: number; y: number } | null>(null);
  const [overCatId, setOverCatId] = useState<string | "uncategorized" | null>(null);
  const [overChannelId, setOverChannelId] = useState<string | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [addChannelTarget, setAddChannelTarget] =
    useState<{ categoryId: string | null } | null>(null);
  const [addChannelName, setAddChannelName] = useState("");
  const [addChannelType, setAddChannelType] = useState<ChannelType>("text");
  const [busy, setBusy] = useState(false);

  const suppressClickRef = useRef<HTMLElement | null>(null);

  const [now, setNow] = useState(() => Date.now());
  const anyCallActive = voiceStartTimes.size > 0;
  useEffect(() => {
    if (!anyCallActive) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [anyCallActive]);

  const DRAG_THRESHOLD = 6;
  const dragRef = useRef<{
    kind: "channel" | "category";
    id: string;
    label: string;
    pointerId: number;
    startX: number;
    startY: number;
    active: boolean;
  } | null>(null);

  const byCategory = (catId: string | null) =>
    channels.filter((c) => c.category_id === catId).sort((a, b) => a.position - b.position);

  const clearDragState = () => {
    setDragChannelId(null);
    setDragCategoryId(null);
    setOverCatId(null);
    setOverChannelId(null);
    setDragGhost(null);
  };

  const dropOnChannel = (target: Channel) => {
    if (dragChannelId && dragChannelId !== target.id && onMoveChannel) {
      const list = byCategory(target.category_id);
      const index = list.findIndex((c) => c.id === target.id);
      onMoveChannel(dragChannelId, target.category_id, index);
    }
    clearDragState();
  };

  const hitTest = (clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY);
    const target = el?.closest?.(
      "[data-channel-id], [data-category-id], [data-drop-uncategorized]",
    ) as HTMLElement | null | undefined;
    const overChannel = target?.dataset?.channelId ?? null;
    const overCategory = target?.dataset?.categoryId ?? null;
    const overUncategorized = target?.dataset?.dropUncategorized != null;
    if (overChannel) {
      setOverChannelId(overChannel);
      setOverCatId(null);
    } else if (overCategory) {
      setOverCatId(overCategory);
      setOverChannelId(null);
    } else if (overUncategorized) {
      setOverCatId("uncategorized");
      setOverChannelId(null);
    } else {
      setOverChannelId(null);
      setOverCatId(null);
    }
  };

  const armDrag = (kind: "channel" | "category", id: string, label: string) =>
    (e: React.PointerEvent<HTMLElement>) => {
      if (!canManageChannels) return;
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = { kind, id, label, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, active: false };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    };

  const moveDrag = (e: React.PointerEvent<HTMLElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (!d.active) {
      if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < DRAG_THRESHOLD) return;
      d.active = true;
      if (d.kind === "channel") setDragChannelId(d.id);
      else setDragCategoryId(d.id);
    }
    e.preventDefault();
    setDragGhost({ kind: d.kind, id: d.id, label: d.label, x: e.clientX, y: e.clientY });
    hitTest(e.clientX, e.clientY);
  };

  const releaseDrag = (e: React.PointerEvent<HTMLElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    if (!d.active) return;
    suppressClickRef.current = e.currentTarget;
    const dragEl = e.currentTarget;
    window.setTimeout(() => {
      if (suppressClickRef.current === dragEl) suppressClickRef.current = null;
    }, 500);
    if (d.kind === "channel") {
      if (overChannelId && overChannelId !== d.id) {
        const target = channels.find((c) => c.id === overChannelId);
        if (target) {
          dropOnChannel(target);
          return;
        }
      }
      const src = channels.find((c) => c.id === d.id);
      const targetCategory: string | null =
        overCatId === "uncategorized" ? null : overCatId;
      const movingAcross = overCatId != null
        && (targetCategory ?? null) !== (src?.category_id ?? null);
      if (overCatId != null && movingAcross && onMoveChannel) {
        onMoveChannel(d.id, targetCategory, byCategory(targetCategory).length);
        clearDragState();
      } else {
        clearDragState();
      }
    } else if (d.kind === "category") {
      const dragged = categories.find((c) => c.id === d.id);
      const over = overCategoryIdForDrop();
      if (dragged && over && over !== "uncategorized" && over !== d.id) {
        onMoveCategory?.(d.id, overCategoryPosition(over));
      }
      clearDragState();
    } else {
      clearDragState();
    }
  };

  const overCategoryPosition = (targetCatId: string) => {
    const sorted = [...categories].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((c) => c.id === targetCatId);
    return idx < 0 ? sorted.length : idx;
  };

  const overCategoryIdForDrop = () => {
    if (overChannelId) {
      const ch = channels.find((c) => c.id === overChannelId);
      return ch?.category_id ?? "uncategorized";
    }
    if (overCatId) return overCatId;
    return null;
  };

  const cancelDrag = (e: React.PointerEvent<HTMLElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    clearDragState();
  };

  const consumeSuppressed = (el: HTMLElement) => {
    if (suppressClickRef.current === el) {
      suppressClickRef.current = null;
      return true;
    }
    return false;
  };

  const startAddChannel = (catId: string | null) => {
    if (!canManageChannels) return;
    setAddChannelTarget({ categoryId: catId });
    setAddChannelName("");
    setAddChannelType("text");
  };

  const submitAddChannel = async () => {
    if (!onCreateChannel || !addChannelName.trim() || !addChannelTarget) return;
    if (!canManageChannels) return;
    setBusy(true);
    await onCreateChannel(addChannelName.trim(), addChannelType, addChannelTarget.categoryId);
    setBusy(false);
    setAddChannelTarget(null);
    setAddChannelName("");
  };

  const submitAddCategory = async () => {
    if (!onCreateCategory || !newCategoryName.trim()) return;
    setBusy(true);
    await onCreateCategory(newCategoryName.trim());
    setBusy(false);
    setAddingCategory(false);
    setNewCategoryName("");
  };

  const renderAddChannelComposer = () => (
    <div className="popover-pop mx-1 mb-1.5 mt-0.5 rounded-[12px] bg-bg-primary p-2 shadow-elev-2 ring-1 ring-glass-border">
      <Segmented
        size="sm"
        ariaLabel="Channel type"
        value={addChannelType}
        onChange={setAddChannelType}
        options={[
          { id: "text", label: <><IconHash size={13} /> Text</> },
          { id: "voice", label: <><IconSpeaker size={13} /> Voice</> },
        ]}
      />
      <div className="mt-2 flex items-center gap-1.5">
        <input
          autoFocus
          value={addChannelName}
          onChange={(e) => setAddChannelName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submitAddChannel();
            if (e.key === "Escape") setAddChannelTarget(null);
          }}
          placeholder={addChannelType === "text" ? "new-channel" : "Voice room"}
          className="field min-h-0 flex-1 px-2.5 py-1.5 text-[13px]"
        />
        <button
          type="button"
          onClick={() => void submitAddChannel()}
          disabled={busy || !addChannelName.trim()}
          className="btn btn-filled btn-sm"
        >
          Add
        </button>
      </div>
    </div>
  );

  const sortedCategories = [...categories].sort((a, b) => a.position - b.position);
  const uncategorized = byCategory(null);

  const renderChannel = (ch: Channel) => {
    const active = ch.id === activeChannelId;
    const participants = ch.type === "voice" ? voicePresence.get(ch.id) ?? [] : [];

    const unread = !active && (getUnreadCount?.(ch.id) ?? 0) > 0;
    const mentions = active ? 0 : getMentionCount?.(ch.id) ?? 0;
    return (
      <div key={ch.id} className="relative">
        {overChannelId === ch.id && <div className="absolute inset-x-2 -top-px h-0.5 rounded-full bg-brand" />}
        <button
          type="button"
          data-channel-id={ch.id}
          aria-current={active ? "true" : undefined}
          onClick={(e) => {
            if (consumeSuppressed(e.currentTarget)) return;
            onSelectChannel(ch.id);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            onChannelContext?.(ch, e.clientX, e.clientY);
          }}
          onPointerDown={armDrag("channel", ch.id, ch.name)}
          onPointerMove={moveDrag}
          onPointerUp={releaseDrag}
          onPointerCancel={cancelDrag}
          style={canManageChannels ? { touchAction: "none" } : undefined}
          className={`group/drag mb-px flex h-[34px] w-full items-center gap-2 rounded-[10px] px-2.5 text-[14.5px] transition-[background-color,color,transform] duration-150 active:scale-[0.985] ${
            active
              ? "bg-brand/14 font-semibold text-text-normal"
              : unread
                ? "font-semibold text-text-normal hover:bg-interactive-hover"
                : "text-text-muted hover:bg-interactive-hover hover:text-text-normal"
          } ${canManageChannels ? "cursor-grab active:cursor-grabbing" : ""}`}
        >
          <span className={`flex w-[18px] shrink-0 justify-center ${active ? "text-brand" : ""}`}>
            {ch.type === "text" ? <IconHash size={17} strokeWidth={2} /> : <IconSpeaker size={17} strokeWidth={2} />}
          </span>
          <span className="min-w-0 flex-1 truncate text-left">{ch.name}</span>
          {mentions > 0 ? (
            <span key={mentions} className="count-badge badge-pop">
              {mentions > 99 ? "99+" : mentions}
            </span>
          ) : unread ? (
            <span aria-label="Unread" className="h-2 w-2 shrink-0 rounded-full bg-brand" />
          ) : null}
          {ch.type === "voice" && participants.length > 0 && (
            <>
              {(() => {
                const start = voiceStartTimes.get(ch.id);
                return start !== undefined ? (
                  <span className="nums shrink-0 rounded-full bg-status-online/14 px-1.5 py-px text-[10.5px] font-semibold text-status-online">
                    {formatCallDuration(now - start)}
                  </span>
                ) : null;
              })()}
            </>
          )}
        </button>
        {ch.type === "voice" && participants.length > 0 && (
          <div className="mb-1 ml-[22px] flex flex-col gap-px border-l border-hairline pb-1 pl-3">
            {participants.map((vp) => (
              <span key={vp.user_id} className="avatar-pop flex h-7 items-center gap-2 rounded-[8px] px-1.5 text-[13px] text-text-muted">
                <MiniAvatar profile={vp.profile} />
                <span className="min-w-0 flex-1 truncate">{vp.profile ? displayName(vp.profile) : "Unknown"}</span>
                {vp.muted && <IconMicOff size={13} className="shrink-0 text-status-dnd" />}
                {vp.deafened && <IconHeadphonesOff size={13} className="shrink-0 text-status-dnd" />}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderCategoryHeader = (cat: ChannelCategory) => {
    const open = !collapsed[cat.id];
    return (
      <div className="group/cat group/drag relative mt-3 flex items-center first:mt-1" data-category-id={cat.id}>
        {overCatId === cat.id && <div className="absolute inset-x-2 -top-px h-0.5 rounded-full bg-brand" />}
        <button
          type="button"
          aria-expanded={open}
          onClick={(e) => {
            if (consumeSuppressed(e.currentTarget)) return;
            toggleCollapsed(cat.id);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCategoryContext?.(cat, e.clientX, e.clientY);
          }}
          onPointerDown={armDrag("category", cat.id, cat.name)}
          onPointerMove={moveDrag}
          onPointerUp={releaseDrag}
          onPointerCancel={cancelDrag}
          style={canManageChannels ? { touchAction: "none" } : undefined}
          className={`flex h-7 min-w-0 flex-1 items-center gap-1 rounded-[8px] px-2.5 text-[12.5px] font-semibold tracking-[-0.005em] transition-colors duration-150 ${
            overCatId === cat.id ? "text-brand" : "text-text-muted hover:text-text-normal"
          } ${canManageChannels ? "cursor-grab active:cursor-grabbing" : ""}`}
        >
          <span className="truncate">{cat.name}</span>
          {/* iPadOS sidebar disclosure: a trailing chevron that turns. */}
          <IconChevron
            size={13}
            strokeWidth={2.4}
            className={`ml-auto shrink-0 opacity-0 transition-[transform,opacity] duration-300 ease-spring group-hover/cat:opacity-100 ${open ? "" : "-rotate-90 opacity-100"}`}
          />
        </button>
        {canManageChannels && (
          <button
            type="button"
            onClick={() => startAddChannel(cat.id)}
            aria-label={`Add channel to ${cat.name}`}
            className="tool-btn h-6 w-6 opacity-0 group-hover/cat:opacity-100 focus-visible:opacity-100"
          >
            <IconPlus size={14} strokeWidth={2.2} />
          </button>
        )}
      </div>
    );
  };

  return (
    <aside className="flex min-h-0 min-w-0 flex-1 flex-col">
      {showServerHeader && (
        bannerUrl && safeImageUrl(bannerUrl) ? (
          <div className="relative m-2 mb-0 h-28 shrink-0 overflow-hidden rounded-[14px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={safeImageUrl(bannerUrl)!}
              alt=""
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-black/30 p-0.5 backdrop-blur-md [&_button]:text-white/90">
              {canManageChannels && (
                <button
                  type="button"
                  onClick={() => setAddingCategory((v) => !v)}
                  aria-label="Create category"
                  className="tool-btn h-7 w-7 hover:bg-white/15"
                >
                  <IconPlus size={16} />
                </button>
              )}
              <NotificationBell />
            </div>
            <button
              type="button"
              onClick={onOpenServerSettings}
              className="press absolute inset-x-0 bottom-0 flex min-w-0 items-center gap-1 px-3.5 pb-2.5 pt-6 text-left"
            >
              <span className="truncate text-[18px] font-bold tracking-[-0.02em] text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">{title}</span>
              {verified && (
                <Tooltip label="This space is officially verified by Disband">
                  <IconVerified size={16} className="shrink-0 text-white" />
                </Tooltip>
              )}
              <IconChevron size={16} strokeWidth={2.4} className="shrink-0 text-white/75" />
            </button>
          </div>
        ) : (
        <div className="flex h-[56px] shrink-0 items-center gap-1 px-2.5 pt-1">
          <button
            type="button"
            onClick={onOpenServerSettings}
            className="press flex min-w-0 flex-1 items-center gap-1 rounded-[10px] px-1.5 py-1.5 text-left transition-colors hover:bg-interactive-hover"
          >
            <span className="truncate text-[18px] font-bold tracking-[-0.02em] text-text-normal">{title}</span>
            {verified && (
              <Tooltip label="This space is officially verified by Disband">
                <IconVerified size={16} className="shrink-0 text-sys-blue" />
              </Tooltip>
            )}
            <IconChevron size={16} strokeWidth={2.4} className="shrink-0 text-text-muted" />
          </button>
          {canManageChannels && (
            <button
              type="button"
              onClick={() => setAddingCategory((v) => !v)}
              aria-label="Create category"
              className="tool-btn"
            >
              <IconPlus size={18} />
            </button>
          )}
          <NotificationBell />
        </div>
        )
      )}
      {onOpenCatalysts && (
        <button
          type="button"
          onClick={onOpenCatalysts}
          title="View space Catalysts"
          className="press mx-2.5 mt-2 flex shrink-0 items-center gap-2.5 rounded-[12px] bg-fill-tertiary px-2.5 py-2 text-left transition-colors hover:bg-fill-secondary"
        >
          <span className="icon-tile h-6 w-6 rounded-[6px] bg-gradient-to-b from-[#b986ff] to-[#8a5cf5]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
            </svg>
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text-normal">
            {catalystCount ?? 0} {(catalystCount ?? 0) === 1 ? "Catalyst" : "Catalysts"}
          </span>
          <span className="shrink-0 text-[12.5px] font-semibold text-brand">Boost</span>
        </button>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-1">
        {addingCategory && (
          <div className="popover-pop mx-1 mb-2 mt-1 flex items-center gap-1.5 rounded-[12px] bg-bg-primary p-2 shadow-elev-2 ring-1 ring-glass-border">
            <input
              autoFocus
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitAddCategory();
                if (e.key === "Escape") {
                  setAddingCategory(false);
                  setNewCategoryName("");
                }
              }}
              placeholder="Category name"
              className="field min-h-0 flex-1 px-2.5 py-1.5 text-[13px]"
            />
            <button type="button" onClick={() => void submitAddCategory()} disabled={busy || !newCategoryName.trim()} className="btn btn-filled btn-sm">
              Add
            </button>
            <button type="button" onClick={() => setAddingCategory(false)} aria-label="Cancel" className="tool-btn h-7 w-7">
              <IconClose size={14} />
            </button>
          </div>
        )}

        {sortedCategories.map((cat) => {
          const items = byCategory(cat.id);
          const open = !collapsed[cat.id];
          return (
            <div key={cat.id}>
              {renderCategoryHeader(cat)}
              {open && items.map((ch) => renderChannel(ch))}
              {open && canManageChannels && addChannelTarget?.categoryId === cat.id && renderAddChannelComposer()}
            </div>
          );
        })}

        {(uncategorized.length > 0 || canManageChannels) && (
          <div>
            <div className="group/cat relative mt-3 flex items-center">
              {overCatId === "uncategorized" && <div className="absolute inset-x-2 -top-px h-0.5 rounded-full bg-brand" />}
              <button
                type="button"
                data-drop-uncategorized="true"
                aria-expanded={!collapsed[UNCATEGORIZED_KEY]}
                onClick={() => toggleCollapsed(UNCATEGORIZED_KEY)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className={`flex h-7 min-w-0 flex-1 items-center gap-1 rounded-[8px] px-2.5 text-[12.5px] font-semibold transition-colors duration-150 ${
                  overCatId === "uncategorized" ? "text-brand" : "text-text-muted hover:text-text-normal"
                }`}
              >
                <span className="truncate">Other</span>
                <IconChevron
                  size={13}
                  strokeWidth={2.4}
                  className={`ml-auto shrink-0 opacity-0 transition-[transform,opacity] duration-300 ease-spring group-hover/cat:opacity-100 ${
                    collapsed[UNCATEGORIZED_KEY] ? "-rotate-90 opacity-100" : ""
                  }`}
                />
              </button>
              {canManageChannels && (
                <button
                  type="button"
                  onClick={() => startAddChannel(null)}
                  aria-label="Add uncategorized channel"
                  className="tool-btn h-6 w-6 opacity-0 group-hover/cat:opacity-100 focus-visible:opacity-100"
                >
                  <IconPlus size={14} strokeWidth={2.2} />
                </button>
              )}
            </div>
            {!collapsed[UNCATEGORIZED_KEY] && uncategorized.map((ch) => renderChannel(ch))}
            {!collapsed[UNCATEGORIZED_KEY]
              && canManageChannels
              && addChannelTarget !== null
              && addChannelTarget.categoryId === null
              && renderAddChannelComposer()}
          </div>
        )}
      </div>

      {dragGhost && (
        <div
          aria-hidden
          className="glass-thick pointer-events-none fixed z-50 flex translate-x-2 translate-y-2 scale-105 items-center gap-1.5 whitespace-nowrap rounded-[10px] px-3 py-1.5 text-[13.5px] font-semibold text-text-normal"
          style={{ left: dragGhost.x, top: dragGhost.y }}
        >
          {dragGhost.kind === "category" ? (
            <IconChevron size={12} className="-rotate-90 shrink-0 text-text-muted" />
          ) : (
            <IconHash size={14} className="shrink-0 text-text-muted" />
          )}
          <span className="max-w-[180px] truncate">{dragGhost.label}</span>
        </div>
      )}

      <CallIndicator />
    </aside>
  );
}
