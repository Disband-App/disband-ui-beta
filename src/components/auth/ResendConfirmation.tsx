"use client";

import { useState } from "react";
import { mapAuthError } from "@/lib/authErrors";
import { getSupabaseClient } from "@/lib/supabase/client";

export function ResendConfirmation({
  defaultEmail = "",

  lockEmail = false,
}: {
  defaultEmail?: string;
  lockEmail?: boolean;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const address = email.trim();
    if (!address || state === "sending") return;

    setState("sending");
    setError(null);

    const { error: sendError } = await getSupabaseClient().auth.resend({
      type: "signup",
      email: address,
    });

    if (sendError) {
      const reason = sendError.message.toLowerCase();

      const revealsAccount =
        reason.includes("not found")
        || reason.includes("no user")
        || reason.includes("already been confirmed")
        || reason.includes("already confirmed");

      if (!revealsAccount) {

        setError(mapAuthError(sendError.message));
        setState("idle");
        return;
      }
    }

    setState("sent");
  }

  if (state === "sent") {
    return (
      <p
        role="status"
        className="rounded-md border border-status-online/30 bg-status-online/[0.08] px-3.5 py-2.5 text-[13px] leading-relaxed text-status-online"
      >
        If that address needs confirming, a new link is on its way to{" "}
        <span className="font-medium">{email.trim()}</span>. It is good for 24 hours —
        check your spam folder if it does not arrive.
      </p>
    );
  }

  return (
    <form onSubmit={send} className="space-y-2 text-left">
      {!lockEmail && (
        <label className="block">
          <span className="mb-1 block text-xs uppercase font-semibold tracking-[0.04em] text-text-muted">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="field w-full text-[14px]"
          />
        </label>
      )}

      <button
        type="submit"
        disabled={state === "sending" || !email.trim()}
        className="btn btn-gray w-full"
      >
        {state === "sending" ? "Sending…" : "Send a new confirmation email"}
      </button>

      {error && <p className="text-[13px] text-status-dnd">{error}</p>}
    </form>
  );
}
