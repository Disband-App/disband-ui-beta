"use client";

import { useOverlayDismiss } from "@/hooks/useOverlayDismiss";
import { OVERLAY_Z } from "@/lib/overlay";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { type ReactionSummary } from "@/lib/messages";
import { twemojiUrl } from "@/components/ui/Twemoji";
import { searchEmojis } from "@/lib/emoji-shortcodes";
import { EMOJI_CATEGORIES } from "@/lib/emoji";
import { Avatar } from "@/components/ui/Avatar";
import { useProfiles } from "@/lib/profile-store";
import { displayName } from "@/lib/utils";
import { SheetCloseButton } from "@/components/ui/Sheet";

interface MessageReactionsProps {
  reactions: ReactionSummary[];
  onToggle: (emoji: string) => void;
  onOpenPicker?: () => void;
}

function EmojiImg({ emoji, size = "1.375em" }: { emoji: string; size?: string }) {
  return (
    <img
      src={twemojiUrl(emoji)}
      alt={emoji}
      className="twemoji"
      draggable={false}
      style={{ height: size, width: size }}
    />
  );
}

const NAMES_IN_PREVIEW = 3;

function reactorSentence(names: string[], total: number): string {
  const rest = total - names.length;
  if (names.length === 0) return total === 1 ? "1 person" : `${total} people`;
  if (rest > 0) return `${names.join(", ")} and ${rest} ${rest === 1 ? "other" : "others"}`;
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function ReactionHoverCard({
  summary, anchorEl, onOpenList, onEnter, onLeave,
}: {
  summary: ReactionSummary;
  anchorEl: HTMLElement;
  onOpenList: () => void;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const preview = summary.userIds.slice(0, NAMES_IN_PREVIEW);
  const profiles = useProfiles(preview);
  const names = preview.map((id) => {
    const p = profiles.get(id);
    return p ? displayName(p) : "Someone";
  });

  // Track the anchor element (not a one-time rect snapshot): chat scrolls
  // and resizes under the card, and a stale rect leaves it floating detached.
  // Flips below the pill when there is no room above; clamped horizontally.
  const measure = () => {
    const rect = anchorEl.getBoundingClientRect();
    const HALF_W = 170;
    const ABOVE_H = 96;
    const left = Math.min(Math.max(rect.left + rect.width / 2, HALF_W + 8), window.innerWidth - HALF_W - 8);
    const below = rect.top < ABOVE_H + 8;
    return { left, top: below ? rect.bottom + 8 : rect.top - 8, below };
  };
  const [pos, setPos] = useState(measure);

  useLayoutEffect(() => {
    setPos(measure());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorEl]);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setPos(measure()));
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorEl]);

  return createPortal(
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={`fixed w-max max-w-xs -translate-x-1/2 ${pos.below ? "pt-2" : "-translate-y-full pb-2"}`}
      style={{ left: pos.left, top: pos.top, zIndex: OVERLAY_Z.tooltip }}
    >
      <button
        type="button"
        onClick={onOpenList}
        className="glass-thick popover-pop flex w-full items-center gap-2.5 rounded-[14px] px-3 py-2 text-left transition-colors hover:bg-interactive-hover"
      >
        <EmojiImg emoji={summary.emoji} size="1.75em" />
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold text-text-normal">
            {reactorSentence(names, summary.count)}
          </span>
          <span className="block text-[11px] text-text-muted">
            reacted with {summary.emoji} · click to see all
          </span>
        </span>
      </button>
    </div>,
    document.body,
  );
}

