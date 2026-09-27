"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useVoiceSession } from "@/contexts/VoiceSessionContext";
import { CallTile, CallGrid } from "./CallTile";
import { CallControls } from "./CallUI";
import { displayName } from "@/lib/utils";
import { requestNotificationPermissionFromGesture } from "@/lib/notifications";
import { IconSpeaker, IconWaveform } from "@/components/icons";

interface VoicePanelProps {
  channelId: string;
  channelName: string;
  onOpenSettings?: () => void;
}

export function VoicePanel({ channelId, channelName, onOpenSettings }: VoicePanelProps) {
  const {
    profile,
    user,
    loadVoicePresence,
    voicePresence,
    micMuted,
    deafened,
    setMicMuted,
    setDeafened,
    setVoiceJoinedChannelId,
  } = useApp();

  const session = useVoiceSession();
  const inThisChannel = session.connectedChannelId === channelId;

  // Join is two-phase (connect sets the channel, the actual media join
  // happens in an effect), so the button needs its own pending state —
  // otherwise it flips from "Join" to nothing with no feedback.
  const [joining, setJoining] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const members = inThisChannel ? session.participants : voicePresence;
  const voice = {
    joined: session.joined && inThisChannel,
    participants: members,
    error: session.error,
    join: () => session.connect(channelId, channelName),
    leave: () => session.disconnect(),
  };

  useEffect(() => {
    if (voice.joined || voice.error) {
      setJoining(false);
      if (voice.error) setActionError(null);
    }
  }, [voice.joined, voice.error]);

  const tiles = [
    ...members.map((p) => {
      const isSelf = p.user_id === user?.id;
      const prof = p.profile ?? { display_name: "?", username: "?" };
      return {
        key: p.user_id,
        profile: prof,
        label: displayName(prof) + (isSelf ? " (you)" : ""),
        stream: inThisChannel
          ? (isSelf ? session.localStream : session.remoteStreams.get(p.user_id)) ?? null
          : null,
        kind: "camera" as const,
        self: isSelf,
        // Remote mute/deafen come from presence (previously dropped, so only
        // the local user ever showed a mute icon). Deafened implies muted.
        muted: isSelf ? micMuted : !!(p.muted || p.deafened),
      };
    }),
    ...members.flatMap((p) => {
      const isSelf = p.user_id === user?.id;
      const stream = isSelf ? session.localScreen : session.remoteScreens.get(p.user_id);
      if (!stream || !inThisChannel) return [];
      const prof = p.profile ?? { display_name: "?", username: "?" };
      return [{
        key: `screen:${p.user_id}`,
        profile: prof,
        label: `${displayName(prof)}'s screen`,
        stream,
        kind: "screen" as const,
        self: false,
        muted: false,
      }];
    }),
  ];

  tiles.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "screen" ? -1 : 1));

  useEffect(() => {
    void loadVoicePresence(channelId);
  }, [channelId, loadVoicePresence]);

  useEffect(() => {
    if (!inThisChannel) session.peek(channelId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inThisChannel, channelId]);

  return (
    <main className="view-enter flex min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="flex h-[58px] shrink-0 items-center gap-2.5 px-4 hairline-b">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${voice.joined ? "bg-status-online/15 text-status-online" : "bg-fill-tertiary text-text-muted"}`}>
          <IconSpeaker size={18} strokeWidth={2} />
        </span>
        <h1 className="text-[16px] font-semibold tracking-[-0.012em]">{channelName}</h1>
        {voice.joined && (
          <span className="pill ml-1 bg-status-online/15 text-status-online">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-online" />
            Connected
          </span>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-hidden px-6 pt-4 pb-4">
        <div className="text-center">
          <div
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] ${
              voice.joined ? "speaking-ring bg-status-online/15 text-status-online" : "bg-fill-tertiary text-text-muted"
            }`}
          >
            <IconWaveform size={36} strokeWidth={1.75} />
          </div>
          <h2 className="large-title mt-4 text-[26px]">{channelName}</h2>
          <p className="mt-1 text-[14px] text-text-muted">
            {voice.joined
              ? `${voice.participants.length} connected`
              : `${voice.participants.length} connected — join to talk`}
          </p>
        </div>

        <CallGrid>
          {tiles.length === 0 ? (
            <p className="px-6 py-10 text-center text-[13.5px] text-text-muted">
              No one is here yet.
              <br />
              Join to start the conversation.
            </p>
          ) : (
            tiles.map((t) => (
              <CallTile
                key={t.key}
                profile={t.profile}
                label={t.label}
                stream={t.stream}
                kind={t.kind}
                self={t.self}
                muted={t.muted}
              />
            ))
          )}
        </CallGrid>

        {(voice.error || actionError) && (
          <p role="alert" className="max-w-md rounded-[14px] bg-status-dnd/12 px-4 py-2.5 text-center text-[13px] text-status-dnd">
            {actionError ?? voice.error}
          </p>
        )}

        <div className="flex flex-col items-center gap-4">
          {!voice.joined ? (
            <button
              type="button"
              disabled={joining}
              onClick={() => {
                setJoining(true);
                setActionError(null);
                void requestNotificationPermissionFromGesture();
                void voice.join();
              }}
              className="btn btn-lg bg-sys-green px-10 text-white shadow-elev-2 hover:brightness-110 disabled:cursor-wait"
            >
              {joining ? "Joining…" : "Join voice"}
            </button>
          ) : (
            <>
              <CallControls
                micMuted={micMuted}
                deafened={deafened}
                onToggleMic={() => setMicMuted(!micMuted)}
                onToggleDeafen={() => {
                  const next = !deafened;
                  setDeafened(next);
                  if (next) setMicMuted(true);
                }}
                onEnd={() => void voice.leave()}
                onOpenSettings={onOpenSettings}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    void session.toggleCamera().catch(() => setActionError("Couldn't access the camera."));
                  }}
                  className={`btn btn-sm ${session.cameraEnabled ? "bg-sys-green text-white" : "btn-gray"}`}
                >
                  {session.cameraEnabled ? "Stop video" : "Turn on camera"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    void session.toggleScreenShare().catch(() => setActionError("Couldn't start screen sharing."));
                  }}
                  className={`btn btn-sm ${session.screenEnabled ? "bg-sys-green text-white" : "btn-gray"}`}
                >
                  {session.screenEnabled ? "Stop sharing" : "Share screen"}
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </main>
  );
}
