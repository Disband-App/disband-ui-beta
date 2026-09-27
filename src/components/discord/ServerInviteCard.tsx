"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { apiFetch } from "@/lib/api";
import { getInviteUrl } from "@/lib/utils";
import { safeImageUrl } from "@/lib/safe-url";
import { IconVerified } from "@/components/icons";
import { Tooltip } from "./Tooltip";

interface ServerInviteCardProps {
  code: string;
  onLoad?: () => void;
}

export function ServerInviteCard({ code, onLoad }: ServerInviteCardProps) {
  const { joinServerByInvite, selectServer, servers, user } = useApp();
  const [info, setInfo] = useState<{
    id: string;
    name: string;
    description: string | null;
    icon_url: string | null;
    banner_url: string | null;
    member_count: number;
    verified?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMember = servers.some((s) => s.invite_code === code || (s.vanity_code && s.vanity_code.toLowerCase() === code.toLowerCase()));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {

        const res = await apiFetch(`/api/invites/${code}`);
        const json = (await res.json()) as {
          error?: string;
          id?: string;
          name?: string;
          description?: string | null;
          icon_url?: string | null;
          banner_url?: string | null;
          member_count?: number | string;
          verified?: boolean;
        };
        if (!cancelled && !res.ok) setError(json?.error ?? "Could not load invite.");
        if (!cancelled && res.ok && json?.id) {
          setInfo({
            id: json.id,
            name: json.name ?? "",
            description: json.description ?? null,
            icon_url: json.icon_url ?? null,
            banner_url: json.banner_url ?? null,
            member_count: Number(json.member_count ?? 0),
            verified: json.verified ?? false,
          });
        }
      } catch {
        if (!cancelled) setError("Could not load invite.");
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [code]);

  useEffect(() => {
    if (!loading && info) onLoad?.();
  }, [loading, info, onLoad]);

  async function handleJoin() {
    if (!user) return;
    setJoining(true);
    setError(null);
    const err = await joinServerByInvite(code);
    if (err) setError(err);
    setJoining(false);
  }

  async function handleGo() {
    const s = servers.find((x) => x.invite_code === code || (x.vanity_code && x.vanity_code.toLowerCase() === code.toLowerCase()));
    if (s) await selectServer(s.id);
  }

  if (loading) return <div className="mt-1 flex h-[74px] w-full max-w-sm items-center gap-3 rounded-[18px] bg-bubble-in p-3"><span className="skeleton h-12 w-12 rounded-[13px]" /><span className="flex-1"><span className="skeleton block h-3 w-1/3 rounded-full" /><span className="skeleton mt-2 block h-4 w-2/3 rounded-full" /></span></div>;
  if (!info) return null;

  return (
    <div className="mt-1 w-full max-w-sm overflow-hidden rounded-[18px] bg-bubble-in text-bubble-in-text">
      {info.banner_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={safeImageUrl(info.banner_url) || undefined} alt="" className="h-16 w-full object-cover" onLoad={onLoad} />
      )}
      <div className="flex gap-3 p-3">
        {info.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={safeImageUrl(info.icon_url) || undefined} alt="" className="squircle h-12 w-12 rounded-[13px] object-cover" onLoad={onLoad} />
        ) : (
          <div className="squircle flex h-12 w-12 items-center justify-center rounded-[13px] bg-brand font-rounded text-lg font-semibold text-brand-foreground">
            {info.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-medium text-text-muted">Invitation to join</p>
          {}
          <div className="flex min-w-0 items-center gap-1 font-semibold">
            <span className="truncate">{info.name}</span>
            {info.verified && (
              <Tooltip as="span" label="This space is officially verified by Disband">
                <IconVerified size={14} className="shrink-0 text-sys-blue" />
              </Tooltip>
            )}
          </div>
          {info.description && <p className="truncate text-xs text-text-muted">{info.description}</p>}
          <p className="text-xs text-text-muted">{info.member_count} members</p>
        </div>
      </div>
      <div className="px-3 pb-3">
        {isMember ? (
          <button type="button" onClick={() => void handleGo()} className="btn btn-gray btn-block">
            Go to Space
          </button>
        ) : (
          <button type="button" disabled={joining || !user} onClick={() => void handleJoin()} className="btn btn-filled btn-block">
            {joining ? "Joining…" : "Join Space"}
          </button>
        )}
        {error && <p className="mt-1 text-xs text-status-dnd">{error}</p>}
        <p className="mt-1.5 truncate text-center text-[10.5px] text-text-muted">{getInviteUrl(code)}</p>
      </div>
    </div>
  );
}