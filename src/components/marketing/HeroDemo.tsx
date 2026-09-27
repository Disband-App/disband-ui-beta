"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { IconSpeaker } from "@/components/icons";

// The homepage hero: a miniature of the real app, drawn with the same tokens
// and classes (bubbles, glass, springs), playing a short conversation on a
// loop. It is not a screenshot on purpose — it follows the visitor's light or
// dark setting and whatever accent the page is showing.

type Who = "me" | "ava" | "jordan" | "sam";

const PEOPLE: Record<Exclude<Who, "me">, { display_name: string; accent_color: string; accent_color_2: string }> = {
  ava: { display_name: "Ava", accent_color: "#ff375f", accent_color_2: "#ff9f0a" },
  jordan: { display_name: "Jordan", accent_color: "#0a84ff", accent_color_2: "#5e5ce6" },
  sam: { display_name: "Sam", accent_color: "#30d158", accent_color_2: "#40c8e0" },
};

const SCRIPT: { who: Who; text: string }[] = [
  { who: "ava", text: "anyone up for the lighthouse level tonight?" },
  { who: "jordan", text: "only if Maya brings snacks" },
  { who: "me", text: "already packed 🍿" },
  { who: "sam", text: "lobby's open in Lounge" },
  { who: "me", text: "joining now" },
];