function ReactionListDialog({
  reactions, initialEmoji, onClose,
}: {
  reactions: ReactionSummary[];
  initialEmoji: string;
  onClose: () => void;
}) {
  const [active, setActive] = useState(initialEmoji);
  const current = reactions.find((r) => r.emoji === active) ?? reactions[0];
  const profiles = useProfiles(current?.userIds ?? []);

  // Always open when rendered; stack-routed Escape + scroll lock + focus back.
  useOverlayDismiss(onClose);

  if (!current) return null;

  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-overlay-scrim overlay-fade"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Reactions"
        className="modal-pop relative flex max-h-[70vh] w-full max-w-sm overflow-hidden rounded-[22px] bg-overlay-panel shadow-elev-4 ring-1 ring-glass-border"
      >
        {}
        <div className="flex w-[96px] shrink-0 flex-col gap-1 overflow-y-auto bg-fill-tertiary p-2">
          {reactions.map((r) => (
            <button
              key={r.emoji}
              type="button"
              onClick={() => setActive(r.emoji)}
              className={`flex items-center gap-2 rounded-[10px] px-2 py-1.5 text-sm transition-colors ${
                r.emoji === active
                  ? "bg-bg-elevated text-text-normal shadow-elev-1"
                  : "text-text-muted hover:bg-interactive-hover"
              }`}
            >
              <EmojiImg emoji={r.emoji} size="1.35em" />
              <span className="font-semibold tabular-nums">{r.count}</span>
            </button>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
            <p className="text-[15px] font-semibold text-text-normal">
              {current.count} {current.count === 1 ? "Reaction" : "Reactions"}
            </p>
            <SheetCloseButton onClick={onClose} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {current.userIds.map((id) => {
              const p = profiles.get(id);
              return (
                <div key={id} className="flex items-center gap-2.5 rounded-[10px] px-2 py-1.5">
                  {p
                    ? <Avatar profile={p} size="sm" />
                    : <span className="h-8 w-8 shrink-0 rounded-full bg-bg-accent" />}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-text-normal">
                      {p ? displayName(p) : "Unknown user"}
                    </span>
                    {p?.username && (
                      <span className="block truncate text-xs text-text-muted">@{p.username}</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function MessageReactions({ reactions, onToggle, onOpenPicker }: MessageReactionsProps) {
  const [hovered, setHovered] = useState<{ emoji: string; el: HTMLElement } | null>(null);
  const [listFor, setListFor] = useState<string | null>(null);

  const closeTimer = useRef<number | null>(null);

  const hoveredSummary = useMemo(
    () => (hovered ? reactions.find((r) => r.emoji === hovered.emoji) ?? null : null),
    [hovered, reactions],
  );

  useEffect(() => () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }, []);

  const keepOpen = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const scheduleClose = () => {
    keepOpen();
    closeTimer.current = window.setTimeout(() => setHovered(null), 120);
  };

  if (reactions.length === 0 && !onOpenPicker) return null;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1 [[data-own=true]_&]:justify-end">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => onToggle(r.emoji)}
          onMouseEnter={(e) => {
            keepOpen();
            setHovered({ emoji: r.emoji, el: e.currentTarget });
          }}
          onMouseLeave={scheduleClose}
          className={`inline-flex h-[26px] items-center gap-1 rounded-full px-2 text-[12.5px] transition-[transform,background-color] duration-300 ease-spring active:scale-90 ${
            r.reacted
              ? "bg-brand/18 text-brand ring-1 ring-brand/40"
              : "bg-fill-tertiary text-text-muted hover:bg-fill-secondary"
          }`}
        >
          <EmojiImg emoji={r.emoji} />
          <span className="font-rounded font-semibold tabular-nums">{r.count}</span>
        </button>
      ))}
      {onOpenPicker && (
        <button
          type="button"
          onClick={onOpenPicker}
          className="inline-flex h-[26px] w-[30px] items-center justify-center rounded-full bg-fill-tertiary text-base text-text-muted hover:bg-fill-secondary hover:text-text-normal"
          aria-label="Add reaction"
        >
          +
        </button>
      )}

      {hovered && hoveredSummary && !listFor && (
        <ReactionHoverCard
          summary={hoveredSummary}
          anchorEl={hovered.el}
          onEnter={keepOpen}
          onLeave={scheduleClose}
          onOpenList={() => { setListFor(hoveredSummary.emoji); setHovered(null); }}
        />
      )}

      {listFor && (
        <ReactionListDialog
          reactions={reactions}
          initialEmoji={listFor}
          onClose={() => setListFor(null)}
        />
      )}
    </div>
  );
}

export function ReactionPicker({
  open,
  onSelect,
  onClose,
}: {
  open: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const searched = useMemo(() => (q ? searchEmojis(q, 60) : []), [q]);

  // Stack-routed Escape + scroll lock + focus back (was: no Escape handling).
  useOverlayDismiss(onClose, open);

  if (!open) return null;

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    onClose();
  };

  return (
    <>
      <button type="button" className="overlay-fade fixed inset-0 z-40 cursor-default bg-overlay-scrim" aria-label="Close" onClick={onClose} />

      <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div role="dialog" aria-modal="true" aria-label="Pick a reaction" className="modal-pop pointer-events-auto w-full max-w-md overflow-hidden rounded-t-[22px] bg-overlay-panel shadow-elev-4 ring-1 ring-glass-border sm:rounded-[22px]">
        <div className="px-3 pb-2 pt-3">
          <label className="search-field h-9">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="shrink-0"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search emoji"
              autoFocus
            />
          </label>
        </div>

        <div className="max-h-72 overflow-y-auto p-3">
          {q ? (
            <div className="grid grid-cols-10 gap-1">
              {searched.map(({ emoji, shortcode }) => (
                <button
                  key={emoji + shortcode}
                  type="button"
                  onClick={() => handleSelect(emoji)}
                  title={shortcode}
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] transition-transform duration-300 ease-spring hover:scale-125 hover:bg-interactive-hover"
                >
                  <EmojiImg emoji={emoji} size="1.3em" />
                </button>
              ))}
              {searched.length === 0 && (
                <p className="col-span-10 py-8 text-center text-xs text-text-muted">No emoji found</p>
              )}
            </div>
          ) : (
            EMOJI_CATEGORIES.map((cat) => (
              <div key={cat.name} className="mb-3 last:mb-0">
                <p className="section-label mb-1.5 px-1 text-[11px]">{cat.name}</p>
                <div className="grid grid-cols-10 gap-1">
                  {cat.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleSelect(emoji)}
                      title={emoji}
                      className="flex h-9 w-9 items-center justify-center rounded-[10px] transition-transform duration-300 ease-spring hover:scale-125 hover:bg-interactive-hover"
                    >
                      <EmojiImg emoji={emoji} size="1.3em" />
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      </div>
    </>
  );
}
