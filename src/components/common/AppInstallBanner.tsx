import { useEffect, useState } from "react";

const GITHUB_RELEASE_API =
  "https://api.github.com/repos/JKT48Connect/JKT48Connect-APP/releases/latest";

interface GithubAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface GithubRelease {
  tag_name: string;
  assets: GithubAsset[];
}

const STORAGE_KEY = "app_install_banner_dismissed";

export default function AppInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [release, setRelease] = useState<GithubRelease | null>(null);

  useEffect(() => {
    // Jangan tampilkan kalau sudah pernah dismiss
    const dismissed = sessionStorage.getItem(STORAGE_KEY);
    if (dismissed) return;

    fetch(GITHUB_RELEASE_API)
      .then((r) => r.json())
      .then((data: GithubRelease) => setRelease(data))
      .catch(() => {});

    // Delay sedikit sebelum muncul agar terasa natural
    const timer = setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => setAnimateIn(true));
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setAnimateIn(false);
    setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem(STORAGE_KEY, "1");
    }, 350);
  };

  const apkAsset = release?.assets?.find((a) => a.name.endsWith(".apk"));
  const downloadUrl =
    apkAsset?.browser_download_url ??
    "https://github.com/JKT48Connect/JKT48Connect-APP/releases/latest";

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes bannerSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes bannerSlideDown {
          from { transform: translateY(0);    opacity: 1; }
          to   { transform: translateY(100%); opacity: 0; }
        }
        .banner-enter { animation: bannerSlideUp 0.4s cubic-bezier(0.34,1.2,0.64,1) forwards; }
        .banner-exit  { animation: bannerSlideDown 0.35s ease-in forwards; }

        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.6; }
          70%  { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .pulse-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid #465FFF;
          animation: pulse-ring 2s ease-out infinite;
        }
      `}</style>

      {/* Fixed container — di atas sidebar, pojok kanan bawah */}
      <div
        className={`fixed bottom-6 right-6 z-[9999] w-[calc(100vw-48px)] max-w-sm ${
          animateIn ? "banner-enter" : "banner-exit"
        }`}
        role="region"
        aria-label="Install aplikasi JKT48Connect"
      >
        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-white/10 dark:bg-gray-900">
          {/* Dekorasi gradient sudut kiri atas */}
          <div
            className="pointer-events-none absolute -left-6 -top-6 h-24 w-24 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #465FFF, transparent)" }}
          />

          {/* Konten */}
          <div className="flex items-start gap-3 p-4">
            {/* Ikon app dengan pulse */}
            <div className="relative mt-0.5 flex-shrink-0">
              <div className="pulse-ring" />
              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
              </div>
            </div>

            {/* Teks */}
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                  Install Aplikasi GiStream
                </p>
                {release?.tag_name && (
                  <span className="flex-shrink-0 rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-500 dark:bg-brand-500/10">
                    {release.tag_name}
                  </span>
                )}
              </div>
              <p className="text-[12px] leading-relaxed text-gray-500 dark:text-gray-400">
                Lebih fleksibel &amp; semua pembelian tiket tersedia di aplikasi.
              </p>

              {/* Tombol */}
              <div className="mt-3 flex items-center gap-2">
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-600 active:scale-95"
                  onClick={dismiss}
                >
                  <svg
                    width="12"
                    height="12"
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
                <button
                  onClick={dismiss}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-300"
                >
                  Nanti saja
                </button>
              </div>
            </div>

            {/* Tombol X */}
            <button
              onClick={dismiss}
              className="mt-0.5 flex-shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10"
              aria-label="Tutup"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
