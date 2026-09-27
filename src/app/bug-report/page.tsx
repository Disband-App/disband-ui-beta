import type { Metadata } from "next";
import { MarketingFooter, MarketingNav } from "@/components/marketing/MarketingLayout";
import { BugReportForm } from "@/components/bugreport/BugReportForm";
import { BUG_REPORT_EMAIL } from "@/lib/bug-reports";

export const metadata: Metadata = {
  title: "Bug Report",
  description: "Report a bug in Disband and earn the Bug Bounty Hunter badge if we fix it.",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function BugReportPage() {
  return (
    <div className="min-h-screen bg-canvas text-text-normal">
      <MarketingNav />
      <main className="mx-auto max-w-3xl px-6 pb-20 pt-20">
        <p className="text-sm font-semibold uppercase tracking-widest text-status-online">Bug Report</p>
        <h1 className="large-title mt-2 text-[34px] sm:text-[40px]">Help us fix Disband</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-text-muted">
          Found something broken? Tell us what happened, how to reproduce it, and attach
          screenshots or a video if you can. If we fix your bug, you&apos;ll receive the{" "}
          <span className="font-semibold text-status-online">Bug Bounty Hunter</span> badge on your
          profile. Reports are also emailed to{" "}
          <a href={`mailto:${BUG_REPORT_EMAIL}`} className="text-text-link hover:underline">
            {BUG_REPORT_EMAIL}
          </a>
          .
        </p>

        <div className="mt-10">
          <BugReportForm />
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
