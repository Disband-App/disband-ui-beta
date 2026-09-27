"use client";

import { useOverlayDismiss } from "@/hooks/useOverlayDismiss";

import { useState } from "react";

export const FOLDER_COLORS = [
  "#5865f2",
  "#57f287",
  "#fee75c",
  "#eb459e",
  "#ed4245",
  "#e67e22",
  "#9b59b6",
  "#1abc9c",
  "#95a5ba",
];

interface ServerFolderDialogProps {
  title: string;
  initialName?: string;
  initialColor?: string;
  onClose: () => void;
  onSave: (name: string, color: string) => void | Promise<void>;
}

export function ServerFolderDialog({ title, initialName = "", initialColor = FOLDER_COLORS[0], onClose, onSave }: ServerFolderDialogProps) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Always mounted when rendered (no `open` prop) — active unconditionally.
  // The input's local Escape handler is removed in favor of this stack.
  useOverlayDismiss(onClose);

  const save = async () => {
    if (!name.trim()) {
      setError("Give the folder a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(name.trim().slice(0, 32), color);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the folder.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-overlay-scrim overlay-fade p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal-pop w-full max-w-xs rounded-[22px] bg-overlay-panel p-5 shadow-elev-4 ring-1 ring-glass-border"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-bold text-text-normal">{title}</h2>
        <label className="mt-4 block text-xs uppercase font-semibold tracking-[0.04em] text-text-muted">
          Folder name
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save();
            }}
            maxLength={32}
            placeholder="My folder"
            className="field mt-1.5 w-full normal-case tracking-normal placeholder:text-text-muted text-[14px]"
          />
        </label>
        <p className="mb-1.5 mt-4 text-xs uppercase font-semibold tracking-[0.04em] text-text-muted">Folder color</p>
        <div className="flex flex-wrap gap-2">
          {FOLDER_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Use color ${c}`}
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`h-8 w-8 rounded-full transition-transform hover:scale-110 ${
                color === c ? "ring-2 ring-white ring-offset-2 ring-offset-bg-secondary" : ""
              }`}
            />
          ))}
        </div>
        {error && <p className="mt-3 text-[13px] text-status-dnd">{error}</p>}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-gray flex-1"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="btn btn-filled flex-1"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
