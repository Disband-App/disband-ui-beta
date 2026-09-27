"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { BotTag } from "@/components/ui/BotTag";
import { PlatformBadge } from "@/components/ui/PlatformBadge";
import { displayName } from "@/lib/utils";
import { roleGradientTextStyle, roleIsGradientAnimated } from "@/lib/profileColor";
import { useApp } from "@/contexts/AppContext";
import { IconCrown, IconShield } from "@/components/icons";
import { Tooltip } from "./Tooltip";
import type { Profile, ServerMember, ServerRole, UserStatus } from "@/lib/supabase/types";

interface MemberListProps {
  members: (ServerMember & { profile: Profile })[];
  roles: ServerRole[];
  onMemberClick?: (member: ServerMember & { profile: Profile }) => void;
  onMemberContext?: (member: ServerMember & { profile: Profile }, x: number, y: number) => void;
}

type Member = ServerMember & { profile: Profile };

const STATUS_BG: Record<UserStatus, string> = {
  online: "bg-status-online",
  idle: "bg-status-idle",
  dnd: "bg-status-dnd",
  offline: "bg-status-offline",
};

const ROW_H = 44;
const HEADER_H = 36;

const OVERSCAN_PX = 600;

type Item =
  | { kind: "header"; key: string; label: string; count: number }
  | { kind: "member"; key: string; member: Member };

function memberRoleIds(member: ServerMember): string[] {
  if (member.role_ids && member.role_ids.length > 0) return member.role_ids;
  return member.role_id ? [member.role_id] : [];
}

function topRole(member: ServerMember, roles: ServerRole[]): ServerRole | null {
  let best: ServerRole | null = null;
  for (const id of memberRoleIds(member)) {
    const r = roles.find((x) => x.id === id);
    if (r && (!best || r.position > best.position)) best = r;
  }
  return best;
}

function roleLabel(member: ServerMember, roles: ServerRole[]): string {
  if (member.role === "owner") return "Owner";
  return topRole(member, roles)?.name ?? member.role;
}

function roleColor(member: ServerMember, roles: ServerRole[]): string | null {
  return topRole(member, roles)?.color ?? null;
}

export function MemberList({ members, roles, onMemberClick, onMemberContext }: MemberListProps) {
  const { presenceMap, serverTimeouts } = useApp();

  const timedOutIds = useMemo(() => {
    const now = Date.now();
    return new Set(
      serverTimeouts.filter((t) => Date.parse(t.expires_at) > now).map((t) => t.user_id),
    );
  }, [serverTimeouts]);

  const liveStatus = useCallback(
    (p: Profile): UserStatus => presenceMap.get(p.id) ?? "offline",
    [presenceMap],
  );

  const items = useMemo<Item[]>(() => {
    const online: Member[] = [];
    const offline: Member[] = [];
    for (const m of members) {
      (liveStatus(m.profile) === "offline" ? offline : online).push(m);
    }

    const grouped = new Map<string, Member[]>();
    for (const m of online) {
      const key = roleLabel(m, roles);
      const list = grouped.get(key);
      if (list) list.push(m);
      else grouped.set(key, [m]);
    }

    const groupPriority = (label: string): number => {
      if (label === "Owner") return Number.MAX_SAFE_INTEGER;
      if (label === "Admin") return Number.MAX_SAFE_INTEGER - 1;
      const best = grouped
        .get(label)
        ?.reduce((max: number, m) => Math.max(max, topRole(m, roles)?.position ?? -1), -1);
      return best ?? -1;
    };

    const out: Item[] = [];
    for (const label of [...grouped.keys()].sort((a, b) => groupPriority(b) - groupPriority(a))) {
      const list = grouped.get(label)!;
      out.push({ kind: "header", key: `h:${label}`, label, count: list.length });
      for (const m of list) out.push({ kind: "member", key: m.user_id, member: m });
    }
    if (offline.length > 0) {
      out.push({ kind: "header", key: "h:offline", label: "Offline", count: offline.length });
      for (const m of offline) out.push({ kind: "member", key: m.user_id, member: m });
    }
    return out;
  }, [members, roles, liveStatus]);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(700);
  const [rowH, setRowH] = useState(ROW_H);
  const [headerH, setHeaderH] = useState(HEADER_H);

  const { offsets, total } = useMemo(() => {
    const offs = new Array<number>(items.length + 1);
    let y = 0;
    for (let i = 0; i < items.length; i++) {
      offs[i] = y;
      y += items[i].kind === "header" ? headerH : rowH;
    }
    offs[items.length] = y;
    return { offsets: offs, total: y };
  }, [items, rowH, headerH]);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (el) setScrollTop(el.scrollTop);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const measure = () => setViewport(el.clientHeight || window.innerHeight || 700);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const row = el.querySelector<HTMLElement>("[data-member-row]");
    const head = el.querySelector<HTMLElement>("[data-member-header]");
    if (row) {
      const h = row.getBoundingClientRect().height;
      if (h > 0 && Math.abs(h - rowH) > 0.5) setRowH(h);
    }
    if (head) {
      const h = head.getBoundingClientRect().height;
      if (h > 0 && Math.abs(h - headerH) > 0.5) setHeaderH(h);
    }
  }, [items.length, rowH, headerH]);

  const top = Math.max(0, scrollTop - OVERSCAN_PX);
  const bottom = scrollTop + viewport + OVERSCAN_PX;

  let first = binarySearch(offsets, top, items.length);
  let last = binarySearch(offsets, bottom, items.length);
  first = Math.max(0, first);
  last = Math.min(items.length, last + 1);

  const visible = items.slice(first, last);
  const padTop = offsets[first] ?? 0;
  const padBottom = Math.max(0, total - (offsets[last] ?? total));

  // An empty server (or one whose members failed to load) used to render a
  // blank rail with no explanation.
  if (members.length === 0) {
    return (
      <aside className="hidden w-[248px] shrink-0 flex-col border-l border-hairline lg:flex">
        <div className="flex h-[58px] shrink-0 items-center px-5">
          <h2 className="text-[15px] font-semibold">Members</h2>
        </div>
        <p className="px-5 py-2 text-[13px] text-text-muted">
          No members to show yet.
        </p>
      </aside>
    );
  }

  return (

    <aside className="hidden w-[248px] shrink-0 flex-col border-l border-hairline lg:flex">
      <div className="flex h-[58px] shrink-0 items-center gap-2 px-5 hairline-b">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Members</h2>
        <span className="pill bg-fill-tertiary text-text-muted">{members.length}</span>
      </div>
    <div
      ref={scrollerRef}
      onScroll={onScroll}
      className="min-h-0 flex-1 overflow-y-auto"
    >
      <div className="px-2.5 pb-4 pt-1">
        <div style={{ height: padTop }} aria-hidden />
        {visible.map((item) =>
          item.kind === "header" ? (
            <h2
              key={item.key}
              data-member-header
              className="section-label flex items-end gap-1.5 px-2.5 pb-1.5 pt-4 text-[11.5px]"
            >
              {item.label}
              <span className="font-normal normal-case tracking-normal opacity-70">{item.count}</span>
            </h2>
          ) : (
            <Row
              key={item.key}
              m={item.member}
              roles={roles}
              live={liveStatus(item.member.profile)}
              timedOut={timedOutIds.has(item.member.user_id)}
              onClick={onMemberClick}
              onContext={onMemberContext}
            />
          ),
        )}
        <div style={{ height: padBottom }} aria-hidden />
      </div>
    </div>
    </aside>
  );
}

