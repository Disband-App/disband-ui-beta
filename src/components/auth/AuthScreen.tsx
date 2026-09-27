"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { ResendConfirmation } from "@/components/auth/ResendConfirmation";
import { EMAIL_NOT_CONFIRMED } from "@/lib/authErrors";
import { isTauri } from "@/lib/platform";
import { PUBLIC_ENV } from "@/lib/public-env";
import { AppIcon } from "@/components/ui/AppIcon";
import { ActivityIndicator } from "@/components/ui/ActivityIndicator";
import { Segmented } from "@/components/ui/Segmented";
import { Turnstile } from "@/components/ui/Turnstile";
import { Avatar } from "@/components/ui/Avatar";

type AuthMode = "login" | "signup" | "reset";

// Fields sit bare inside a grouped card (iOS sign-in forms): the card draws
// the rounded edge, rows are divided by hairlines, labels ride above input.
const fieldClass =
  "w-full bg-transparent py-0.5 text-[16px] text-text-normal outline-none placeholder:text-label-tertiary";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="list-row block cursor-text py-2.5 transition-colors focus-within:bg-interactive-hover">
      <span className="mb-0.5 flex items-baseline justify-between">
        <span className="text-[12px] font-medium text-text-muted">{label}</span>
        {hint}
      </span>
      {children}
    </label>
  );
}

interface AuthScreenProps {

  overlay?: boolean;
  onClose?: () => void;
}

