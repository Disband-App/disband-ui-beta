import Link from "next/link";
import { MarketingFooter, MarketingNav } from "./MarketingLayout";
import { DownloadSection } from "./DownloadSection";
import { HeroDemo } from "./HeroDemo";
import { RevealObserver } from "./RevealObserver";
import { AccentPlayground } from "./AccentPlayground";
import { LiveOnlineCount } from "./LiveOnlineCount";
import { THEMES, type ThemeId } from "@/lib/theme/themes";
import {
  IconGavel,
  IconHeadphones,
  IconLock,
  IconMicOff,
  IconPhoneOff,
  IconReply,
  IconScreenShare,
  IconShieldCheck,
  IconSpeaker,
  IconVideo,
} from "@/components/icons";

// Themes shown as live miniatures further down. Each is rendered with its own
// data-theme, so these are the real palettes, not pictures of them.
const GALLERY: ThemeId[] = ["light", "dark", "sunset", "forest", "porcelain", "midnight"];

function ThemeMiniature({ id }: { id: ThemeId }) {
  const theme = THEMES.find((t) => t.id === id)!;
  return (
    <figure className="reveal group" style={{ ["--i" as string]: GALLERY.indexOf(id) }}>
      <div
        data-theme={id}
        data-appearance={theme.mode ?? "dark"}
        className="flex aspect-[4/3] gap-1.5 rounded-[20px] bg-canvas p-1.5 text-text-normal shadow-[0_0_0_1px_var(--glass-border)] transition-transform duration-700 ease-smooth group-hover:-translate-y-1"
      >
        <div className="panel-sidebar hidden w-[34%] flex-col gap-1 p-2 sm:flex">
          <span className="mb-1 h-2 w-3/4 rounded-full bg-text-normal/70" />
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`flex h-4 items-center gap-1 rounded-[5px] px-1 ${i === 0 ? "bg-brand/15" : ""}`}>
              <span className={`h-1 w-1 rounded-full ${i === 0 ? "bg-brand" : "bg-text-muted"}`} />
              <span className={`h-1 rounded-full ${i === 0 ? "w-3/5 bg-text-normal/60" : "w-2/5 bg-text-muted/50"}`} />
            </span>
          ))}
        </div>
        <div className="panel flex flex-1 flex-col justify-end gap-[3px] p-2.5">
          <span className="bubble bubble-in w-fit px-2.5 py-1 text-[11px]" data-stack="below">see you there?</span>
          <span className="bubble bubble-in w-fit px-2.5 py-1 text-[11px]" data-stack="above" data-tail="">8pm</span>
          <span className="bubble bubble-out mt-1.5 w-fit self-end px-2.5 py-1 text-[11px]" data-tail="">on my way</span>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-[13px] text-text-muted">
        <span className="font-semibold text-text-normal">{theme.label}</span>
        {theme.plan ? " · Aero" : ""}
      </figcaption>
    </figure>
  );
}

function Feature({
  eyebrow,
  title,
  body,
  children,
  flip = false,
}: {
  eyebrow: string;
  title: string;
  body: React.ReactNode;
  children: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <div className={`grid items-center gap-10 md:grid-cols-2 md:gap-16 ${flip ? "md:[&>*:first-child]:order-2" : ""}`}>
      <div className="reveal">
        <p className="text-[14px] font-semibold text-brand">{eyebrow}</p>
        <h3 className="mt-2 font-display text-[32px] font-bold leading-[1.08] tracking-[-0.03em] sm:text-[40px]">{title}</h3>
        <div className="mt-4 max-w-md text-[17px] leading-relaxed text-text-muted">{body}</div>
      </div>
      <div className="reveal" style={{ ["--i" as string]: 1 }}>
        {children}
      </div>
    </div>
  );
}

