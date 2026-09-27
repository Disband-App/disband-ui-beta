import Link from "next/link";
import type { Metadata } from "next";
import { AppIcon } from "@/components/ui/AppIcon";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 py-20 text-center text-text-normal">
      <div className="view-enter flex max-w-md flex-col items-center">
        <AppIcon size={64} />
        <p className="nums mt-8 font-rounded text-[13px] font-semibold tracking-[0.3em] text-text-muted">404</p>
        <h1 className="large-title mt-2 text-[34px] sm:text-[40px]">This channel was disbanded.</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-text-muted">
          The page you were looking for doesn&apos;t exist, was moved, or never got a seat in the space.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/home" className="btn btn-filled btn-lg">
            Back to Disband
          </Link>
          <Link href="/login" className="btn btn-gray btn-lg">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
