"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { displayName } from "@/lib/utils";
import type { Profile } from "@/lib/supabase/types";
import { apiFetch } from "@/lib/api";

interface PlatformBanRow {
  user_id: string;
  reason: string | null;
  email: string | null;
  created_at: string;
  profile?: { username: string | null; display_name: string | null } | null;
}

export function PlatformModerationPanel() {
  const { profile, platformBanUser, platformUnbanUser } = useApp();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [bans, setBans] = useState<PlatformBanRow[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadBans = useCallback(async () => {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    if (!session) return;
    try {
      const res = await apiFetch("/api/moderation/platform-ban", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const json = (await res.json()) as { bans?: PlatformBanRow[] };
      setBans(json.bans ?? []);
    } catch {

    }
  }, []);

  useEffect(() => {
    if (profile?.show_owner_badge) void loadBans();
  }, [profile?.show_owner_badge, loadBans]);

  useEffect(() => {
    const term = query.trim();
    if (selected || term.length < 1) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      const escaped = term.replace(/[%_,]/g, (m) => `\\${m}`);
      const like = `%${escaped}%`;
      try {
        const [byUsername, byDisplayName] = await Promise.all([
          getSupabaseClient().from("profiles").select("*").ilike("username", like).limit(8),
          getSupabaseClient().from("profiles").select("*").ilike("display_name", like).limit(8),
        ]);
        const seen = new Map<string, Profile>();
        for (const row of [...(byUsername.data ?? []), ...(byDisplayName.data ?? [])]) {
          if (!seen.has(row.id)) seen.set(row.id, row as Profile);
        }
        setResults([...seen.values()].slice(0, 8));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
        setDropdownOpen(true);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query, selected]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!profile?.show_owner_badge) return null;

  function pickUser(user: Profile) {
    setSelected(user);
    setQuery("");
    setResults([]);
    setDropdownOpen(false);
    setError(null);
    setSuccess(null);
  }

  async function handleBan() {
    if (!selected) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const err = await platformBanUser({ userId: selected.id, password, reason: reason.trim() || undefined });
      if (err) {
        setError(err);
      } else {
        setSuccess(`Banned ${selected.username ? `@${selected.username}` : displayName(selected)}`);
        setSelected(null);
        setReason("");
        await loadBans();
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnban(userId: string, uname: string | null) {
    setError(null);
    setSuccess(null);
    if (!password.trim()) {
      setError("Enter the owner password to unban.");
      return;
    }
    setLoading(true);
    try {
      const err = await platformUnbanUser({ userId, password });
      if (err) {
        setError(err);
      } else {
        setSuccess(`Unbanned ${uname ? `@${uname}` : "user"}`);
        await loadBans();
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 space-y-4 border-t border-divider pt-6">
      <div>
        <h3 className="text-sm font-bold uppercase text-status-danger">Platform moderation</h3>
        <p className="mt-1 text-xs text-text-muted">
          Owner-only. Requires the <code className="text-text-normal">OWNER_PASSWORD</code> environment variable.
          Banned users are locked out of Disband and cannot re-register with the same email.
        </p>
      </div>

      <div ref={containerRef} className="relative">
        <span className="text-xs uppercase font-semibold tracking-[0.04em] text-text-muted">User to ban</span>
        {selected ? (
          <div className="mt-1 flex items-center gap-3 rounded bg-bg-accent px-3 py-2">
            <Avatar profile={selected} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{displayName(selected)}</p>
              {selected.username && <p className="truncate text-xs text-text-muted">@{selected.username}</p>}
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="btn btn-gray btn-sm shrink-0"
            >
              Change
            </button>
          </div>
        ) : (
          <>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setDropdownOpen(true)}
              placeholder="Search by username or display name…"
              className="field mt-1 w-full text-[14px]"
            />
            {dropdownOpen && (searching || results.length > 0 || query.trim().length > 0) && (
              <div className="glass-thick rounded-[14px] absolute z-10 mt-1 max-h-72 w-full overflow-y-auto">
                {searching && (
                  <p className="px-3 py-3 text-xs text-text-muted">Searching…</p>
                )}
                {!searching && results.length === 0 && (
                  <p className="px-3 py-3 text-xs text-text-muted">No users found.</p>
                )}
                {!searching &&
                  results.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => pickUser(user)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-interactive-hover"
                    >
                      <Avatar profile={user} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{displayName(user)}</p>
                        {user.username && <p className="truncate text-xs text-text-muted">@{user.username}</p>}
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </>
        )}
      </div>

      <label className="block">
        <span className="text-xs uppercase font-semibold tracking-[0.04em] text-text-muted">Reason (optional)</span>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="field mt-1 w-full text-[14px]"
        />
      </label>

      <label className="block">
        <span className="text-xs uppercase font-semibold tracking-[0.04em] text-text-muted">Owner password</span>
        <input
          type="password"
          autoComplete="off"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field mt-1 w-full text-[14px]"
        />
      </label>

      <button
        type="button"
        disabled={loading || !selected || !password}
        onClick={() => void handleBan()}
        className="rounded bg-status-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        Ban from Disband
      </button>

      {error && <p className="text-sm text-status-danger">{error}</p>}
      {success && <p className="text-sm text-status-online">{success}</p>}

      {bans.length > 0 && (
        <div className="rounded-[14px] bg-fill-tertiary">
          <p className="border-b border-divider px-4 py-2 text-xs uppercase font-semibold tracking-[0.04em] text-text-muted">Active platform bans</p>
          <ul className="divide-y divide-divider">
            {bans.map((ban) => (
              <li key={ban.user_id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">
                    {ban.profile?.display_name || ban.profile?.username || ban.email || ban.user_id}
                  </p>
                  {ban.profile?.username && <p className="text-xs text-text-muted">@{ban.profile.username}</p>}
                  {ban.reason && <p className="text-xs text-text-muted">{ban.reason}</p>}
                </div>
                <button
                  type="button"
                  disabled={loading || !password}
                  onClick={() => void handleUnban(ban.user_id, ban.profile?.username ?? null)}
                  className="btn btn-gray btn-sm shrink-0"
                >
                  Unban
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
