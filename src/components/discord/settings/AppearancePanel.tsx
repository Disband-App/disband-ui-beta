"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { SubscriptionBadge } from "@/components/ui/SubscriptionBadge";
import { Segmented } from "@/components/ui/Segmented";
import { IconCheck, IconLock } from "@/components/icons";
import { THEMES, type ThemeChoice, type ThemeDefinition } from "@/lib/theme/themes";
import {
  ACCENTS,
  setChatStyle,
  setStoredAccent,
  useAccent,
  useAppearance,
  useChatStyle,
} from "@/lib/theme/appearance";
import { getStoredMotion, setStoredMotion, type MotionPreference } from "@/lib/motion";
import { useZoom, MIN_ZOOM, MAX_ZOOM } from "@/hooks/useZoom";
import { useState } from "react";
import type { SubscriptionPlan } from "@/lib/subscription";

/** A tiny window drawn in a theme's colours: canvas, sidebar card, content card. */
function MiniWindow({ swatch, className = "" }: { swatch: ThemeDefinition["swatch"]; className?: string }) {
  const [canvas, sidebar, content, accent] = swatch;
  return (
    <div className={`flex gap-[3px] rounded-[10px] p-[4px] ${className}`} style={{ background: canvas }}>
      <div className="flex w-[7px] flex-col gap-[3px] pt-[2px]">
        <span className="h-[7px] w-[7px] rounded-[2.5px]" style={{ background: accent }} />
        <span className="h-[7px] w-[7px] rounded-[2.5px] opacity-40" style={{ background: sidebar === canvas ? "#fff3" : sidebar }} />
      </div>
      <div className="w-[34%] rounded-[5px] p-[3px]" style={{ background: sidebar, boxShadow: sidebar === canvas ? "inset 0 0 0 0.5px #ffffff22" : undefined }}>
        <span className="block h-[3px] w-3/4 rounded-full opacity-50" style={{ background: accent }} />
        <span className="mt-[3px] block h-[3px] w-1/2 rounded-full bg-current opacity-20" />
        <span className="mt-[3px] block h-[3px] w-2/3 rounded-full bg-current opacity-20" />
      </div>
      <div className="flex flex-1 flex-col justify-end gap-[3px] rounded-[5px] p-[4px]" style={{ background: content, boxShadow: content === canvas ? "inset 0 0 0 0.5px #ffffff22" : undefined }}>
        <span className="h-[6px] w-1/2 rounded-full bg-current opacity-20" />
        <span className="ml-auto h-[6px] w-2/5 rounded-full" style={{ background: accent }} />
      </div>
    </div>
  );
}

