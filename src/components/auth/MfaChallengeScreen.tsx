"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { AppIcon } from "@/components/ui/AppIcon";
import {
  factorLabel,
  listVerifiedMfaFactors,
  verifyPasskeyChallenge,
  verifyTotpChallenge,
  type MfaFactor,
} from "@/lib/mfa";

export function MfaChallengeScreen() {
  const { refreshMfaStatus, signOut } = useApp();
  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [selectedFactorId, setSelectedFactorId] = useState<string>("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingFactors, setLoadingFactors] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadingFactors(true);
    setLoadError(null);
    void (async () => {
      try {
        const list = await listVerifiedMfaFactors();
        if (cancelled) return;
        setFactors(list);
        setSelectedFactorId(list.find((f) => f.factor_type === "totp")?.id ?? list[0]?.id ?? "");
      } catch {
        if (!cancelled) setLoadError("Couldn’t load your security methods.");
      } finally {
        if (!cancelled) setLoadingFactors(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const totpFactors = factors.filter((f) => f.factor_type === "totp");
  const passkeyFactors = factors.filter((f) => f.factor_type === "webauthn");

  async function submitTotp(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFactorId) return;
    setLoading(true);
    setError(null);
    const err = await verifyTotpChallenge(selectedFactorId, code);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    await refreshMfaStatus();
  }

  async function usePasskey(factorId: string) {
    setLoading(true);
    setError(null);
    const err = await verifyPasskeyChallenge(factorId);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    await refreshMfaStatus();
  }

  if (loadingFactors) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas text-text-muted">
        Loading your security methods…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas p-6">
        <div className="view-enter w-full max-w-sm rounded-[24px] bg-bg-secondary p-8 text-center shadow-elev-3 ring-1 ring-glass-border">
          <h1 className="title-2 text-text-normal">Something went wrong</h1>
          <p className="mt-2 text-sm text-text-muted">{loadError}</p>
          <button
            type="button"
            onClick={() => setAttempt((a) => a + 1)}
            className="btn btn-filled mt-4 w-full"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-3 w-full text-sm text-text-link hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-canvas p-6">
      <div className="view-enter w-full max-w-sm rounded-[24px] bg-bg-secondary p-8 shadow-elev-3 ring-1 ring-glass-border">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex justify-center">
            <AppIcon size={64} />
          </div>
          <h1 className="title-2 text-text-normal">Two-factor authentication</h1>
          <p className="mt-1 text-sm text-text-muted">
            Verify it&apos;s you with your authenticator app or passkey.
          </p>
        </div>

        {totpFactors.length > 0 && (
          <form onSubmit={submitTotp} className="space-y-4">
            {totpFactors.length > 1 && (
              <label className="block">
                <span className="mb-1 block text-xs uppercase font-semibold tracking-[0.04em] text-text-muted">Authenticator</span>
                <select
                  value={selectedFactorId}
                  onChange={(e) => setSelectedFactorId(e.target.value)}
                  className="field w-full text-[14px]"
                >
                  {totpFactors.map((factor) => (
                    <option key={factor.id} value={factor.id}>
                      {factorLabel(factor)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block">
              <span className="mb-1 block text-xs uppercase font-semibold tracking-[0.04em] text-text-muted">Authentication code</span>
              <input
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="field w-full text-center text-lg tracking-[0.35em]"
                placeholder="000000"
              />
            </label>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="btn btn-filled w-full"
            >
              {loading ? "Verifying…" : "Verify code"}
            </button>
          </form>
        )}

        {passkeyFactors.length > 0 && (
          <div className={totpFactors.length > 0 ? "mt-4 space-y-2" : "space-y-2"}>
            {totpFactors.length > 0 && (
              <p className="text-center text-xs uppercase tracking-wide text-text-muted">or</p>
            )}
            {passkeyFactors.map((factor) => (
              <button
                key={factor.id}
                type="button"
                disabled={loading}
                onClick={() => void usePasskey(factor.id)}
                className="btn btn-gray w-full"
              >
                {loading ? "Verifying…" : `Use ${factorLabel(factor)}`}
              </button>
            ))}
          </div>
        )}

        {factors.length === 0 && (
          <p className="text-sm text-text-muted">
            No verified security methods were found. Sign out and contact support if this keeps happening.
          </p>
        )}

        {error && <p role="alert" aria-live="polite" className="mt-3 text-sm text-status-dnd">{error}</p>}

        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-4 w-full text-sm text-text-link hover:underline"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
