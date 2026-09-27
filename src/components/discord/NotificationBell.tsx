"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "@/contexts/AppContext";
import { IconBell } from "@/components/icons";
import type { AppNotification } from "@/lib/supabase/types";

function timeAgo(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return "now";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationBell() {
  const {
    notifications,
    markNotificationsSeen,
    markNotificationRead,
    markNotificationsRead,
    routeToNotification,
  } = useApp();
  const [open, setOpen] = useState(false);
  const [navError, setNavError] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  const unseen = notifications.filter((n) => !n.seen_at).length;

  const toggle = useCallback(() => {
    // Side effect lives in the handler, not the updater: calling another
    // component's setState inside a setOpen updater runs during render and
    // throws ("Cannot update a component while rendering"). It would also
    // double-fire under StrictMode's double-invoked updaters.
    if (!open) {
      setNavError(null);
      void markNotificationsSeen();
    }
    setOpen(!open);
  }, [markNotificationsSeen, open]);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;

      const right = Math.max(8, window.innerWidth - r.right);
      setPos({ top: r.bottom + 8, right });
    };
    place();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open ]);

  const handleItemClick = useCallback(async (n: AppNotification) => {
    setNavError(null);
    if (!n.read) void markNotificationRead(n.id);
    // Stay open with an explanation when the target is gone (deleted,
    // revoked, stale link) instead of dropping the user on a blank pane.
    // The notification timestamp goes along so the chat can land on the
    // ping itself rather than just the channel bottom.
    const ok = await routeToNotification(n.link, n.created_at);
    if (!ok) {
      setNavError("Couldn’t open that conversation. It may have been deleted.");
      return;
    }
    setOpen(false);
  }, [markNotificationRead, routeToNotification]);

  const drawer =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Notifications"
            className="glass-thick popover-pop fixed z-[120] flex max-h-[min(70vh,560px)] w-[min(22rem,calc(100vw-16px))] flex-col overflow-hidden rounded-[18px]"
            style={{ top: pos.top, right: pos.right, ["--popover-origin" as string]: "top right" }}
          >
            <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-3.5">
              <p className="title-2 text-[19px]">Notifications</p>
              {notifications.some((n) => !n.read) && (
                <button
                  type="button"
                  onClick={() => void markNotificationsRead()}
                  className="btn btn-plain btn-sm -mr-2"
                >
                  Mark all read
                </button>
              )}
            </div>
            {navError && (
              <p role="alert" className="mx-3 mb-2 rounded-[10px] bg-status-dnd/12 px-3 py-2 text-[12.5px] text-status-dnd">
                {navError}
              </p>
            )}
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center px-6 pb-8 pt-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-fill-tertiary text-text-muted">
                  <IconBell size={22} />
                </span>
                <p className="mt-3 text-[14px] font-semibold text-text-normal">You&rsquo;re all caught up</p>
                <p className="mt-1 text-[13px] text-text-muted">Mentions and replies will show up here.</p>
              </div>
            ) : (
              <ul className="stagger min-h-0 flex-1 overflow-y-auto px-2 pb-2">
                {notifications.map((n, i) => (
                  <li key={n.id} style={{ ["--i" as string]: Math.min(i, 8) }}>
                    <button
                      type="button"
                      onClick={() => void handleItemClick(n)}
                      className={`flex w-full items-start gap-3 rounded-[12px] px-2.5 py-2.5 text-left transition-colors hover:bg-interactive-hover ${
                        n.read ? "opacity-65" : ""
                      }`}
                    >
                      <span
                        className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${
                          n.read ? "bg-transparent" : "bg-brand"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className="line-clamp-2 min-w-0 flex-1 text-[13.5px] font-semibold leading-snug text-text-normal">
                            {n.title}
                          </span>
                          <span className="shrink-0 text-[11.5px] text-text-muted">{timeAgo(n.created_at)}</span>
                        </span>
                        {n.body && (
                          <span className="mt-0.5 block line-clamp-3 text-[13px] leading-snug text-text-muted">
                            {n.body}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        title="Notifications"
        aria-label={unseen > 0 ? `${unseen} unread notifications` : "Notifications"}
        aria-expanded={open}
        data-active={open ? "true" : undefined}
        className="tool-btn relative"
      >
        <IconBell size={18} />
        {unseen > 0 && (
          <span key={unseen} className="count-badge badge-pop absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[10px]">
            {unseen > 9 ? "9+" : unseen}
          </span>
        )}
      </button>
      {drawer}
    </>
  );
}
