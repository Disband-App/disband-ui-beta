"use client";

import { AppProvider } from "@/contexts/AppContext";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";
import { MfaStepUpForm } from "@/components/auth/MfaStepUpForm";
import { AppIcon } from "@/components/ui/AppIcon";
import { useApp } from "@/contexts/AppContext";
import { recoverSessionFromUrl } from "@/lib/recover-session-from-url";
import { getMfaAssurance } from "@/lib/mfa";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isTauri } from "@/lib/platform";

function ResetPasswordGate() {
  const { ready, session, updatePassword, configured } = useApp();
  const router = useRouter();
  const [linkReady, setLinkReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const [needsMfa, setNeedsMfa] = useState(false);

  useEffect(() => {
    if (!configured || !ready) return;
    void (async () => {
      const { error } = await recoverSessionFromUrl();
      setLinkError(error);
      if (!error) {
        const { mfaRequired } = await getMfaAssurance();
        setNeedsMfa(mfaRequired);
      }
      setLinkReady(true);
    })();
  }, [configured, ready]);

  if (!configured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas p-6 text-center text-text-muted">
        Supabase is not configured.
      </div>
    );
  }

  if (!ready || !linkReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-text-muted">
        Loading…
      </div>
    );
  }

  const canReset = !!session && !linkError;

  return (
    <div className="relative min-h-screen bg-canvas">
      {!isTauri() && (
        <Link
          href="/login"
          className="press absolute left-4 top-4 z-10 flex items-center gap-1 rounded-full px-3 py-1.5 text-[15px] font-medium text-brand transition-colors hover:bg-brand/10"
        >
          ← Back to log in
        </Link>
      )}
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="view-enter w-full max-w-sm rounded-[24px] bg-bg-secondary p-8 shadow-elev-3 ring-1 ring-glass-border">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex justify-center">
              <AppIcon size={64} />
            </div>
            <h1 className="title-2 mt-3">Choose a new password</h1>
            <p className="mt-1 text-sm text-text-muted">
              {!canReset
                ? "This reset link is invalid or has expired."
                : needsMfa
                  ? "One more step before you can set it."
                  : "Enter a new password for your account."}
            </p>
          </div>

          {canReset && needsMfa ? (
            <MfaStepUpForm onVerified={() => setNeedsMfa(false)} />
          ) : canReset ? (
            <NewPasswordForm
              submitLabel="Save new password"
              onSubmit={updatePassword}
              onSuccess={() => {
                setTimeout(() => router.replace("/app"), 800);
              }}
            />
          ) : (
            <Link
              href="/login"
              className="btn btn-filled btn-lg w-full"
            >
              Back to log in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <ThemeProvider>
      <AppProvider>
        <ResetPasswordGate />
      </AppProvider>
    </ThemeProvider>
  );
}
