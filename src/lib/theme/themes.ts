export type ThemeId = "light" | "dark" | "midnight" | "sunset" | "ocean" | "rose-gold" | "plasma" | "nord" | "graphite" | "forest" | "cobalt" | "ember" | "parchment" | "porcelain" | "orchid" | "copper";

/** What the user picked: a theme, or "auto" to follow the OS light/dark setting. */
export type ThemeChoice = ThemeId | "auto";

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  mode?: "light" | "dark";
  description: string;

  /** [canvas, sidebar, content, accent] — drawn as a miniature window. */
  swatch: [string, string, string, string];

  plan?: "aero";
}

export const THEMES: ThemeDefinition[] = [
  {
    id: "light",
    mode: "light",
    label: "Light",
    description: "White panels on a soft grey canvas.",
    swatch: ["#e9e9ee", "#f7f7f9", "#ffffff", "#007aff"],
  },
  {
    id: "dark",
    label: "Dark",
    description: "Graphite panels, easy on the eyes at night.",
    swatch: ["#0b0b0c", "#1c1c1e", "#141416", "#0a84ff"],
  },
  {
    id: "midnight",
    label: "Black",
    description: "True black for OLED displays.",
    swatch: ["#000000", "#000000", "#000000", "#0a84ff"],
  },
  {
    id: "sunset",
    label: "Sunset",
    description: "Warm plum surfaces with a pink accent.",
    swatch: ["#120c0e", "#221a1d", "#1a1316", "#ff375f"],
  },
  {
    id: "ocean",
    label: "Ocean",
    description: "Deep sea blues with a teal accent.",
    swatch: ["#06121a", "#10212c", "#0b1a23", "#40c8e0"],
    plan: "aero",
  },
  {
    id: "rose-gold",
    label: "Rosé",
    description: "Dusky rose with a blush accent.",
    swatch: ["#140e0f", "#261b1d", "#1d1517", "#f4a7b9"],
    plan: "aero",
  },
  {
    id: "plasma",
    label: "Plasma",
    description: "Ink violet with an electric purple accent.",
    swatch: ["#0b0714", "#1b1229", "#140d20", "#bf5af2"],
    plan: "aero",
  },
  {
    id: "nord",
    label: "Nord",
    description: "The Nord palette: arctic slate and frost.",
    swatch: ["#1f242d", "#2e3440", "#272c36", "#88c0d0"],
    plan: "aero",
  },
  { id: "graphite", label: "Graphite", mode: "dark", description: "Neutral greys, no colour at all.", swatch: ["#0e0e0f", "#1f1f21", "#18181a", "#aeaeb2"] },
  { id: "forest", label: "Forest", mode: "dark", description: "Pine greens with a bright leaf accent.", swatch: ["#08110d", "#13211a", "#0e1914", "#30d158"] },
  { id: "cobalt", label: "Cobalt", mode: "dark", description: "Midnight navy and a clear blue.", swatch: ["#070c1a", "#111a33", "#0c1428", "#5e8bff"] },
  { id: "ember", label: "Ember", mode: "dark", description: "Roasted browns with an amber glow.", swatch: ["#140c08", "#251913", "#1c130e", "#ff9f0a"] },
  { id: "parchment", label: "Parchment", mode: "light", description: "Warm paper and sepia ink.", swatch: ["#e9e3d6", "#f6f1e6", "#fcf9f2", "#8a6538"] },
  { id: "porcelain", label: "Porcelain", mode: "light", description: "Cool whites with a crisp blue.", swatch: ["#e3e9f0", "#f3f6fa", "#fbfcfe", "#3478f6"] },
  { id: "orchid", label: "Orchid", mode: "dark", description: "Muted plum with lavender highlights.", swatch: ["#120d16", "#241b2b", "#1b1421", "#da8fff"] },
  { id: "copper", label: "Copper", mode: "dark", description: "Slate blue with burnished copper.", swatch: ["#0c1316", "#1a262c", "#141e23", "#e6a26b"] },
];

/** The theme used when nothing is stored and the OS preference is unknown. */
export const DEFAULT_THEME: ThemeId = "dark";

/** New installs follow the OS, as iOS does. */
export const DEFAULT_THEME_CHOICE: ThemeChoice = "auto";

export const THEME_IDS = THEMES.map((t) => t.id);

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return !!value && (THEME_IDS as string[]).includes(value);
}

export function isThemeChoice(value: string | null | undefined): value is ThemeChoice {
  return value === "auto" || isThemeId(value);
}

export function themeColorScheme(id: ThemeId) {
  return THEMES.find((t) => t.id === id)?.mode ?? "dark";
}

/** "auto" becomes Light or Dark from the OS setting; anything else is itself. */
export function resolveThemeChoice(choice: ThemeChoice, prefersDark: boolean): ThemeId {
  if (choice !== "auto") return choice;
  return prefersDark ? "dark" : "light";
}
