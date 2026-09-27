"use client";

import { useEffect, useMemo, useState } from "react";
import { PlatformIcon } from "@/components/marketing/PlatformIcon";
import {
  detectClientPlatform,
  detectMacArchAsync,
  fetchLatestReleaseFromGitHub,
  GITHUB_RELEASES_URL,
  inferVersionFromAssets,
  pickAssetForPlatform,
  type GitHubRelease,
  type MacArch,
  type ReleaseAsset,
} from "@/lib/github-releases";
import { parseSemverTag } from "@/lib/version";
import { apiFetch } from "@/lib/api";

async function loadReleases(): Promise<{
  release: GitHubRelease | null;
  assets: ReleaseAsset[];
}> {
  try {
    const res = await apiFetch("/api/releases");
    if (res.ok) {
      const data = (await res.json()) as {
        release: GitHubRelease | null;
        assets: ReleaseAsset[];
      };
      if (data.release || (data.assets?.length ?? 0) > 0) {
        return data;
      }
    }
  } catch {

  }
  return fetchLatestReleaseFromGitHub();
}

function platformIconKey(platform: ReleaseAsset["platform"]): "macos" | "windows" | "linux" {
  if (platform === "windows") return "windows";
  if (platform === "linux") return "linux";
  return "macos";
}

function displayVersion(release: GitHubRelease | null, assets: ReleaseAsset[]): string | null {
  if (!release) return null;
  if (parseSemverTag(release.tag)) return release.tag;
  return inferVersionFromAssets(assets) ? `v${inferVersionFromAssets(assets)}` : release.tag;
}

function uniqueDownloadOptions(assets: ReleaseAsset[]): ReleaseAsset[] {
  const seen = new Set<string>();
  const out: ReleaseAsset[] = [];
  for (const asset of assets) {
    const key = `${asset.platform}:${asset.macArch ?? asset.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(asset);
  }
  return out;
}

const APP_STORE_URL =
  "https://apps.apple.com/us/app/disband/id6783881800";

export function DownloadSection() {
  const [release, setRelease] = useState<GitHubRelease | null>(null);
  const [assets, setAssets] = useState<ReleaseAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState(detectClientPlatform());
  const [macArch, setMacArch] = useState<MacArch>("unknown");

  useEffect(() => {
    setPlatform(detectClientPlatform());
    if (detectClientPlatform() === "macos") {
      void detectMacArchAsync().then(setMacArch);
    }
    void loadReleases()
      .then((data) => {
        setRelease(data.release);
        setAssets(data.assets ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const recommended = pickAssetForPlatform(assets, platform, macArch);
  const downloadOptions = useMemo(() => uniqueDownloadOptions(assets), [assets]);
  const versionLabel = displayVersion(release, assets);

  return (
    <section id="download" className="scroll-mt-16 px-5 py-24 sm:py-32">
      <div className="mx-auto max-w-[1080px]">
        <div className="reveal max-w-2xl">
          <p className="text-[14px] font-semibold text-brand">Download</p>
          <h2 className="mt-2 font-display text-[36px] font-bold leading-[1.06] tracking-[-0.03em] sm:text-[48px]">
            On every screen you own.
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-text-muted">
            Native apps for Mac, Windows and Linux, Disband for iPhone on the App Store — or skip the
            install and use it in your browser. One account everywhere.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {/* Desktop */}
          <div className="reveal flex flex-col rounded-[28px] bg-bg-secondary p-7 shadow-[0_0_0_1px_var(--panel-border)]">
            <p className="text-[13px] font-semibold text-text-muted">Desktop</p>
            <h3 className="mt-1 text-[24px] font-bold tracking-[-0.02em]">Mac, Windows &amp; Linux</h3>
            {loading ? (
              <p className="mt-6 text-[14px] text-text-muted">Checking for the latest release…</p>
            ) : downloadOptions.length > 0 ? (
              <>
                {recommended && (
                  <div className="mt-6">
                    <a href={recommended.url} className="btn btn-filled btn-lg">
                      <PlatformIcon platform={platformIconKey(recommended.platform)} />
                      Download for {recommended.label}
                    </a>
                    {versionLabel && (
                      <p className="nums mt-2.5 text-[12px] text-text-muted">{versionLabel}</p>
                    )}
                  </div>
                )}
                <ul className="mt-6 overflow-hidden rounded-[16px] bg-bg-primary shadow-[0_0_0_1px_var(--panel-border)]" style={{ ["--row-inset" as string]: "48px" }}>
                  {downloadOptions.map((asset) => (
                    <li key={asset.url} className="list-row p-0">
                      <a
                        href={asset.url}
                        className="group flex w-full items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-interactive-hover"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <PlatformIcon platform={platformIconKey(asset.platform)} />
                          <span className="min-w-0">
                            <span className="block text-[14px] font-medium">{asset.label}</span>
                            <span className="block truncate font-mono text-[11px] text-text-muted">{asset.name}</span>
                          </span>
                        </span>
                        <span className="shrink-0 text-[13px] font-semibold text-brand">Get</span>
                      </a>
                    </li>
                  ))}
                </ul>
                {platform === "macos" && (
                  <p className="mt-4 text-[12.5px] leading-relaxed text-text-muted">
                    First launch blocked by macOS? Right-click the app and choose Open, or run{" "}
                    <code className="md-code">xattr -cr /Applications/Disband.app</code> in Terminal.
                  </p>
                )}
              </>
            ) : (
              <div className="mt-6">
                <p className="text-[14px] leading-relaxed text-text-muted">
                  Desktop builds are published on GitHub Releases.
                </p>
                <a href={GITHUB_RELEASES_URL} className="btn btn-gray mt-4">
                  View downloads on GitHub
                </a>
              </div>
            )}
          </div>

          {/* iPhone + web */}
          <div className="flex flex-col gap-5">
            <div className="reveal flex flex-1 flex-col rounded-[28px] bg-bg-secondary p-7 shadow-[0_0_0_1px_var(--panel-border)]" style={{ ["--i" as string]: 1 }}>
              <p className="text-[13px] font-semibold text-text-muted">iPhone</p>
              <h3 className="mt-1 text-[24px] font-bold tracking-[-0.02em]">Disband for iOS</h3>
              <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-text-muted">
                Chat, calls and communities on the go, with the same account you use on desktop.
              </p>
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Download Disband on the App Store"
                className="press mt-auto w-fit pt-5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/appstore-badge.png" alt="Download on the App Store" width={150} height={50} className="h-[46px] w-auto" />
              </a>
            </div>
            <div className="reveal flex flex-col rounded-[28px] bg-bg-secondary p-7 shadow-[0_0_0_1px_var(--panel-border)]" style={{ ["--i" as string]: 2 }}>
              <p className="text-[13px] font-semibold text-text-muted">Browser</p>
              <h3 className="mt-1 text-[24px] font-bold tracking-[-0.02em]">No install needed</h3>
              <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-text-muted">
                Works in any recent Chromium, Firefox or Safari.
              </p>
              <a href="/app" className="btn btn-tinted mt-5 w-fit">
                Open in browser
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
