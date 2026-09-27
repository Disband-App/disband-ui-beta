"use client";

import { AppProvider } from "@/contexts/AppContext";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { MfaChallengeScreen } from "@/components/auth/MfaChallengeScreen";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import Link from "next/link";
import { isTauri } from "@/lib/platform";
import { ActivityIndicator } from "@/components/ui/ActivityIndicator";

function LoginGate() {
  const { ready, session, mfaRequired } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (ready && session && !mfaRequired) {
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/app");
    }
  }, [ready, session, mfaRequired, router]);

  if (ready && session && !mfaRequired) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-canvas text-[13px] text-text-muted">
        <ActivityIndicator size={22} />
        Opening Disband…
      </div>
    );
  }

  if (ready && session && mfaRequired) {
    return (
      <div className="relative min-h-screen bg-canvas">
        <MfaChallengeScreen />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-canvas">
      {!isTauri() && (
        // A navigation-bar back button: chevron and the previous page's name.
        <Link
          href="/home"
          className="press absolute left-4 top-4 z-10 flex items-center gap-0.5 rounded-full py-1.5 pl-1.5 pr-3 text-[15px] font-medium text-brand transition-colors hover:bg-brand/10"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m15 18-6-6 6-6" />
          </svg>
          Home
        </Link>
      )}
      <AuthScreen />
    </div>
  );
}

export default function LoginPage() {
  return (
    <ThemeProvider>
      <AppProvider>
        <LoginGate />
      </AppProvider>
    </ThemeProvider>
  );
}
