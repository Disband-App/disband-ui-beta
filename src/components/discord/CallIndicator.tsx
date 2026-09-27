"use client";

import { useEffect, useState } from "react";
import { IconPhoneOff, IconWaveform } from "@/components/icons";
import { getCallIndicatorState, subscribeCallIndicator, type CallIndicatorState } from "@/lib/call-status";

function connectionBars(): number {
  if (typeof navigator === "undefined" || !("connection" in navigator)) return 3;
  const et = (navigator.connection as { effectiveType?: string } | undefined)?.effectiveType;
  if (et === "slow-2g" || et === "2g") return 1;
  if (et === "3g") return 2;
  return 3;
}

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(m)}:${pad(s)}`;
}

export function CallIndicator() {
  const [state, setState] = useState<CallIndicatorState>(() => getCallIndicatorState());
  const [now, setNow] = useState(() => Date.now());
  const [bars, setBars] = useState(connectionBars);

  useEffect(() => subscribeCallIndicator(() => setState(getCallIndicatorState())), []);

  useEffect(() => {
    if (!state.active || !state.startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.active, state.startedAt]);

  useEffect(() => {
    if (!state.active) return;
    const id = setInterval(() => setBars(connectionBars()), 5000);
    return () => clearInterval(id);
  }, [state.active]);

  if (!state.active) return null;

  return (
    <div className="shrink-0 px-2 pb-1.5 pt-1">
      <div
        role="button"
        tabIndex={state.focus ? 0 : -1}
        onClick={state.focus ?? undefined}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && state.focus) {
            e.preventDefault();
            state.focus();
          }
        }}
        title={state.focus ? "Return to call" : undefined}
        className={`island-in flex w-full items-center gap-2.5 rounded-[14px] bg-status-online/12 px-2.5 py-2 text-left ring-1 ring-status-online/20 transition-colors ${
          state.focus ? "cursor-pointer hover:bg-status-online/18" : "cursor-default"
        }`}
      >
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-status-online text-white">
          <IconWaveform size={16} strokeWidth={2.2} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold leading-tight text-status-online">
            {state.label}
          </span>
          <span className="nums block text-[11.5px] leading-tight text-text-muted">
            {state.startedAt ? formatElapsed(Math.max(0, now - state.startedAt)) : "Connecting…"}
          </span>
        </span>

        <span className="flex shrink-0 items-end gap-[2px]" title="Connection strength" aria-label="Connection strength">
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              className={`w-[3px] rounded-full ${i <= bars ? "bg-status-online" : "bg-text-muted/30"}`}
              style={{ height: `${4 + i * 3}px` }}
            />
          ))}
        </span>

        {state.hangup && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              state.hangup?.();
            }}
            title="Hang up"
            aria-label="Hang up"
            className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sys-red text-white"
          >
            <IconPhoneOff size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
