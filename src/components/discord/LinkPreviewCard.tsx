"use client";

import { useEffect, useState } from "react";
import { fetchLinkPreview, type LinkPreview } from "@/lib/link-preview";
import { IconLink } from "@/components/icons";
import { safeImageUrl } from "@/lib/safe-url";

interface LinkPreviewCardProps {
  url: string;
  onLoad?: () => void;
}

export function LinkPreviewCard({ url, onLoad }: LinkPreviewCardProps) {
  const [preview, setPreview] = useState<LinkPreview | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setPreview(undefined);
      setFailed(false);
      setImgFailed(false);
      const data = await fetchLinkPreview(url);
      if (cancelled) return;
      if (!data) {
        setFailed(true);
        setPreview(null);
      } else {
        setPreview(data);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  // Fire only when real preview data arrives. The old version fired on the
  // failure path too (preview !== undefined includes null), which triggered
  // a spurious scroll-to-bottom right before rendering nothing.
  useEffect(() => {
    if (preview) onLoad?.();
  }, [preview, onLoad]);

  if (preview === undefined) {
    return (
      <div aria-label="Loading preview" className="mt-1 w-full max-w-sm overflow-hidden rounded-[18px] bg-bubble-in p-3">
        <div className="skeleton h-3 w-1/3 rounded-full" />
        <div className="skeleton mt-2 h-4 w-3/4 rounded-full" />
        <div className="skeleton mt-1.5 h-3 w-full rounded-full" />
      </div>
    );
  }

  if (failed || !preview) return null;

  let hostname = url;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch {

  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="press mt-1 block w-full max-w-sm overflow-hidden rounded-[18px] bg-bubble-in text-bubble-in-text transition-[filter] hover:brightness-[1.04]"
    >
      {safeImageUrl(preview.image) && !imgFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={safeImageUrl(preview.image)!}
          alt=""
          className="aspect-[1200/630] max-h-52 w-full bg-fill-tertiary object-cover"
          onLoad={onLoad}
          onError={() => setImgFailed(true)}
        />
      ) : safeImageUrl(preview.image) ? (
        // Broken image URLs keep the same aspect box (with an icon) instead
        // of display:none collapsing the card and shifting the chat.
        <div className="flex aspect-[1200/630] max-h-52 w-full items-center justify-center bg-fill-tertiary text-text-muted">
          <IconLink size={24} />
        </div>
      ) : null}
      <div className="px-3.5 pb-3 pt-2.5">
        <p className="line-clamp-2 text-[14px] font-semibold leading-snug">{preview.title}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-text-muted">
          <IconLink size={12} />
          <span className="truncate">{hostname}</span>
        </div>
        {preview.description && (
          <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-text-muted">{preview.description}</p>
        )}
      </div>
    </a>
  );
}
