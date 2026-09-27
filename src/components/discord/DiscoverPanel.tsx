"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { IconClose, IconSearch, IconCompass, IconSparkle, IconVerified } from "@/components/icons";
import { safeImageUrl } from "@/lib/safe-url";
import { CallIndicator } from "./CallIndicator";
import { Tooltip } from "./Tooltip";
import { SpaceTile, spaceTint } from "./ServerList";
import type { Server } from "@/lib/supabase/types";

export interface DiscoverableServer {
  id: string;
  name: string;
  icon_url: string | null;
  banner_url: string | null;
  description: string | null;
  owner_id: string;
  owner_name: string;
  member_count: number;
  created_at: string;
  verified?: boolean;
}

export type DiscoverTab = "popular" | "new";

function useDiscoverableServers() {
  const [items, setItems] = useState<DiscoverableServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void getSupabaseClient()
      .rpc("list_discoverable_servers")
      .then(({ data, error: rpcError }) => {
        if (cancelled) return;
        setLoading(false);
        if (rpcError) {
          setError(rpcError.message);
          return;
        }
        setItems((data ?? []) as DiscoverableServer[]);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return { items, loading, error, reload: () => setAttempt((a) => a + 1) };
}

interface DiscoverSidebarProps {
  tab: DiscoverTab;
  onTabChange: (tab: DiscoverTab) => void;
  query: string;
  onQueryChange: (q: string) => void;
  onOpenSettings: () => void;
  onOpenProfile?: () => void;
}

export function DiscoverSidebar({
  tab,
  onTabChange,
  query,
  onQueryChange,
  onOpenSettings,
  onOpenProfile,
}: DiscoverSidebarProps) {
  const tabs: { id: DiscoverTab; label: string; icon: React.ReactNode; hint: string }[] = [
    {
      id: "popular",
      label: "Popular",
      icon: <IconCompass size={17} strokeWidth={2.1} />,
      hint: "Most members",
    },
    {
      id: "new",
      label: "New",
      icon: <IconSparkle size={17} strokeWidth={2.1} />,
      hint: "Recently created",
    },
  ];

  return (
    <aside className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 px-4 pb-1 pt-3.5">
        <h2 className="large-title text-[26px]">Discover</h2>
      </header>
      <div className="shrink-0 px-3 pb-2 pt-1.5">
        <label className="search-field">
          <IconSearch size={15} className="shrink-0" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search spaces"
            aria-label="Search spaces"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="Clear search"
              className="flex h-4 w-4 items-center justify-center rounded-full bg-text-muted/60 text-bg-secondary"
            >
              <IconClose size={10} strokeWidth={3} />
            </button>
          )}
        </label>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pt-1">
        <p className="section-label px-3 pb-1.5 pt-2">Browse</p>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTabChange(t.id)}
            aria-current={tab === t.id ? "true" : undefined}
            className="nav-row mb-0.5 gap-3 py-2"
          >
            <span className="icon-tile h-8 w-8 rounded-[8px]" style={{ background: t.id === "popular" ? "linear-gradient(180deg,#3d9bff,#0a6fe8)" : "linear-gradient(180deg,#ff7a93,#ec4263)" }}>
              {t.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14.5px] font-semibold text-text-normal">
                {t.label}
              </span>
              <span className="block truncate text-[12px] text-text-muted">{t.hint}</span>
            </span>
          </button>
        ))}
      </nav>

      <CallIndicator />
    </aside>
  );
}

