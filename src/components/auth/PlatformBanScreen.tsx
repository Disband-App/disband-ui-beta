"use client";

import { useApp } from "@/contexts/AppContext";
import { Logo } from "@/components/ui/Logo";

export function PlatformBanScreen() {
  const { platformBan, signOut } = useApp();

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="view-enter w-full max-w-md rounded-[24px] bg-bg-secondary p-8 text-center shadow-elev-3 ring-1 ring-status-dnd/30">
        <div className="mb-4 flex justify-center">
          <Logo adaptive size={48} />
        </div>
        <h1 className="title-2 text-status-danger">You have been banned from Disband</h1>
        <p className="mt-3 text-sm text-text-muted">
          {platformBan?.reason ?? "Your account no longer has access to Disband."}
        </p>
        {platformBan?.vpnBlocked && (
          <p className="mt-2 text-xs text-text-muted">
            VPN or proxy connections are not allowed while banned. Disable your VPN to appeal access checks.
          </p>
        )}
        <p className="mt-4 text-xs text-text-muted">
          You cannot use Disband until a platform owner removes this ban. Creating a new account with the same email is also blocked.
        </p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-6 rounded bg-interactive-normal px-4 py-2 text-sm font-semibold text-text-normal hover:bg-interactive-hover"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
