"use client";

import { useOverlayDismiss } from "@/hooks/useOverlayDismiss";

import { useRef, useState } from "react";
import { IconClose } from "@/components/icons";
import type { AvatarCrop } from "@/lib/utils";

interface AvatarCropModalProps {
  open: boolean;
  imageUrl: string;
  onClose: () => void;
  onSave: (crop: AvatarCrop) => void;
}

export function AvatarCropModal({ open, imageUrl, onClose, onSave }: AvatarCropModalProps) {
  const [zoom, setZoom] = useState(1);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);

  useOverlayDismiss(onClose, open);

  if (!open) return null;

  const previewStyle = {
    objectFit: "cover" as const,
    objectPosition: `${50 + posX}% ${50 + posY}%`,
    transform: `scale(${zoom})`,
    transformOrigin: `${50 + posX}% ${50 + posY}%`,
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-overlay-scrim-strong overlay-fade" onClick={onClose} aria-label="Close" />
      <div role="dialog" aria-modal="true" aria-label="Adjust profile picture" className="modal-pop relative w-full max-w-md rounded-[22px] bg-overlay-panel p-6 shadow-elev-4 ring-1 ring-glass-border">
        <button type="button" onClick={onClose} className="press absolute right-4 top-4 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-fill-secondary text-text-muted transition-colors hover:bg-fill hover:text-text-normal">
          <IconClose size={15} strokeWidth={2.4} />
        </button>
        <h2 className="text-lg font-bold">Adjust profile picture</h2>
        <div className="relative mx-auto mt-4 h-48 w-48 overflow-hidden rounded-full border-4 border-brand bg-bg-accent">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Crop preview"
            className="h-full w-full"
            style={previewStyle}
          />
        </div>
        <label className="mt-4 block text-xs uppercase font-semibold tracking-[0.04em] text-text-muted">Zoom</label>
        <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full" />
        <label className="mt-2 block text-xs uppercase font-semibold tracking-[0.04em] text-text-muted">Horizontal</label>
        <input type="range" min={-50} max={50} value={posX} onChange={(e) => setPosX(Number(e.target.value))} className="w-full" />
        <label className="mt-2 block text-xs uppercase font-semibold tracking-[0.04em] text-text-muted">Vertical</label>
        <input type="range" min={-50} max={50} value={posY} onChange={(e) => setPosY(Number(e.target.value))} className="w-full" />
        <button
          type="button"
          onClick={() => onSave({ zoom, x: posX, y: posY })}
          className="btn btn-filled mt-4 w-full"
        >
          Save
        </button>
      </div>
    </div>
  );
}