function binarySearch(offsets: number[], y: number, count: number): number {
  let lo = 0;
  let hi = count - 1;
  let best = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (offsets[mid] <= y) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

function Row({
  m, roles, live, timedOut, onClick, onContext,
}: {
  m: Member;
  roles: ServerRole[];
  live: UserStatus;
  timedOut: boolean;
  onClick?: (m: Member) => void;
  onContext?: (m: Member, x: number, y: number) => void;
}) {
  const p = m.profile;
  const color = roleColor(m, roles);
  const gradRole = topRole(m, roles);
  const gradStyle = roleGradientTextStyle(gradRole);
  return (
    <button
      type="button"
      data-member-row
      onClick={() => onClick?.(m)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContext?.(m, e.clientX, e.clientY);
      }}
      className="nav-row gap-2.5 px-2.5 py-[5px]"
    >
      <div className="relative shrink-0">
        <Avatar profile={p} size="sm" />
        {live !== "offline" && (
          <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[2.5px] border-bg-primary ${STATUS_BG[live]}`} />
        )}
      </div>
      <span
        className={`flex min-w-0 flex-1 items-center gap-1.5 truncate text-[14px] font-medium ${live === "offline" ? "text-text-muted opacity-70" : "text-text-normal"}`}
        style={color ? { color } : undefined}
      >
        <span className={`truncate ${gradStyle && roleIsGradientAnimated(gradRole) ? "animate-role-gradient" : ""}`} style={gradStyle ?? undefined}>{displayName(p)}</span>
        <BotTag profile={p} size="sm" />
        <PlatformBadge userId={p.id} />
        {m.role === "owner" && (
          <Tooltip label="Owner" side="top" as="span">
            <IconCrown size={13} className="shrink-0 text-sys-yellow" />
          </Tooltip>
        )}
        {m.role === "admin" && (
          <Tooltip label="Admin" side="top" as="span">
            <IconShield size={13} className="shrink-0 text-sys-blue" />
          </Tooltip>
        )}
        {timedOut && (
          <Tooltip label="Timed out" side="top" as="span">
            <span className="pill shrink-0 bg-status-dnd/15 px-1.5 py-0 text-[10px] text-status-dnd">
              Muted
            </span>
          </Tooltip>
        )}
      </span>
    </button>
  );
}
