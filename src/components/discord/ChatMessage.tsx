"use client";

import { Fragment, type ReactNode } from "react";
import { AttachmentGrid } from "@/components/discord/AttachmentGrid";
import { readAttachments } from "@/lib/message-attachments";
import {
  formatMessageTime, displayName, extractInviteCodes, normalizeMessageContent,
  mentionsEveryone, mentionsUsername,
} from "@/lib/utils";
import { extractGiftCodes } from "@/lib/gifts";
import { renderMarkdown } from "@/lib/markdown";
import {
  CustomEmojiImg,
  isSingleCustomEmoji,
  splitCustomEmojiSegments,
} from "@/lib/custom-emoji";
import { extractPreviewUrls } from "@/lib/link-preview";
import { areLinkPreviewsEnabled } from "@/lib/user-settings";
import { isEmojiOnlyMessage, emojiOnlySizeClass } from "@/lib/emoji";
import { getUsernameStyle } from "@/lib/profileColor";
import { summarizeReactions, type ReactionSummary } from "@/lib/messages";
import { Avatar } from "@/components/ui/Avatar";
import { BotTag } from "@/components/ui/BotTag";
import { PlatformBadge } from "@/components/ui/PlatformBadge";
import { ServerInviteCard } from "./ServerInviteCard";
import { GiftCard } from "@/components/gift/GiftCard";
import { LinkPreviewCard } from "./LinkPreviewCard";
import { MessageAttachment } from "./MessageAttachment";
import { AttachmentUploadCard } from "./AttachmentUploadCard";
import { MessageReactions } from "./MessageReactions";
import { MessageActionBar } from "./MessageActionBar";
import { Twemoji } from "@/components/ui/Twemoji";
import { IconReply } from "@/components/icons";
import { useChatStyle } from "@/lib/theme/appearance";
import type { Profile } from "@/lib/supabase/types";
import type { MessageReaction, ReplyPreview } from "@/lib/messages";
import type { ChannelLite } from "@/lib/markdown";

export interface ChatMessageData {
  id: string;
  display_id?: number;
  author_id: string | null;
  content: string;
  attachment_url?: string | null;
  attachments?: import("@/lib/message-attachments").StoredAttachment[] | null;
  attachment_type?: "image" | "video" | "gif" | "file" | "poll" | "audio" | null;
  attachment_name?: string | null;
  attachment_size?: number | null;
  reply_to_id?: string | null;
  reply_to?: ReplyPreview | null;
  edited_at?: string | null;
  created_at: string;
  mentions?: string[];
  author?: Profile;
  sending?: boolean;
  uploadProgress?: number;
}

interface ChatMessageProps {
  message: ChatMessageData;
  showHeader: boolean;
  compact: boolean;
  /** False when the next message continues this run (same author, close in time). */
  lastInGroup?: boolean;
  /** One-to-one thread: bubbles drop the author's name and avatar, as Messages does. */
  direct?: boolean;
  currentUserId?: string | null;

