import { useState } from "react";
import { Link } from "react-router";
import { ChevronLeftIcon } from "../../icons";

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

const features = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
    color: "#DC1F2E",
    title: "Beli Tiket Show",
    desc: "Beli tiket dan tonton show JKT48 langsung di dalam aplikasi secara real-time.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
    color: "#f59e0b",
    title: "Beli Kode Show",
    desc: "Dapatkan kode show melalui aplikasi untuk digunakan menonton di website.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    color: "#465FFF",
    title: "Membership Bulanan",
    desc: "Akses semua show tanpa batas selama masa membership aktif — bypass semua show.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    color: "#10b981",
    title: "Fitur Mendatang",
    desc: "Lebih banyak fitur eksklusif sedang dalam pengembangan untuk member setia.",
  },
];

export default function SignUpForm() {
  const [release, setRelease] = useState<GithubRelease | null>(null);
  const [loadingRelease, setLoadingRelease] = useState(true);

  useState(() => {
    fetch(GITHUB_RELEASE_API)
      .then((r) => r.json())
      .then((data: GithubRelease) => setRelease(data))
      .catch((e) => console.error("Error fetching release:", e))
      .finally(() => setLoadingRelease(false));
  });

  const apkAsset = release?.assets?.find((a) => a.name.endsWith(".apk"));

  const formatSize = (bytes: number): string => {
    if (!bytes) return "";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  };

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
      <div className="w-full max-w-md mx-auto mb-5 sm:pt-10">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Back to dashboard
        </Link>
      </div>

      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          {/* ── Header ── */}
          <div className="mb-6">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Buat Akun
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Registrasi akun JKT48Connect
            </p>
          </div>

          {/* ── Notice Card ── */}
          <div className="rounded-2xl border border-orange-200 bg-orange-50 dark:border-orange-500/20 dark:bg-orange-500/5 p-4 mb-6">
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-500/15">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-1">
                  Registrasi Hanya Tersedia di Aplikasi
                </h3>
                <p className="text-xs text-orange-600 dark:text-orange-400/80 leading-relaxed">
                  Pembuatan akun tidak dapat dilakukan melalui website. Silakan download aplikasi
                  <strong> JKT48Connect</strong> untuk mendaftar dan menikmati semua fitur.
                </p>
              </div>
            </div>
          </div>

          {/* ── Features ── */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              Yang bisa kamu lakukan di aplikasi
            </p>
            <div className="space-y-2.5">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]"
                >
                  <div
                    className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0"
                    style={{
                      backgroundColor: `${f.color}15`,
                      border: `1px solid ${f.color}25`,
                      color: f.color,
                    }}
                  >
                    {f.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-0.5">
                      {f.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      {f.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Membership Info ── */}
          <div className="rounded-xl border border-brand-200 bg-brand-50 dark:border-brand-500/20 dark:bg-brand-500/5 p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-500/15 flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="#465FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-brand-700 dark:text-brand-400 mb-1">
                  Tentang Membership
                </h4>
                <p className="text-xs text-brand-600 dark:text-brand-400/80 leading-relaxed">
                  Dengan membership aktif, <strong>semua show terbuka tanpa batas</strong> selama
                  periode berlaku. Tidak perlu beli tiket per-show — cukup login akun membership
                  di website untuk langsung menonton.
                </p>
              </div>
            </div>
          </div>

          {/* ── Download Button ── */}
          <div className="space-y-3">
            {loadingRelease ? (
              <div className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-brand-500 text-white text-sm font-medium">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Memuat info rilis...
              </div>
            ) : apkAsset ? (
              <a
                href={apkAsset.browser_download_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download Aplikasi
                {release?.tag_name && (
                  <span className="text-white/70 font-normal text-xs">
                    {release.tag_name}
                    {apkAsset.size ? ` · ${formatSize(apkAsset.size)}` : ""}
                  </span>
                )}
              </a>
            ) : (
              <a
                href="https://github.com/JKT48Connect/JKT48Connect-APP/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download Aplikasi
              </a>
            )}

            <a
              href="https://github.com/JKT48Connect/JKT48Connect-APP/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
              Lihat semua versi di GitHub
            </a>
          </div>

                    {/* ── Sign In Link ── */}
          <div className="mt-5">
            <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
              Sudah punya akun?{" "}
              <Link
                to="/signin"
                className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
