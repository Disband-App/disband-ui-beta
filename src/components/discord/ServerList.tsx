"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Tooltip } from "./Tooltip";
import { IconVerified, IconPlus, IconCompass, IconChevron, IconMessage } from "@/components/icons";
import { displayName, serverInitials } from "@/lib/utils";
import { safeImageUrl } from "@/lib/safe-url";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Profile, Server, ServerFolder, ServerListState, ViewMode } from "@/lib/supabase/types";

export interface DmRailUnread {
  threadId: string;
  friend: Profile;
  count: number;
}

export interface RailSlot {
  server_id: string;
  position: number;
  folder_id: string | null;
}

export interface RailLayout {
  top: Server[];
  folders: { folder: ServerFolder; servers: Server[] }[];
}

export function computeRailLayout(servers: Server[], folders: ServerFolder[], listState: ServerListState[]): RailLayout {
  const stateByServer = new Map(listState.map((s) => [s.server_id, s]));
  const liveFolderIds = new Set(folders.map((f) => f.id));
  const posOf = (s: Server) => stateByServer.get(s.id)?.position ?? Number.MAX_SAFE_INTEGER;
  const byPos = (a: Server, b: Server) => posOf(a) - posOf(b) || (a.created_at < b.created_at ? -1 : 1);
  const top = servers
    .filter((s) => {
      const st = stateByServer.get(s.id);
      return !st || !st.folder_id || !liveFolderIds.has(st.folder_id);
    })
    .sort(byPos);
  const sortedFolders = [...folders].sort((a, b) => a.position - b.position);
  return {
    top,
    folders: sortedFolders.map((folder) => ({
      folder,
      servers: servers
        .filter((s) => stateByServer.get(s.id)?.folder_id === folder.id)
        .sort(byPos),
    })),
  };
}

type DropTarget =
  | { kind: "space"; id: string; before: boolean }
  | { kind: "folder"; id: string }
  | { kind: "top-end" }
  | { kind: "folder-end"; id: string };

export function resolveServerDrop(
  layout: RailLayout,
  dragId: string,
  target: DropTarget,
): RailSlot[] {
  const topIds = layout.top.map((s) => s.id);
  const folderMembers = new Map(layout.folders.map((f) => [f.folder.id, f.servers.map((s) => s.id)]));
  const sourceFolder = layout.folders.find((f) => f.servers.some((s) => s.id === dragId))?.folder.id ?? null;
  const removeFrom = (ids: string[]) => ids.filter((id) => id !== dragId);

  let destFolder: string | null = null;
  let destIds: string[];
  if (target.kind === "space") {
    destFolder = layout.folders.find((f) => f.servers.some((s) => s.id === target.id))?.folder.id ?? null;
    destIds = removeFrom(destFolder ? (folderMembers.get(destFolder) ?? []) : [...topIds]);
    const idx = destIds.indexOf(target.id);
    destIds.splice(idx < 0 ? destIds.length : target.before ? idx : idx + 1, 0, dragId);
  } else if (target.kind === "folder" || target.kind === "folder-end") {
    destFolder = target.id;
    destIds = removeFrom([...(folderMembers.get(target.id) ?? [])]);
    destIds.push(dragId);
  } else {
    destIds = removeFrom([...topIds]);
    destIds.push(dragId);
  }

  const slots: RailSlot[] = [];
  const reindex = (ids: string[], folderId: string | null) => {
    ids.forEach((id, i) => slots.push({ server_id: id, position: i, folder_id: folderId }));
  };
  reindex(destIds, destFolder);
  if (sourceFolder !== destFolder) {
    const srcIds = removeFrom(sourceFolder ? [...(folderMembers.get(sourceFolder) ?? [])] : [...topIds]);
    reindex(srcIds, sourceFolder);
  } else if (target.kind === "space") {
    // same-list reorder already covered by destIds
  }
  return slots;
}

