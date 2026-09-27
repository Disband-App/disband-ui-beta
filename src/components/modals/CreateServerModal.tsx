"use client";

import { useOverlayDismiss } from "@/hooks/useOverlayDismiss";

import { useEffect, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { IconClose, IconUpload, IconChevron, IconHash, IconSpeaker, IconShield } from "@/components/icons";
import { safeImageUrl } from "@/lib/safe-url";

interface CreateServerModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateServerModal({ open, onClose }: CreateServerModalProps) {
  const { createServer } = useApp();
  const { upload, isUploading } = useMediaUpload();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"name" | "customize">("name");

  useEffect(() => {
    if (!open) return;
    setName("");
    setDescription("");
    setIconUrl(null);
    setBannerUrl(null);
    setError(null);
    setLoading(false);
    setStep("name");
  }, [open]);

  useOverlayDismiss(onClose, open);

  if (!open) return null;

  async function handleIcon(file: File) {
    const res = await upload(file);
    if (res) setIconUrl(res.url);
  }

  async function handleBanner(file: File) {
    const res = await upload(file);
    if (res) setBannerUrl(res.url);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const err = await createServer({
      name: name.trim(),
      description: description.trim() || undefined,
      iconUrl: iconUrl ?? undefined,
      bannerUrl: bannerUrl ?? undefined,
    });
    if (err) setError(err);
    else onClose();
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-overlay-scrim overlay-fade" onClick={onClose} />
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-label="Create a server" className="modal-pop relative w-full max-w-md rounded-[22px] bg-overlay-panel p-6 shadow-elev-4 ring-1 ring-glass-border">
        <button type="button" onClick={onClose} className="press absolute right-4 top-4 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-fill-secondary text-text-muted transition-colors hover:bg-fill hover:text-text-normal">
          <IconClose size={15} strokeWidth={2.4} />
        </button>

        {step === "name" ? (
          <>
            <h2 className="title-2 text-text-normal">Create your space</h2>
            <p className="mt-1 text-sm text-text-muted">
              Name your space first — you can customize it right after.
            </p>

            <div className="mt-4">
              <label className="block">
                <span className="text-xs uppercase font-semibold tracking-[0.04em] text-text-muted">Space name</span>
                <input
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (name.trim()) setStep("customize");
                    }
                  }}
                  maxLength={32}
                  className="field mt-1 w-full text-[14px]"
                  placeholder="My awesome space"
                />
              </label>
            </div>

            <div className="rounded-[14px] bg-fill-tertiary mt-4 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Comes with</p>
              <ul className="mt-2 space-y-1 text-sm text-text-muted">
                <li className="flex items-center gap-2">
                  <IconHash size={14} className="shrink-0" />
                  #general and #welcome text channels
                </li>
                <li className="flex items-center gap-2">
                  <IconSpeaker size={14} className="shrink-0" />
                  A voice channel ready for calls
                </li>
                <li className="flex items-center gap-2">
                  <IconShield size={14} className="shrink-0" />
                  The @everyone role so anyone can chat
                </li>
              </ul>
            </div>

            <button
              type="button"
              disabled={!name.trim()}
              onClick={() => setStep("customize")}
              className="btn btn-filled mt-4 w-full"
            >
              Continue
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setStep("name")}
              className="mb-1 flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-text-normal"
            >
              <IconChevron size={14} className="rotate-90" />
              Back
            </button>
            <h2 className="title-2 text-text-normal">Make it yours</h2>
            <p className="mt-1 text-sm text-text-muted">Add a description, icon, and banner — or skip all of it.</p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs uppercase font-semibold tracking-[0.04em] text-text-muted">Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  maxLength={190}
                  className="field mt-1 w-full resize-none text-[14px]"
                />
              </label>

              <div className="flex gap-3">
                <label className="flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-[14px] border-[1.5px] border-dashed border-divider p-3 text-center transition-all duration-150 hover:border-brand">
                  <IconUpload className="text-text-muted" />
                  <span className="text-xs text-text-muted">Space icon</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && void handleIcon(e.target.files[0])} />
                  {safeImageUrl(iconUrl) && <img src={safeImageUrl(iconUrl)!} alt="" className="mt-1 h-10 w-10 rounded-[30%] object-cover" />}
                </label>
                <label className="flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-[14px] border-[1.5px] border-dashed border-divider p-3 text-center transition-all duration-150 hover:border-brand">
                  <IconUpload className="text-text-muted" />
                  <span className="text-xs text-text-muted">Banner</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && void handleBanner(e.target.files[0])} />
                  {safeImageUrl(bannerUrl) && <img src={safeImageUrl(bannerUrl)!} alt="" className="mt-1 h-10 w-full rounded object-cover" />}
                </label>
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-status-dnd">{error}</p>}

            <button
              type="submit"
              disabled={loading || isUploading}
              className="btn btn-filled mt-4 w-full"
            >
              {loading ? "Creating..." : "Create Space"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