export function MarketingHomePage() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-normal">
      <RevealObserver />
      <MarketingNav />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-canvas px-5 pb-24 pt-32 sm:pt-40">
          <div className="mx-auto max-w-[1080px] text-center">
            <p className="marketing-fade-up inline-flex items-center gap-2 text-[13px] font-medium text-text-muted">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-status-online opacity-60" />
                <span className="relative h-2 w-2 rounded-full bg-status-online" />
              </span>
              <LiveOnlineCount format={(n) => (n === null ? "People are talking right now" : `${n.toLocaleString()} ${n === 1 ? "person" : "people"} online right now`)} />
            </p>
            <h1 className="marketing-fade-up marketing-delay-1 mx-auto mt-5 max-w-[14ch] font-display text-[48px] font-bold leading-[1.02] tracking-[-0.04em] sm:text-[76px]">
              Your space to talk, hang out, and belong.
            </h1>
            <p className="marketing-fade-up marketing-delay-2 mx-auto mt-6 max-w-[34rem] text-[19px] leading-relaxed text-text-muted">
              Communities, group chats and calls in one app — with messages that feel like texting and
              voice that starts with a single click.
            </p>
            <div className="marketing-fade-up marketing-delay-3 mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link href="/app" className="btn btn-filled btn-lg px-7">
                Open Disband
              </Link>
              <a href="#download" className="btn btn-gray btn-lg px-7">
                Download
              </a>
            </div>
            <p className="marketing-fade-up marketing-delay-3 mt-4 text-[13px] text-text-muted">
              Free on Mac, Windows, Linux, iPhone and the web.
            </p>
          </div>

          <div className="marketing-fade-up marketing-delay-3 mt-16 sm:mt-20">
            <HeroDemo />
          </div>
        </section>

        {/* Features */}
        <section className="px-5 py-24 sm:py-32">
          <div className="mx-auto max-w-[1080px] space-y-28 sm:space-y-36">
            <Feature
              eyebrow="Messages"
              title="Chat that feels like texting."
              body={
                <>
                  <p>
                    Replies, reactions, GIFs, polls and files, in bubbles that sit right next to your
                    texts. Runs of messages stack, timestamps appear when the conversation picks back up,
                    and new messages spring into place.
                  </p>
                  <p className="mt-3">Prefer a dense list? Switch to Classic in Settings.</p>
                </>
              }
            >
              <div className="rounded-[28px] bg-bg-secondary p-6 shadow-[0_0_0_1px_var(--panel-border)]" style={{ ["--tail-mask" as string]: "var(--bg-secondary)" }}>
                <div className="flex flex-col gap-[3px]">
                  <p className="chat-stamp pt-0"><span><b>Yesterday</b> 11:02 PM</span></p>
                  <div className="flex items-end gap-2">
                    <span className="h-7 w-7 shrink-0 rounded-full bg-[linear-gradient(135deg,#ff9f0a,#ff375f)]" />
                    <div className="flex flex-col gap-[3px]">
                      <span className="px-3 text-[11px] font-medium text-text-muted">Jordan</span>
                      <span className="bubble bubble-in w-fit text-[14px]" data-stack="below">did the patch fix your audio?</span>
                      <span className="bubble bubble-in w-fit text-[14px]" data-stack="above" data-tail="">mine&apos;s still crackling</span>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-col items-end gap-[3px]">
                    <span className="flex max-w-full flex-col items-end">
                      <span className="flex items-center gap-1 px-2 text-[11px] font-medium text-text-muted"><IconReply size={11} strokeWidth={2.2} /> Jordan</span>
                      <span className="max-w-full truncate rounded-[16px] px-3 py-1 text-[12.5px] text-text-muted ring-1 ring-divider">mine&apos;s still crackling</span>
                    </span>
                    <span className="bubble bubble-out w-fit text-[14px]" data-tail="">set the sample rate to 48k 🎧</span>
                    <span className="mt-1 flex gap-1">
                      <span className="inline-flex h-[26px] items-center gap-1 rounded-full bg-brand/18 px-2 text-[12.5px] text-brand ring-1 ring-brand/40">🙏 <b className="font-rounded">2</b></span>
                    </span>
                  </div>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="h-7 w-7 shrink-0 rounded-full bg-[linear-gradient(135deg,#ff9f0a,#ff375f)]" />
                    <span className="bubble bubble-in flex h-[30px] items-center gap-[4px] px-3 py-0 text-text-muted" data-tail="">
                      <span className="typing-dot h-[6px] w-[6px]" />
                      <span className="typing-dot h-[6px] w-[6px]" />
                      <span className="typing-dot h-[6px] w-[6px]" />
                    </span>
                  </div>
                </div>
              </div>
            </Feature>

            <Feature
              flip
              eyebrow="Spaces"
              title="A space for every group you're in."
              body={
                <p>
                  Channels grouped into categories, roles and permissions, invite links, and the
                  moderation tools a community actually needs — laid out in a sidebar you&apos;ll
                  recognise from your iPad.
                </p>
              }
            >
              <div className="flex gap-3 rounded-[28px] bg-canvas p-3 shadow-[0_0_0_1px_var(--panel-border)]">
                <div className="flex flex-col items-center gap-2 pt-1">
                  {["#7d7aff,#5451d6", "#4fd88b,#22a95b", "#ffb147,#f08a0b", "#ff7a93,#e2455f"].map((g, i) => (
                    <span key={g} className="relative h-11 w-11 rounded-[12px]" style={{ background: `linear-gradient(180deg,${g.split(",")[0]},${g.split(",")[1]})` }}>
                      {i === 0 && <span className="absolute -left-[9px] top-1/2 h-7 w-[4px] -translate-y-1/2 rounded-full bg-text-normal" />}
                    </span>
                  ))}
                  <span className="grid h-11 w-11 grid-cols-2 place-items-center gap-[3px] rounded-[12px] bg-fill-secondary p-[7px]">
                    {["#5e9cff", "#c07cff", "#4fd0e6", "#ffb147"].map((c) => (
                      <span key={c} className="h-3.5 w-3.5 rounded-[4px]" style={{ background: c }} />
                    ))}
                  </span>
                </div>
                <div className="panel-sidebar flex-1 p-3">
                  <p className="px-1.5 pb-2 text-[17px] font-bold tracking-[-0.02em]">Design Club</p>
                  <p className="px-2 pb-1 text-[11.5px] font-semibold text-text-muted">Studio</p>
                  {[
                    ["critique", true, 0],
                    ["typography", false, 3],
                    ["inspiration", false, 0],
                  ].map(([name, active, mentions]) => (
                    <span key={name as string} className={`mb-px flex h-[32px] items-center gap-2 rounded-[10px] px-2.5 text-[14px] ${active ? "bg-brand/14 font-semibold" : "text-text-muted"}`}>
                      <span className={active ? "text-brand" : ""}>#</span>
                      {name as string}
                      {(mentions as number) > 0 && <span className="count-badge ml-auto">{mentions as number}</span>}
                    </span>
                  ))}
                  <p className="px-2 pb-1 pt-3 text-[11.5px] font-semibold text-text-muted">Voice</p>
                  <span className="flex h-[32px] items-center gap-2 rounded-[10px] px-2.5 text-[14px] text-text-muted">
                    <IconSpeaker size={15} strokeWidth={2} /> Studio Call
                    <span className="nums ml-auto rounded-full bg-status-online/14 px-1.5 text-[10.5px] font-semibold text-status-online">12:04</span>
                  </span>
                </div>
              </div>
            </Feature>

            <Feature
              eyebrow="Voice & video"
              title="Calls without the meeting link."
              body={
                <p>
                  One-to-one and group calls over WebRTC, straight from a conversation. Mute, deafen,
                  camera and screen sharing live in one control bar that stays out of the way.
                </p>
              }
            >
              <div className="relative overflow-hidden rounded-[28px] bg-[#0b0b0c] p-5 text-white">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["M", "#0a84ff,#5e5ce6", true],
                    ["J", "#ff9f0a,#ff375f", false],
                    ["S", "#30d158,#40c8e0", false],
                    ["A", "#bf5af2,#ff375f", false],
                  ].map(([l, g, speaking]) => (
                    <div key={l as string} className={`flex aspect-[4/3] items-center justify-center rounded-[18px] bg-[#1c1c1e] ${speaking ? "speaking-ring" : "ring-1 ring-white/10"}`}>
                      <span className="flex h-14 w-14 items-center justify-center rounded-full font-rounded text-[22px] font-semibold" style={{ background: `linear-gradient(135deg,${(g as string).split(",")[0]},${(g as string).split(",")[1]})` }}>
                        {l as string}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-full bg-[#1c1c1e]/80 p-2 ring-1 ring-white/10">
                  {[IconMicOff, IconHeadphones, IconVideo, IconScreenShare].map((Glyph, i) => (
                    <span key={i} className={`flex h-10 w-10 items-center justify-center rounded-full ${i === 0 ? "bg-white text-[#1c1c1e]" : "bg-white/14"}`}>
                      <Glyph size={18} strokeWidth={2} />
                    </span>
                  ))}
                  <span className="flex h-10 w-14 items-center justify-center rounded-full bg-[#ff453a]">
                    <IconPhoneOff size={18} strokeWidth={2} />
                  </span>
                </div>
              </div>
            </Feature>
          </div>
        </section>

        {/* Personalisation */}
        <section className="bg-canvas px-5 py-24 sm:py-32">
          <div className="mx-auto max-w-[1080px]">
            <div className="reveal mx-auto max-w-2xl text-center">
              <p className="text-[14px] font-semibold text-brand">Make it yours</p>
              <h2 className="mt-2 font-display text-[36px] font-bold leading-[1.06] tracking-[-0.03em] sm:text-[52px]">
                Light, dark, or somewhere in between.
              </h2>
              <p className="mt-4 text-[17px] leading-relaxed text-text-muted">
                Sixteen themes, eleven accent colours, and an Automatic mode that follows your system
                from day into night. Pick an accent below — it&apos;s the real thing.
              </p>
            </div>
            <div className="reveal mx-auto mt-12 max-w-3xl" style={{ ["--i" as string]: 1 }}>
              <AccentPlayground />
            </div>
            <div className="mt-16 grid grid-cols-2 gap-5 md:grid-cols-3">
              {GALLERY.map((id) => (
                <ThemeMiniature key={id} id={id} />
              ))}
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="px-5 py-24 sm:py-28">
          <div className="mx-auto grid max-w-[1080px] gap-5 md:grid-cols-3">
            {[
              {
                tint: "linear-gradient(180deg,#9a9aa3,#6f6f78)",
                Glyph: IconLock,
                title: "Two-factor sign-in",
                body: "Protect your account with an authenticator app or a passkey.",
              },
              {
                tint: "linear-gradient(180deg,#4fd88b,#22a95b)",
                Glyph: IconShieldCheck,
                title: "Private conversations",
                body: "Messages and media stay between the people in the conversation.",
              },
              {
                tint: "linear-gradient(180deg,#ffb147,#f08a0b)",
                Glyph: IconGavel,
                title: "Tools for moderators",
                body: "Roles, timeouts, bans and an audit log for every space.",
              },
            ].map((item, i) => (
              <div key={item.title} className="reveal rounded-[24px] bg-bg-secondary p-6 shadow-[0_0_0_1px_var(--panel-border)]" style={{ ["--i" as string]: i }}>
                <span className="icon-tile h-10 w-10 rounded-[10px]" style={{ background: item.tint }}>
                  <item.Glyph size={20} strokeWidth={2.1} />
                </span>
                <h3 className="mt-4 text-[19px] font-semibold tracking-[-0.015em]">{item.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <DownloadSection />

        {/* Closing call to action */}
        <section className="bg-canvas px-5 py-24 text-center sm:py-32">
          <div className="reveal mx-auto max-w-2xl">
            <h2 className="font-display text-[36px] font-bold leading-[1.06] tracking-[-0.03em] sm:text-[52px]">
              Your people are waiting.
            </h2>
            <p className="mt-4 text-[17px] text-text-muted">Free to join. No card, no trial timer.</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/login" className="btn btn-filled btn-lg px-7">
                Create an account
              </Link>
              <Link href="/app" className="btn btn-plain btn-lg">
                Open in browser ›
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