export function AuthScreen({ overlay = false, onClose }: AuthScreenProps = {}) {
  const { signIn, signUp, requestPasswordReset, configured, savedSessions, switchAccount, removeSavedAccount } = useApp();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);

  const needsConfirmation = error === EMAIL_NOT_CONFIRMED;
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [turnstileFailed, setTurnstileFailed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [appliedRef, setAppliedRef] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const webOnly = !isTauri();

  useEffect(() => {
    if (overlay) return;
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && /^[0-9a-zA-Z]{9}$/.test(ref)) {
      setAppliedRef(ref);
      setMode("signup");
    }
  }, [overlay]);

  if (!configured) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-tertiary p-6">
        <div className="rounded-[14px] bg-fill-tertiary max-w-md p-8 text-center">
          <h1 className="title-2 text-text-normal">Disband</h1>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            {isTauri()
              ? "This build is missing Supabase configuration. Rebuild the desktop app with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY set."
              : "Copy .env.example to .env.local and add your Supabase URL + anon key, then restart the dev space."}
          </p>
        </div>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current || success) return;
    submittingRef.current = true;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === "login") {
        const err = await signIn(email, password);
        if (err) setError(err);
      } else if (mode === "reset") {
        const err = await requestPasswordReset(email);
        if (err) {
          setError(err);
        } else {
          setSuccess(
            `If an account exists for ${email.trim()}, we sent a password reset link. Check your inbox and spam folder.`,
          );
        }
      } else {
        const sanitized = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
        if (sanitized.length < 2) {
          setError("Username must be at least 2 characters (letters, numbers, and underscores).");
        } else {
          const result = await signUp(email, password, username, appliedRef, turnstileToken);
          if (result.error) {
            setError(result.error);
          } else if (result.needsEmailConfirmation !== false) {
            setSuccess(
              `Check your email to verify your account. We sent a link to ${email.trim()} — then log in at /login.`,
            );
          }
        }
      }
    } catch {
      setError("We couldn't complete that request. Check your connection and try again.");
    } finally {
      setTurnstileToken(null);
      setTurnstileFailed(false);
      setTurnstileKey((k) => k + 1);
      setLoading(false);
      submittingRef.current = false;
    }
  }

  function switchMode(next: AuthMode) {
    setMode(next);
    setError(null);
    setSuccess(null);
    setTurnstileToken(null);
    setTurnstileFailed(false);
    setTurnstileKey((k) => k + 1);
  }

  async function handleSwitch(acct: (typeof savedSessions)[number]) {
    if (switchingId) return;
    setSwitchingId(acct.user_id);
    setError(null);
    try {
      const err = await switchAccount(acct);
      if (err) {
        setEmail(acct.email ?? "");
        setError(err);
      }
    } finally {
      setSwitchingId(null);
    }
  }

  const title = success
    ? "Check your email"
    : mode === "login"
      ? overlay ? "Add an account" : "Sign in to Disband"
      : mode === "reset"
        ? "Reset your password"
        : "Create your account";

  const subtitle = success
    ? mode === "reset"
      ? "Use the link we sent to choose a new password."
      : "Verify your email address to finish signing up."
    : mode === "login"
      ? overlay
        ? "Sign in to the account you want to add. This one stays signed in."
        : "Your spaces, messages, and calls — on every device."
      : mode === "reset"
        ? "We'll email you a link to choose a new one."
        : "Free to join. No card required.";

  const submitLabel =
    mode === "login" ? "Sign in" : mode === "reset" ? "Send reset link" : "Create account";

  const fieldsCard = (children: React.ReactNode) => (
    <div className="list-group bg-bg-primary">{children}</div>
  );

  return (
    <div
      className={
        overlay
          ? "fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-overlay-scrim overlay-fade px-6 py-12 backdrop-blur-sm"
          : "relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-6 py-12"
      }
      onClick={overlay ? onClose : undefined}
    >
      <div
        className={overlay ? "modal-pop relative w-full max-w-[420px] rounded-[26px] bg-bg-secondary p-7 shadow-elev-4 ring-1 ring-glass-border" : "view-enter relative w-full max-w-[400px]"}
        onClick={overlay ? (e) => e.stopPropagation() : undefined}
      >
        {overlay && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancel adding an account"
            className="press absolute right-4 top-4 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-fill-secondary text-text-muted transition-colors hover:bg-fill hover:text-text-normal"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}

        <div className="mb-7 flex flex-col items-center text-center">
          <span className="badge-pop">
            <AppIcon size={72} />
          </span>
          <h1 key={title} className="large-title view-enter mt-6">{title}</h1>
          <p className="mt-2 max-w-[20rem] text-[15px] leading-relaxed text-text-muted">{subtitle}</p>
        </div>

        {!success && mode !== "reset" && (
          <Segmented
            className="mb-5"
            ariaLabel="Sign in or create an account"
            value={mode}
            onChange={(m) => switchMode(m)}
            options={[
              { id: "login", label: "Sign in" },
              { id: "signup", label: "Create account" },
            ]}
          />
        )}

        {!overlay && mode === "login" && savedSessions.length > 0 && !success && (
          <div className="mb-5">
            <p className="section-label mb-1.5">Continue as</p>
            <div className="list-group bg-bg-primary" style={{ ["--row-inset" as string]: "58px" }}>
              {savedSessions.map((acct) => {
                const display = acct.display_name || acct.username || acct.email?.split("@")[0] || "Account";
                const busy = switchingId === acct.user_id;
                return (
                  <div key={acct.user_id} className="list-row group py-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleSwitch(acct)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <Avatar
                        size="sm"
                        profile={{ display_name: display, avatar_url: acct.avatar_url }}
                        className="h-[30px] w-[30px] text-[12px]"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-medium text-text-normal">{display}</span>
                        <span className="block truncate text-[12px] text-text-muted">{acct.email}</span>
                      </span>
                      {busy ? (
                        <ActivityIndicator size={16} className="ml-auto shrink-0" />
                      ) : (
                        <span className="ml-auto shrink-0 text-[13px] font-semibold text-brand">Continue</span>
                      )}
                    </button>
                    <button
                      type="button"
                      aria-label={`Forget ${display}'s saved login`}
                      title="Forget this account"
                      onClick={() => removeSavedAccount(acct.user_id)}
                      className="tool-btn h-7 w-7 opacity-0 hover:text-status-dnd focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <form onSubmit={submit}>
          {success ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-[16px] bg-status-online/10 px-4 py-3.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sys-green text-white">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
                <p className="text-[14px] leading-relaxed text-text-normal">{success}</p>
              </div>
              {mode !== "reset" && (
                <p className="px-1 text-[13px] leading-relaxed text-text-muted">
                  Once verified, come back here and sign in with your email and password.
                </p>
              )}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="btn btn-gray btn-lg w-full"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {fieldsCard(
                <>
              {mode === "signup" && (
                <Field label="Username">
                  <input
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.slice(0, 25))}
                    maxLength={25}
                    autoComplete="username"
                    placeholder="nova_reyes"
                    className={fieldClass}
                  />
                  {(() => {
                    // Usernames are lowercased and stripped of anything but
                    // letters/numbers/underscores: show the result live so
                    // "Nova-Reyes" becoming "novareyes" is never a surprise.
                    const preview = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
                    return username && preview !== username ? (
                      <p className="mt-1 text-xs text-text-muted">
                        Will be saved as <span className="font-mono text-text-normal">@{preview || "…"}</span>
                      </p>
                    ) : null;
                  })()}
                </Field>
              )}

              <Field label="Email">
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={fieldClass}
                />
              </Field>

              {mode !== "reset" && (
                <Field
                  label="Password"
                  hint={
                    mode === "login" ? (
                      <button
                        type="button"
                        onClick={() => switchMode("reset")}
                        className="text-[12.5px] font-medium text-brand transition-opacity hover:opacity-80"
                      >
                        Forgot password?
                      </button>
                    ) : undefined
                  }
                >
                  <div className="relative">
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      placeholder={mode === "signup" ? "At least 6 characters" : "Required"}
                      className={fieldClass + " pr-16"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-[13px] font-medium text-text-muted transition-colors hover:text-text-normal"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </Field>
              )}

              {mode === "signup" && appliedRef && (
                <Field
                  label="Referral code applied"
                  hint={
                    <span className="flex items-center gap-1 text-[12.5px] text-status-online">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      Credited on signup
                    </span>
                  }
                >
                  <input
                    readOnly
                    value={appliedRef}
                    aria-label="Referral code applied"
                    className={fieldClass + " cursor-default font-mono tracking-wide text-status-online"}
                  />
                </Field>
              )}
                </>,
              )}

              {webOnly && !turnstileFailed && (
                <Turnstile
                  key={turnstileKey}
                  siteKey={PUBLIC_ENV.turnstileSiteKey}
                  onToken={setTurnstileToken}
                  onExpire={() => setTurnstileToken(null)}
                  onError={() => {
                    setTurnstileToken(null);
                    setTurnstileFailed(true);
                  }}
                />
              )}

              {error && (
                <p
                  role="alert"
                  className="shake rounded-[14px] bg-status-dnd/10 px-4 py-3 text-[13.5px] leading-relaxed text-status-dnd"
                >
                  {error}
                </p>
              )}

              {}
              {needsConfirmation && <ResendConfirmation defaultEmail={email} lockEmail />}

              {/* The Turnstile token is not consumed by the auth calls yet
                  (backend TODO): it used to gate the submit button, which
                  permanently dead-ended the form for anyone whose blocker
                  stops the widget script without firing onError. The widget
                  still renders; the button no longer depends on it. */}
              <button
                type="submit"
                disabled={loading}
                className="btn btn-filled btn-lg w-full"
              >
                {loading ? <ActivityIndicator size={18} className="text-brand-foreground" /> : submitLabel}
              </button>
            </div>
          )}
        </form>

        {!success && mode === "reset" && (
          <p className="mt-6 text-center text-[14px] text-text-muted">
            Remembered it?{" "}
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="font-semibold text-brand transition-opacity hover:opacity-80"
            >
              Sign in
            </button>
          </p>
        )}

        {!overlay && !success && (
          <p className="mt-8 text-center text-[12px] leading-relaxed text-text-muted">
            By continuing you agree to Disband&rsquo;s{" "}
            <a href="/terms" className="text-text-normal hover:underline">Terms</a> and{" "}
            <a href="/privacy" className="text-text-normal hover:underline">Privacy Policy</a>.
          </p>
        )}
      </div>
    </div>
  );
}
