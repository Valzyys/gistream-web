import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import Hls from "hls.js";
import Plyr from "plyr";
import "plyr/dist/plyr.css";
import PageMeta from "../components/common/PageMeta";

// ── Config ────────────────────────────────────────────────────────────────────
const SHOWS_API = "https://asset.gstreamlive.com/shows";
const API_KEY   = "JKTCONNECT";

const DEFAULT_IMG =
  "https://res.cloudinary.com/haymzm4wp/image/upload/v1760105848/bi5ej2hgh0cc2uowu5xr.jpg";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ReplayShow {
  id:        string;
  title:     string;
  image_url: string | null;
  lineup:    string[];
  url:       string;
}

interface HlsLevel {
  index:      number;
  height:     number;
  width:      number;
  bitrate:    number;
  name:       string;
}

// ── Download Modal ────────────────────────────────────────────────────────────
function DownloadModal({
  show,
  levels,
  onClose,
}: {
  show:    ReplayShow;
  levels:  HlsLevel[];
  onClose: () => void;
}) {
  const [downloading,    setDownloading]    = useState(false);
  const [progress,       setProgress]       = useState(0);
  const [downloadError,  setDownloadError]  = useState("");
  const [selectedLevel,  setSelectedLevel]  = useState<number>(
    levels.length > 0 ? levels[0].index : -1
  );
  const abortRef = useRef<AbortController | null>(null);

  // Tutup saat klik backdrop
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Tutup dengan Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  /**
   * Strategi download:
   * 1. Coba fetch blob langsung (works jika server CORS-friendly & file kecil)
   * 2. Jika HLS multi-segment → buka di tab baru (pengguna bisa save-as dari browser)
   * 3. Jika URL bukan .m3u8 → anchor download biasa
   */
  const handleDownload = async () => {
    setDownloadError("");
    const src = show.url;

    // Untuk HLS → buka ffmpeg.wasm atau fallback ke tab baru
    const isHls = src.includes(".m3u8") || src.includes("m3u8");

    if (isHls) {
      // Coba ambil manifest dulu untuk resolve URL segment pertama
      // Fallback: buka halaman download eksternal atau tab baru
      try {
        setDownloading(true);
        setProgress(5);

        const ctrl = new AbortController();
        abortRef.current = ctrl;

        // Ambil manifest
        const manifestRes = await fetch(src, { signal: ctrl.signal });
        if (!manifestRes.ok) throw new Error("Gagal mengambil manifest");
        const manifest = await manifestRes.text();
        setProgress(10);

        // Parse master/media playlist untuk dapat segment URL
        const baseUrl = src.substring(0, src.lastIndexOf("/") + 1);

        // Jika master playlist → ambil stream sesuai level yang dipilih
        if (manifest.includes("#EXT-X-STREAM-INF")) {
          const lines = manifest.split("\n").map(l => l.trim()).filter(Boolean);
          let streamUrls: string[] = [];
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith("#EXT-X-STREAM-INF")) {
              const nextLine = lines[i + 1];
              if (nextLine && !nextLine.startsWith("#")) {
                streamUrls.push(nextLine.startsWith("http") ? nextLine : baseUrl + nextLine);
              }
            }
          }
          // Pilih stream sesuai selectedLevel (index dari levels array yang sudah sorted)
          const targetIdx = Math.min(selectedLevel < 0 ? 0 : selectedLevel, streamUrls.length - 1);
          const chosenStreamUrl = streamUrls[targetIdx] || streamUrls[0];

          if (chosenStreamUrl) {
            // Buka stream M3U8 di tab baru — pengguna bisa pakai browser/IDM untuk download
            window.open(chosenStreamUrl, "_blank");
            setDownloading(false);
            setProgress(0);
            onClose();
            return;
          }
        }

        // Media playlist langsung → coba download via blob
        const segLines = manifest.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));
        const segUrls  = segLines.map(l => l.startsWith("http") ? l : baseUrl + l);

        if (segUrls.length === 0) {
          throw new Error("Tidak ada segment ditemukan di playlist");
        }

        // Download semua segment lalu gabungkan
        const chunks: Uint8Array[] = [];
        const total = segUrls.length;

        for (let i = 0; i < total; i++) {
          if (ctrl.signal.aborted) return;
          const segRes = await fetch(segUrls[i], { signal: ctrl.signal });
          if (!segRes.ok) throw new Error(`Segment ${i + 1} gagal`);
          const buf = await segRes.arrayBuffer();
          chunks.push(new Uint8Array(buf));
          setProgress(10 + Math.round(((i + 1) / total) * 88));
        }

        setProgress(99);

        // Gabungkan semua chunk
        const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
        const merged   = new Uint8Array(totalLen);
        let offset = 0;
        for (const chunk of chunks) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }

        // Buat blob dan trigger download
        const blob    = new Blob([merged], { type: "video/mp2t" });
        const blobUrl = URL.createObjectURL(blob);
        const a       = document.createElement("a");
        a.href        = blobUrl;
        a.download    = `${show.title.replace(/[^a-zA-Z0-9]/g, "_")}_${show.id}.ts`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

        setProgress(100);
        setTimeout(() => {
          setDownloading(false);
          setProgress(0);
          onClose();
        }, 1000);

      } catch (err: any) {
        if (err.name === "AbortError") return;
        // Fallback: buka URL langsung di tab baru
        setDownloadError("Download otomatis gagal. Membuka stream di tab baru...");
        setTimeout(() => {
          window.open(src, "_blank");
          setDownloading(false);
          setProgress(0);
          setDownloadError("");
          onClose();
        }, 1500);
      }
      return;
    }

    // Non-HLS: download biasa via anchor
    try {
      setDownloading(true);
      setProgress(30);
      const res  = await fetch(src);
      const blob = await res.blob();
      setProgress(90);
      const blobUrl = URL.createObjectURL(blob);
      const a       = document.createElement("a");
      const ext     = src.split(".").pop()?.split("?")[0] || "mp4";
      a.href        = blobUrl;
      a.download    = `${show.title.replace(/[^a-zA-Z0-9]/g, "_")}_${show.id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      setProgress(100);
      setTimeout(() => { setDownloading(false); setProgress(0); onClose(); }, 800);
    } catch {
      setDownloadError("Gagal mengunduh. Coba buka di tab baru.");
      setDownloading(false);
    }
  };

  const cancelDownload = () => {
    abortRef.current?.abort();
    setDownloading(false);
    setProgress(0);
    setDownloadError("");
  };

  const isHls = show.url.includes(".m3u8") || show.url.includes("m3u8");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-[440px] rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#DC1F2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-white">Unduh Video</span>
          </div>
          <button
            onClick={onClose}
            disabled={downloading}
            className="w-7 h-7 rounded-lg border-0 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">

          {/* Show info */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <img
              src={show.image_url || DEFAULT_IMG}
              alt={show.title}
              className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700"
              onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }}
            />
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{show.title}</p>
              <p className="text-[11px] text-gray-400 font-mono mt-0.5">{show.id}</p>
            </div>
          </div>

          {/* Quality selector (hanya tampil jika HLS dan ada multiple levels) */}
          {isHls && levels.length > 1 && !downloading && (
            <div>
              <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Kualitas Download
              </p>
              <div className="flex flex-col gap-1.5">
                {levels.map((lvl) => (
                  <button
                    key={lvl.index}
                    onClick={() => setSelectedLevel(lvl.index)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm cursor-pointer transition-all ${
                      selectedLevel === lvl.index
                        ? "border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-bold"
                        : "border-gray-200 dark:border-gray-700 bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {lvl.height >= 1080 && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">HD</span>
                      )}
                      {lvl.name}
                    </span>
                    <span className="text-[11px] opacity-50 font-mono">
                      {lvl.bitrate >= 1_000_000
                        ? (lvl.bitrate / 1_000_000).toFixed(1) + " Mbps"
                        : Math.round(lvl.bitrate / 1000) + " Kbps"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Info HLS */}
          {isHls && !downloading && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                Video ini berformat HLS. Download akan menggabungkan semua segmen video. Proses mungkin memakan waktu beberapa menit tergantung durasi dan koneksi internet.
              </p>
            </div>
          )}

          {/* Progress bar */}
          {downloading && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {progress < 10 ? "Memuat playlist..." :
                   progress < 99 ? `Mengunduh segmen... ${progress}%` :
                   progress === 99 ? "Menggabungkan video..." :
                   "Selesai! ✓"}
                </span>
                <span className="text-sm font-bold text-red-500">{progress}%</span>
              </div>

              <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {progress < 100 && (
                <button
                  onClick={cancelDownload}
                  className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-500 dark:text-gray-400 text-xs font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  Batalkan
                </button>
              )}
            </div>
          )}

          {/* Error */}
          {downloadError && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {downloadError}
            </div>
          )}

          {/* Action buttons */}
          {!downloading && (
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border-0 bg-red-500 hover:bg-red-600 text-white text-sm font-bold cursor-pointer shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:-translate-y-0.5 transition-all duration-200"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Unduh Video
              </button>

              {/* Alternatif: buka URL langsung */}
              <button
                onClick={() => window.open(show.url, "_blank")}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-600 dark:text-gray-400 text-sm font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Buka di Tab Baru
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Plyr + hls.js Player ──────────────────────────────────────────────────────
function ReplayPlyrPlayer({
  src,
  title,
  poster,
}: {
  src:    string;
  title:  string;
  poster: string;
}) {
  const videoRef     = useRef<HTMLVideoElement>(null);
  const plyrRef      = useRef<Plyr | null>(null);
  const hlsRef       = useRef<Hls | null>(null);
  const retryRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [levels,        setLevels]        = useState<HlsLevel[]>([]);
  const [currentLevel,  setCurrentLevel]  = useState<number>(-1); // -1 = Auto
  const [showQuality,   setShowQuality]   = useState(false);
  const [isReady,       setIsReady]       = useState(false);
  const qualityPanelRef = useRef<HTMLDivElement>(null);

  const destroyAll = useCallback(() => {
    if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
    if (hlsRef.current)   { hlsRef.current.destroy(); hlsRef.current = null; }
    if (plyrRef.current)  { plyrRef.current.destroy(); plyrRef.current = null; }
  }, []);

  // Close quality panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (qualityPanelRef.current && !qualityPanelRef.current.contains(e.target as Node)) {
        setShowQuality(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    destroyAll();
    setLevels([]);
    setCurrentLevel(-1);
    setIsReady(false);

    const player = new Plyr(video, {
      controls: [
        "play-large",
        "play",
        "rewind",
        "fast-forward",
        "progress",
        "current-time",
        "duration",
        "mute",
        "volume",
        "captions",
        "fullscreen",
      ],
      resetOnEnd: false,
      keyboard:   { focused: true, global: false },
      tooltips:   { controls: true, seek: true },
      speed:      { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
    });
    plyrRef.current = player;

    if (!Hls.isSupported()) {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
        video.load();
        setIsReady(true);
      }
      return;
    }

    const hls = new Hls({
      enableWorker:       true,
      lowLatencyMode:     false,
      maxBufferLength:    60,
      maxMaxBufferLength: 120,
      maxBufferSize:      80 * 1000 * 1000,
      backBufferLength:   60,
      startLevel:         -1,
      abrEwmaDefaultEstimate: 500_000,
      abrBandWidthFactor:     0.8,
      abrBandWidthUpFactor:   0.7,
      fragLoadingTimeOut:     10000,
      fragLoadingMaxRetry:    6,
      fragLoadingRetryDelay:  1000,
      manifestLoadingTimeOut: 10000,
      manifestLoadingMaxRetry: 4,
      levelLoadingTimeOut:    10000,
      levelLoadingMaxRetry:   4,
    });

    hlsRef.current = hls;
    hls.loadSource(src);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
      const parsed: HlsLevel[] = data.levels.map((lvl, idx) => ({
        index:   idx,
        height:  lvl.height  || 0,
        width:   lvl.width   || 0,
        bitrate: lvl.bitrate || 0,
        name:    lvl.name    || (lvl.height ? `${lvl.height}p` : `Level ${idx}`),
      }));
      parsed.sort((a, b) => b.height - a.height);
      setLevels(parsed);
      setIsReady(true);
      video.play().catch(() => {});
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
      setCurrentLevel(data.level);
    });

    hls.on(Hls.Events.ERROR, (_, data) => {
      if (!data.fatal) return;
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        hls.startLoad();
      } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        hls.recoverMediaError();
      } else {
        destroyAll();
        retryRef.current = setTimeout(() => {
          const v = videoRef.current;
          if (!v) return;
          const newHls = new Hls({ lowLatencyMode: false, maxBufferLength: 60 });
          newHls.loadSource(src);
          newHls.attachMedia(v);
          newHls.on(Hls.Events.MANIFEST_PARSED, () => v.play().catch(() => {}));
          hlsRef.current = newHls;
        }, 2500);
      }
    });

    return destroyAll;
  }, [src, destroyAll, title, poster]);

  const switchLevel = (index: number) => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = index;
    setCurrentLevel(index);
    setShowQuality(false);
  };

  const currentLevelLabel = () => {
    if (currentLevel === -1 || levels.length === 0) return "Auto";
    const lvl = levels.find((l) => l.index === currentLevel);
    return lvl ? lvl.name : "Auto";
  };

  const formatBitrate = (bps: number) => {
    if (bps >= 1_000_000) return (bps / 1_000_000).toFixed(1) + " Mbps";
    return Math.round(bps / 1000) + " Kbps";
  };

  // Expose levels ke parent via prop (tidak perlu, parent punya sendiri)
  // Kita export levels via ref agar DownloadModal bisa akses
  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-black shadow-2xl group">
      <style>{`
        .plyr--video .plyr__controls {
          background: linear-gradient(transparent, rgba(0,0,0,0.75));
          padding: 12px 16px 14px;
        }
        .plyr__control--overlaid {
          background: rgba(220, 31, 46, 0.9) !important;
          box-shadow: 0 4px 20px rgba(220,31,46,0.45) !important;
        }
        .plyr__control--overlaid:hover {
          background: #DC1F2E !important;
          transform: scale(1.08);
        }
        .plyr--full-ui input[type=range] { color: #DC1F2E; }
        .plyr__progress__buffer { color: rgba(255,255,255,0.25); }
        .plyr__control.plyr__tab-focus,
        .plyr__control:hover,
        .plyr__control[aria-expanded=true] { background: rgba(220,31,46,0.85) !important; }
        .plyr--video .plyr__control.plyr__tab-focus,
        .plyr--video .plyr__control:hover,
        .plyr--video .plyr__control[aria-expanded=true] { background: rgba(220,31,46,0.85) !important; }
        .plyr__tooltip { background: rgba(0,0,0,0.85); color: #fff; border-radius: 6px; font-size: 11px; font-weight: 600; }
        .plyr__tooltip::before { border-top-color: rgba(0,0,0,0.85); }
        .plyr, .plyr--video, .plyr__video-wrapper, .plyr video {
          width: 100% !important; height: 100% !important;
          max-height: none !important; position: absolute !important;
          top: 0 !important; left: 0 !important;
        }
        .plyr__video-wrapper { padding-bottom: 0 !important; }
      `}</style>

      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        <video ref={videoRef} className="plyr-video-el" crossOrigin="anonymous" playsInline poster={poster} />
      </div>

      {/* Quality switcher */}
      {isReady && levels.length > 1 && (
        <div ref={qualityPanelRef} className="absolute bottom-14 right-3 z-30">
          <button
            onClick={() => setShowQuality((p) => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-sm text-white text-[11px] font-bold cursor-pointer border border-white/10 hover:bg-black/90 transition-colors select-none"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
            </svg>
            {currentLevel === -1 ? `Auto (${currentLevelLabel()})` : currentLevelLabel()}
          </button>

          {showQuality && (
            <div className="absolute bottom-[calc(100%+8px)] right-0 bg-gray-900/97 backdrop-blur-xl border border-white/10 rounded-2xl p-2 min-w-[200px] shadow-2xl">
              <p className="text-[9px] font-bold text-white/30 px-2 pb-1.5 uppercase tracking-widest">Kualitas</p>
              <button
                onClick={() => switchLevel(-1)}
                className={`w-full px-3 py-2 rounded-xl border-0 text-[12px] cursor-pointer text-left flex items-center justify-between mb-0.5 transition-colors ${currentLevel === -1 ? "bg-red-500/20 text-red-400 font-bold" : "bg-transparent text-white/70 hover:bg-white/5"}`}
              >
                <span>⚡ Auto</span>
                <span className="text-[10px] opacity-50">Adaptif</span>
              </button>
              {levels.map((lvl) => {
                const isActive = currentLevel === lvl.index;
                return (
                  <button
                    key={lvl.index}
                    onClick={() => switchLevel(lvl.index)}
                    className={`w-full px-3 py-2 rounded-xl border-0 text-[12px] cursor-pointer text-left flex items-center justify-between mb-0.5 transition-colors ${isActive ? "bg-red-500/20 text-red-400 font-bold" : "bg-transparent text-white/70 hover:bg-white/5"}`}
                  >
                    <span className="flex items-center gap-1.5">
                      {lvl.height >= 1080 && <span className="text-[9px] font-black px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">HD</span>}
                      {lvl.name}
                    </span>
                    <span className="text-[10px] opacity-40">{lvl.bitrate ? formatBitrate(lvl.bitrate) : ""}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Loading overlay */}
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-[3px] border-white/20 border-t-red-500 rounded-full animate-spin" />
            <span className="text-white/60 text-xs font-medium">Memuat video...</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const getSession = () => {
  try {
    const d = JSON.parse(
      sessionStorage.getItem("userLogin") ||
      localStorage.getItem("userLogin") ||
      "null"
    );
    if (d && d.isLoggedIn && d.token) return d;
    return null;
  } catch { return null; }
};

const API_BASE = "https://v2.jkt48connect.com/api/jkt48connect";

async function checkMonthlyMembership(): Promise<boolean> {
  const session = getSession();
  if (!session) return false;
  const uid   = session.user?.user_id;
  const token = session.token;
  if (!uid || !token) return false;
  try {
    const res  = await fetch(`${API_BASE}/membership/status/${uid}?apikey=${API_KEY}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return !!(data.status && data.data?.is_active && data.data?.membership_type === "monthly");
  } catch { return false; }
}

// ── Verification Gate ─────────────────────────────────────────────────────────
function VerificationGate({
  onVerified,
  onBack,
}: {
  onVerified: () => void;
  onBack:     () => void;
}) {
  const [email,    setEmail]    = useState("");
  const [code,     setCode]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !code.trim()) { setError("Email dan kode wajib diisi"); return; }
    setLoading(true);
    setError("");
    try {
      const hasMembership = await checkMonthlyMembership();
      if (hasMembership) {
        localStorage.setItem(
          "replay_verification",
          JSON.stringify({ email: email.trim(), code: "MEMBERSHIP_BYPASS", ts: Date.now() })
        );
        onVerified();
        return;
      }

      const res  = await fetch(
        `https://v2.jkt48connect.com/api/codes/list?email=${encodeURIComponent(email.trim())}&apikey=${API_KEY}`
      );
      const data = await res.json();

      if (!data.status) { setError("Email tidak ditemukan"); setLoading(false); return; }

      const codes: any[] = data.data?.codes || data.data?.wotatokens || [];
      const found = codes.find(
        (t) => t.code?.toLowerCase() === code.trim().toLowerCase()
      );

      if (!found) { setError("Kode tidak ditemukan untuk email ini"); setLoading(false); return; }

      localStorage.setItem(
        "replay_verification",
        JSON.stringify({ email: email.trim(), code: code.trim(), ts: Date.now() })
      );
      onVerified();
    } catch {
      setError("Terjadi kesalahan, silakan coba lagi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#DC1F2E" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white/90 mb-1.5">Akses Replay</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Masukkan email dan kode untuk menonton replay show theater
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-3">
          <form onSubmit={verify} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Email</label>
              <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="email@example.com" required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 dark:focus:border-red-500 placeholder:text-gray-400 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Kode Akses</label>
              <input type="text" value={code} onChange={(e) => { setCode(e.target.value); setError(""); }} placeholder="Masukkan kode akses" required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 dark:focus:border-red-500 placeholder:text-gray-400 tracking-widest transition-all" />
            </div>
            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading}
              className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border-0 text-sm font-bold text-white transition-all duration-200 mt-1 ${loading ? "bg-red-400 cursor-not-allowed" : "bg-red-500 hover:bg-red-600 cursor-pointer shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:-translate-y-0.5"}`}>
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Memverifikasi...</>
              ) : (
                <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>Akses Replay</>
              )}
            </button>
          </form>
        </div>

        <button onClick={onBack}
          className="w-full py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-500 dark:text-gray-400 text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center justify-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Kembali ke Daftar Replay
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const ReplayPlayerPage: React.FC = () => {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [show,           setShow]           = useState<ReplayShow | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState("");
  const [verified,       setVerified]       = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [showDownload,   setShowDownload]   = useState(false);
  // levels dari player — diisi saat HLS manifest parsed
  const [playerLevels,   setPlayerLevels]   = useState<HlsLevel[]>([]);

  // ── Intercept levels dari player child ───────────────────────────────────
  // Karena ReplayPlyrPlayer tidak expose levels via prop callback,
  // kita buat wrapper yang mendengarkan HLS events di level page.
  const hlsPageRef = useRef<Hls | null>(null);

  // Check membership bypass OR existing localStorage
  useEffect(() => {
    const init = async () => {
      const hasMembership = await checkMonthlyMembership();
      if (hasMembership) { setVerified(true); setCheckingAccess(false); return; }
      const stored = localStorage.getItem("replay_verification");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed?.code && parsed?.email) { setVerified(true); setCheckingAccess(false); return; }
        } catch {}
      }
      setCheckingAccess(false);
    };
    init();
  }, []);

  const fetchShow = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(SHOWS_API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const list: ReplayShow[] = await res.json();
      const found = list.find((s) => s.id === id);
      if (!found) { setError("Show tidak ditemukan"); setLoading(false); return; }
      setShow(found);
    } catch (e: any) {
      setError(e.message || "Gagal memuat data show");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchShow(); }, [fetchShow]);

  // Fetch HLS levels secara terpisah agar DownloadModal bisa pilih kualitas
  useEffect(() => {
    if (!show?.url || !verified) return;
    setPlayerLevels([]);

    if (!Hls.isSupported()) return;

    const hls = new Hls({ enableWorker: false, startLevel: -1 });
    hlsPageRef.current = hls;

    // Attach ke video dummy (tidak perlu render) hanya untuk parse manifest
    const dummyVideo = document.createElement("video");
    hls.loadSource(show.url);
    hls.attachMedia(dummyVideo);

    hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
      const parsed: HlsLevel[] = data.levels.map((lvl, idx) => ({
        index:   idx,
        height:  lvl.height  || 0,
        width:   lvl.width   || 0,
        bitrate: lvl.bitrate || 0,
        name:    lvl.name    || (lvl.height ? `${lvl.height}p` : `Level ${idx}`),
      }));
      parsed.sort((a, b) => b.height - a.height);
      setPlayerLevels(parsed);
      // Destroy setelah dapat levels — tidak butuh stream
      hls.destroy();
      hlsPageRef.current = null;
    });

    hls.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal) { hls.destroy(); hlsPageRef.current = null; }
    });

    return () => { hls.destroy(); hlsPageRef.current = null; };
  }, [show?.url, verified]);

  // ── Checking access spinner ──
  if (checkingAccess) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-gray-200 dark:border-gray-700 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Memeriksa akses...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-gray-200 dark:border-gray-700 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Memuat data show...</p>
        </div>
      </div>
    );
  }

  if (error || !show) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] min-h-[60vh] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC1F2E" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white/90 mb-2">Show Tidak Ditemukan</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{error || "Show dengan ID ini tidak tersedia."}</p>
          <button onClick={() => navigate("/replay")}
            className="px-5 py-2.5 rounded-xl border-0 bg-red-500 text-white text-sm font-bold cursor-pointer hover:bg-red-600 shadow-lg shadow-red-500/25 transition-all hover:-translate-y-0.5">
            Kembali ke Replay
          </button>
        </div>
      </div>
    );
  }

  if (!verified) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">
        <PageMeta title={`Replay: ${show.title} | JKT48Connect`} description={`Tonton replay ${show.title}`} />
        <div className="relative h-32 overflow-hidden">
          <img src={show.image_url || DEFAULT_IMG} alt={show.title} className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/80" />
          <div className="absolute bottom-4 left-5 right-5">
            <p className="text-white font-bold text-base leading-tight line-clamp-1">{show.title}</p>
            {show.lineup.length > 0 && (
              <p className="text-white/60 text-xs mt-0.5">{show.lineup.slice(0, 4).join(", ")}{show.lineup.length > 4 ? ` +${show.lineup.length - 4}` : ""}</p>
            )}
          </div>
        </div>
        <VerificationGate onVerified={() => setVerified(true)} onBack={() => navigate("/replay")} />
      </div>
    );
  }

  return (
    <>
      <PageMeta title={`Replay: ${show.title} | JKT48Connect`} description={`Tonton replay ${show.title}`} />

      {/* Download Modal */}
      {showDownload && (
        <DownloadModal
          show={show}
          levels={playerLevels}
          onClose={() => setShowDownload(false)}
        />
      )}

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">

        {/* ── Header ── */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3 flex-wrap">
          <button onClick={() => navigate("/replay")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-600 dark:text-gray-400 text-xs font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Replay
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800 text-white text-[11px] font-extrabold tracking-wide">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            REPLAY
          </div>

          <h1 className="text-sm font-bold text-gray-800 dark:text-white truncate flex-1">
            {show.title}
          </h1>

          {/* ── Tombol Download ── */}
          <button
            onClick={() => setShowDownload(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-600 dark:text-gray-400 text-xs font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            title="Unduh Video"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Unduh
          </button>

          <button
            onClick={() => { localStorage.removeItem("replay_verification"); setVerified(false); }}
            className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-500 dark:text-gray-400 text-[11px] font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            Logout
          </button>
        </div>

        {/* ── Content ── */}
        <div className="p-5 xl:p-7">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">

            {/* Left: Player + details */}
            <div className="flex flex-col gap-5">
              <ReplayPlyrPlayer
                src={show.url}
                title={show.title}
                poster={show.image_url || DEFAULT_IMG}
              />

              {/* Show info */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 p-5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Detail Show</p>
                <div className="flex gap-4 items-start">
                  <img src={show.image_url || DEFAULT_IMG} alt={show.title}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700"
                    onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }} />
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold text-gray-800 dark:text-white/90 mb-2 leading-snug">{show.title}</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        ID: {show.id}
                      </span>
                      {show.lineup.length > 0 && (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                          {show.lineup.length} Member
                        </span>
                      )}
                      {/* Download badge */}
                      <button
                        onClick={() => setShowDownload(true)}
                        className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Unduh
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-center text-[10px] font-semibold text-gray-300 dark:text-gray-700 uppercase tracking-widest pb-1">
                Powered by JKT48Connect
              </p>
            </div>

            {/* Right: Lineup */}
            <div className="xl:sticky xl:top-4 xl:self-start">
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.02] overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC1F2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">Lineup</span>
                  </div>
                  {show.lineup.length > 0 && (
                    <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                      {show.lineup.length} member
                    </span>
                  )}
                </div>

                <div className="p-4">
                  {show.lineup.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-10 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">Lineup belum tersedia</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {show.lineup.map((name, idx) => (
                        <div key={idx}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors group">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-[10px] shadow-sm shadow-red-500/20">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                            {name}
                          </span>
                          <span className="ml-auto text-[10px] text-gray-300 dark:text-gray-700 font-mono">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default ReplayPlayerPage;
