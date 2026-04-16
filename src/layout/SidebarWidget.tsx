import { useEffect, useState } from "react";

const GITHUB_RELEASE_API =
  "https://api.github.com/repos/JKT48Connect/JKT48Connect-APP/releases/latest";

interface GithubAsset {
  name: string;
  browser_download_url: string;
  size: number;
  download_count: number;
}

interface GithubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  assets: GithubAsset[];
}

export default function SidebarWidget() {
  const [release, setRelease] = useState<GithubRelease | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(GITHUB_RELEASE_API)
      .then((r) => r.json())
      .then((data: GithubRelease) => setRelease(data))
      .catch((e) => console.error("Error fetching release:", e))
      .finally(() => setLoading(false));
  }, []);

  const apkAsset = release?.assets?.find((a) => a.name.endsWith(".apk"));

  const formatSize = (bytes: number): string => {
    if (!bytes) return "";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  };

  return (
    <div className="mx-auto mb-10 w-full max-w-60 rounded-2xl bg-gray-50 px-4 py-5 text-center dark:bg-white/[0.03]">
      {/* Icon */}
      <div className="flex items-center justify-center w-10 h-10 mx-auto mb-3 rounded-xl bg-brand-50 dark:bg-brand-500/10">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#465FFF"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
      </div>

      {/* Title */}
      <h3 className="mb-1 font-semibold text-gray-900 text-theme-sm dark:text-white">
        JKT48Connect App
      </h3>

      {/* Version & size */}
      {loading ? (
        <div className="flex flex-col items-center gap-1.5 mb-3">
          <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
      ) : release ? (
        <div className="mb-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 dark:bg-brand-500/10 px-2 py-0.5 text-[11px] font-semibold text-brand-500 mb-1">
            {release.tag_name}
          </span>
          {apkAsset && (
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              {formatSize(apkAsset.size)} · {apkAsset.download_count.toLocaleString("id-ID")} unduhan
            </p>
          )}
        </div>
      ) : (
        <p className="mb-3 text-gray-500 text-theme-sm dark:text-gray-400">
          Aplikasi Android JKT48Connect
        </p>
      )}

      {/* Download Button */}
      {apkAsset ? (
        <a
          href={apkAsset.browser_download_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 p-3 font-medium text-white rounded-lg bg-brand-500 text-theme-sm hover:bg-brand-600 transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download APK
        </a>
      ) : (
        <a
          href="https://github.com/JKT48Connect/JKT48Connect-APP/releases/latest"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 p-3 font-medium text-white rounded-lg bg-brand-500 text-theme-sm hover:bg-brand-600 transition-colors"
        >
          Lihat Rilis
        </a>
      )}

      {/* Changelog link */}
      <a
        href="https://github.com/JKT48Connect/JKT48Connect-APP/releases"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 block text-[11px] text-gray-400 hover:text-brand-500 dark:text-gray-500 dark:hover:text-brand-400 transition-colors"
      >
        Lihat semua versi →
      </a>
    </div>
  );
}
