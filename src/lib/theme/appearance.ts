"use client";

import { useSyncExternalStore } from "react";

// Per-device appearance preferences that sit beside the theme: the accent
// colour and how chat messages are laid out. Both are applied without React
// state where possible — the accent is a data attribute on <html> that CSS
// reads (tokens.css), so a change repaints instantly. The chat layout needs a
// different DOM, so it is exposed through a tiny external store.

export type AccentId =
  | "theme"
  | "blue"
  | "indigo"
  | "purple"
  | "pink"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "mint"
  | "teal"
  | "graphite";

export interface AccentDefinition {
  id: AccentId;
  label: string;
  /** Swatch colours [light, dark]; "theme" draws the current theme's own. */
  swatch: [string, string];
}

export const ACCENTS: AccentDefinition[] = [
  { id: "theme", label: "Theme", swatch: ["var(--brand)", "var(--brand)"] },
  { id: "blue", label: "Blue", swatch: ["#007aff", "#0a84ff"] },
  { id: "indigo", label: "Indigo", swatch: ["#5856d6", "#5e5ce6"] },
  { id: "purple", label: "Purple", swatch: ["#af52de", "#bf5af2"] },
  { id: "pink", label: "Pink", swatch: ["#ff2d55", "#ff375f"] },
  { id: "red", label: "Red", swatch: ["#ff3b30", "#ff453a"] },
  { id: "orange", label: "Orange", swatch: ["#ff9500", "#ff9f0a"] },
  { id: "yellow", label: "Yellow", swatch: ["#ffcc00", "#ffd60a"] },
  { id: "green", label: "Green", swatch: ["#34c759", "#30d158"] },
  { id: "mint", label: "Mint", swatch: ["#00c7be", "#63e6e2"] },
  { id: "teal", label: "Teal", swatch: ["#30b0c7", "#40c8e0"] },
  { id: "graphite", label: "Graphite", swatch: ["#8e8e93", "#98989d"] },
];

export type ChatStyle = "bubbles" | "classic";

const ACCENT_KEY = "disband:accent";
const CHAT_STYLE_KEY = "disband:chat-style";

export function isAccentId(value: string | null | undefined): value is AccentId {
  return !!value && ACCENTS.some((a) => a.id === value);
}

export function getStoredAccent(): AccentId {
  try {
    const stored = window.localStorage.getItem(ACCENT_KEY);
    if (isAccentId(stored)) return stored;
  } catch {
    /* Session-only preference. */
  }
  return "theme";
}

export function applyAccent(id: AccentId) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (id === "theme") root.removeAttribute("data-accent");
  else root.setAttribute("data-accent", id);
}

export function setStoredAccent(id: AccentId) {
  applyAccent(id);
  try {
    window.localStorage.setItem(ACCENT_KEY, id);
  } catch {
    /* Session-only preference. */
  }
  emit();
}

// --- Chat layout store --------------------------------------------------

const listeners = new Set<() => void>();
let chatStyle: ChatStyle | null = null;

function emit() {
  for (const l of listeners) l();
}

function readChatStyle(): ChatStyle {
  if (chatStyle) return chatStyle;
  try {
    const stored = window.localStorage.getItem(CHAT_STYLE_KEY);
    chatStyle = stored === "classic" ? "classic" : "bubbles";
  } catch {
    chatStyle = "bubbles";
  }
  return chatStyle;
}

export function setChatStyle(next: ChatStyle) {
  chatStyle = next;
  try {
    window.localStorage.setItem(CHAT_STYLE_KEY, next);
  } catch {
    /* Session-only preference. */
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another window (desktop app, second tab) changed it.
  const onStorage = (e: StorageEvent) => {
    if (e.key === CHAT_STYLE_KEY) {
      chatStyle = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The server snapshot is "bubbles" so the first client render matches it. */
export function useChatStyle(): ChatStyle {
  return useSyncExternalStore(subscribe, readChatStyle, () => "bubbles");
}

export function useAccent(): AccentId {
  return useSyncExternalStore(subscribe, getStoredAccent, () => "theme");
}

// --- Resolved light/dark ------------------------------------------------

function readAppearance(): "light" | "dark" {
  return document.documentElement.getAttribute("data-appearance") === "light" ? "light" : "dark";
}

function subscribeAppearance(listener: () => void) {
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-appearance"] });
  return () => observer.disconnect();
}

/**
 * Whether the palette on screen is light or dark, for the few things CSS
 * variables can't reach (syntax-highlighting themes, canvas drawing). Reads
 * the attribute ThemeProvider sets, so it works outside the provider too.
 */
export function useAppearance(): "light" | "dark" {
  return useSyncExternalStore(subscribeAppearance, readAppearance, () => "dark");
}
