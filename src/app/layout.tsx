import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { THEMES } from "@/lib/theme/themes";
import { PUBLIC_ENV } from "@/lib/public-env";

export const SITE_URL = PUBLIC_ENV.webAppUrl;

const homeDescription =
  "Disband is a free, privacy-first chat app for your people — spaces and channels, direct messages, group chats, and WebRTC voice and video calls across desktop, mobile, and the web.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Disband",
    template: "%s — Disband",
  },
  description: homeDescription,
  applicationName: "Disband",
  category: "communication",
  keywords: [
    "Disband",
    "chat app",
    "Discord alternative",
    "voice chat",
    "video calls",
    "free chat",
    "spaces and channels",
    "group chat",
    "privacy-focused chat",
    "community chat",
  ],
  authors: [{ name: "Disband" }],
  creator: "Disband",
  publisher: "Disband",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Disband",
    title: "Disband — A place for your people to talk",
    description: homeDescription,
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Disband — A place for your people to talk",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Disband — A place for your people to talk",
    description: homeDescription,
    images: ["/opengraph-image"],
  },
  icons: {

    icon: "/logo.png",
    shortcut: "/favicon.png",

    apple: "/logo-app.png",
  },
  appleWebApp: {
    title: "Disband",
    statusBarStyle: "black-translucent",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e9e9ee" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0c" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" data-appearance="dark" suppressHydrationWarning>
      <head>
        <meta name="referrer" content="no-referrer" />
        <Script id="theme-init" strategy="beforeInteractive">
          {`
(function () {
  var root = document.documentElement;
  var themes = ${JSON.stringify(THEMES.map(t=>({id:t.id,mode:t.mode||"dark"}))).replace(/</g,"\\u003c")};
  var mq = null;
  try { mq = window.matchMedia('(prefers-color-scheme: dark)'); } catch (e) {}
  function apply(choice) {
    var id = choice === 'auto' ? (mq && !mq.matches ? 'light' : 'dark') : choice;
    var t = themes.find(function (x) { return x.id === id; }) || { id: 'dark', mode: 'dark' };
    root.setAttribute('data-theme', t.id);
    root.setAttribute('data-appearance', t.mode);
    root.style.colorScheme = t.mode;
  }
  var choice = 'auto';
  try {
    var stored = localStorage.getItem('disband:theme');
    if (stored === 'auto' || themes.some(function (x) { return x.id === stored; })) choice = stored;
  } catch (e) {}
  apply(choice);
  /* Pages without the app's ThemeProvider (marketing, legal) still follow
     the OS live while on Automatic. The provider re-applies on its own. */
  if (mq && mq.addEventListener) {
    mq.addEventListener('change', function () {
      var current = 'auto';
      try { current = localStorage.getItem('disband:theme') || 'auto'; } catch (e) {}
      if (current === 'auto') apply('auto');
    });
  }
  try {
    var accent = localStorage.getItem('disband:accent');
    if (accent && accent !== 'theme' && /^[a-z]+$/.test(accent)) root.setAttribute('data-accent', accent);
  } catch (e) {}
  try {
    var motion = localStorage.getItem('disband:motion');
    if (motion === 'reduced' || motion === 'full') {
      root.setAttribute('data-motion', motion);
    }
  } catch (e) {}
})();
          `}
        </Script>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