export function resolveFolderDrop(folders: ServerFolder[], dragId: string, targetId: string | null, before: boolean): string[] {
  const ids = [...folders].sort((a, b) => a.position - b.position).map((f) => f.id).filter((id) => id !== dragId);
  if (!targetId) {
    ids.push(dragId);
    return ids;
  }
  const idx = ids.indexOf(targetId);
  ids.splice(idx < 0 ? ids.length : before ? idx : idx + 1, 0, dragId);
  return ids;
}

interface ServerListProps {
  servers: Server[];
  activeServerId: string | null;
  viewMode: ViewMode;
  dmUnreads: DmRailUnread[];
  activeDmThreadId: string | null;
  serverUnreadIds: string[];
  folders: ServerFolder[];
  listState: ServerListState[];
  onSelectHome: () => void;
  onSelectServer: (id: string) => void;
  onSelectDmThread: (threadId: string) => void;
  onCreateServer: () => void;
  onDiscover: () => void;
  onServerContext: (server: Server, x: number, y: number) => void;
  onFolderContext: (folder: ServerFolder, x: number, y: number) => void;
  onReorderServers: (slots: RailSlot[]) => void;
  onReorderFolders: (orderedIds: string[]) => void;
}

function UnreadCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span key={count} className="count-badge badge-pop absolute -right-1 -top-1 ring-[2.5px] ring-canvas">
      {label}
    </span>
  );
}

/// The capsule at the rail's leading edge: tall for the current space, a dot
/// for unread, a short bar on hover. Height is what springs, so moving
/// between states reads as one object stretching rather than a swap.
function RailIndicator({ state }: { state: "active" | "unread" | "none" }) {
  return (
    <span
      aria-hidden
      className={`absolute -left-[10px] top-1/2 w-[4px] -translate-y-1/2 rounded-full bg-text-normal transition-[height,opacity] duration-500 ease-spring ${
        state === "active"
          ? "h-7 opacity-100"
          : state === "unread"
            ? "h-[7px] opacity-100"
            : "h-[7px] opacity-0 group-hover:h-4 group-hover:opacity-60"
      }`}
    />
  );
}

/// Shows where a dragged server will land, sitting in the gap between two
/// rail items. It is absolutely positioned on purpose: a border on the row
/// would resize that row mid-drag, so every icon below it would shift by 2px
/// each time the target changed.
function DropIndicator({ edge }: { edge: "before" | "after" }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute left-1/2 z-10 h-[3px] w-10 -translate-x-1/2 rounded-full bg-brand ${
        edge === "before" ? "-top-[6px]" : "-bottom-[6px]"
      }`}
    />
  );
}

/** A space's icon: its image, or its initials on a tinted squircle. */
function SpaceTile({ server, size = 44, className = "" }: { server: Server; size?: number; className?: string }) {
  const src = safeImageUrl(server.icon_url);
  const radius = Math.round(size * 0.27);
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        draggable={false}
        className={`squircle shrink-0 object-cover ${className}`}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }
  return (
    <span
      className={`squircle flex shrink-0 items-center justify-center font-rounded font-semibold text-white ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        fontSize: Math.max(8, Math.round(size * 0.34)),
        background: spaceTint(server.id),
      }}
    >
      {serverInitials(server.name)}
    </span>
  );
}

// Initial-only spaces get one of a few quiet system tints, picked from the
// id so a space keeps its colour everywhere it appears.
const SPACE_TINTS = [
  "linear-gradient(180deg, #5e9cff 0%, #2f6fe0 100%)",
  "linear-gradient(180deg, #7d7aff 0%, #5451d6 100%)",
  "linear-gradient(180deg, #ff7a93 0%, #e2455f 100%)",
  "linear-gradient(180deg, #ffb147 0%, #f08a0b 100%)",
  "linear-gradient(180deg, #4fd88b 0%, #22a95b 100%)",
  "linear-gradient(180deg, #4fd0e6 0%, #1f9fb8 100%)",
  "linear-gradient(180deg, #c07cff 0%, #9a4fe0 100%)",
  "linear-gradient(180deg, #9a9aa3 0%, #6f6f78 100%)",
];

