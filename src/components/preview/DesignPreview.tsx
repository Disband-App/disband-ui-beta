"use client";

// Marks the page before any component asks for a Supabase client, so the
// guard in lib/supabase/client.ts hands out the unroutable preview client.
if (typeof window !== "undefined") {
  (window as { __DISBAND_DESIGN_PREVIEW__?: boolean }).__DISBAND_DESIGN_PREVIEW__ = true;
}

import { useEffect, useState } from "react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ContextMenuProvider } from "@/components/ui/ContextMenu";
import { VoiceSessionProvider } from "@/contexts/VoiceSessionContext";
import { DiscordApp } from "@/components/discord/DiscordApp";
import { MockAppProvider } from "./MockAppProvider";

/** The real app shell on sample data, for reviewing the design without an account. */
export function DesignPreview() {
  // Client-only: the sample data is stamped relative to "now", which differs
  // between the server render and hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <ThemeProvider>
      <MockAppProvider>
        <ContextMenuProvider>
          <div className="flex h-screen flex-col">
            <div className="min-h-0 flex-1">
              <VoiceSessionProvider>
                <DiscordApp />
              </VoiceSessionProvider>
            </div>
          </div>
        </ContextMenuProvider>
      </MockAppProvider>
    </ThemeProvider>
  );
}
