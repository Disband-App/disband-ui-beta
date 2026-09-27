"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gifThumb, gifUrl, searchGifs, type GiphyImage } from "@/lib/giphy";
import { IconClose } from "@/components/icons";

interface GifPickerProps {
  onSelect: (url: string) => void;
  disabled?: boolean;
}

function GifThumb({ gif, onSelect }: {
  gif: GiphyImage;
  onSelect: (url: string) => void;
}) {
  const thumb = gifThumb(gif);
  const full = gifUrl(gif);
  if (!thumb || !full) return null;

  return (
    <div className="overflow-hidden rounded-[10px] transition-transform duration-300 ease-spring hover:scale-[1.03] hover:ring-2 hover:ring-brand">
      <button
        type="button"
        onClick={() => { onSelect(full); }}
        className="block w-full"
        title={gif.title}
      >
        {thumb.isVideo ? (
          <video
            src={thumb.src}
            autoPlay
            loop
            muted
            playsInline
            webkit-playsinline=""
            className="h-24 w-full object-cover"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb.src}
            alt={gif.title ?? "GIF"}
            loading="lazy"
            className="h-24 w-full object-cover"
          />
        )}
      </button>
    </div>
  );
}

export function GifPicker({ onSelect, disabled }: GifPickerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GiphyImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelPos, setPanelPos] = useState({ left: 0, bottom: 0, width: 320 });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  const updatePanelPos = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const width = 320;
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    setPanelPos({
      left,
      bottom: window.innerHeight - rect.top + 8,
      width,
    });
  }, []);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      setGifs(await searchGifs(q));
    } catch {
      setError("Could not load GIFs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePanelPos();
    window.addEventListener("resize", updatePanelPos);
    window.addEventListener("scroll", updatePanelPos, true);
    return () => {
      window.removeEventListener("resize", updatePanelPos);
      window.removeEventListener("scroll", updatePanelPos, true);
    };
  }, [open, updatePanelPos]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void load(query), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, open, load]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (document.getElementById("gif-picker-panel")?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function handleSelect(url: string) {
    onSelect(url);
    setOpen(false);
  }

  const panel =
    open && mounted
      ? createPortal(
          <div
            id="gif-picker-panel"
            className="glass-thick popover-pop fixed z-[100] flex max-h-[min(22rem,55vh)] flex-col overflow-hidden rounded-[18px]"
            style={{
              left: panelPos.left,
              bottom: panelPos.bottom,
              width: panelPos.width,
              ["--popover-origin" as string]: "bottom right",
            }}
          >
            <div className="flex shrink-0 items-center gap-2 p-2 pb-1">
              <label className="search-field min-w-0 flex-1">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="shrink-0"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search KLIPY"
                  autoFocus
                />
              </label>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="tool-btn h-8 w-8">
                <IconClose size={16} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
              {loading && <p className="py-4 text-center text-sm text-text-muted">Loading…</p>}
              {error && <p className="py-4 text-center text-sm text-status-dnd">{error}</p>}
              {!loading && !error && gifs.length === 0 && query.trim() && (
                <p className="py-4 text-center text-sm text-text-muted">No GIFs found</p>
              )}
              {!loading && !error && gifs.length > 0 && (
                <div className="grid grid-cols-2 gap-1">
                  {gifs.map((gif) => (
                    <GifThumb
                      key={gif.id}
                      gif={gif}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        aria-label="Send GIF"
        aria-expanded={open}
        disabled={disabled}
        title={disabled ? "Finish editing before sending a GIF" : "Send GIF"}
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            if (next) requestAnimationFrame(updatePanelPos);
            return next;
          });
        }}
        data-active={open ? "true" : undefined}
        className="tool-btn h-8 w-auto px-1.5 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="rounded-[5px] px-1 text-[10.5px] font-bold leading-[16px] tracking-wide ring-[1.5px] ring-current">GIF</span>
      </button>
      {panel}
    </div>
  );
}
