"use client";

import type { ReactNode } from "react";
import { IconClose } from "@/components/icons";

/** The round grey ⓧ that closes an iOS sheet. */
export function SheetCloseButton({
  onClick,
  label = "Close",
  className = "",
}: {
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`press flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-fill-secondary text-text-muted transition-colors hover:bg-fill hover:text-text-normal ${className}`}
    >
      <IconClose size={15} strokeWidth={2.4} />
    </button>
  );
}

/**
 * Sheet navigation bar: centred title between optional leading and trailing
 * items, with the close button trailing when nothing else claims the spot.
 */
export function SheetHeader({
  title,
  subtitle,
  onClose,
  leading,
  trailing,
  id,
  className = "",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose?: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** For aria-labelledby on the dialog. */
  id?: string;
  className?: string;
}) {
  return (
    <header className={`grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 pb-2 pt-4 ${className}`}>
      <div className="flex min-w-0 items-center justify-start">{leading}</div>
      <div className="min-w-0 text-center">
        <h2 id={id} className="truncate text-[16px] font-semibold tracking-[-0.01em] text-text-normal">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 truncate text-[12.5px] text-text-muted">{subtitle}</p>}
      </div>
      <div className="flex min-w-0 items-center justify-end">
        {trailing ?? (onClose ? <SheetCloseButton onClick={onClose} /> : null)}
      </div>
    </header>
  );
}

const SHEET_WIDTHS = {
  sm: "max-w-[400px]",
  md: "max-w-[480px]",
  lg: "max-w-[640px]",
  xl: "max-w-[880px]",
} as const;

/**
 * Presentation shell for a form sheet: dimmed backdrop, a rounded card that
 * springs up, bottom-anchored on phone widths. The caller owns open state and
 * Escape handling (useOverlayDismiss), as every modal here already does.
 */
export function Sheet({
  onClose,
  children,
  size = "md",
  labelledBy,
  label,
  className = "",
  zIndex = 50,
}: {
  onClose: () => void;
  children: ReactNode;
  size?: keyof typeof SHEET_WIDTHS;
  labelledBy?: string;
  label?: string;
  className?: string;
  zIndex?: number;
}) {
  return (
    <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-6" style={{ zIndex }}>
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        className="overlay-fade absolute inset-0 cursor-default bg-overlay-scrim"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : label}
        className={`modal-pop relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[22px] bg-overlay-panel shadow-elev-4 ring-1 ring-glass-border sm:rounded-[22px] ${SHEET_WIDTHS[size]} ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
