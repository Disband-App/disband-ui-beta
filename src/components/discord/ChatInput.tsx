"use client";

import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import type { UploadEntry } from "@/hooks/useMediaUpload";
import { Avatar } from "@/components/ui/Avatar";
import { IconArrowUp, IconCheck, IconClose, IconHash, IconImage, IconPlus, IconPoll } from "@/components/icons";
import { displayName, getMentionQuery, getChannelQuery, getEmojiQuery, getCompletedEmojiToken, normalizeMessageContent } from "@/lib/utils";
import { formatFileSize, type ReplyPreview } from "@/lib/messages";
import { lookupShortcode, searchEmojis, type EmojiMatch } from "@/lib/emoji-shortcodes";
import type { Profile, ServerRole } from "@/lib/supabase/types";
import type { ChannelLite } from "@/lib/markdown";
import { GifPicker } from "./GifPicker";
import { EmojiPicker, EmojiImg } from "./EmojiPicker";
import { PollCreateModal } from "./PollCreateModal";
import { ComposerMarkdown } from "./ComposerMarkdown";
import { useApp } from "@/contexts/AppContext";
import { mentionsTether, TETHER_AERO_NUDGE } from "@/lib/tether-client";

interface ChatInputProps {
  placeholder: string;
  members?: Profile[];
  roles?: ServerRole[];

  channels?: ChannelLite[];
  replyTo?: ReplyPreview | null;
  onClearReply?: () => void;
  editingMessageId?: string | null;
  editingContent?: string;
  onCancelEdit?: () => void;
  onSend: (content: string, options?: { attachment?: { url: string; type: "gif" | "poll" }; replyToId?: string | null; pendingFile?: File; pendingFiles?: File[]; maxUploadBytes?: number }) => Promise<string | null>;
  onTypingActivity?: () => void;
  maxUploadBytes?: number;
  serverId?: string | null;

  allowPolls?: boolean;

  focusSignal?: number;

  /** Whether this surface can invoke Tether ('@tether'). Notes cannot. */
  tetherEnabled?: boolean;
}

interface MentionItem {
  id: string;
  kind: "member" | "role";
  label: string;
  sublabel?: string;
  insert: string;
  color?: string;
  profile?: Profile;
}