function RadioDot({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-[20px] w-[20px] items-center justify-center rounded-full transition-colors ${
        checked ? "bg-brand text-brand-foreground" : "ring-[1.5px] ring-inset ring-divider"
      }`}
    >
      {checked && <IconCheck size={12} strokeWidth={3.4} />}
    </span>
  );
}

const LIGHT = THEMES.find((t) => t.id === "light")!;
const DARK = THEMES.find((t) => t.id === "dark")!;

export function AppearancePanel({
  plan,
  onSaveTheme,
}: {
  plan: SubscriptionPlan;
  /** Persists the choice to the account alongside the local preference. */
  onSaveTheme: (theme: ThemeChoice) => void;
}) {
  const { theme, setTheme } = useTheme();
  const appearance = useAppearance();
  const accent = useAccent();
  const chatStyle = useChatStyle();
  const [zoom, setZoom] = useZoom();
  const [motion, setMotion] = useState<MotionPreference>(() => getStoredMotion());

  const pick = (next: ThemeChoice) => {
    setTheme(next);
    onSaveTheme(next);
  };

  const modes: { id: ThemeChoice; label: string; render: React.ReactNode }[] = [
    { id: "light", label: "Light", render: <MiniWindow swatch={LIGHT.swatch} className="h-full w-full text-black" /> },
    { id: "dark", label: "Dark", render: <MiniWindow swatch={DARK.swatch} className="h-full w-full text-white" /> },
    {
      id: "auto",
      label: "Automatic",
      render: (
        // Half and half, split on the diagonal, as the system draws it.
        <div className="relative h-full w-full">
          <MiniWindow swatch={LIGHT.swatch} className="absolute inset-0 text-black [clip-path:polygon(0_0,100%_0,0_100%)]" />
          <MiniWindow swatch={DARK.swatch} className="absolute inset-0 text-white [clip-path:polygon(100%_0,100%_100%,0_100%)]" />
        </div>
      ),
    },
  ];

  return (
    <div className="pb-10">
      <section className="mb-8">
        <h3 className="section-label mb-2">Appearance</h3>
        <div className="list-group p-5">
          <div className="grid grid-cols-3 gap-4">
            {modes.map((m) => {
              const selected = theme === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => pick(m.id)}
                  aria-pressed={selected}
                  className="group flex flex-col items-center gap-2.5"
                >
                  <span
                    className={`block aspect-[16/10] w-full overflow-hidden rounded-[14px] transition-[transform,box-shadow] duration-500 ease-spring group-hover:scale-[1.03] group-active:scale-[0.98] ${
                      selected ? "ring-[3px] ring-brand ring-offset-2 ring-offset-bg-secondary" : "ring-1 ring-divider"
                    }`}
                  >
                    {m.render}
                  </span>
                  <span className="text-[13px] font-medium">{m.label}</span>
                  <RadioDot checked={selected} />
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-2 px-4 text-[12.5px] text-text-muted">
          Automatic follows your system&rsquo;s light and dark setting and switches with it.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="section-label mb-2">Accent colour</h3>
        <div className="list-group px-5 py-4">
          <div className="flex flex-wrap items-center gap-3" role="radiogroup" aria-label="Accent colour">
            {ACCENTS.map((a) => {
              const selected = accent === a.id;
              const colour = a.id === "theme" ? undefined : appearance === "light" ? a.swatch[0] : a.swatch[1];
              return (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  title={a.id === "theme" ? "Use the theme's own accent" : a.label}
                  aria-label={a.label}
                  onClick={() => setStoredAccent(a.id)}
                  className={`relative flex h-7 w-7 items-center justify-center rounded-full transition-transform duration-500 ease-bouncy hover:scale-110 active:scale-95 ${
                    selected ? "ring-2 ring-offset-2 ring-offset-bg-secondary" : ""
                  }`}
                  style={{
                    background: colour ?? "conic-gradient(#ff453a, #ff9f0a, #ffd60a, #30d158, #40c8e0, #0a84ff, #bf5af2, #ff375f, #ff453a)",
                    ["--tw-ring-color" as string]: colour ?? "var(--brand)",
                  }}
                >
                  {selected && <span className="h-2.5 w-2.5 rounded-full bg-white shadow" />}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[12.5px] text-text-muted">
            {accent === "theme"
              ? "Using each theme's own accent."
              : `${ACCENTS.find((a) => a.id === accent)?.label} buttons, links and highlights, in every theme.`}
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="section-label mb-2">Messages</h3>
        <div className="list-group p-5">
          <div className="grid grid-cols-2 gap-4">
            {(
              [
                { id: "bubbles", label: "Bubbles", hint: "Like Messages" },
                { id: "classic", label: "Classic", hint: "Compact list" },
              ] as const
            ).map((opt) => {
              const selected = chatStyle === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setChatStyle(opt.id)}
                  aria-pressed={selected}
                  className="group flex flex-col items-center gap-2.5"
                >
                  <span
                    className={`flex h-[104px] w-full flex-col justify-center gap-1.5 overflow-hidden rounded-[14px] bg-bg-primary p-3 transition-[transform,box-shadow] duration-500 ease-spring group-hover:scale-[1.03] ${
                      selected ? "ring-[3px] ring-brand ring-offset-2 ring-offset-bg-secondary" : "ring-1 ring-divider"
                    }`}
                  >
                    {opt.id === "bubbles" ? (
                      <>
                        <span className="h-[14px] w-[58%] rounded-full bg-bubble-in" />
                        <span className="h-[14px] w-[40%] rounded-full bg-bubble-in" />
                        <span className="ml-auto h-[14px] w-[52%] rounded-full bg-brand" />
                        <span className="ml-auto h-[14px] w-[30%] rounded-full bg-brand" />
                      </>
                    ) : (
                      [0, 1, 2].map((i) => (
                        <span key={i} className="flex items-center gap-1.5">
                          <span className="h-[14px] w-[14px] shrink-0 rounded-full bg-fill" />
                          <span className="flex flex-1 flex-col gap-[3px]">
                            <span className="h-[4px] w-1/3 rounded-full bg-text-normal/40" />
                            <span className="h-[4px] rounded-full bg-fill" style={{ width: `${80 - i * 18}%` }} />
                          </span>
                        </span>
                      ))
                    )}
                  </span>
                  <span className="text-center">
                    <span className="block text-[13px] font-medium">{opt.label}</span>
                    <span className="block text-[11.5px] text-text-muted">{opt.hint}</span>
                  </span>
                  <RadioDot checked={selected} />
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="section-label mb-2">Themes</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {THEMES.map((t) => {
            const locked = !!t.plan && plan === "free";
            const selected = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                disabled={locked}
                onClick={() => !locked && pick(t.id)}
                aria-pressed={selected}
                className={`group rounded-[16px] bg-bg-secondary p-2 text-left transition-[transform,box-shadow] duration-500 ease-spring enabled:hover:-translate-y-0.5 enabled:active:scale-[0.98] ${
                  selected ? "ring-[2.5px] ring-brand" : "ring-1 ring-divider"
                } ${locked ? "cursor-not-allowed opacity-55" : ""}`}
              >
                <MiniWindow swatch={t.swatch} className={`aspect-[16/10] w-full ${t.mode === "light" ? "text-black" : "text-white"}`} />
                <div className="flex items-center gap-1.5 px-1 pb-0.5 pt-2">
                  <p className="min-w-0 flex-1 truncate text-[13px] font-semibold">{t.label}</p>
                  {t.plan && <SubscriptionBadge plan={t.plan} />}
                  {locked && <IconLock size={12} className="text-text-muted" />}
                </div>
                <p className="line-clamp-1 px-1 text-[11.5px] text-text-muted">{t.description}</p>
              </button>
            );
          })}
        </div>
        <p className="mt-2 px-4 text-[12.5px] text-text-muted">Themes apply instantly and sync to your account.</p>
      </section>

      <section className="mb-8">
        <h3 className="section-label mb-2">Display</h3>
        <div className="list-group">
          <div className="list-row flex-col items-stretch gap-3 py-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[14.5px]">Interface zoom</span>
              <span className="nums text-[13px] text-text-muted">{Math.round(zoom * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[12px] font-medium text-text-muted" aria-hidden>A</span>
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number.parseFloat(e.target.value))}
                className="ios-range flex-1"
                aria-label="Interface zoom"
                style={{ ["--range-pct" as string]: `${((zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100}%` }}
              />
              <span className="text-[17px] font-medium text-text-muted" aria-hidden>A</span>
            </div>
            <p className="text-[12px] text-text-muted">
              Or hold <span className="kbd">⌘</span> / <span className="kbd">Ctrl</span> and press <span className="kbd">+</span> or <span className="kbd">−</span>; <span className="kbd">0</span> resets.
            </p>
          </div>
          <div className="list-row flex-col items-stretch gap-2.5 py-3.5">
            <div>
              <span className="block text-[14.5px]">Motion</span>
              <span className="block text-[12.5px] text-text-muted">Springs, transitions and message animations.</span>
            </div>
            <Segmented
              ariaLabel="Animation preference"
              value={motion}
              onChange={(next) => {
                setMotion(next);
                setStoredMotion(next);
              }}
              options={[
                { id: "system", label: "System", title: "Follow your OS setting" },
                { id: "full", label: "Full", title: "Always animate" },
                { id: "reduced", label: "Reduced", title: "Calm interface" },
              ]}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
