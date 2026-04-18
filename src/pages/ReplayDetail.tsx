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

    // Init Plyr first (without quality menu — we build our own)
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
      title,
      poster,
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
      startLevel:         -1,          // start with auto
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
      // Sort highest quality first
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
    hlsRef.current.currentLevel = index; // -1 = auto
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

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-black shadow-2xl group">
      {/* Plyr custom theme overrides */}
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
        .plyr--full-ui input[type=range] {
          color: #DC1F2E;
        }
        .plyr__progress__buffer {
          color: rgba(255,255,255,0.25);
        }
        .plyr__control.plyr__tab-focus,
        .plyr__control:hover,
        .plyr__control[aria-expanded=true] {
          background: rgba(220,31,46,0.85) !important;
        }
        .plyr--video .plyr__control.plyr__tab-focus,
        .plyr--video .plyr__control:hover,
        .plyr--video .plyr__control[aria-expanded=true] {
          background: rgba(220,31,46,0.85) !important;
        }
        .plyr__tooltip {
          background: rgba(0,0,0,0.85);
          color: #fff;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
        }
        .plyr__tooltip::before {
          border-top-color: rgba(0,0,0,0.85);
        }
        video.plyr-video-el {
          max-height: 520px;
        }
      `}</style>

      <div className="aspect-video">
        <video
          ref={videoRef}
          className="plyr-video-el w-full h-full"
          crossOrigin="anonymous"
          playsInline
        />
      </div>

      {/* Quality switcher — sits above Plyr controls */}
      {isReady && levels.length > 1 && (
        <div
          ref={qualityPanelRef}
          className="absolute bottom-14 right-3 z-30"
        >
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

              {/* Auto option */}
              <button
                onClick={() => switchLevel(-1)}
                className={`w-full px-3 py-2 rounded-xl border-0 text-[12px] cursor-pointer text-left flex items-center justify-between mb-0.5 transition-colors ${currentLevel === -1 ? "bg-red-500/20 text-red-400 font-bold" : "bg-transparent text-white/70 hover:bg-white/5"}`}
              >
                <span>⚡ Auto</span>
                <span className="text-[10px] opacity-50">Adaptif</span>
              </button>

              {/* Manual levels */}
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
      // Only check if code exists — no expiry / usage check
      const res  = await fetch(
        `https://v2.jkt48connect.com/api/codes/list?email=${encodeURIComponent(email.trim())}&apikey=${API_KEY}`
      );
      const data = await res.json();
      if (!data.status) { setError("Email tidak ditemukan"); setLoading(false); return; }

      const tokens: any[] = data.data?.wotatokens || [];
      const found = tokens.find(
        (t) => t.code?.toLowerCase() === code.trim().toLowerCase()
      );

      if (!found) { setError("Kode tidak ditemukan untuk email ini"); setLoading(false); return; }

      // Save minimal session — just mark verified
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
        {/* Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="#DC1F2E" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white/90 mb-1.5">
            Akses Replay
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Masukkan email dan kode untuk menonton replay show theater
          </p>
        </div>

        {/* Form */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-3">
          <form onSubmit={verify} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="email@example.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 dark:focus:border-red-500 placeholder:text-gray-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Kode Akses
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => { setCode(e.target.value); setError(""); }}
                placeholder="Masukkan kode akses"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 dark:focus:border-red-500 placeholder:text-gray-400 tracking-widest transition-all"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border-0 text-sm font-bold text-white transition-all duration-200 mt-1 ${loading ? "bg-red-400 cursor-not-allowed" : "bg-red-500 hover:bg-red-600 cursor-pointer shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:-translate-y-0.5"}`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Akses Replay
                </>
              )}
            </button>
          </form>
        </div>

        <button
          onClick={onBack}
          className="w-full py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-500 dark:text-gray-400 text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center justify-center gap-1.5"
        >
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

  const [show,       setShow]       = useState<ReplayShow | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [verified,   setVerified]   = useState(false);

  // Check existing verification in localStorage
  useEffect(() => {
    const stored = localStorage.getItem("replay_verification");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.code && parsed?.email) setVerified(true);
      } catch {}
    }
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

  // ── Loading ──
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

  // ── Error ──
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
          <button
            onClick={() => navigate("/replay")}
            className="px-5 py-2.5 rounded-xl border-0 bg-red-500 text-white text-sm font-bold cursor-pointer hover:bg-red-600 shadow-lg shadow-red-500/25 transition-all hover:-translate-y-0.5"
          >
            Kembali ke Replay
          </button>
        </div>
      </div>
    );
  }

  // ── Verification gate ──
  if (!verified) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">
        <PageMeta title={`Replay: ${show.title} | JKT48Connect`} description={`Tonton replay ${show.title}`} />

        {/* Show preview header */}
        <div className="relative h-32 overflow-hidden">
          <img
            src={show.image_url || DEFAULT_IMG}
            alt={show.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/80" />
          <div className="absolute bottom-4 left-5 right-5">
            <p className="text-white font-bold text-base leading-tight line-clamp-1">{show.title}</p>
            {show.lineup.length > 0 && (
              <p className="text-white/60 text-xs mt-0.5">{show.lineup.slice(0, 4).join(", ")}{show.lineup.length > 4 ? ` +${show.lineup.length - 4}` : ""}</p>
            )}
          </div>
        </div>

        <VerificationGate
          onVerified={() => setVerified(true)}
          onBack={() => navigate("/replay")}
        />
      </div>
    );
  }

  // ── Player ──
  return (
    <>
      <PageMeta title={`Replay: ${show.title} | JKT48Connect`} description={`Tonton replay ${show.title}`} />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">

        {/* ── Header ── */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate("/replay")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-600 dark:text-gray-400 text-xs font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
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

          <button
            onClick={() => {
              localStorage.removeItem("replay_verification");
              setVerified(false);
            }}
            className="ml-auto px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-500 dark:text-gray-400 text-[11px] font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
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
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                  Detail Show
                </p>
                <div className="flex gap-4 items-start">
                  <img
                    src={show.image_url || DEFAULT_IMG}
                    alt={show.title}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700"
                    onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }}
                  />
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold text-gray-800 dark:text-white/90 mb-2 leading-snug">
                      {show.title}
                    </h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        ID: {show.id}
                      </span>
                      {show.lineup.length > 0 && (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                          {show.lineup.length} Member
                        </span>
                      )}
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
                      <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">
                        Lineup belum tersedia
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {show.lineup.map((name, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors group"
                        >
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