function PreviewThumb({ entry, onRemove }: { entry: UploadEntry; onRemove: (id: string) => void }) {
  const type = entry.file.type.startsWith("video/") ? "video" : entry.file.type.startsWith("image/") ? "image" : "file";
  const pct = entry.progress ? Math.max(0, Math.min(100, Math.round(entry.progress.percent))) : null;

  const failed = entry.status === "error";

  return (
    <div className="avatar-pop group relative">
      {type === "video" ? (
        <video src={entry.localUrl} className="h-20 w-20 rounded-[14px] object-cover" />
      ) : type === "file" ? (
        <div className={`flex h-20 w-40 flex-col justify-center rounded-[14px] bg-fill-tertiary px-3 ${failed ? "ring-2 ring-status-dnd" : ""}`}>
          <p className="truncate text-[12.5px] font-semibold">{entry.file.name}</p>
          <p className="text-[11px] text-text-muted">{formatFileSize(entry.file.size)}</p>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={entry.localUrl} alt="" className="h-20 w-20 rounded-[14px] object-cover" />
      )}
      {entry.status === "uploading" && entry.progress ? (
        <span className="absolute inset-x-2 bottom-2 h-1 overflow-hidden rounded-full bg-black/40">
          <span
            className="block h-full rounded-full bg-white transition-[width]"
            style={{ width: `${pct ?? 0}%` }}
          />
        </span>
      ) : null}
      {failed ? (
        <span className="absolute inset-0 flex items-center justify-center rounded-[14px] bg-black/55 text-[11px] font-semibold text-white">
          Failed
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => onRemove(entry.id)}
        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#1d1d1f]/85 text-white ring-2 ring-bg-primary backdrop-blur transition-transform hover:scale-110"
        aria-label="Remove attachment"
      >
        <IconClose size={11} strokeWidth={3} />
      </button>
    </div>
  );
}

/** Visible lines before the composer starts scrolling, matching Discord. */
const COMPOSER_MAX_LINES = 16;

export function ChatInput({
  placeholder,
  members = [],
  roles = [],
  channels = [],
  replyTo,
  onClearReply,
  editingMessageId,
  editingContent,
  onCancelEdit,
  onSend,
  onTypingActivity,
  maxUploadBytes = 50 * 1024 * 1024,
  serverId,
  allowPolls = false,
  focusSignal,
  tetherEnabled = false,
}: ChatInputProps) {
  const [text, setText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [windowDrag, setWindowDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mentionIdx, setMentionIdx] = useState(0);
  const [channelIdx, setChannelIdx] = useState(0);
  const [emojiIdx, setEmojiIdx] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const { entries, add, remove, clear } = useMediaUpload();

  const { subscriptionPlan, tetherProfile } = useApp();

  useEffect(() => {
    if (editingMessageId && editingContent != null) {
      setText(editingContent);
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [editingMessageId, editingContent]);

  useEffect(() => {
    if (!focusSignal || focusSignal <= 0) return;
    const active = document.activeElement;
    if (
      active instanceof HTMLInputElement
      || active instanceof HTMLTextAreaElement
      || active instanceof HTMLSelectElement
      || (active instanceof HTMLElement && active.isContentEditable)
    ) {
      return;
    }
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [focusSignal]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.isComposing) return;

      if (e.key.length !== 1) return;

      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      if (target?.closest("[role='dialog']")) return;

      const el = textareaRef.current;
      if (!el || el === document.activeElement || el.disabled) return;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const topmost = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      );
      if (topmost !== el && !el.contains(topmost)) return;

      el.focus();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const typingActivityRef = useRef(onTypingActivity);
  typingActivityRef.current = onTypingActivity;
  const textRef = useRef(text);
  textRef.current = text;

  // Mount-once interval. The old version depended on `text`, so every
  // keystroke tore the timer down and recreated it (plus an extra immediate
  // ping — redundant, since onChange already pings via onTypingActivity).
  useEffect(() => {
    const id = window.setInterval(() => {
      if (textRef.current.trim()) typingActivityRef.current?.();
    }, 2000);
    return () => window.clearInterval(id);
  }, []);

  const mentionCtx = getMentionQuery(text, cursor);
  const showMentions = !!mentionCtx;

  const emojiCtx = getEmojiQuery(text, cursor);
  const showEmoji = !!emojiCtx && !showMentions;

  const channelCtx = getChannelQuery(text, cursor);
  const showChannels = !!channelCtx && !showMentions && !showEmoji;

  const emojiItems = useMemo((): EmojiMatch[] => {
    if (!emojiCtx) return [];
    return searchEmojis(emojiCtx.query);
  }, [emojiCtx]);

  const channelItems = useMemo((): ChannelLite[] => {
    if (!channelCtx) return [];
    const q = channelCtx.query.toLowerCase();
    return channels
      .filter((c) => q === "" || c.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [channelCtx, channels]);

  useEffect(() => {
    if (!plusMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (plusMenuRef.current?.contains(e.target as Node)) return;
      setPlusMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [plusMenuOpen]);

  // The composer grows to COMPOSER_MAX_LINES before it starts scrolling. The
  // old cap was a flat 84px — about four lines — which made pasting or
  // drafting anything of length feel like typing through a letterbox.
  // Measured from the element's own line-height rather than assumed, so it
  // stays right if the font or density changes.
  const fitComposer = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 21;
    const padding = el.offsetHeight - el.clientHeight
      + parseFloat(getComputedStyle(el).paddingTop)
      + parseFloat(getComputedStyle(el).paddingBottom);
    const max = lineHeight * COMPOSER_MAX_LINES + padding;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
    // Only scroll once it is actually capped, so short drafts never show a bar.
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    fitComposer();
  }, [text, editingMessageId, fitComposer]);

  // Line wrapping depends on width, so re-fit when the composer is resized —
  // a window resize, the member list opening, or a first measure taken while
  // the layout was still settling (which otherwise leaves a tall empty box).
  useEffect(() => {
    const host = textareaRef.current?.parentElement;
    if (!host || typeof ResizeObserver === "undefined") return;
    let width = host.clientWidth;
    const ro = new ResizeObserver(() => {
      if (host.clientWidth === width) return;
      width = host.clientWidth;
      fitComposer();
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, [fitComposer]);

  const mentionItems = useMemo((): MentionItem[] => {
    if (!mentionCtx) return [];
    const q = mentionCtx.query.toLowerCase();
    // Tether is a first-class mention, shown first whenever the query touches
    // it (or the query is empty). It is not a server member, so it gets an
    // explicit entry instead of riding along with the member list.
    const tetherItems: MentionItem[] =
      tetherEnabled && (q === "" || "tether".startsWith(q) || "tether".includes(q))
        ? [
            {
              id: tetherProfile?.id ?? "tether",
              kind: "member" as const,
              label: tetherProfile?.display_name ?? "Tether",
              sublabel: "@tether",
              insert: "@tether",
              profile: tetherProfile ?? undefined,
            },
          ]
        : [];
    const memberItems: MentionItem[] = members
      .filter((m) => m.username && (q === "" || m.username!.toLowerCase().startsWith(q) || displayName(m).toLowerCase().includes(q)))
      .map((m) => ({
        id: m.id,
        kind: "member" as const,
        label: displayName(m),
        sublabel: m.username ? `@${m.username}` : undefined,
        insert: `@${m.username}`,
        profile: m,
      }));
    const roleItems: MentionItem[] = roles
      .filter((r) => q === "" || r.name.toLowerCase().includes(q))
      .map((r) => ({
        id: r.id,
        kind: "role" as const,
        label: r.name,
        sublabel: "Role",
        insert: `@${r.name.replace(/\s+/g, "-").toLowerCase()}`,
        color: r.color,
      }));
    return [...tetherItems, ...memberItems, ...roleItems].slice(0, 8);
  }, [mentionCtx, members, roles, tetherEnabled, tetherProfile]);

  // Validate at pick time so an oversize file never looks stageable only to
  // fail at send (uploadMedia enforces the same limit as a backstop).
  const handleFiles = useCallback((files: FileList | File[]) => {
    setError(null);
    const maxMb = Math.round(maxUploadBytes / (1024 * 1024));
    for (const file of Array.from(files)) {
      if (file.size > maxUploadBytes) {
        setError(`${file.name} is too large (max ${maxMb} MB).`);
        continue;
      }
      if (file.size === 0) {
        setError(`${file.name} is empty.`);
        continue;
      }
      add(file);
    }
  }, [add, maxUploadBytes]);

  const removeFile = useCallback((id: string) => {
    remove(id);
  }, [remove]);

  useEffect(() => {

    let depth = 0;

    const hasFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes("Files");

    const visible = () => {
      const el = textareaRef.current;
      return !!el && el.getClientRects().length > 0;
    };

    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e) || !visible()) return;
      depth += 1;
      setWindowDrag(true);
    };
    const onOver = (e: DragEvent) => {
      if (!hasFiles(e) || !visible()) return;

      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setWindowDrag(false);
    };
    const onDrop = (e: DragEvent) => {
      depth = 0;
      setWindowDrag(false);
      if (!hasFiles(e) || !visible()) return;
      e.preventDefault();
      const files = e.dataTransfer?.files;
      if (files?.length) handleFiles(files);
      textareaRef.current?.focus();
    };

    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [handleFiles]);

  function insertMention(item: MentionItem) {
    if (!mentionCtx || !textareaRef.current) return;
    const before = text.slice(0, mentionCtx.start);
    const after = text.slice(textareaRef.current.selectionStart);
    const next = `${before}${item.insert} ${after}`;
    setText(next);
    setMentionIdx(0);
    requestAnimationFrame(() => {
      const pos = before.length + item.insert.length + 1;
      textareaRef.current?.setSelectionRange(pos, pos);
      textareaRef.current?.focus();
    });
  }

  function insertChannel(item: ChannelLite) {
    if (!channelCtx || !textareaRef.current) return;
    const before = text.slice(0, channelCtx.start);
    const after = text.slice(textareaRef.current.selectionStart);
    const next = `${before}#${item.name} ${after}`;
    setText(next);
    setChannelIdx(0);
    requestAnimationFrame(() => {
      const pos = before.length + item.name.length + 2;
      textareaRef.current?.setSelectionRange(pos, pos);
      textareaRef.current?.focus();
    });
  }

  function insertEmojiFromPicker(item: EmojiMatch) {
    if (!emojiCtx || !textareaRef.current) return;
    const before = text.slice(0, emojiCtx.start);
    const after = text.slice(textareaRef.current.selectionStart);
    const spacer = after && !after.startsWith(" ") ? " " : "";
    const next = `${before}${item.emoji}${spacer}${after}`;
    setText(next);
    setEmojiIdx(0);
    requestAnimationFrame(() => {
      const pos = before.length + item.emoji.length + spacer.length;
      textareaRef.current?.setSelectionRange(pos, pos);
      textareaRef.current?.focus();
    });
  }

  function insertEmoji(emoji: string) {
    const ta = textareaRef.current;
    if (!ta) {
      setText((prev) => prev + emoji);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      const pos = start + emoji.length;
      ta.setSelectionRange(pos, pos);
      ta.focus();
      onTypingActivity?.();
    });
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (editingMessageId) {
      const content = normalizeMessageContent(text);
      if (!content) return;
      setError(null);
      const err = await onSend(content, { replyToId: undefined });
      if (err) {
        setError(err);
        return;
      }
      onCancelEdit?.();
      return;
    }

    const content = normalizeMessageContent(text);
    if (!content && entries.length === 0) return;

    setError(null);
    const replyToId = replyTo?.id;
    const pendingFiles = entries.map((e) => e.file);

    // Clear the composer optimistically, but keep the reply chip until the
    // first message lands: the parent owns reply state, so clearing it early
    // would make it unrecoverable on failure.
    setText("");
    clear();

    // One message carries the caption and every file. This used to loop and
    // send a message per file, which is why a caption and its images landed
    // as separate messages in the wrong order.
    if (pendingFiles.length > 0) {
      const err = await onSend(content, {
        pendingFiles,
        maxUploadBytes,
        replyToId,
      });
      if (err) {
        // Nothing landed — it is one insert now, so there is no partial
        // state to reconcile. Restore the draft exactly as it was. (clear()
        // revoked the preview URLs, so add() re-creates them.)
        setText(content);
        for (const f of pendingFiles) add(f);
        setError(err);
        return;
      }
      onClearReply?.();
      return;
    }

    if (pendingFiles.length === 0 && content) {
      const err = await onSend(content, { replyToId });
      if (err) {
        setText(content);
        setError(err);
        return;
      }
    }
    onClearReply?.();
  }

  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const item of items) {
      if (item.kind !== "file") continue;
      const file = item.getAsFile();
      if (file) files.push(file);
    }
    if (files.length === 0) return;
    e.preventDefault();
    void handleFiles(files);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      if (replyTo) {
        e.preventDefault();
        onClearReply?.();
        return;
      }
      if (editingMessageId) {
        e.preventDefault();
        onCancelEdit?.();
        setText("");
        return;
      }
    }
    if (showMentions && mentionItems.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIdx((i) => (i + 1) % mentionItems.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIdx((i) => (i - 1 + mentionItems.length) % mentionItems.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(mentionItems[mentionIdx] ?? mentionItems[0]);
        return;
      }
    }
    if (showChannels && channelItems.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setChannelIdx((i) => (i + 1) % channelItems.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setChannelIdx((i) => (i - 1 + channelItems.length) % channelItems.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertChannel(channelItems[channelIdx] ?? channelItems[0]);
        return;
      }
    }
    if (showEmoji && emojiItems.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setEmojiIdx((i) => (i + 1) % emojiItems.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setEmojiIdx((i) => (i - 1 + emojiItems.length) % emojiItems.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertEmojiFromPicker(emojiItems[emojiIdx] ?? emojiItems[0]);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  const canSend = !!text.trim() || entries.length > 0;

  return (
    <div className="relative shrink-0 px-4 pb-4 pt-1">
      {windowDrag
        && createPortal(
          <div className="overlay-fade pointer-events-none fixed inset-0 z-[150] flex items-center justify-center bg-overlay-scrim p-8 backdrop-blur-sm">
            <div className="modal-pop flex w-full max-w-md flex-col items-center gap-3 rounded-[28px] bg-overlay-panel px-10 py-12 text-center shadow-elev-4 ring-1 ring-glass-border">
              <span className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-brand text-brand-foreground shadow-elev-2">
                <IconPlus size={30} strokeWidth={2.4} />
              </span>
              <p className="title-2 mt-1">Drop to attach</p>
              <p className="text-[13.5px] text-text-muted">
                Anything you drop here is added to your message before you send it.
              </p>
            </div>
          </div>,
          document.body,
        )}

      {showMentions && mentionItems.length > 0 && (
        <div className="glass-thick popover-pop absolute bottom-full left-4 right-4 z-20 mb-2 max-h-64 overflow-y-auto rounded-[16px] p-1.5" style={{ ["--popover-origin" as string]: "bottom left" }}>
          {(() => {
            let idx = 0;
            const membersList = mentionItems.filter((m) => m.kind === "member");
            const rolesList = mentionItems.filter((m) => m.kind === "role");
            return (
              <>
                {membersList.length > 0 && (
                  <p className="section-label px-2.5 pb-1 pt-1.5 text-[11px]">Members</p>
                )}
                {membersList.map((item) => {
                  const myIdx = idx++;
                  return (
                    <button
                      key={`m-${item.id}`}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); insertMention(item); }}
                      className={`flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-1.5 text-left text-[14px] transition-colors hover:bg-interactive-hover ${
                        mentionIdx === myIdx ? "bg-brand text-brand-foreground hover:bg-brand" : ""
                      }`}
                    >
                      {item.profile && <Avatar profile={item.profile} size="sm" className="h-7 w-7 text-[11px]" />}
                      <span className="truncate font-semibold">{item.label}</span>
                      {item.sublabel && <span className={`ml-auto truncate text-[12px] ${mentionIdx === myIdx ? "opacity-80" : "text-text-muted"}`}>{item.sublabel}</span>}
                    </button>
                  );
                })}
                {rolesList.length > 0 && (
                  <p className="section-label mt-1 px-2.5 pb-1 pt-1.5 text-[11px]">Roles</p>
                )}
                {rolesList.map((item) => {
                  const myIdx = idx++;
                  return (
                    <button
                      key={`r-${item.id}`}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); insertMention(item); }}
                      className={`flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-1.5 text-left text-[14px] transition-colors hover:bg-interactive-hover ${
                        mentionIdx === myIdx ? "bg-interactive-selected" : ""
                      }`}
                    >
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color ?? "#8e8e93" }} />
                      <span className="truncate font-semibold" style={{ color: item.color ?? undefined }}>{item.label}</span>
                      <span className="ml-auto text-[12px] text-text-muted">{item.sublabel}</span>
                    </button>
                  );
                })}
              </>
            );
          })()}
        </div>
      )}

      {showChannels && channelItems.length > 0 && (
        <div className="glass-thick popover-pop absolute bottom-full left-4 right-4 z-20 mb-2 max-h-64 overflow-y-auto rounded-[16px] p-1.5" style={{ ["--popover-origin" as string]: "bottom left" }}>
          <p className="section-label px-2.5 pb-1 pt-1.5 text-[11px]">Channels</p>
          {channelItems.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertChannel(c); }}
              className={`flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-1.5 text-left text-[14px] transition-colors hover:bg-interactive-hover ${
                channelIdx === i ? "bg-brand text-brand-foreground hover:bg-brand" : ""
              }`}
            >
              <IconHash size={15} className="shrink-0 opacity-70" />
              <span className="truncate font-semibold">{c.name}</span>
            </button>
          ))}
        </div>
      )}

      {showEmoji && emojiItems.length > 0 && (
        <div className="glass-thick popover-pop absolute bottom-full left-4 right-4 z-20 mb-2 max-h-64 overflow-y-auto rounded-[16px] p-1.5" style={{ ["--popover-origin" as string]: "bottom left" }}>
          <p className="section-label px-2.5 pb-1 pt-1.5 text-[11px]">Emoji</p>
          {emojiItems.map((item, i) => (
            <button
              key={`e-${item.shortcode}`}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertEmojiFromPicker(item); }}
              className={`flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-1.5 text-left text-[14px] transition-colors hover:bg-interactive-hover ${
                emojiIdx === i ? "bg-brand text-brand-foreground hover:bg-brand" : ""
              }`}
            >
              <EmojiImg emoji={item.emoji} />
              <span className="truncate font-medium">:{item.shortcode}:</span>
            </button>
          ))}
        </div>
      )}

      {(replyTo || editingMessageId) && (
        <div className="popover-pop mb-2 flex items-center gap-2.5 rounded-[14px] bg-fill-tertiary py-2 pl-3 pr-2 text-sm" style={{ ["--popover-origin" as string]: "bottom left" }}>
          <span className="h-8 w-[3px] shrink-0 rounded-full bg-brand" />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-brand">
              {editingMessageId ? "Editing message" : `Replying to ${replyTo?.author ? displayName(replyTo.author as Profile) : "message"}`}
            </p>
            {!editingMessageId && replyTo && (
              <p className="truncate text-[12.5px] text-text-muted">
                {normalizeMessageContent(replyTo.content) || replyTo.attachment_type || "Attachment"}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => { onClearReply?.(); onCancelEdit?.(); setText(""); }}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fill-secondary text-text-muted transition-colors hover:text-text-normal"
            aria-label="Cancel"
          >
            <IconClose size={13} strokeWidth={2.6} />
          </button>
        </div>
      )}

      <form
        onSubmit={submit}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
        }}
        className="relative flex items-end gap-2"
      >
          <div ref={plusMenuRef} className="relative mb-[3px] shrink-0">
            <button
              type="button"
              aria-label="Add attachment"
              aria-expanded={plusMenuOpen}
              disabled={!!editingMessageId}
              title={editingMessageId ? "Finish editing before adding files" : "Attach"}
              onClick={() => {
                if (allowPolls) setPlusMenuOpen((v) => !v);
                else fileRef.current?.click();
              }}
              className={`flex h-[34px] w-[34px] items-center justify-center rounded-full bg-fill-secondary text-text-muted transition-[transform,background-color,color] duration-500 ease-spring hover:bg-fill hover:text-text-normal active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 ${
                plusMenuOpen ? "rotate-45 text-text-normal" : ""
              }`}
            >
              <IconPlus size={19} strokeWidth={2.4} />
            </button>
            {allowPolls && plusMenuOpen && (
              <div className="glass-thick menu-pop absolute bottom-full left-0 z-20 mb-2 w-56 rounded-[14px] p-[5px]" style={{ ["--menu-origin" as string]: "bottom left" }}>
                <button
                  type="button"
                  onClick={() => { setPlusMenuOpen(false); fileRef.current?.click(); }}
                  className="flex h-9 w-full items-center gap-3 rounded-[9px] px-2.5 text-left text-[14px] hover:bg-interactive-selected"
                >
                  <span className="icon-tile h-6 w-6 rounded-[6px] bg-sys-blue"><IconImage size={14} strokeWidth={2.2} /></span>
                  Photos &amp; files
                </button>
                <button
                  type="button"
                  disabled={!!editingMessageId}
                  title={editingMessageId ? "Finish editing before creating a poll" : undefined}
                  onClick={() => { setPlusMenuOpen(false); setPollOpen(true); }}
                  className="flex h-9 w-full items-center gap-3 rounded-[9px] px-2.5 text-left text-[14px] hover:bg-interactive-selected disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="icon-tile h-6 w-6 rounded-[6px] bg-sys-orange"><IconPoll size={14} strokeWidth={2.2} /></span>
                  Poll
                </button>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            multiple
            disabled={!!editingMessageId}
            className="hidden"
            onChange={(e) => { if (e.target.files?.length) void handleFiles(e.target.files); e.target.value = ""; }}
          />

        {/* The field: a capsule that grows with the text, holding the
            emoji and GIF buttons at its trailing edge. */}
        <div
          className={`min-w-0 flex-1 rounded-[20px] bg-bg-primary shadow-[0_0_0_1px_var(--divider)] transition-[box-shadow] duration-200 focus-within:shadow-[0_0_0_1px_color-mix(in_srgb,var(--brand)_55%,transparent),0_0_0_4px_color-mix(in_srgb,var(--brand)_14%,transparent)] ${
            dragOver ? "shadow-[0_0_0_2px_var(--brand)]" : ""
          }`}
        >
          {entries.length > 0 && (
            <div className="flex flex-wrap gap-2.5 px-3 pb-1 pt-3">
              {entries.map((entry) => (
                <PreviewThumb key={entry.id} entry={entry} onRemove={removeFile} />
              ))}
            </div>
          )}

          <div className="flex items-end gap-0.5 py-[3px] pl-3.5 pr-1">
          <div className="relative min-w-0 flex-1 py-[6px]">
            {/* The styled layer. aria-hidden: the textarea is the real input,
                and a screen reader must not read the text twice. */}
            <div
              ref={highlightRef}
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-[6px] bottom-[6px] overflow-hidden whitespace-pre-wrap break-words text-[15px] leading-5 text-text-normal"
            >
              <ComposerMarkdown text={text} />
            </div>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              const next = e.target.value;
              const selStart = e.target.selectionStart;
              const token = getCompletedEmojiToken(next, selStart);
              if (token) {
                const emoji = lookupShortcode(token.code);
                if (emoji) {
                  const replaced = next.slice(0, token.start) + emoji + next.slice(selStart);
                  const pos = token.start + emoji.length;
                  setText(replaced);
                  setCursor(pos);
                  setMentionIdx(0);
                  setEmojiIdx(0);
                  requestAnimationFrame(() => {
                    textareaRef.current?.setSelectionRange(pos, pos);
                  });
                  onTypingActivity?.();
                  return;
                }
              }
              setText(next);
              setCursor(selStart);
              setMentionIdx(0);
              setEmojiIdx(0);
              onTypingActivity?.();
            }}
            onSelect={(e) => setCursor(e.currentTarget.selectionStart)}
            onClick={(e) => setCursor(e.currentTarget.selectionStart)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            placeholder={editingMessageId ? "Edit your message…" : placeholder}
            rows={1}
            className="relative z-[1] block min-h-0 w-full resize-none bg-transparent text-[15px] leading-5 text-transparent caret-brand placeholder:text-label-tertiary focus:outline-none"
            onScroll={(e) => {
              // Keep the styled layer pinned to the textarea once the text is
              // long enough to scroll, or the two drift apart.
              if (highlightRef.current) {
                highlightRef.current.scrollTop = e.currentTarget.scrollTop;
              }
            }}
          />
          </div>
          <EmojiPicker onSelect={insertEmoji} serverId={serverId} />
          <GifPicker
            disabled={!!editingMessageId}
            onSelect={(url) => {
              // Guarded twice (button is also disabled while editing): a GIF
              // must never become a stray new message with an edit left open.
              if (editingMessageId) return;
              void onSend("", { attachment: { url, type: "gif" }, replyToId: replyTo?.id });
              onClearReply?.();
            }}
          />
          {/* Send: springs in once there is something to send, as in Messages. */}
          <button
            type="submit"
            aria-label={editingMessageId ? "Save edit" : "Send message"}
            disabled={!canSend}
            className={`mb-px ml-0.5 flex h-[30px] shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground transition-[width,opacity,transform] duration-500 ease-spring ${
              canSend ? "w-[30px] scale-100 opacity-100" : "pointer-events-none w-0 scale-50 opacity-0"
            }`}
          >
            {editingMessageId ? <IconCheck size={17} strokeWidth={3} /> : <IconArrowUp size={18} strokeWidth={2.8} />}
          </button>
          </div>
        </div>
      </form>
      {error && <p className="px-12 pt-1.5 text-[12px] text-status-dnd">{error}</p>}
      {tetherEnabled && !editingMessageId && subscriptionPlan !== "aero" && mentionsTether(text) && (
        <p className="flex items-center gap-1.5 px-12 pt-1.5 text-[12px] text-text-muted">
          <span aria-hidden>🤖</span> {TETHER_AERO_NUDGE}
        </p>
      )}

      <PollCreateModal
        open={pollOpen}
        onClose={() => setPollOpen(false)}
        onCreated={(pollId) => {
          setPollOpen(false);
          // Same guard as GIFs: never fire a new-message send from edit mode.
          if (editingMessageId) return;
          void onSend("", { attachment: { url: pollId, type: "poll" } }).then((err) => {
            if (err) setError(err);
          });
        }}
      />
    </div>
  );
}