const CHANNELS = ["general", "clips", "looking-for-group", "patch-notes"];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches || document.documentElement.getAttribute("data-motion") === "reduced");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function HeroDemo() {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(reduced ? SCRIPT.length : 0);
  const [typing, setTyping] = useState<Who | null>(null);
  const [fading, setFading] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const clear = () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
    if (reduced) {
      clear();
      setShown(SCRIPT.length);
      setTyping(null);
      return clear;
    }

    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    const run = () => {
      clear();
      setFading(false);
      setShown(0);
      let t = 700;
      SCRIPT.forEach((line, i) => {
        if (line.who !== "me") {
          at(t, () => setTyping(line.who));
          t += 1100;
        }
        at(t, () => {
          setTyping(null);
          setShown(i + 1);
        });
        t += line.who === "me" ? 1100 : 900;
      });
      at(t + 2800, () => setFading(true));
      at(t + 3300, run);
    };
    run();
    return clear;
  }, [reduced]);

  const visible = SCRIPT.slice(0, shown);

  return (
    <div className="relative mx-auto w-full max-w-[1000px]">
      {/* The window. */}
      <div className="overflow-hidden rounded-[22px] bg-canvas shadow-[0_40px_120px_-30px_rgb(0_0_0/0.45),0_0_0_1px_var(--glass-border)]">
        <div className="flex h-10 items-center gap-2 px-4">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex h-[440px] gap-2 px-2 pb-2 sm:h-[480px]">
          {/* Rail */}
          <div className="hidden w-[52px] shrink-0 flex-col items-center gap-2.5 pt-1 md:flex" aria-hidden>
            <span className="h-10 w-10 rounded-[11px] bg-fill-secondary" />
            <span className="h-px w-6 bg-divider" />
            <span className="relative h-10 w-10 rounded-[11px] bg-[linear-gradient(180deg,#7d7aff,#5451d6)] shadow-elev-2">
              <span className="absolute -left-[9px] top-1/2 h-6 w-[4px] -translate-y-1/2 rounded-full bg-text-normal" />
            </span>
            <span className="h-10 w-10 rounded-[11px] bg-[linear-gradient(180deg,#4fd88b,#22a95b)]" />
            <span className="h-10 w-10 rounded-[11px] bg-[linear-gradient(180deg,#ffb147,#f08a0b)]" />
            <span className="h-10 w-10 rounded-[11px] bg-[linear-gradient(180deg,#ff7a93,#e2455f)]" />
          </div>

          {/* Sidebar */}
          <div className="panel-sidebar hidden w-[210px] shrink-0 flex-col p-2.5 md:flex" aria-hidden>
            <p className="px-1.5 pb-2 pt-1 text-[16px] font-bold tracking-[-0.02em] text-text-normal">Night Owls</p>
            <p className="px-2 pb-1 pt-1 text-[11.5px] font-semibold text-text-muted">Hangout</p>
            {CHANNELS.map((c, i) => (
              <span
                key={c}
                className={`mb-px flex h-[30px] items-center gap-2 rounded-[9px] px-2 text-[13px] ${
                  i === 0 ? "bg-brand/14 font-semibold text-text-normal" : "text-text-muted"
                }`}
              >
                <span className={i === 0 ? "text-brand" : ""}>#</span>
                {c}
                {i === 2 && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand" />}
              </span>
            ))}
            <p className="px-2 pb-1 pt-3 text-[11.5px] font-semibold text-text-muted">Voice</p>
            <span className="flex h-[30px] items-center gap-2 rounded-[9px] px-2 text-[13px] text-text-muted"><IconSpeaker size={14} strokeWidth={2} /> Lounge</span>
            <div className="ml-[18px] flex flex-col gap-1 border-l border-hairline pl-3 pt-0.5">
              {(["jordan", "sam"] as const).map((p) => (
                <span key={p} className="flex items-center gap-2 text-[12px] text-text-muted">
                  <Avatar profile={PEOPLE[p]} size="sm" className="h-5 w-5 text-[9px]" />
                  {PEOPLE[p].display_name}
                </span>
              ))}
            </div>
            <div className="mt-auto flex items-center gap-2 rounded-[12px] bg-fill-tertiary p-2">
              <Avatar profile={{ display_name: "Maya", accent_color: "#0a84ff", accent_color_2: "#bf5af2" }} size="sm" className="h-7 w-7 text-[11px]" />
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold text-text-normal">Maya</span>
                <span className="block text-[10.5px] text-text-muted">Online</span>
              </span>
            </div>
          </div>

          {/* Conversation */}
          <div className="panel relative flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="bar-material absolute inset-x-0 top-0 z-10 flex h-12 items-center gap-2 px-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-fill-tertiary text-[13px] font-semibold text-text-muted">#</span>
              <span className="text-[14px] font-semibold text-text-normal">general</span>
              <span className="ml-auto flex -space-x-1.5">
                {(["ava", "jordan", "sam"] as const).map((p) => (
                  <span key={p} className="rounded-full ring-2 ring-bg-primary">
                    <Avatar profile={PEOPLE[p]} size="sm" className="h-6 w-6 text-[10px]" />
                  </span>
                ))}
              </span>
            </div>

            <div
              className={`flex flex-1 flex-col justify-end gap-[3px] px-4 pb-3 pt-14 transition-opacity duration-500 ${fading ? "opacity-0" : "opacity-100"}`}
              aria-live="off"
            >
              <p className="chat-stamp pb-2"><span><b>Today</b> 9:41 PM</span></p>
              {visible.map((line, i) => {
                const own = line.who === "me";
                const next = visible[i + 1];
                const last = !next || next.who !== line.who;
                const prev = visible[i - 1];
                const first = !prev || prev.who !== line.who;
                return (
                  <div
                    key={`${i}-${line.text}`}
                    className={`msg-enter flex items-end gap-2 ${own ? "justify-end" : "justify-start"} ${first ? "mt-2" : ""}`}
                    style={{ ["--bubble-origin" as string]: own ? "bottom right" : "bottom left" }}
                  >
                    {!own && (
                      <span className="relative z-[1] w-7 shrink-0">
                        {last && <Avatar profile={PEOPLE[line.who as Exclude<Who, "me">]} size="sm" className="h-7 w-7 text-[11px]" />}
                      </span>
                    )}
                    <span className="flex max-w-[78%] flex-col">
                      {!own && first && (
                        <span className="mb-0.5 px-3 text-[11px] font-medium text-text-muted">
                          {PEOPLE[line.who as Exclude<Who, "me">].display_name}
                        </span>
                      )}
                      <span
                        className={`bubble ${own ? "bubble-out" : "bubble-in"} text-[14px]`}
                        data-tail={last ? "" : undefined}
                      >
                        {line.text}
                      </span>
                    </span>
                  </div>
                );
              })}
              {typing && (
                <div className="mt-2 flex items-end gap-2">
                  <span className="relative z-[1] w-7 shrink-0">
                    <Avatar profile={PEOPLE[typing as Exclude<Who, "me">]} size="sm" className="h-7 w-7 text-[11px]" />
                  </span>
                  <span className="bubble bubble-in avatar-pop flex h-[30px] items-center gap-[4px] px-3 py-0 text-text-muted" data-tail="">
                    <span className="typing-dot h-[6px] w-[6px]" />
                    <span className="typing-dot h-[6px] w-[6px]" />
                    <span className="typing-dot h-[6px] w-[6px]" />
                  </span>
                </div>
              )}
            </div>

            <div className="px-4 pb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-fill-secondary text-[18px] leading-none text-text-muted">+</span>
                <span className="flex h-[34px] flex-1 items-center rounded-full px-3.5 text-[13.5px] text-label-tertiary shadow-[0_0_0_1px_var(--divider)]">
                  Message #general
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating voice pill, the way the call indicator sits over content. */}
      <div className="island absolute -bottom-5 right-4 hidden items-center gap-3 py-2 pl-2 pr-4 sm:flex md:right-10">
        <span className="flex -space-x-1.5">
          {(["jordan", "sam"] as const).map((p) => (
            <span key={p} className="rounded-full ring-2 ring-[#0b0b0c]">
              <Avatar profile={PEOPLE[p]} size="sm" className="h-7 w-7 text-[11px]" />
            </span>
          ))}
        </span>
        <span className="text-[12.5px]">
          <span className="block font-semibold">Lounge</span>
          <span className="block text-[11px] text-white/60">2 in voice</span>
        </span>
        <span className="flex h-5 items-end gap-[3px]" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="voice-bar w-[3px] rounded-full bg-[#30d158]" style={{ animationDelay: `${i * 0.13}s` }} />
          ))}
        </span>
      </div>
    </div>
  );
}