  currentUserName?: string | null;
  authorColor?: string | null;
  reactions?: MessageReaction[];
  onAuthorClick?: (profile: Profile) => void;
  onAuthorContextMenu?: (profile: Profile, e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onToggleReaction?: (emoji: string) => void;
  onReplyClick?: (messageId: string) => void;
  onJumpToReply?: (messageId: string) => void;
  onDoubleClick?: () => void;
  onReply?: (reply: ReplyPreview) => void;
  onOpenReactionPicker?: () => void;
  onForward?: () => void;
  highlight?: boolean;
  onContentResize?: () => void;
  channels?: ChannelLite[];
  onChannelClick?: (channelId: string) => void;

  customEmoji?: Record<string, string>;
}

function renderCustomEmojiMarkdown(
  text: string,
  members: Profile[],
  onMentionClick: ((profile: Profile) => void) | undefined,
  channels: ChannelLite[] | undefined,
  onChannelClick: ((channelId: string) => void) | undefined,
  customEmoji: Record<string, string> | undefined,
): ReactNode[] {
  const segs = splitCustomEmojiSegments(text, customEmoji);
  if (segs.length <= 1 || !segs.some((s) => s.kind === "emoji")) {
    return renderMarkdown(text, members, onMentionClick, channels, onChannelClick);
  }
  const out: ReactNode[] = [];
  segs.forEach((s, i) => {
    if (s.kind === "emoji") {
      out.push(<CustomEmojiImg key={`e-${i}`} name={s.name} url={s.url} />);
    } else {
      out.push(
        <Fragment key={`t-${i}`}>
          {renderMarkdown(s.text, members, onMentionClick, channels, onChannelClick)}
        </Fragment>,
      );
    }
  });
  return out;
}

/**
 * The pieces of a message body. Bubble layout draws the text inside the
 * bubble and the cards (invites, gifts, link previews) under it, so the two
 * are separate; classic layout renders them together.
 */
function splitBody(content: string, customEmoji: Record<string, string> | undefined) {
  const codes = extractInviteCodes(content);
  const giftCodes = extractGiftCodes(content);
  const previewUrls = areLinkPreviewsEnabled() ? extractPreviewUrls(content) : [];
  const textOnly = content
    .replace(/(?:https?:\/\/[^\s]+)?\/server\/[a-zA-Z0-9]{7}\b/g, "")
    .replace(/(?:https?:\/\/[^\s]+)?\/gift\/[a-zA-Z0-9]{10}\b/g, "")
    .trim();
  const emojiOnly = isEmojiOnlyMessage(textOnly);
  const singleCustom = isSingleCustomEmoji(textOnly, customEmoji);
  return { codes, giftCodes, previewUrls, textOnly, emojiOnly, singleCustom };
}

type BodyParts = ReturnType<typeof splitBody>;

function MessageText({
  parts,
  members,
  compact,
  sending,
  onMentionClick,
  channels,
  onChannelClick,
  customEmoji,
  bubble,
}: {
  parts: BodyParts;
  members: Profile[];
  compact?: boolean;
  sending?: boolean;
  onMentionClick?: (profile: Profile) => void;
  channels?: ChannelLite[];
  onChannelClick?: (channelId: string) => void;
  customEmoji?: Record<string, string>;
  bubble?: boolean;
}) {
  const { textOnly, emojiOnly, singleCustom } = parts;
  if (!textOnly) return null;
  const emojiSizeClass = emojiOnly ? emojiOnlySizeClass(textOnly) : "";
  const normalClass = bubble ? "" : compact ? "text-[15px] leading-[1.35rem]" : "text-[15px] leading-[1.4rem]";
  const tone = bubble ? "" : sending ? "text-text-muted" : "text-text-normal";

  return (
    <div className={`break-words ${tone} ${emojiOnly ? emojiSizeClass || normalClass : normalClass}`}>
      {singleCustom ? (
        <CustomEmojiImg name={singleCustom.name} url={singleCustom.url} size="3em" />
      ) : emojiOnly ? (
        <Twemoji>{textOnly}</Twemoji>
      ) : (
        <Twemoji>{renderCustomEmojiMarkdown(textOnly, members, onMentionClick, channels, onChannelClick, customEmoji)}</Twemoji>
      )}
    </div>
  );
}

function MessageCards({ parts, onContentResize }: { parts: BodyParts; onContentResize?: () => void }) {
  return (
    <>
      {parts.codes.map((code) => (
        <ServerInviteCard key={code} code={code} onLoad={onContentResize} />
      ))}
      {parts.giftCodes.map((code) => (
        <GiftCard key={code} code={code} onLoad={onContentResize} />
      ))}
      {parts.previewUrls.map((url) => (
        <LinkPreviewCard key={url} url={url} onLoad={onContentResize} />
      ))}
    </>
  );
}

function replyLabel(reply: ReplyPreview): { name: string; preview: string } {
  const name = reply.author ? displayName(reply.author as Profile) : "Unknown";
  const preview =
    normalizeMessageContent(reply.content)
    || (reply.attachment_type === "file" ? "Attachment" : reply.attachment_type ?? "Attachment");
  return { name, preview };
}

function ReplyQuote({
  reply,
  onJump,
  bubble,
  own,
}: {
  reply: ReplyPreview;
  onJump?: (id: string) => void;
  bubble?: boolean;
  own?: boolean;
}) {
  // The target may be outside the loaded window (paginated away) or deleted.
  // buildReplyPreviews synthesizes a `deleted` placeholder in that case so
  // the reply doesn't silently lose its quote — show an honest fallback.
  if (reply.deleted) {
    return (
      <div
        className={`mb-1 flex max-w-full items-center gap-1.5 text-[12px] italic text-text-muted ${bubble ? "px-3" : ""}`}
        aria-label="Original message unavailable"
      >
        <IconReply size={12} className="shrink-0 not-italic" />
        <span className="truncate">Original message unavailable</span>
      </div>
    );
  }

  const { name, preview } = replyLabel(reply);

  if (bubble) {
    // Messages-style: a faded outline of the quoted bubble, with who it was.
    return (
      <button
        type="button"
        onClick={() => onJump?.(reply.id)}
        className={`press mb-1 flex max-w-full flex-col gap-0.5 text-left ${own ? "items-end" : "items-start"}`}
      >
        <span className="flex items-center gap-1 px-2 text-[11.5px] font-medium text-text-muted">
          <IconReply size={11} strokeWidth={2.2} className="shrink-0" />
          {name}
        </span>
        <span className="max-w-full truncate rounded-[16px] px-3 py-1.5 text-[13px] leading-snug text-text-muted ring-1 ring-divider transition-colors hover:bg-interactive-hover">
          {preview}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onJump?.(reply.id)}
      className="mb-1 flex max-w-full items-center gap-2 rounded-[8px] py-0.5 pl-2 pr-2 text-left shadow-[inset_2px_0_0_var(--brand)] transition-colors hover:bg-interactive-hover"
    >
      <span className="shrink-0 text-[12.5px] font-semibold text-brand">{name}</span>
      <span className="truncate text-[12.5px] text-text-muted">{preview}</span>
    </button>
  );
}

function SendingSpinner() {
  return (
    <svg className="h-3 w-3 shrink-0 animate-spin text-text-muted" viewBox="0 0 24 24" fill="none" aria-label="Sending">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

const COMPACT_INDENT = "pl-[68px]";

export function ChatMessage({
  message,
  showHeader,
  compact,
  lastInGroup = true,
  direct = false,
  currentUserId,
  currentUserName,
  authorColor,
  reactions = [],
  onAuthorClick,
  onAuthorContextMenu,
  onContextMenu,
  onToggleReaction,
  onJumpToReply,
  onDoubleClick,
  onReply,
  onOpenReactionPicker,
  onForward,
  highlight,
  members = [],
  onContentResize,
  channels,
  onChannelClick,
  customEmoji,
}: ChatMessageProps & { members?: Profile[] }) {
  const chatStyle = useChatStyle();
  const author = message.author;
  const isOwn = message.author_id === currentUserId;
  const isSystem = !message.author_id;
  const nameStyle = authorColor
    ? { color: authorColor }
    : author
      ? getUsernameStyle(author)
      : undefined;
  const canOpenProfile = author && onAuthorClick;
  const body = normalizeMessageContent(message.content);
  const parts = splitBody(body, customEmoji);
  const reactionSummaries: ReactionSummary[] = summarizeReactions(reactions, message.id, currentUserId);

  function openAuthor() {
    if (author && onAuthorClick) onAuthorClick(author);
  }

  // Right-clicking the author opens moderation for that member. It must not
  // fall through to the row handler, which opens the *message* menu.
  function authorContextMenu(e: React.MouseEvent) {
    if (!author || !onAuthorContextMenu) return;
    e.preventDefault();
    e.stopPropagation();
    onAuthorContextMenu(author, e);
  }

  // Uploading sends render the labelled UploadCard (with its own proper
  // progressbar) only while progress is live. The separate thin bar below
  // used to duplicate it, and a progress value stuck at exactly 100 would
  // never swap to the finished attachment: < 100 guarantees the swap.
  const multi = readAttachments(message);
  const attachment = message.attachment_url && message.uploadProgress !== undefined && message.uploadProgress < 100 ? (
    <AttachmentUploadCard
      name={message.attachment_name || "File"}
      size={message.attachment_size}
      type={message.attachment_type}
      progress={message.uploadProgress}
      localUrl={message.attachment_url}
    />
  ) : multi.length > 1 ? (
    // Several files on one message: the mosaic, rather than a stack of cards.
    <AttachmentGrid
      attachments={multi}
      author={author}
      authorColor={authorColor}
      isOwn={isOwn}
      createdAt={message.created_at}
    />
  ) : message.attachment_url ? (
    <MessageAttachment
      url={message.attachment_url}
      type={message.attachment_type}
      name={message.attachment_name}
      size={message.attachment_size}
      onLoad={onContentResize}
      author={author}
      authorColor={authorColor}
      isOwn={isOwn}
      createdAt={message.created_at}
      currentUserId={currentUserId}
    />
  ) : null;

  const reactionBlock = onToggleReaction ? (
    <MessageReactions reactions={reactionSummaries} onToggle={onToggleReaction} />
  ) : null;

  const mentionedYou = !!(
    (currentUserId && message.mentions?.includes(currentUserId))
    || mentionsEveryone(body)
    || mentionsUsername(body, currentUserName)
  );
  const repliedToYou = !!(
    currentUserId
    && message.reply_to?.author_id === currentUserId
    && message.author_id !== currentUserId
  );
  const pingedYou = mentionedYou || repliedToYou;

  const textProps = {
    parts,
    members,
    sending: message.sending,
    onMentionClick: onAuthorClick,
    channels,
    onChannelClick,
    customEmoji,
  };

  const actionBar = (align: "start" | "end") => (
    <MessageActionBar
      message={message}
      onReply={onReply}
      onToggleReaction={onToggleReaction}
      onOpenReactionPicker={onOpenReactionPicker}
      onForward={onForward}
      onMoreActions={onContextMenu}
      align={align}
    />
  );

  if (isSystem) {
    const sysText = normalizeMessageContent(message.content);
    if (!sysText) return null;
    return (
      <article id={`msg-${message.id}`} className="my-3 flex justify-center px-6">
        <p className="max-w-full rounded-full bg-fill-tertiary px-3 py-1 text-center text-[12px] font-medium leading-snug text-text-muted">
          {sysText}
        </p>
      </article>
    );
  }

  // ---------------------------------------------------------------- Bubbles
  if (chatStyle === "bubbles") {
    const timeLabel = formatMessageTime(message.created_at).split(" at ").pop();
    // A bubble only exists for text. Emoji-only messages float free and big,
    // and media stands on its own, as in Messages.
    const hasBubble = !!parts.textOnly && !parts.emojiOnly && !parts.singleCustom;
    const stack = [compact ? "above" : "", lastInGroup ? "" : "below"].filter(Boolean).join(" ");
    const tail = hasBubble && lastInGroup && !attachment;
    const showAvatar = !isOwn && lastInGroup && !direct;
    const showName = !isOwn && showHeader && !direct;

    return (
      <article
        id={`msg-${message.id}`}
        data-own={isOwn ? "true" : "false"}
        className={`group relative flex items-end px-4 ${isOwn ? "justify-end pl-16" : "justify-start pr-16"} ${
          compact ? "mt-[3px]" : "mt-3"
        } ${message.sending ? "msg-enter" : ""}`}
        style={{ ["--bubble-origin" as string]: isOwn ? "bottom right" : "bottom left" }}
        onContextMenu={onContextMenu}
        onDoubleClick={onDoubleClick}
      >
        {!isOwn && !direct && (
          // Stacked above the bubble: the tail's mask would otherwise clip
          // the avatar's edge.
          <div className="relative z-[1] mr-2.5 w-8 shrink-0 self-end">
            {showAvatar && (
              canOpenProfile ? (
                <button
                  type="button"
                  onClick={openAuthor}
                  onContextMenu={authorContextMenu}
                  aria-label={`View ${displayName(author)}`}
                  className="press block rounded-full"
                >
                  <Avatar profile={author} size="sm" />
                </button>
              ) : (
                <Avatar profile={author ?? { display_name: "?" }} size="sm" />
              )
            )}
          </div>
        )}

        <div className={`relative flex min-w-0 max-w-[min(100%,620px)] flex-col ${isOwn ? "items-end" : "items-start"}`}>
          {actionBar(isOwn ? "end" : "start")}

          {showName && (
            <header className="mb-0.5 flex items-center gap-1.5 px-3 text-[12px] leading-tight">
              {canOpenProfile ? (
                <button
                  type="button"
                  onClick={openAuthor}
                  onContextMenu={authorContextMenu}
                  className="font-semibold text-text-muted hover:underline"
                  style={nameStyle}
                >
                  {displayName(author)}
                </button>
              ) : (
                <span className="font-semibold text-text-muted" style={nameStyle}>
                  {displayName(author ?? {})}
                </span>
              )}
              <BotTag profile={author} size="sm" />
              {author && <PlatformBadge userId={author.id} />}
            </header>
          )}

          {message.reply_to && (
            <ReplyQuote reply={message.reply_to} onJump={onJumpToReply} bubble own={isOwn} />
          )}

          {hasBubble ? (
            <div
              className={`bubble ${isOwn ? "bubble-out" : "bubble-in"} ${highlight ? "bubble-flash" : ""} ${message.sending ? "opacity-70" : ""}`}
              data-stack={stack || undefined}
              data-tail={tail ? "" : undefined}
              data-ping={pingedYou && !isOwn ? "" : undefined}
            >
              <MessageText {...textProps} bubble />
              {message.edited_at && (
                <span className="ml-1.5 align-baseline text-[11px] opacity-60">edited</span>
              )}
            </div>
          ) : parts.textOnly ? (
            <div className={`px-1 ${highlight ? "bubble-flash rounded-2xl" : ""}`}>
              <MessageText {...textProps} />
            </div>
          ) : null}

          {(parts.codes.length > 0 || parts.giftCodes.length > 0 || parts.previewUrls.length > 0) && (
            <div className="mt-1 flex max-w-full flex-col gap-1">
              <MessageCards parts={parts} onContentResize={onContentResize} />
            </div>
          )}
          {attachment && <div className={`mt-1 max-w-full ${highlight && !hasBubble ? "bubble-flash rounded-2xl" : ""}`}>{attachment}</div>}
          {reactionBlock}

          {message.sending && lastInGroup && (
            <span className="mt-1 flex items-center gap-1 px-1 text-[11px] text-text-muted">
              <SendingSpinner /> Sending
            </span>
          )}
        </div>

        {/* Hover timestamp beside the bubble, where a swipe would reveal it
            on a phone. */}
        <time
          dateTime={message.created_at}
          className={`pointer-events-none absolute bottom-1 text-[11px] text-text-muted opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${
            isOwn ? "left-4" : "right-4"
          }`}
        >
          {timeLabel}
        </time>
      </article>
    );
  }

  // ---------------------------------------------------------------- Classic
  const editedTag = message.edited_at ? (
    <span className="ml-1 text-[11px] text-text-muted">(edited)</span>
  ) : null;
  const highlightClass = highlight ? "bg-brand/10 ring-1 ring-brand/30" : "";
  const rowBgClass = pingedYou
    ? "bg-[var(--ping-bg)] hover:bg-[var(--ping-bg-hover)] shadow-[inset_3px_0_0_0_var(--ping-bar)]"
    : "hover:bg-interactive-hover/60";
  const replyBlock = message.reply_to ? <ReplyQuote reply={message.reply_to} onJump={onJumpToReply} /> : null;

  if (compact) {
    return (
      <article
        id={`msg-${message.id}`}
        className={`group relative mx-2 rounded-[10px] ${COMPACT_INDENT} py-[1px] pr-3 ${rowBgClass} ${highlightClass} ${message.sending ? "msg-enter" : ""}`}
        onContextMenu={onContextMenu}
        onDoubleClick={onDoubleClick}
      >
        {actionBar("end")}
        <time className="nums pointer-events-none absolute left-1 top-[5px] w-[52px] text-right text-[10.5px] text-text-muted opacity-0 group-hover:opacity-100">
          {formatMessageTime(message.created_at).split(" at ").pop()}
        </time>
        {message.sending && (
          <span className="mr-1 inline-flex items-center"><SendingSpinner /></span>
        )}
        {replyBlock}
        {body && (
          <div className="min-w-0">
            <MessageText {...textProps} compact />
            <MessageCards parts={parts} onContentResize={onContentResize} />
            {editedTag}
          </div>
        )}
        {attachment}
        {reactionBlock}
      </article>
    );
  }

  return (
    <article
      id={`msg-${message.id}`}
      className={`group relative mx-2 mt-3 flex items-start gap-3 rounded-[10px] py-1 pl-2 pr-3 ${rowBgClass} ${highlightClass} ${message.sending ? "msg-enter" : ""}`}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
    >
      {showHeader ? (
        canOpenProfile ? (
          <button
            type="button"
            onClick={openAuthor}
            onContextMenu={authorContextMenu}
            className="press mt-0.5 shrink-0 self-start rounded-full"
          >
            <Avatar profile={author} size="md" />
          </button>
        ) : (
          <Avatar profile={author ?? { display_name: "?" }} size="md" className="mt-0.5 shrink-0 self-start" />
        )
      ) : null}

      <div className="relative min-w-0 flex-1">
        {actionBar("end")}
        {showHeader && (
          <header className="mb-0.5 flex items-baseline gap-2 leading-none">
            {canOpenProfile ? (
              <button
                type="button"
                onClick={openAuthor}
                onContextMenu={authorContextMenu}
                className="text-[15px] font-semibold tracking-[-0.01em] hover:underline"
                style={nameStyle}
              >
                {displayName(author)}
              </button>
            ) : (
              <span className="text-[15px] font-semibold tracking-[-0.01em]" style={nameStyle}>
                {displayName(author ?? {})}
              </span>
            )}
            {isOwn && <span className="pill bg-brand/15 px-1.5 py-0 text-[10px] text-brand">You</span>}
            <BotTag profile={author} size="sm" />
            {author && <PlatformBadge userId={author.id} />}
            <time className="text-[12px] text-text-muted">{formatMessageTime(message.created_at)}</time>
            {message.sending && <SendingSpinner />}
            {editedTag}
          </header>
        )}
        {replyBlock}
        {body && (
          <>
            <MessageText {...textProps} />
            <MessageCards parts={parts} onContentResize={onContentResize} />
          </>
        )}
        {attachment}
        {reactionBlock}
      </div>
    </article>
  );
}

export function shouldGroupMessages(
  prev: ChatMessageData | undefined,
  msg: ChatMessageData,
  currentUserId?: string | null,
  currentUserName?: string | null,
): boolean {
  if (!prev || !prev.author_id || !msg.author_id) return false;
  if (prev.author_id !== msg.author_id) return false;
  if (msg.reply_to_id) return false;
  // Grouped rows hide the header (avatar, name, full timestamp), so anything
  // that changes how the row reads starts a new group instead.
  if (new Date(prev.created_at).toDateString() !== new Date(msg.created_at).toDateString()) return false;
  if (msg.edited_at) return false;
  if (currentUserId && messagePingsUser(msg, currentUserId, currentUserName)) return false;
  const gap = new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime();
  return gap >= 0 && gap <= 7 * 60 * 1000;
}

function messagePingsUser(
  msg: ChatMessageData,
  currentUserId: string,
  currentUserName?: string | null,
): boolean {
  const body = normalizeMessageContent(msg.content);
  return !!(
    msg.mentions?.includes(currentUserId)
    || mentionsEveryone(body)
    || mentionsUsername(body, currentUserName)
    || (msg.reply_to?.author_id === currentUserId && msg.author_id !== currentUserId)
  );
}

export function buildReplyPreviews<T extends ChatMessageData>(messages: T[]): T[] {
  const map = new Map(messages.map((m) => [m.id, m]));
  return messages.map((m) => {
    if (!m.reply_to_id) return m;
    const target = map.get(m.reply_to_id);
    if (!target) {
      // Target outside the loaded window (paginated or trimmed away) or
      // deleted: synthesize a placeholder so the reply keeps its quote.
      // Callers that already resolved a richer preview keep it.
      if (m.reply_to) return m;
      return {
        ...m,
        reply_to: {
          id: m.reply_to_id,
          author_id: null,
          content: "",
          attachment_type: null,
          deleted: true,
        },
      };
    }
    return {
      ...m,
      reply_to: {
        id: target.id,
        author_id: target.author_id,
        content: target.content,
        attachment_type: target.attachment_type,
        author: target.author
          ? { id: target.author.id, username: target.author.username, display_name: target.author.display_name }
          : undefined,
      },
    };
  });
}
