"use client";

import { useMemo } from "react";
import type { ChatMessageData } from "./ChatMessage";
import type { ReplyPreview } from "@/lib/messages";
import { IconForward, IconMore, IconReply, IconSmile } from "@/components/icons";

// The iOS tapback set, in its order.
const QUICK_EMOJIS = ["\u{2764}\u{fe0f}", "\u{1f44d}", "\u{1f44e}", "\u{1f602}", "\u{203c}\u{fe0f}", "\u{2753}"];

interface MessageActionBarProps {
  message: ChatMessageData;
  onReply?: (reply: ReplyPreview) => void;
  onForward?: () => void;
  onToggleReaction?: (emoji: string) => void;
  onOpenReactionPicker?: () => void;
  onMoreActions?: (e: React.MouseEvent) => void;
  /** Where the bar anchors: "end" (right edge) or "start" (left edge). */
  align?: "start" | "end";
}

export function MessageActionBar({
  message,
  onReply,
  onForward,
  onToggleReaction,
  onOpenReactionPicker,
  onMoreActions,
  align = "end",
}: MessageActionBarProps) {
  const replyPreview: ReplyPreview | null = useMemo(() => {
    if (!message.id) return null;
    return {
      id: message.id,
      author_id: message.author_id,
      content: message.content,
      attachment_type: message.attachment_type,
      author: message.author
        ? { id: message.author.id, username: message.author.username, display_name: message.author.display_name }
        : undefined,
    };
  }, [message]);

  const btn =
    "flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition-[transform,background-color,color] duration-300 ease-spring hover:bg-interactive-hover hover:text-text-normal active:scale-90";

  return (
    <div
      className={`glass-thick pointer-events-none absolute -top-5 z-10 flex translate-y-1 scale-95 items-center gap-0.5 rounded-full p-[3px] opacity-0 transition-[opacity,transform] duration-300 ease-spring group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:opacity-100 ${
        align === "end" ? "right-0 origin-bottom-right" : "left-0 origin-bottom-left"
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onToggleReaction?.(emoji)}
          className="flex h-7 w-7 items-center justify-center rounded-full text-[15px] leading-none transition-transform duration-300 ease-bouncy hover:scale-[1.3] active:scale-90"
          title={emoji}
          aria-label={`React ${emoji}`}
        >
          {emoji}
        </button>
      ))}

      <div className="mx-0.5 h-4 w-px bg-hairline" />

      <button type="button" onClick={onOpenReactionPicker} className={btn} title="Add Reaction" aria-label="Add reaction">
        <IconSmile size={16} strokeWidth={2} />
      </button>
      <button type="button" onClick={() => onReply?.(replyPreview!)} className={btn} title="Reply" aria-label="Reply">
        <IconReply size={16} strokeWidth={2} />
      </button>
      <button type="button" onClick={onForward} className={btn} title="Forward" aria-label="Forward">
        <IconForward size={16} strokeWidth={2} />
      </button>
      <button type="button" onClick={onMoreActions} className={btn} title="More" aria-label="More actions">
        <IconMore size={16} strokeWidth={2} />
      </button>
    </div>
  );
}