export function spaceTint(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return SPACE_TINTS[h % SPACE_TINTS.length]!;
}

export { SpaceTile };

// Hover member counts, cached per server id for the session. A request in
// flight is marked with PENDING_COUNTS so rapid re-hovers share it.
type ServerCounts = { total: number; online: number };
const PENDING_COUNTS = { total: -1, online: -1 };
const serverCountCache = new Map<string, ServerCounts>();

function ServerButton({
  server,
  active,
  hasUnread,
  draggable,
  dropBefore,
  dropAfter,
  onSelect,
  onContext,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  server: Server;
  active: boolean;
  hasUnread: boolean;
  draggable: boolean;
  dropBefore: boolean;
  dropAfter: boolean;
  onSelect: () => void;
  onContext: (x: number, y: number) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  // Member counts are fetched lazily on first hover (one cheap RPC, cached
  // per server) so the rail never pays for servers you only glance past.
  const [counts, setCounts] = useState<{ total: number; online: number } | null>(() => {
    const cached = serverCountCache.get(server.id);
    return cached && cached !== PENDING_COUNTS ? cached : null;
  });
  const ensureCounts = () => {
    if (serverCountCache.has(server.id)) {
      const cached = serverCountCache.get(server.id);
      if (cached && cached !== PENDING_COUNTS) setCounts(cached);
      return;
    }
    // Sentinel so concurrent hovers share one request; cleared on failure.
    serverCountCache.set(server.id, PENDING_COUNTS);
    void getSupabaseClient()
      .rpc("get_server_member_counts", { p_server_id: server.id })
      .maybeSingle()
      .then(
        ({ data }) => {
          const row = data as { total?: number | string; online?: number | string } | null;
          if (row && row.total != null) {
            const value = { total: Number(row.total), online: Number(row.online ?? 0) };
            serverCountCache.set(server.id, value);
            setCounts(value);
          } else {
            serverCountCache.delete(server.id);
          }
        },
        () => {
          serverCountCache.delete(server.id);
        },
      );
  };
  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseEnter={ensureCounts}
      className="relative flex w-full justify-center"
    >
      {dropBefore && <DropIndicator edge="before" />}
      {dropAfter && <DropIndicator edge="after" />}
      <Tooltip
        label={
          <span className="flex flex-col items-start gap-0.5">
            <span className="font-semibold">{server.name}</span>
            {counts && (
              <span className="text-[11.5px] font-medium">
                <span className="text-text-muted">{counts.total} member{counts.total === 1 ? "" : "s"}</span>
                <span className="text-text-muted"> · </span>
                <span className="text-status-online">{counts.online} online</span>
              </span>
            )}
          </span>
        }
      >
        <button
          type="button"
          aria-label={server.name}
          aria-current={active ? "true" : undefined}
          onClick={onSelect}
          onContextMenu={(e) => {
            e.preventDefault();
            onContext(e.clientX, e.clientY);
          }}
          draggable={draggable}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          className="group relative flex h-11 w-11 items-center justify-center"
        >
          <RailIndicator state={active ? "active" : hasUnread ? "unread" : "none"} />
          <span
            className={`relative block transition-[transform,box-shadow] duration-500 ease-spring group-hover:scale-[1.06] group-active:scale-95 ${
              active ? "shadow-elev-2" : ""
            }`}
            style={{ borderRadius: 12 }}
          >
            <SpaceTile server={server} />
            {server.verified && (
              <span className="absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-canvas">
                <IconVerified size={14} className="shrink-0 text-sys-blue" />
              </span>
            )}
          </span>
        </button>
      </Tooltip>
    </div>
  );
}

