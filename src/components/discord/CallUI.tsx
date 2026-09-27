"use client";

import { Avatar } from "@/components/ui/Avatar";
import { displayName } from "@/lib/utils";
import {
  IconMic,
  IconMicOff,
  IconHeadphones,
  IconHeadphonesOff,
  IconPhoneOff,
  IconPhone,
  IconSettings,
  IconVideo,
  IconVideoOff,
  IconScreenShare,
  IconScreenShareOff,
} from "@/components/icons";
import type { Profile } from "@/lib/supabase/types";
import { useEffect, useRef, useState } from "react";
import { CallResizeHandle, useCallHeight } from "./CallResizer";
import { useLiveVideoStream } from "@/hooks/useLiveVideoStream";
import { CallGrid } from "./CallTile";

interface CallControlsProps {
  micMuted: boolean;
  deafened: boolean;
  cameraEnabled?: boolean;
  screenShareEnabled?: boolean;
  onToggleMic: () => void;
  onToggleDeafen: () => void;
  onToggleCamera?: () => void;
  onToggleScreenShare?: () => void;
  onEnd: () => void;
  onOpenSettings?: () => void;
}

export function CallControls({
  micMuted, deafened, cameraEnabled, screenShareEnabled,
  onToggleMic, onToggleDeafen, onToggleCamera, onToggleScreenShare,
  onEnd, onOpenSettings,
}: CallControlsProps) {
  const items = [
    { onClick: onToggleMic, title: micMuted ? "Unmute" : "Mute", active: micMuted, on: IconMic, off: IconMicOff },
    // Deafen gets the brand treatment (not the mic's red): at a glance,
    // red ring = muted mic, blue ring = deafened.
    { onClick: onToggleDeafen, title: deafened ? "Undeafen" : "Deafen", active: deafened, on: IconHeadphones, off: IconHeadphonesOff, brand: true },
    ...(onToggleCamera ? [{ onClick: onToggleCamera, title: cameraEnabled ? "Stop video" : "Start video", active: !!cameraEnabled, on: IconVideo, off: IconVideoOff }] : []),
    ...(onToggleScreenShare ? [{ onClick: onToggleScreenShare, title: screenShareEnabled ? "Stop sharing" : "Share screen", active: !!screenShareEnabled, on: IconScreenShare, off: IconScreenShareOff }] : []),
    { onClick: onEnd, title: "End call", active: false, on: IconPhoneOff, off: IconPhoneOff, danger: true },
    ...(onOpenSettings ? [{ onClick: onOpenSettings, title: "Settings", active: false, on: IconSettings, off: IconSettings }] : []),
  ];

  // FaceTime's control bar: a dark glass capsule of round buttons. A control
  // that is switched on (muted, deafened, camera off…) turns white with a
  // dark glyph, and End is always red.
  return (
    <div className="flex items-center gap-2 rounded-full bg-[#1c1c1e]/80 p-2 shadow-elev-3 ring-1 ring-white/10 backdrop-blur-2xl">
      {items.map((item) => {
        const Icon = item.active && item.off ? item.off : item.on;
        const danger = "danger" in item && item.danger;
        return (
          <button
            key={item.title}
            type="button"
            onClick={item.onClick}
            title={item.title}
            aria-label={item.title}
            aria-pressed={danger ? undefined : item.active}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-[transform,background-color,color] duration-300 ease-spring active:scale-90 ${
              danger
                ? "w-14 bg-sys-red text-white hover:brightness-110"
                : item.active
                  ? "bg-white text-[#1c1c1e]"
                  : "bg-white/14 text-white hover:bg-white/22"
            }`}
          >
            <Icon size={20} strokeWidth={2} />
          </button>
        );
      })}
    </div>
  );
}

function ParticipantTile({
  profile,
  stream,
  label,
  mirrored,
  isScreen,
  ring,
  size = "md",
}: {
  profile?: Profile;
  stream?: MediaStream | null;
  label: string;
  mirrored?: boolean;

  isScreen?: boolean;
  ring?: boolean;
  size?: "md" | "lg";
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const hasVideo = useLiveVideoStream(stream);
  const textSize = size === "lg" ? "text-4xl" : "text-3xl";
  const ringClass = ring
    ? "speaking-ring"
    : "ring-1 ring-white/10";

  useEffect(() => {
    if (ref.current && stream && hasVideo) {
      ref.current.srcObject = stream;
      void ref.current.play().catch(() => {});
    }
  }, [stream, hasVideo]);

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div
        className={`relative h-full min-h-0 w-full overflow-hidden rounded-[20px] bg-[#1c1c1e] ${ringClass} ${
          ring ? "shadow-[0_0_24px_rgba(59,165,93,0.3)]" : ""
        }`}
      >
        {hasVideo && stream ? (
          <video
            ref={ref}
            autoPlay
            playsInline
            muted={mirrored || isScreen}
            className={`h-full w-full ${isScreen ? "bg-black object-contain" : "object-cover"} ${
              mirrored && !isScreen ? "scale-x-[-1]" : ""
            }`}
          />
        ) : profile ? (
          <span className="flex h-full w-full items-center justify-center">
            <Avatar profile={profile} size="lg" className="h-20 w-20 text-2xl" />
          </span>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className={`${textSize} font-bold text-white/40`}>{label.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[12.5px] font-semibold text-white backdrop-blur-md">
          <span className="max-w-[160px] truncate">{label}</span>
          {isScreen && (
            <span className="shrink-0 rounded-full bg-status-online/25 px-1.5 text-[10px] uppercase font-semibold tracking-[0.04em] text-status-online">
              Live
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

export function IncomingCallOverlay({ callerName, profile, onAccept, onReject }: {
  callerName: string; profile?: Profile; onAccept: () => void; onReject: () => void;
}) {
  // The iOS incoming-call screen: caller up top on a deep blur, the two
  // answer buttons at the foot, each labelled underneath.
  return (
    <div className="overlay-fade fixed inset-0 z-[100] flex flex-col items-center justify-between bg-black/70 px-8 pb-16 pt-[18vh] text-center text-white backdrop-blur-2xl">
      <div className="call-enter flex flex-col items-center">
        <div className="relative mb-5">
          <div className="call-ring absolute -inset-2 rounded-full" />
          {profile ? (
            <Avatar profile={profile} size="lg" className="relative h-28 w-28 text-4xl" />
          ) : (
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-[linear-gradient(180deg,#a5a9b5,#858a96)] font-rounded text-4xl font-semibold text-white">
              {callerName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <h2 className="font-display text-[34px] font-semibold leading-tight tracking-[-0.02em]">{callerName}</h2>
        <p className="mt-1.5 text-[15px] text-white/60">Disband voice call…</p>
      </div>
      <div className="call-enter flex gap-20">
        <div className="flex flex-col items-center gap-2">
          <button type="button" onClick={onReject} className="press flex h-[72px] w-[72px] items-center justify-center rounded-full bg-sys-red text-white" aria-label="Decline">
            <IconPhoneOff size={30} />
          </button>
          <span className="text-[13px] text-white/80">Decline</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button type="button" onClick={onAccept} className="press flex h-[72px] w-[72px] items-center justify-center rounded-full bg-sys-green text-white" aria-label="Accept">
            <IconPhone size={30} />
          </button>
          <span className="text-[13px] text-white/80">Accept</span>
        </div>
      </div>
    </div>
  );
}

export function GroupRingOverlay({ groupName, onJoin, onDismiss }: {
  groupName: string; onJoin: () => void; onDismiss: () => void;
}) {
  // A banner notification dropping in from the top edge.
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex justify-center px-4">
      <div className="glass-thick island-in pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-[22px] p-3 pr-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-sys-green text-white">
          <IconPhone size={21} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-text-normal">{groupName}</p>
          <p className="truncate text-[12.5px] text-text-muted">Group call started</p>
        </div>
        <button type="button" onClick={onDismiss} className="btn btn-gray btn-sm">Not now</button>
        <button type="button" onClick={onJoin} className="btn btn-sm bg-sys-green text-white hover:brightness-110">Join</button>
      </div>
    </div>
  );
}

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

interface CallPanelProps {
  title: string;
  subtitle: string;
  phase: "outgoing" | "active";
  peer?: Profile;
  selfProfile?: Profile | null;
  localStream?: MediaStream | null;

  localScreen?: MediaStream | null;
  remoteScreen?: MediaStream | null;
  remoteStream?: MediaStream | null;
  connectedAt?: number | null;
  micMuted: boolean;
  deafened: boolean;
  cameraEnabled?: boolean;
  screenShareEnabled?: boolean;
  onToggleMic: () => void;
  onToggleDeafen: () => void;
  onToggleCamera?: () => void;
  onToggleScreenShare?: () => void;
  onEnd: () => void;
  onOpenSettings?: () => void;
}

export function CallPanel({
  title, subtitle, phase, peer, selfProfile, localStream, remoteStream, localScreen, remoteScreen,
  connectedAt, micMuted, deafened, cameraEnabled, screenShareEnabled,
  onToggleMic, onToggleDeafen, onToggleCamera, onToggleScreenShare,
  onEnd, onOpenSettings,
}: CallPanelProps) {
  const { height: callHeight, setHeight: setCallHeight } = useCallHeight();
  const calling = phase === "outgoing";
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (phase !== "active" || !connectedAt) { setElapsed(0); return; }
    const tick = () => setElapsed(Math.max(0, Date.now() - connectedAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, connectedAt]);

  if (calling) {
    return (
      <div className="call-enter flex shrink-0 flex-col items-center justify-center bg-[#0b0b0c] py-10">
        <p className="mb-6 text-[12px] font-medium text-white/45">Calling…</p>
        <div className="flex h-44 w-full max-w-3xl flex-col py-3 sm:h-56">
          <CallGrid>
            {selfProfile && (
              <ParticipantTile profile={selfProfile} label="You" size="md" />
            )}
            {peer && (
              <ParticipantTile profile={peer} label={displayName(peer)} ring size="md" />
            )}
          </CallGrid>
        </div>
        <p className="font-display text-[22px] font-semibold tracking-[-0.02em] text-white">{title}</p>
        <p className="mb-7 mt-1 text-[13px] text-white/50">{subtitle || "Ringing…"}</p>
        <CallControls
          micMuted={micMuted} deafened={deafened}
          cameraEnabled={cameraEnabled} screenShareEnabled={screenShareEnabled}
          onToggleMic={onToggleMic} onToggleDeafen={onToggleDeafen}
          onToggleCamera={onToggleCamera} onToggleScreenShare={onToggleScreenShare}
          onEnd={onEnd} onOpenSettings={onOpenSettings}
        />
      </div>
    );
  }

  return (
    <div
      className="call-enter flex shrink-0 flex-col overflow-hidden bg-[#0b0b0c]"
      style={{ height: callHeight }}
    >
     <div className="flex min-h-0 flex-1 flex-col items-center px-6 pt-3">
      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-sys-green">
        <span className="h-1.5 w-1.5 rounded-full bg-sys-green" />
        Connected
      </p>
      <p className="nums mt-0.5 text-[13px] text-white/55">
        {elapsed > 0 ? formatElapsed(elapsed) : subtitle}
      </p>

      {}
      <div className="flex min-h-0 w-full max-w-3xl flex-1 flex-col py-3">
        <CallGrid>
          {localScreen && (
            <ParticipantTile
              profile={selfProfile ?? undefined} stream={localScreen} isScreen
              label="Your screen" size="md"
            />
          )}
          {remoteScreen && peer && (
            <ParticipantTile
              profile={peer} stream={remoteScreen} isScreen
              label={`${displayName(peer)}'s screen`} size="md"
            />
          )}
          {selfProfile && (
            <ParticipantTile
              profile={selfProfile} stream={localStream} label="You"
              mirrored size="md"
            />
          )}
          {peer && (
            <ParticipantTile
              profile={peer} stream={remoteStream}
              label={displayName(peer)} size="md"
            />
          )}
        </CallGrid>
      </div>

      <div className="shrink-0 pb-3 pt-1">
        <CallControls
          micMuted={micMuted} deafened={deafened}
          cameraEnabled={cameraEnabled} screenShareEnabled={screenShareEnabled}
          onToggleMic={onToggleMic} onToggleDeafen={onToggleDeafen}
          onToggleCamera={onToggleCamera} onToggleScreenShare={onToggleScreenShare}
          onEnd={onEnd} onOpenSettings={onOpenSettings}
        />
      </div>
     </div>
      <CallResizeHandle height={callHeight} onResize={setCallHeight} />
    </div>
  );
}

export function HeaderCallButton({ disabled, onClick }: { disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title="Start voice call"
      aria-label="Start voice call"
      className="tool-btn text-status-online hover:bg-status-online/14 hover:text-status-online disabled:cursor-not-allowed disabled:opacity-40"
    >
      <IconPhone size={18} />
    </button>
  );
}