export function DiscoverPanel({ tab, query }: { tab: DiscoverTab; query: string }) {
  const { servers, joinServerById } = useApp();
  const { items, loading, error, reload } = useDiscoverableServers();
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<{ id: string; message: string } | null>(null);

  const memberIds = useMemo(() => new Set(servers.map((s) => s.id)), [servers]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? items.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            (s.description ?? "").toLowerCase().includes(q) ||
            s.owner_name.toLowerCase().includes(q),
        )
      : items;

    return [...filtered].sort((a, b) =>
      tab === "popular"
        ? b.member_count - a.member_count
        : b.created_at.localeCompare(a.created_at),
    );
  }, [items, query, tab]);

  async function join(server: DiscoverableServer) {
    setJoiningId(server.id);
    setJoinError(null);
    const err = await joinServerById(server.id);
    setJoiningId(null);
    if (err) setJoinError({ id: server.id, message: err });
  }

  return (
    <main className="view-enter flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-bg-primary">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8 pt-6">
        <header className="mb-6">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-text-muted">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="large-title mt-0.5 text-[32px]">
            {tab === "popular" ? "Popular spaces" : "New spaces"}
          </h1>
          {!loading && !error && (
            <p className="mt-1 text-[14px] text-text-muted">
              {visible.length} {visible.length === 1 ? "space" : "spaces"}{query ? ` matching “${query}”` : " open to everyone"}
            </p>
          )}
        </header>

        {loading ? (
          <ul aria-label="Loading spaces" className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="overflow-hidden rounded-[22px] bg-bg-secondary shadow-[0_0_0_1px_var(--panel-border)]">
                <div className="skeleton h-28 w-full" />
                <div className="flex gap-3 p-4">
                  <div className="skeleton h-14 w-14 shrink-0 rounded-[15px]" />
                  <div className="flex-1">
                    <div className="skeleton h-4 w-2/3 rounded-full" />
                    <div className="skeleton mt-2 h-3 w-full rounded-full" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : error ? (
          <div className="max-w-sm rounded-[18px] bg-status-dnd/10 p-5" role="alert">
            <h2 className="text-[15px] font-semibold text-text-normal">Couldn&apos;t load spaces</h2>
            <p className="mt-1 text-[13.5px] text-text-muted">{error}</p>
            <button
              type="button"
              onClick={reload}
              className="btn btn-filled btn-sm mt-4"
            >
              Try again
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex max-w-sm flex-col items-start">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-fill-tertiary text-text-muted"><IconCompass size={26} /></span>
            <h2 className="title-2">
              {query ? "No matches" : "Nothing to discover yet"}
            </h2>
            <p className="mt-1 text-[13.5px] leading-relaxed text-text-muted">
              {query
                ? `No spaces match “${query}”.`
                : "Public spaces will show up here once people create them."}
            </p>
          </div>
        ) : (
          <>
            <ul key={tab} className="stagger grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {visible.map((server, i) => {
                const joined = memberIds.has(server.id);
                const banner = safeImageUrl(server.banner_url);
                const icon = safeImageUrl(server.icon_url);
                return (
                  <li
                    key={server.id}
                    style={{ ["--i" as string]: Math.min(i, 12) }}
                    className="group flex flex-col overflow-hidden rounded-[22px] bg-bg-secondary shadow-[0_0_0_1px_var(--panel-border)] transition-[transform,box-shadow] duration-500 ease-spring hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_var(--panel-border),var(--elev-3)]"
                  >
                    <div className="h-28 w-full overflow-hidden" style={banner ? undefined : { background: spaceTint(server.id), opacity: 0.85 }}>
                      {banner && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={banner} alt="" className="h-full w-full object-cover transition-transform duration-700 ease-smooth group-hover:scale-[1.04]" />
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col p-4">
                      <div className="flex items-center gap-3">
                        {icon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={icon}
                            alt=""
                            className="squircle -mt-10 h-14 w-14 shrink-0 rounded-[15px] object-cover shadow-elev-2 ring-[3px] ring-bg-secondary"
                          />
                        ) : (
                          <span className="-mt-10 shrink-0 rounded-[15px] shadow-elev-2 ring-[3px] ring-bg-secondary">
                            <SpaceTile server={{ id: server.id, name: server.name, icon_url: null } as Server} size={56} />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="flex min-w-0 items-center gap-1 text-[16px] font-semibold tracking-[-0.01em] text-text-normal">
                            <span className="truncate">{server.name}</span>
                            {server.verified && (
                              <Tooltip label="This space is officially verified by Disband">
                                <IconVerified size={15} className="shrink-0 text-sys-blue" />
                              </Tooltip>
                            )}
                          </p>
                          <p className="flex items-center gap-1 truncate text-[12px] text-text-muted">
                            {server.member_count.toLocaleString()} {server.member_count === 1 ? "member" : "members"}
                            <span aria-hidden>·</span>
                            <span className="truncate">{server.owner_name}</span>
                          </p>
                        </div>
                        {/* App Store style action: a grey capsule with bold tinted text. */}
                        <button
                          type="button"
                          disabled={joined || joiningId === server.id}
                          onClick={() => void join(server)}
                          className={`press h-[30px] min-w-[72px] shrink-0 rounded-full px-4 text-[13px] font-bold tracking-wide transition-colors ${
                            joined
                              ? "cursor-default bg-fill-tertiary text-text-muted"
                              : "bg-fill-secondary text-brand hover:bg-fill disabled:opacity-50"
                          }`}
                        >
                          {joined ? "JOINED" : joiningId === server.id ? "…" : "JOIN"}
                        </button>
                      </div>
                      <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-[13.5px] leading-relaxed text-text-muted">
                        {server.description || "No description."}
                      </p>
                      {joinError?.id === server.id && (
                        <p role="alert" className="mt-2 text-[12px] text-status-dnd">{joinError.message}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