export function ServerList({
  servers,
  activeServerId,
  viewMode,
  dmUnreads,
  activeDmThreadId,
  serverUnreadIds,
  folders,
  listState,
  onSelectHome,
  onSelectServer,
  onSelectDmThread,
  onCreateServer,
  onDiscover,
  onServerContext,
  onFolderContext,
  onReorderServers,
  onReorderFolders,
}: ServerListProps) {
  const homeActive =
    viewMode === "home" || viewMode === "dm" || viewMode === "group" || viewMode === "notes";
  const visibleDmUnreads = dmUnreads.filter(
    (entry) => !(viewMode === "dm" && activeDmThreadId === entry.threadId),
  );
  const serverUnreadSet = new Set(serverUnreadIds);
  const layout = useMemo(() => computeRailLayout(servers, folders, listState), [servers, folders, listState]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!activeServerId) return;
    const holder = layout.folders.find((f) => f.servers.some((s) => s.id === activeServerId));
    if (holder) setExpanded((prev) => new Set(prev).add(holder.folder.id));
  }, [activeServerId, layout]);

  const dragRef = useRef<{ kind: "space" | "folder"; id: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const startServerDrag = (e: React.DragEvent, id: string) => {
    dragRef.current = { kind: "space", id };
    e.dataTransfer.setData("application/x-disband-server", id);
    e.dataTransfer.effectAllowed = "move";
  };
  const startFolderDrag = (e: React.DragEvent, id: string) => {
    dragRef.current = { kind: "folder", id };
    e.dataTransfer.setData("application/x-disband-folder", id);
    e.dataTransfer.effectAllowed = "move";
  };
  const endDrag = () => {
    dragRef.current = null;
    setDropTarget(null);
  };

  const serverDragOver = (e: React.DragEvent, id: string) => {
    if (dragRef.current?.kind !== "space" && !e.dataTransfer.types.includes("application/x-disband-server")) return;
    e.preventDefault();
    // Without this the event keeps bubbling to the list (and to the enclosing
    // folder), whose own handler overwrites the target we just set — so the
    // line showed up at the end of the rail instead of beside this server.
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDropTarget({ kind: "space", id, before: e.clientY < rect.top + rect.height / 2 });
  };
  const dropOnServer = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const dragId = dragRef.current?.kind === "space" ? dragRef.current.id : e.dataTransfer.getData("application/x-disband-server");
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (dragId && dragId !== id) {
      onReorderServers(resolveServerDrop(layout, dragId, { kind: "space", id, before: e.clientY < rect.top + rect.height / 2 }));
    }
    endDrag();
  };
  const dropOnFolder = (e: React.DragEvent, folderId: string, asReorder: boolean, targetId?: string, before?: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragRef.current?.kind === "folder" || e.dataTransfer.types.includes("application/x-disband-folder")) {
      const dragId = dragRef.current?.kind === "folder" ? dragRef.current.id : e.dataTransfer.getData("application/x-disband-folder");
      if (dragId && dragId !== folderId) onReorderFolders(resolveFolderDrop(folders, dragId, targetId ?? folderId, before ?? false));
    } else {
      const dragId = dragRef.current?.kind === "space" ? dragRef.current.id : e.dataTransfer.getData("application/x-disband-server");
      if (dragId) {
        onReorderServers(resolveServerDrop(layout, dragId, asReorder && targetId ? { kind: "space", id: targetId, before: before ?? false } : { kind: "folder", id: folderId }));
        setExpanded((prev) => new Set(prev).add(folderId));
      }
    }
    endDrag();
  };

  const renderServerButton = (server: Server) => {
    const active = activeServerId === server.id && viewMode === "space";
    const hasUnread = serverUnreadSet.has(server.id) && !active;
    const dt = dropTarget;
    return (
      <ServerButton
        key={server.id}
        server={server}
        active={active}
        hasUnread={hasUnread}
        draggable
        dropBefore={dt?.kind === "space" && dt.id === server.id && dt.before}
        dropAfter={dt?.kind === "space" && dt.id === server.id && !dt.before}
        onSelect={() => onSelectServer(server.id)}
        onContext={(x, y) => onServerContext(server, x, y)}
        onDragStart={(e) => startServerDrag(e, server.id)}
        onDragOver={(e) => serverDragOver(e, server.id)}
        onDrop={(e) => dropOnServer(e, server.id)}
        onDragEnd={endDrag}
      />
    );
  };

  return (
    <nav
      aria-label="Spaces"
      // Top-aligned on purpose. Centring the stack (whether with `m-auto` or
      // `justify-content: center`) leaves a gap above the home button whenever
      // the rail is shorter than the window, and pushes the first servers out
      // of reach above the scroll origin once it is taller.
      className="no-scrollbar flex w-[68px] shrink-0 flex-col items-center overflow-y-auto py-2"
    >
      <div className="flex w-full flex-col items-center gap-2.5">
      <Tooltip label="Messages">
        <button
          type="button"
          aria-label="Messages"
          aria-current={homeActive ? "true" : undefined}
          onClick={onSelectHome}
          className="group relative flex h-11 w-11 items-center justify-center"
        >
          <RailIndicator state={homeActive ? "active" : "none"} />
          <span
            className={`squircle flex h-11 w-11 items-center justify-center rounded-[12px] transition-[transform,background-color,color] duration-500 ease-spring group-hover:scale-[1.06] group-active:scale-95 ${
              homeActive ? "bg-brand text-brand-foreground shadow-elev-2" : "bg-fill-secondary text-text-normal"
            }`}
          >
            <IconMessage size={21} strokeWidth={2} />
          </span>
        </button>
      </Tooltip>

      {visibleDmUnreads.length > 0 && (
        <div className="flex w-full flex-col items-center gap-2.5">
          {visibleDmUnreads.map((entry) => {
            const active = viewMode === "dm" && activeDmThreadId === entry.threadId;
            return (
              <Tooltip key={entry.threadId} label={`${displayName(entry.friend)} — ${entry.count} new`}>
                <button
                  type="button"
                  aria-label={`${entry.count} unread messages from ${displayName(entry.friend)}`}
                  onClick={() => onSelectDmThread(entry.threadId)}
                  className="avatar-pop group relative flex h-11 w-11 items-center justify-center"
                >
                  <RailIndicator state={active ? "active" : "unread"} />
                  <span className="relative transition-transform duration-500 ease-spring group-hover:scale-[1.06] group-active:scale-95">
                    <Avatar profile={entry.friend} size="md" className="h-11 w-11" />
                    <UnreadCountBadge count={entry.count} />
                  </span>
                </button>
              </Tooltip>
            );
          })}
        </div>
      )}

      <div className="h-px w-7 shrink-0 rounded-full bg-divider" />

      <div
        className="flex w-full flex-col items-center gap-2.5"
        onDragOver={(e) => {
          if (!dragRef.current) return;
          e.preventDefault();
          // Only events from the list's own padding and the gaps between rows
          // reach here, since each row stops its own. Claim "drop at the end"
          // just for the area past the last row — otherwise crossing a gap
          // would flick the line down to the bottom of the rail.
          const last = e.currentTarget.lastElementChild;
          const below = !last || e.clientY > last.getBoundingClientRect().bottom;
          if (below) setDropTarget({ kind: "top-end" });
        }}
        onDrop={(e) => {
          e.preventDefault();
          const serverId = dragRef.current?.kind === "space" ? dragRef.current.id : e.dataTransfer.getData("application/x-disband-server");
          const folderId = dragRef.current?.kind === "folder" ? dragRef.current.id : e.dataTransfer.getData("application/x-disband-folder");
          if (serverId) onReorderServers(resolveServerDrop(layout, serverId, { kind: "top-end" }));
          else if (folderId) onReorderFolders(resolveFolderDrop(folders, folderId, null, false));
          endDrag();
        }}
      >
        {layout.top.map((server) => renderServerButton(server))}

        {layout.folders.map(({ folder, servers: members }) => {
          const isOpen = expanded.has(folder.id);
          const hasActive = members.some((s) => s.id === activeServerId && viewMode === "space");
          const hasUnread = members.some((s) => serverUnreadSet.has(s.id) && !(s.id === activeServerId && viewMode === "space"));
          const isDrop = dropTarget?.kind === "folder" && dropTarget.id === folder.id;
          return (
            <div
              key={folder.id}
              onDragOver={(e) => {
                if (!dragRef.current) return;
                e.preventDefault();
                e.stopPropagation();
                setDropTarget({ kind: "folder", id: folder.id });
              }}
              onDrop={(e) => dropOnFolder(e, folder.id, false)}
              className={`flex w-[54px] flex-col items-center gap-2.5 rounded-[16px] transition-[background-color,padding,box-shadow] duration-500 ease-spring ${
                isOpen ? "py-[5px]" : ""
              } ${isDrop ? "ring-2 ring-brand" : ""}`}
              style={isOpen ? { backgroundColor: `color-mix(in srgb, ${folder.color} 16%, transparent)` } : undefined}
            >
              <Tooltip label={folder.name}>
                <button
                  type="button"
                  aria-label={`Folder ${folder.name}`}
                  aria-expanded={isOpen}
                  onClick={() => setExpanded((prev) => {
                    const next = new Set(prev);
                    if (next.has(folder.id)) next.delete(folder.id);
                    else next.add(folder.id);
                    return next;
                  })}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onFolderContext(folder, e.clientX, e.clientY);
                  }}
                  draggable
                  onDragStart={(e) => startFolderDrag(e, folder.id)}
                  onDragEnd={endDrag}
                  className="group relative flex h-11 w-11 items-center justify-center"
                >
                  {!isOpen && <RailIndicator state={hasActive ? "active" : hasUnread ? "unread" : "none"} />}
                  {/* iOS home-screen folder: a frosted tile holding up to
                      four miniature icons, or a chevron once it's open. */}
                  <span
                    className="squircle grid h-11 w-11 grid-cols-2 place-items-center gap-[3px] rounded-[12px] p-[6px] transition-transform duration-500 ease-spring group-hover:scale-[1.06] group-active:scale-95"
                    style={{ backgroundColor: `color-mix(in srgb, ${folder.color} 30%, var(--fill-secondary))` }}
                  >
                    {isOpen ? (
                      <IconChevron size={18} className="col-span-2 row-span-2 text-text-normal" />
                    ) : (
                      members.slice(0, 4).map((m) => <SpaceTile key={m.id} server={m} size={14} />)
                    )}
                  </span>
                </button>
              </Tooltip>
              {isOpen && (
                <div className="flex w-full flex-col items-center gap-2.5">
                  {members.map((server) => renderServerButton(server))}
                  {members.length === 0 && (
                    <p className="px-1 text-center text-[10px] leading-tight text-text-muted">Drop spaces here</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Tooltip label="Create a space">
        <button
          type="button"
          aria-label="Create space"
          onClick={onCreateServer}
          className="group flex h-11 w-11 items-center justify-center"
        >
          <span className="squircle flex h-11 w-11 items-center justify-center rounded-[12px] bg-fill-tertiary text-sys-green transition-[transform,background-color,color] duration-500 ease-spring group-hover:scale-[1.06] group-hover:bg-sys-green group-hover:text-white group-active:scale-95">
            <IconPlus size={22} strokeWidth={2.2} />
          </span>
        </button>
      </Tooltip>

      <Tooltip label="Discover">
        <button
          type="button"
          aria-label="Discover spaces"
          onClick={onDiscover}
          className="group relative flex h-11 w-11 items-center justify-center"
        >
          <RailIndicator state={viewMode === "discover" ? "active" : "none"} />
          <span
            className={`squircle flex h-11 w-11 items-center justify-center rounded-[12px] transition-[transform,background-color,color] duration-500 ease-spring group-hover:scale-[1.06] group-active:scale-95 ${
              viewMode === "discover" ? "bg-brand text-brand-foreground" : "bg-fill-tertiary text-text-muted group-hover:text-text-normal"
            }`}
          >
            <IconCompass size={21} />
          </span>
        </button>
      </Tooltip>
      <div
        aria-hidden
        className={`h-[3px] w-10 rounded-full bg-brand transition-opacity ${dropTarget?.kind === "top-end" ? "opacity-100" : "opacity-0"}`}
      />
      </div>
    </nav>
  );
}
