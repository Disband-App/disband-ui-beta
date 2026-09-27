"use client";

import { useState, useEffect } from "react";
import { AppIcon } from "@/components/ui/AppIcon";
import { ActivityIndicator } from "@/components/ui/ActivityIndicator";

// Launch screen: the app icon settles in, a system spinner sits under it.
// Nothing else competes for attention on a start that is usually quick.
export function LoadingScreen({ label = "Loading Disband" }: { label?: string }) {
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setShowStatus(true), 4000);
    return () => clearTimeout(id);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="flex h-screen w-screen flex-col items-center justify-center bg-canvas"
    >
      <div className="badge-pop">
        <AppIcon size={76} />
      </div>
      <ActivityIndicator size={22} className="mt-9" />

      {showStatus && (
        <p className="island-in absolute bottom-10 text-center text-[13px] text-text-muted">
          Taking longer than usual?{" "}
          <a
            href="/status"
            className="font-medium text-text-link hover:underline"
          >
            Check service status
          </a>
        </p>
      )}
    </div>
  );
}
