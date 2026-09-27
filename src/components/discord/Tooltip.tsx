"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { OVERLAY_Z } from "@/lib/overlay";

interface TooltipProps {

  label: React.ReactNode;
  children: React.ReactNode;
  side?: "right" | "left" | "top";

  as?: "div" | "span";
}

export function Tooltip({ label, children, side = "right", as: Trigger = "div" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);

  useEffect(() => setMounted(true), []);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 8;

    if (side === "top") {
      setPos({
        left: rect.left + rect.width / 2,
        top: rect.top - gap,
      });
      return;
    }

    if (side === "left") {
      setPos({
        left: rect.left - gap,
        top: rect.top + rect.height / 2,
      });
      return;
    }

    setPos({
      left: rect.right + gap,
      top: rect.top + rect.height / 2,
    });
  }, [side]);

  useEffect(() => {
    if (!visible) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [visible, updatePosition]);

  const transform =
    side === "top"
      ? "translate(-50%, -100%)"
      : side === "left"
        ? "translate(-100%, -50%)"
        : "translateY(-50%)";

  return (
    <>
      <Trigger
        ref={triggerRef as React.Ref<HTMLDivElement & HTMLSpanElement>}
        className="relative inline-flex items-center justify-center"
        onMouseEnter={() => {
          updatePosition();
          setVisible(true);
        }}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => {
          updatePosition();
          setVisible(true);
        }}
        onBlur={() => setVisible(false)}
      >
        {children}
      </Trigger>

      {mounted && visible
        && createPortal(
          <div
            role="tooltip"
            className="tooltip-content glass-thick pointer-events-none fixed max-w-xs rounded-[10px] px-2.5 py-1.5 text-[12.5px] font-medium leading-snug text-text-normal"
            style={{ top: pos.top, left: pos.left, transform, zIndex: OVERLAY_Z.tooltip }}
          >
            {label}
          </div>,
          document.body,
        )}
    </>
  );
}
