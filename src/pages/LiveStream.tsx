import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import Hls from "hls.js";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://mzxfuaoihgzxvokwarao.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16eGZ1YW9paGd6eHZva3dhcmFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MDg0NjIsImV4cCI6MjA4OTk4NDQ2Mn0.OFYCkBFXCSfLn-wG94OHHKL5CX8T_BLrbDGPiBdPIog";
const supabase = createClient(supabaseUrl, supabaseKey);

const API_BASE  = "https://v2.jkt48connect.com/api/jkt48connect";
const API_KEY   = "JKTCONNECT";
const PLAY_HOST = "https://play.jkt48connect.com";
const IDN_API   = "https://v2.jkt48connect.com/api/jkt48/idnplus?apikey=JKTCONNECT";
const LIVE_API  = "https://v2.jkt48connect.com/api/jkt48/live?apikey=JKTCONNECT";

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

const isIdnSlug = (param: string) => {
  if (!param) return false;
  return /\d{4}-\d{2}-\d{2}/.test(param);
};

interface QualityOption {
  index:           number;
  name:            string;
  quality:         string;
  bandwidth:       number;
  bandwidth_label: string;
  resolution:      string;
  fps:             string;
  manual_url:      string;
  playlist_url:    string;
}

interface ChatMessage {
  user_id:      string;
  username:     string;
  avatar_url:   string;
  bluetick:     boolean;
  role:         string;
  text_content: string;
  timestamp:    string;
}

// Showroom comment type (untuk member live via polling)
interface SRComment {
  id: string;
  name: string;
  avatar_url: string;
  comment: string;
  created_at: number;
  class_level: number;
  user_id: number;
}

