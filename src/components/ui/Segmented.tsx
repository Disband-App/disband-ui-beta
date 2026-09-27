"use client";

import type { ReactNode } from "react";

export interface SegmentOption<T extends string> {
  id: T;
  label: ReactNode;
  title?: string;
}

/**
 * UISegmentedControl. Segments are equal width, so the selected thumb is a
 * single element that slides by index — a spring, not a cross-fade.
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  size = "md",
  className = "",
}: {
  value: T;
  options: SegmentOption<T>[];
  onChange: (next: T) => void;
  ariaLabel: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const index = Math.max(0, options.findIndex((o) => o.id === value));
  const height = size === "sm" ? "h-[28px]" : "h-[32px]";
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`relative grid rounded-[9px] bg-fill-tertiary p-[2px] ${height} ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="absolute bottom-[2px] left-[2px] top-[2px] rounded-[7px] bg-bg-elevated shadow-[0_3px_8px_rgb(0_0_0/0.12),0_0_0_0.5px_rgb(0_0_0/0.04)] transition-transform duration-500 ease-spring"
        style={{
          width: `calc((100% - 4px) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((opt) => {
        const selected = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={selected}
            title={opt.title}
            onClick={() => onChange(opt.id)}
            className={`relative z-[1] flex min-w-0 items-center justify-center gap-1.5 truncate px-3 text-[13px] transition-colors duration-200 ${
              selected ? "font-semibold text-text-normal" : "font-medium text-text-muted hover:text-text-normal"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
