import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DesignPreview } from "@/components/preview/DesignPreview";

export const metadata: Metadata = {
  title: "Design preview",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

// Development only, unless a deployment opts in explicitly. The page renders
// sample data and talks to no backend, but it has no business on the public
// site by default.
export default function DesignPreviewPage() {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_DESIGN_PREVIEW !== "1") {
    notFound();
  }
  return <DesignPreview />;
}