// ── Showroom comment polling hook ─────────────────────────────────────────────
function useShowroomComments(roomId: number | null) {
  const [comments, setComments] = useState<SRComment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
  const mounted = useRef(true);
  const timer   = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchComments = useCallback(async () => {
    if (!roomId || !mounted.current) return;
    try {
      const res = await fetch(
        `https://www.showroom-live.com/api/live/comment_log?room_id=${roomId}`,
        { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" } }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      const parsed: SRComment[] = (data?.comment_log ?? [])
        .map((c: any) => ({
          id: `${c.user_id}-${c.created_at}`,
          name: c.name ?? "Unknown",
          avatar_url: c.avatar_url ?? "",
          comment: c.comment ?? "",
          created_at: c.created_at ?? 0,
          class_level: c.class_level ?? 1,
          user_id: c.user_id ?? 0,
        }))
        .sort((a: SRComment, b: SRComment) => a.created_at - b.created_at);
      if (!mounted.current) return;
      setComments(parsed);
      setLastPoll(new Date());
      setError(false);
    } catch {
      if (mounted.current) setError(true);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    mounted.current = true;
    if (!roomId) { setLoading(false); return; }
    fetchComments();
    timer.current = setInterval(fetchComments, 5000);
    return () => {
      mounted.current = false;
      if (timer.current) clearInterval(timer.current);
    };
  }, [roomId, fetchComments]);

  return { comments, loading, error, lastPoll, retry: fetchComments };
}

// ── HLS Player ────────────────────────────────────────────────────────────────
function HlsPlayer({
  src, title, qualities, onQualityChange, currentQuality, qualityMode, onModeChange, isIdn,
}: {
  src: string; title: string; qualities: QualityOption[];
  onQualityChange: (q: QualityOption | null) => void;
  currentQuality: QualityOption | null;
  qualityMode: "auto" | "manual";
  onModeChange: (mode: "auto" | "manual") => void;
  isIdn: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef   = useRef<Hls | null>(null);
  const [showQualityPanel, setShowQualityPanel] = useState(false);
  const [currentLevel, setCurrentLevel]         = useState<string>("Auto");
  const [bandwidth, setBandwidth]               = useState<string>("");

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true, lowLatencyMode: true,
        liveSyncDuration: 3, liveMaxLatencyDuration: 10,
        startLevel: qualityMode === "auto" ? -1 : undefined,
        abrEwmaDefaultEstimate: 1_000_000,
        abrBandWidthFactor: 0.9, abrBandWidthUpFactor: 0.7,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); });
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const lvl = hls.levels[data.level];
        if (lvl) {
          setCurrentLevel(lvl.name || `${lvl.height}p`);
          const bw = hls.bandwidthEstimate;
          if (bw > 0) setBandwidth(bw >= 1_000_000 ? (bw / 1_000_000).toFixed(1) + " Mbps" : Math.round(bw / 1_000) + " Kbps");
        }
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else hls.destroy();
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("loadedmetadata", () => { video.play().catch(() => {}); });
    }
    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [src]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-black shadow-2xl">
      <div className={isIdn ? "aspect-video" : ""}>
        <video
          ref={videoRef}
          controls autoPlay playsInline
          className={`w-full ${isIdn ? "h-full" : ""} block`}
          title={title}
        />
      </div>
      {qualities.length > 0 && (
        <div className="absolute bottom-12 right-3 z-20">
          <button
            onClick={() => setShowQualityPanel((p) => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-sm text-white text-[11px] font-bold cursor-pointer border border-white/10 hover:bg-black/90 transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
            </svg>
            {qualityMode === "auto" ? `Auto (${currentLevel})` : currentQuality?.name || currentLevel}
            {bandwidth && <span className="opacity-50 text-[10px]">· {bandwidth}</span>}
          </button>
          {showQualityPanel && (
            <div className="absolute bottom-[calc(100%+8px)] right-0 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 min-w-[190px] shadow-2xl">
              <p className="text-[9px] font-bold text-white/30 px-2 pb-1.5 uppercase tracking-widest">Kualitas</p>
              <button
                onClick={() => { onModeChange("auto"); onQualityChange(null); setShowQualityPanel(false); }}
                className={`w-full px-3 py-2 rounded-xl border-0 text-[12px] cursor-pointer text-left flex items-center justify-between mb-0.5 transition-colors ${qualityMode === "auto" ? "bg-red-500/20 text-red-400 font-bold" : "bg-transparent text-white/70 hover:bg-white/5"}`}
              >
                <span>⚡ Auto</span>
                {qualityMode === "auto" && <span className="text-[10px] opacity-60">{currentLevel}</span>}
              </button>
              {qualities.map((q) => {
                const isActive = qualityMode === "manual" && currentQuality?.quality === q.quality;
                return (
                  <button
                    key={q.quality}
                    onClick={() => { onModeChange("manual"); onQualityChange(q); setShowQualityPanel(false); }}
                    className={`w-full px-3 py-2 rounded-xl border-0 text-[12px] cursor-pointer text-left flex items-center justify-between mb-0.5 transition-colors ${isActive ? "bg-red-500/20 text-red-400 font-bold" : "bg-transparent text-white/70 hover:bg-white/5"}`}
                  >
                    <span>{q.name}</span>
                    <span className="text-[10px] opacity-50">{q.bandwidth_label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── IDN Chat Panel (Supabase realtime, bisa kirim) ────────────────────────────
function IdnChatPanel({
  messages, chatInput, setChatInput, chatUser, isChatLoggingIn, onSend, chatEndRef, navigate,
}: {
  messages: ChatMessage[]; chatInput: string; setChatInput: (v: string) => void;
  chatUser: any; isChatLoggingIn: boolean; onSend: (e: React.FormEvent) => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>; navigate: (path: string) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <span className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">Live Chat</span>
        </div>
        <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
          {messages.length} pesan
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 scroll-smooth">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Belum ada pesan</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Jadilah yang pertama komentar!</p>
            </div>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className="flex gap-2.5 items-start group">
            <img
              src={msg.avatar_url || `https://ui-avatars.com/api/?name=${msg.username}&background=dc2626&color=fff`}
              alt={msg.username}
              className="w-7 h-7 rounded-full object-cover flex-shrink-0 ring-2 ring-white dark:ring-gray-900"
              onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${msg.username}`; }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                {msg.role && msg.role !== "member" && (
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${msg.role === "admin" ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400" : "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"}`}>
                    {msg.role}
                  </span>
                )}
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-none">{msg.username}</span>
                {msg.bluetick && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.79-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.726 2.75 1.83 3.444-.06.315-.09.64-.09.966 0 2.21 1.71 3.998 3.918 3.998.53 0 1.04-.1 1.51-.282.825 1.155 2.15 1.924 3.63 1.924s2.805-.767 3.63-1.924c.47.182.98.282 1.51.282 2.21 0 3.918-1.79 3.918-4 0-.325-.03-.65-.09-.966 1.105-.694 1.83-1.984 1.83-3.444z" fill="#1DA1F2"/>
                    <path d="M10.42 16.273L6.46 12.31l1.41-1.414 2.55 2.548 6.42-6.42 1.414 1.415-7.834 7.834z" fill="white"/>
                  </svg>
                )}
                <span className="text-[10px] text-gray-400 dark:text-gray-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  {new Date(msg.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400 break-words m-0">{msg.text_content}</p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
        {isChatLoggingIn ? (
          <div className="flex items-center justify-center gap-2 py-2">
            <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            <span className="text-xs text-gray-400">Memuat akun...</span>
          </div>
        ) : chatUser ? (
          <form onSubmit={onSend} className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Komentar sebagai ${chatUser.username}...`}
              maxLength={200}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 dark:focus:border-red-500 placeholder:text-gray-400 transition-all"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className={`w-10 h-10 rounded-xl border-0 flex-shrink-0 flex items-center justify-center transition-all duration-150 ${chatInput.trim() ? "bg-red-500 hover:bg-red-600 text-white cursor-pointer shadow-lg shadow-red-500/30" : "bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed"}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        ) : (
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-1">
            Hanya bisa melihat chat.{" "}
            <span onClick={() => navigate("/signin")} className="text-red-500 cursor-pointer font-bold hover:underline">
              Login
            </span>{" "}
            untuk ikut komentar.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Member/Showroom Chat Panel (read-only, polling) ───────────────────────────
function MemberChatPanel({
  comments, loading, error, lastPoll, retry,
}: {
  comments: SRComment[];
  loading: boolean;
  error: boolean;
  lastPoll: Date | null;
  retry: () => void;
}) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  const formatTime = (ts: number) => {
    const d = new Date(ts * 1000);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const getLevelColor = (level: number) => {
    if (level >= 20) return "#7B4FFF";
    if (level >= 10) return "#158DE8";
    return "#929CC3";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">Komentar Live</span>
        </div>
        <div className="flex items-center gap-2">
          {lastPoll && !error && (
            <span className="text-[10px] text-gray-400 dark:text-gray-600">
              Update {lastPoll.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={retry}
            className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hover:opacity-75 transition-opacity"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
          <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
            {comments.length} komentar
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 scroll-smooth">
        {loading && comments.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12">
            <div className="w-8 h-8 border-2 border-gray-200 dark:border-gray-700 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Memuat komentar...</p>
          </div>
        )}
        {error && comments.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Gagal memuat komentar</p>
            <button onClick={retry} className="text-xs text-red-500 font-bold hover:underline">Coba Lagi</button>
          </div>
        )}
        {!loading && !error && comments.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Belum ada komentar</p>
          </div>
        )}
        {comments.map((msg) => (
          <div key={msg.id} className="flex gap-2.5 items-start group">
            <img
              src={msg.avatar_url || `https://ui-avatars.com/api/?name=${msg.name}&background=22c55e&color=fff`}
              alt={msg.name}
              className="w-7 h-7 rounded-full object-cover flex-shrink-0 ring-2 ring-white dark:ring-gray-900"
              onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${msg.name}&background=22c55e&color=fff`; }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                {/* Level badge */}
                <span
                  className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md"
                  style={{
                    backgroundColor: getLevelColor(msg.class_level) + "22",
                    color: getLevelColor(msg.class_level),
                    border: `1px solid ${getLevelColor(msg.class_level)}44`,
                  }}
                >
                  ★ {msg.class_level}
                </span>
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-none">{msg.name}</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  {formatTime(msg.created_at)}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400 break-words m-0">{msg.comment}</p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Read-only footer */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-center gap-2 py-1">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Komentar Showroom · auto-refresh 5 detik
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
function LiveStream() {
  const { playbackId } = useParams<{ playbackId: string }>();
  const navigate       = useNavigate();

  const isIdn    = isIdnSlug(playbackId || "");
  const isMember = !isIdn;

  const [idnShow,           setIdnShow]           = useState<any>(null);
  const [qualities,         setQualities]         = useState<QualityOption[]>([]);
  const [qualityMode,       setQualityMode]       = useState<"auto" | "manual">("auto");
  const [currentQuality,    setCurrentQuality]    = useState<QualityOption | null>(null);
  const [hlsUrl,            setHlsUrl]            = useState("");
  const [memberShow,        setMemberShow]        = useState<any>(null);
  const [memberHlsUrl,      setMemberHlsUrl]      = useState("");
  const [memberRoomId,      setMemberRoomId]      = useState<number | null>(null);
  const [membershipLoading, setMembershipLoading] = useState(isIdn);
  const [hasMembership,     setHasMembership]     = useState(false);
  const [isVerified,        setIsVerified]        = useState(false);
  const [showVerification,  setShowVerification]  = useState(false);
  const [verifData,         setVerifData]         = useState({ email: "", code: "" });
  const [verifyError,       setVerifyError]       = useState("");
  const [verifying,         setVerifying]         = useState(false);
  const [clientIP,          setClientIP]          = useState("");
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState("");
  const [members,           setMembers]           = useState<any[]>([]);

  // IDN chat (Supabase)
  const [chatMessages,      setChatMessages]      = useState<ChatMessage[]>([]);
  const [chatInput,         setChatInput]         = useState("");
  const [chatUser,          setChatUser]          = useState<any>(null);
  const [isChatLoggingIn,   setIsChatLoggingIn]   = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  // Member/Showroom chat (polling, read-only)
  const { comments: srComments, loading: srLoading, error: srError, lastPoll: srLastPoll, retry: srRetry } =
    useShowroomComments(isMember ? memberRoomId : null);

  const fetchClientIP = async () => {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      setClientIP(data.ip);
      return data.ip;
    } catch { return "unknown"; }
  };

  const checkMembership = useCallback(async () => {
    setMembershipLoading(true);
    const session = getSession();
    if (!session) { setMembershipLoading(false); return false; }
    const uid = session.user?.user_id;
    const token = session.token;
    if (!uid || !token) { setMembershipLoading(false); return false; }
    try {
      const res = await fetch(`${API_BASE}/membership/status/${uid}?apikey=${API_KEY}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.status && data.data?.is_active && data.data?.membership_type === "monthly") {
        setHasMembership(true); setMembershipLoading(false); return true;
      }
    } catch {}
    setMembershipLoading(false);
    return false;
  }, []);

  const checkExistingVerification = async () => {
    const stored = localStorage.getItem("stream_verification");
    if (!stored) { setShowVerification(true); return false; }
    try {
      const info = JSON.parse(stored);
      if (!info.verified || !info.timestamp) { localStorage.removeItem("stream_verification"); setShowVerification(true); return false; }
      const hoursDiff = (Date.now() - info.timestamp) / (1000 * 60 * 60);
      if (hoursDiff > 5) { localStorage.removeItem("stream_verification"); setShowVerification(true); return false; }
      const ip = await fetchClientIP();
      if (info.ip !== ip) { info.ip = ip; localStorage.setItem("stream_verification", JSON.stringify(info)); }
      setIsVerified(true); setShowVerification(false);
      setVerifData({ email: info.email, code: info.code });
      return true;
    } catch { localStorage.removeItem("stream_verification"); setShowVerification(true); return false; }
  };

  const verifyAccess = async () => {
    if (!verifData.email || !verifData.code) { setVerifyError("Email dan code wajib diisi"); return; }
    setVerifying(true); setVerifyError("");
    try {
      const ip = clientIP || (await fetchClientIP());
      const verifyRes = await fetch("https://v2.jkt48connect.com/api/codes/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifData.email, code: verifData.code, apikey: "JKTCONNECT" }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.status) { setVerifyError(verifyData.message || "Code tidak valid atau sudah kedaluwarsa"); setVerifying(false); return; }
      const codeData = verifyData.data;
      if (!codeData.is_active) { setVerifyError("Code ini sudah tidak aktif"); setVerifying(false); return; }
      const usageCount = parseInt(codeData.usage_count) || 0;
      const usageLimit = parseInt(codeData.usage_limit) || 1;
      const hasUsageLeft = usageCount < usageLimit;
      if (codeData.is_used && !hasUsageLeft) {
        const listRes = await fetch(`https://v2.jkt48connect.com/api/codes/list?email=${verifData.email}&apikey=JKTCONNECT`);
        const listData = await listRes.json();
        if (listData.status && listData.data?.wotatokens) {
          const userCode = listData.data.wotatokens.find((c: any) => c.code === verifData.code);
          if (userCode) {
            if (userCode.ip_address && userCode.ip_address !== "" && userCode.ip_address !== ip) {
              setVerifyError("Code ini sudah digunakan dari IP address yang berbeda"); setVerifying(false); return;
            }
            localStorage.setItem("stream_verification", JSON.stringify({ email: verifData.email, code: verifData.code, ip, timestamp: Date.now(), verified: true }));
            setIsVerified(true); setShowVerification(false); setVerifying(false); return;
          }
        }
        setVerifyError("Code sudah tidak dapat digunakan"); setVerifying(false); return;
      }
      const useRes = await fetch("https://v2.jkt48connect.com/api/codes/use", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifData.email, code: verifData.code, apikey: "JKTCONNECT" }),
      });
      const useData = await useRes.json();
      if (useData.status) {
        localStorage.setItem("stream_verification", JSON.stringify({ email: verifData.email, code: verifData.code, ip, timestamp: Date.now(), verified: true }));
        setIsVerified(true); setShowVerification(false); setVerifying(false);
      } else { setVerifyError(useData.message || "Gagal menggunakan code"); setVerifying(false); }
    } catch { setVerifyError("Terjadi kesalahan saat verifikasi. Silakan coba lagi."); setVerifying(false); }
  };

  const loadIdnStream = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const idnRes = await fetch(IDN_API);
      const idnData = await idnRes.json();
      if (!idnData || idnData.status !== 200 || !Array.isArray(idnData.data)) { setError("Gagal mengambil data IDN Plus"); setLoading(false); return; }
      const show = idnData.data.find((s: any) => s.slug === playbackId && s.status === "live");
      if (!show) { setError("Show tidak ditemukan atau sudah berakhir"); setLoading(false); return; }
      setIdnShow(show);
      const qualRes = await fetch(`${PLAY_HOST}/live/idn/${show.slug}/qualities.json?showId=${show.showId}`);
      const qualData = await qualRes.json();
      if (qualData.success && Array.isArray(qualData.qualities)) setQualities(qualData.qualities);
      setHlsUrl(`${PLAY_HOST}/live/idn/${show.slug}/master.m3u8?showId=${show.showId}`);
      try {
        const theaterRes = await fetch(`https://v2.jkt48connect.com/api/jkt48/theater?apikey=${API_KEY}`);
        const theaterData = await theaterRes.json();
        if (theaterData.theater?.length > 0) {
          const now = Date.now();
          let nearest = theaterData.theater[0];
          let minDiff = Math.abs(new Date(nearest.date).getTime() - now);
          theaterData.theater.forEach((s: any) => {
            const diff = Math.abs(new Date(s.date).getTime() - now);
            if (diff < minDiff) { minDiff = diff; nearest = s; }
          });
          const detailRes = await fetch(`https://v2.jkt48connect.com/api/jkt48/theater/${nearest.id}?apikey=${API_KEY}`);
          const detailData = await detailRes.json();
          if (detailData.shows?.[0]?.members) setMembers(detailData.shows[0].members);
        }
      } catch {}
      setLoading(false);
    } catch { setError("Terjadi kesalahan saat memuat stream."); setLoading(false); }
  }, [playbackId]);

  const loadMemberStream = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(LIVE_API);
      const data = await res.json();
      if (!Array.isArray(data)) { setError("Gagal mengambil data live member"); setLoading(false); return; }
      const show = data.find((s: any) => s.url_key === playbackId);
      if (!show) { setError("Member tidak sedang live saat ini"); setLoading(false); return; }
      setMemberShow(show);
      const streamUrl = show.streaming_url_list?.[0]?.url || null;
      if (!streamUrl) { setError("URL stream tidak tersedia"); setLoading(false); return; }
      setMemberHlsUrl(streamUrl);
      // Set room_id untuk polling Showroom comments
      if (show.room_id) setMemberRoomId(show.room_id);
      setLoading(false);
    } catch { setError("Terjadi kesalahan saat memuat stream member."); setLoading(false); }
  }, [playbackId]);

  const handleQualityChange = (q: QualityOption | null) => {
    setCurrentQuality(q);
    if (!q || !idnShow) return;
    setHlsUrl(q.manual_url);
  };

  const handleModeChange = (mode: "auto" | "manual") => {
    setQualityMode(mode);
    if (mode === "auto" && idnShow) {
      setHlsUrl(`${PLAY_HOST}/live/idn/${idnShow.slug}/master.m3u8?showId=${idnShow.showId}`);
      setCurrentQuality(null);
    }
  };

  const initChat = useCallback(async () => {
    setIsChatLoggingIn(true);
    let userData: any = null;
    try {
      const rawData = sessionStorage.getItem("userLogin") || localStorage.getItem("userLogin");
      if (rawData) {
        const parsed = JSON.parse(rawData);
        if (parsed?.isLoggedIn && parsed?.token && parsed?.user?.user_id) {
          try {
            const res = await fetch(`${API_BASE}/profile/${parsed.user.user_id}?apikey=${API_KEY}`, {
              headers: { Authorization: `Bearer ${parsed.token}` },
            });
            const profileData = await res.json();
            userData = profileData.status && profileData.data ? profileData.data : parsed.user;
          } catch { userData = parsed.user; }
        } else { userData = parsed?.user || parsed; }
      }
    } catch {}
    if (userData && (userData.username || userData.full_name)) {
      const username = userData.username || userData.full_name;
      const email = userData.email || `${username.replace(/\s+/g, "").toLowerCase()}@jkt48connect.local`;
      const avatar_url = userData.avatar
        ? userData.avatar
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=dc2626&color=fff`;
      try {
        await fetch(`${API_BASE}/chatstream/register?apikey=${API_KEY}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.toLowerCase(), email, avatar_url }),
        });
        const { data: supabaseUser, error } = await supabase
          .from("dashboard_v2_users")
          .select("id, username, avatar_url, role, bluetick")
          .eq("username", username.toLowerCase())
          .single();
        if (!error && supabaseUser) { setChatUser({ ...supabaseUser, avatar_url }); }
        else { setChatUser({ id: userData.user_id || username, username: username.toLowerCase(), avatar_url, role: "member", bluetick: false }); }
      } catch {}
    }
    setIsChatLoggingIn(false);
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !chatUser) return;
    const payload: ChatMessage = {
      user_id: chatUser.id, username: chatUser.username,
      avatar_url: chatUser.avatar_url || `https://ui-avatars.com/api/?name=${chatUser.username}`,
      bluetick: chatUser.bluetick, role: chatUser.role,
      text_content: chatInput.trim(), timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, payload]);
    setChatInput("");
    await channelRef.current?.send({ type: "broadcast", event: "pesan_baru", payload });
  };

  // IDN chat via Supabase realtime
  useEffect(() => {
    if (!isIdn) return;
    const channel = supabase.channel(`chat-${playbackId}`, { config: { broadcast: { ack: true } } });
    channel
      .on("broadcast", { event: "pesan_baru" }, ({ payload }: { payload: ChatMessage }) => {
        setChatMessages((prev) => {
          const exists = prev.some((m) => m.timestamp === payload.timestamp && m.username === payload.username);
          return exists ? prev : [...prev, payload];
        });
      })
      .subscribe();
    channelRef.current = channel;
    initChat();
    return () => { supabase.removeChannel(channel); };
  }, [playbackId, isIdn, initChat]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  useEffect(() => {
    if (isMember) {
      loadMemberStream();
    } else {
      const init = async () => {
        await fetchClientIP();
        const hasMember = await checkMembership();
        if (hasMember) { setIsVerified(true); setShowVerification(false); await loadIdnStream(); }
        else {
          const verified = await checkExistingVerification();
          if (verified) await loadIdnStream();
          else setLoading(false);
        }
      };
      init();
    }
  }, [isMember]); // eslint-disable-line

  useEffect(() => { if (isIdn && isVerified && !idnShow) loadIdnStream(); }, [isVerified]); // eslint-disable-line

  const handleLogout = () => {
    localStorage.removeItem("stream_verification");
    setIsVerified(false); setShowVerification(true);
    setIdnShow(null); setHlsUrl(""); setQualities([]);
    setVerifData({ email: "", code: "" });
  };

  const showTitle = isIdn
    ? (idnShow?.title || "Live Stream JKT48")
    : (memberShow?.name || "Live Member JKT48");

  // ── Membership Loading ────────────────────────────────────────────────────
  if (isIdn && membershipLoading) {
    return (
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-gray-200 dark:border-gray-700 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Memeriksa akses...</p>
        </div>
      </div>
    );
  }

  // ── Verification Page ─────────────────────────────────────────────────────
  if (isIdn && showVerification && !isVerified) {
    return (
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12 flex items-center justify-center">
        <div className="w-full max-w-[440px]">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white/90 mb-1.5">Verifikasi Akses</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Masukkan email dan kode untuk mengakses live stream IDN Plus</p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-4">
            <form onSubmit={(e) => { e.preventDefault(); verifyAccess(); }} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={verifData.email}
                  onChange={(e) => { setVerifData((p) => ({ ...p, email: e.target.value })); setVerifyError(""); }}
                  placeholder="email@example.com"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 dark:focus:border-red-500 placeholder:text-gray-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Verification Code</label>
                <input
                  type="text"
                  value={verifData.code}
                  onChange={(e) => { setVerifData((p) => ({ ...p, code: e.target.value })); setVerifyError(""); }}
                  placeholder="Masukkan kode verifikasi"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 dark:focus:border-red-500 placeholder:text-gray-400 tracking-widest transition-all"
                />
              </div>
              {verifyError && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {verifyError}
                </div>
              )}
              <button
                type="submit"
                disabled={verifying}
                className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border-0 text-sm font-bold text-white transition-all duration-200 mt-1 ${verifying ? "bg-red-400 cursor-not-allowed" : "bg-red-500 hover:bg-red-600 cursor-pointer shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:-translate-y-0.5"}`}
              >
                {verifying ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Memverifikasi...</>
                ) : (
                  <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>Verifikasi Akses</>
                )}
              </button>
            </form>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700/50 p-4 mb-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Informasi</p>
            <ul className="space-y-1">
              {["Code verifikasi hanya dapat digunakan sekali", "IP address akan dicatat untuk keamanan", "Akses berlaku selama 5 jam", "Session tetap aktif saat refresh halaman"].map((info, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="text-gray-300 dark:text-gray-600 mt-0.5">•</span>{info}
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
              Punya membership monthly?{" "}
              <span onClick={() => navigate("/signin")} className="text-red-500 cursor-pointer font-bold hover:underline">Login di sini</span>
            </div>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="w-full py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-500 dark:text-gray-400 text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center justify-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Kembali
          </button>
        </div>
      </div>
    );
  }

  // ── Loading stream ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-gray-200 dark:border-gray-700 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {isIdn ? "Memuat IDN Live Plus..." : "Memuat live stream member..."}
          </p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white/90 mb-2">Terjadi Kesalahan</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setError(""); isIdn ? loadIdnStream() : loadMemberStream(); }}
              className="px-5 py-2.5 rounded-xl border-0 bg-red-500 text-white text-sm font-bold cursor-pointer hover:bg-red-600 shadow-lg shadow-red-500/25 transition-all hover:-translate-y-0.5"
            >
              Coba Lagi
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-600 dark:text-gray-400 text-sm font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div>
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03] xl:px-8 xl:py-7">

        {/* ── Top bar ── */}
        <div className="flex items-center gap-2.5 mb-6 flex-wrap">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-600 dark:text-gray-400 text-xs font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Kembali
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500 text-white text-[11px] font-extrabold tracking-wide shadow-md shadow-red-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </div>

          {isIdn && (
            <span className="px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-[11px] font-bold">
              IDN Live+
            </span>
          )}
          {isMember && (
            <span className="px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
              Member Live
            </span>
          )}
          {isIdn && hasMembership && (
            <span className="px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-bold">
              ★ Monthly
            </span>
          )}
          {isIdn && idnShow && (
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {idnShow.view_count?.toLocaleString() || 0} penonton
            </span>
          )}
          {isMember && memberShow && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {memberShow.type?.toUpperCase()} · Mulai {new Date(memberShow.started_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
            </span>
          )}
          {isIdn && !hasMembership && isVerified && (
            <button
              onClick={handleLogout}
              className="ml-auto px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-500 dark:text-gray-400 text-[11px] font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              Logout
            </button>
          )}
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">

          {/* ── Left: video + info ── */}
          <div className="flex flex-col gap-5">

            {/* Player */}
            {isIdn && hlsUrl ? (
              <HlsPlayer
                src={hlsUrl} title={showTitle} qualities={qualities}
                onQualityChange={handleQualityChange} currentQuality={currentQuality}
                qualityMode={qualityMode} onModeChange={handleModeChange} isIdn={true}
              />
            ) : isMember && memberHlsUrl ? (
              <HlsPlayer
                src={memberHlsUrl} title={showTitle} qualities={[]}
                onQualityChange={() => {}} currentQuality={null}
                qualityMode="auto" onModeChange={() => {}} isIdn={false}
              />
            ) : (
              <div className="aspect-video bg-gray-100 dark:bg-gray-800/50 rounded-2xl flex items-center justify-center border border-gray-200 dark:border-gray-700">
                <div className="w-10 h-10 border-[3px] border-gray-200 dark:border-gray-700 border-t-red-500 rounded-full animate-spin" />
              </div>
            )}

            {/* IDN Show detail */}
            {isIdn && idnShow && (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 p-5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Detail Show</p>
                <div className="flex gap-4 items-start">
                  {idnShow.image_url && (
                    <img
                      src={idnShow.image_url} alt={idnShow.title}
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-800 dark:text-white/90 mb-2">{idnShow.title}</h3>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2">
                      <span className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        {idnShow.view_count?.toLocaleString() || 0}
                      </span>
                      {idnShow.showId && <span>#{idnShow.showId}</span>}
                    </div>
                    {idnShow.idnliveplus?.description && (
                      <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400 m-0 whitespace-pre-line">{idnShow.idnliveplus.description}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Member detail */}
            {isMember && memberShow && (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 p-5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Detail Member</p>
                <div className="flex gap-4 items-center">
                  <img
                    src={memberShow.img_alt || memberShow.img} alt={memberShow.name}
                    className="w-14 h-14 rounded-full object-cover flex-shrink-0 border-2 border-gray-200 dark:border-gray-700"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <div>
                    <h3 className="text-base font-bold text-gray-800 dark:text-white/90 mb-2">{memberShow.name}</h3>
                    <div className="flex gap-2 flex-wrap items-center">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase">
                        {memberShow.type}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Mulai: {new Date(memberShow.started_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Lineup */}
            {isIdn && members.length > 0 && (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 p-5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                  Lineup Show · {members.length} Member
                </p>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(68px,1fr))] gap-3">
                  {members.map((m: any) => (
                    <div key={m.id} className="text-center group">
                      <div className="relative mx-auto w-12 h-12 mb-1.5">
                        <img
                          src={m.img} alt={m.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700 group-hover:border-red-400 transition-colors"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                      <p className="m-0 text-[10px] font-medium text-gray-500 dark:text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap leading-tight">{m.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-center text-[10px] font-semibold text-gray-300 dark:text-gray-700 uppercase tracking-widest pb-1">
              Powered by JKT48Connect
            </p>
          </div>

          {/* ── Right: Chat ── */}
          <div className="xl:sticky xl:top-4 xl:self-start">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.02] overflow-hidden" style={{ height: "580px" }}>
              <div className="h-full flex flex-col">
                {isIdn ? (
                  <IdnChatPanel
                    messages={chatMessages}
                    chatInput={chatInput}
                    setChatInput={setChatInput}
                    chatUser={chatUser}
                    isChatLoggingIn={isChatLoggingIn}
                    onSend={handleSendMessage}
                    chatEndRef={chatEndRef}
                    navigate={navigate}
                  />
                ) : (
                  <MemberChatPanel
                    comments={srComments}
                    loading={srLoading}
                    error={srError}
                    lastPoll={srLastPoll}
                    retry={srRetry}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LiveStream;
