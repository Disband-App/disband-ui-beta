"use client";

import { useState } from "react";
import { Toggle } from "@/components/discord/settings/SettingsPrimitives";
import { Segmented } from "@/components/ui/Segmented";
import { ACCENTS, type AccentId } from "@/lib/theme/appearance";

// A small, working slice of the app's controls, recoloured live by the accent
// picker above it. The accent is scoped to this block (data-accent on the
// wrapper), so trying colours here never changes the visitor's own setting.

const CHOICES = ACCENTS.filter((a) => a.id !== "theme");

export function AccentPlayground() {
  const [accent, setAccent] = useState<AccentId>("blue");
  const [notify, setNotify] = useState(true);
  const [layout, setLayout] = useState<"bubbles" | "classic">("bubbles");

  return (
    <div data-accent={accent} className="rounded-[28px] bg-bg-secondary p-6 shadow-[0_0_0_1px_var(--panel-border)] sm:p-8">
      <div className="flex flex-wrap items-center gap-3" role="radiogroup" aria-label="Try an accent colour">
        {CHOICES.map((a) => (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={accent === a.id}
            aria-label={a.label}
            title={a.label}
            onClick={() => setAccent(a.id)}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-500 ease-bouncy hover:scale-110 active:scale-95 ${
              accent === a.id ? "ring-2 ring-offset-2 ring-offset-bg-secondary" : ""
            }`}
            style={{ background: `var(--sys-${a.id === "graphite" ? "gray" : a.id})`, ["--tw-ring-color" as string]: `var(--sys-${a.id === "graphite" ? "gray" : a.id})` }}
          >
            {accent === a.id && <span className="h-2.5 w-2.5 rounded-full bg-white shadow" />}
          </button>
        ))}
      </div>

      <div className="mt-7 grid gap-5 md:grid-cols-2">
        <div className="flex flex-col justify-end gap-[3px] rounded-[20px] bg-bg-primary p-5 shadow-[0_0_0_1px_var(--panel-border)]">
          <span className="bubble bubble-in w-fit text-[14px]" data-stack="below">new colour?</span>
          <span className="bubble bubble-in w-fit text-[14px]" data-stack="above" data-tail="">it suits you</span>
          <span className="bubble bubble-out mt-2 w-fit self-end text-[14px]" data-tail="">
            picked it in about two seconds
          </span>
          <span className="mt-1 self-end text-[11px] text-text-muted">Delivered</span>
        </div>

        <div className="list-group bg-bg-primary">
          <div className="list-row">
            <span className="flex-1 text-[14.5px]">Notifications</span>
            <Toggle checked={notify} onChange={setNotify} label="Notifications" />
          </div>
          <div className="list-row flex-col items-stretch gap-2.5">
            <span className="text-[14.5px]">Messages</span>
            <Segmented
              ariaLabel="Message layout"
              value={layout}
              onChange={setLayout}
              options={[
                { id: "bubbles", label: "Bubbles" },
                { id: "classic", label: "Classic" },
              ]}
            />
          </div>
          <div className="list-row">
            <span className="flex-1 text-[14.5px] text-brand">Invite friends</span>
            <span className="btn btn-filled btn-sm">Share</span>
          </div>
        </div>
      </div>
    </div>
  );
}
