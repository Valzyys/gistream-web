import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import Hls from "hls.js";
import { createClient } from "@supabase/supabase-js";
import PageMeta from "../components/common/PageMeta";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://mzxfuaoihgzxvokwarao.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16eGZ1YW9paGd6eHZva3dhcmFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MDg0NjIsImV4cCI6MjA4OTk4NDQ2Mn0.OFYCkBFXCSfLn-wG94OHHKL5CX8T_BLrbDGPiBdPIog";
const supabase = createClient(supabaseUrl, supabaseKey);

const API_BASE  = "https://v2.jkt48connect.com/api/jkt48connect";
const API_KEY   = "JKTCONNECT";
const PLAY_HOST = "https://play.jkt48connect.com";
const IDN_API   = "https://v2.jkt48connect.com/api/jkt48/idnplus?apikey=JKTCONNECT";
const LIVE_API  = "https://v2.jkt48connect.com/api/jkt48/live?apikey=JKTCONNECT";

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

const isIdnSlug = (param: string) => {
  if (!param) return false;
  return /\d{4}-\d{2}-\d{2}/.test(param);
};

// ── Types ─────────────────────────────────────────────────────────────────────
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

// ── HLS Player Component ──────────────────────────────────────────────────────
function HlsPlayer({
  src,
  title,
  qualities,
  onQualityChange,
  currentQuality,
  qualityMode,
  onModeChange,
  isIdn,
}: {
  src:             string;
  title:           string;
  qualities:       QualityOption[];
  onQualityChange: (q: QualityOption | null) => void;
  currentQuality:  QualityOption | null;
  qualityMode:     "auto" | "manual";
  onModeChange:    (mode: "auto" | "manual") => void;
  isIdn:           boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef   = useRef<Hls | null>(null);
  const [showQualityPanel, setShowQualityPanel] = useState(false);
  const [currentLevel,     setCurrentLevel]     = useState<string>("Auto");
  const [bandwidth,        setBandwidth]         = useState<string>("");

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker:           true,
        lowLatencyMode:         true,
        liveSyncDuration:       3,
        liveMaxLatencyDuration: 10,
        startLevel:             qualityMode === "auto" ? -1 : undefined,
        abrEwmaDefaultEstimate: 1_000_000,
        abrBandWidthFactor:     0.9,
        abrBandWidthUpFactor:   0.7,
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
          if (bw > 0) {
            setBandwidth(bw >= 1_000_000
              ? (bw / 1_000_000).toFixed(1) + " Mbps"
              : Math.round(bw / 1_000) + " Kbps"
            );
          }
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
    <div className="relative w-full bg-black rounded-xl overflow-hidden">
      {isIdn ? (
        <div className="aspect-video">
          <video
            ref={videoRef}
            controls
            autoPlay
            playsInline
            className="w-full h-full block"
            title={title}
          />
        </div>
      ) : (
        <div
          className="flex items-center justify-center bg-black"
          style={{ maxHeight: "420px" }}
        >
          <video
            ref={videoRef}
            controls
            autoPlay
            playsInline
            className="block"
            style={{
              maxWidth:  "100%",
              maxHeight: "420px",
              width:     "auto",
              height:    "auto",
              margin:    "0 auto",
            }}
            title={title}
          />
        </div>
      )}

      {/* Quality Button */}
      {qualities.length > 0 && (
        <div className="absolute bottom-12 right-2 z-20">
          <button
            onClick={() => setShowQualityPanel((p) => !p)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-black/75 backdrop-blur-sm text-white text-[11px] font-bold cursor-pointer border-0"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
            </svg>
            {qualityMode === "auto" ? `Auto (${currentLevel})` : currentQuality?.name || currentLevel}
            {bandwidth && <span className="opacity-70 text-[10px]">· {bandwidth}</span>}
          </button>

          {showQualityPanel && (
            <div className="absolute bottom-[calc(100%+6px)] right-0 bg-[rgba(15,15,15,0.95)] backdrop-blur-xl border border-white/10 rounded-xl p-2 min-w-[180px] shadow-2xl">
              <div className="text-[10px] font-bold text-white/40 px-2 pb-2 uppercase tracking-wide">
                Kualitas Video
              </div>
              <button
                onClick={() => { onModeChange("auto"); onQualityChange(null); setShowQualityPanel(false); }}
                className={`w-full px-2.5 py-2 rounded-md border-0 text-[12px] font-${qualityMode === "auto" ? "bold" : "medium"} cursor-pointer text-left flex items-center justify-between mb-0.5 ${
                  qualityMode === "auto"
                    ? "bg-brand-500/20 text-brand-500"
                    : "bg-transparent text-white/80"
                }`}
              >
                <span>⚡ Auto</span>
                {qualityMode === "auto" && <span className="text-[10px] opacity-70">{currentLevel}</span>}
              </button>
              {qualities.map((q) => {
                const isActive = qualityMode === "manual" && currentQuality?.quality === q.quality;
                return (
                  <button
                    key={q.quality}
                    onClick={() => { onModeChange("manual"); onQualityChange(q); setShowQualityPanel(false); }}
                    className={`w-full px-2.5 py-2 rounded-md border-0 text-[12px] cursor-pointer text-left flex items-center justify-between mb-0.5 ${
                      isActive
                        ? "bg-brand-500/20 text-brand-500 font-bold"
                        : "bg-transparent text-white/80 font-medium"
                    }`}
                  >
                    <span>{q.name}</span>
                    <span className="text-[10px] opacity-60">{q.bandwidth_label}</span>
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

// ── Chat Component ────────────────────────────────────────────────────────────
function ChatPanel({
  messages,
  chatInput,
  setChatInput,
  chatUser,
  isChatLoggingIn,
  onSend,
  chatEndRef,
  navigate,
}: {
  messages:        ChatMessage[];
  chatInput:       string;
  setChatInput:    (v: string) => void;
  chatUser:        any;
  isChatLoggingIn: boolean;
  onSend:          (e: React.FormEvent) => void;
  chatEndRef:      React.RefObject<HTMLDivElement | null>;
  navigate:        (path: string) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02] flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-error-500 animate-pulse" />
          <span className="text-sm font-bold text-gray-900 dark:text-white">Live Chat</span>
        </div>
        <span className="text-xs text-gray-400 dark:text-white/35">
          {messages.length} pesan
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-0">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-white/20 text-sm text-center py-8">
            Belum ada pesan.<br />Jadilah yang pertama!
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className="flex gap-2 items-start">
            <img
              src={msg.avatar_url || `https://ui-avatars.com/api/?name=${msg.username}&background=7b1c1c&color=fff`}
              alt={msg.username}
              className="w-7 h-7 rounded-full object-cover flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${msg.username}`; }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 flex-wrap mb-0.5">
                {msg.role && msg.role !== "member" && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                    msg.role === "admin"
                      ? "bg-error-500/25 text-error-400"
                      : "bg-brand-500/25 text-brand-400"
                  }`}>
                    {msg.role}
                  </span>
                )}
                <span className="text-xs font-bold text-gray-800 dark:text-white/85">{msg.username}</span>
                {msg.bluetick && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.79-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.726 2.75 1.83 3.444-.06.315-.09.64-.09.966 0 2.21 1.71 3.998 3.918 3.998.53 0 1.04-.1 1.51-.282.825 1.155 2.15 1.924 3.63 1.924s2.805-.767 3.63-1.924c.47.182.98.282 1.51.282 2.21 0 3.918-1.79 3.918-4 0-.325-.03-.65-.09-.966 1.105-.694 1.83-1.984 1.83-3.444z" fill="#1DA1F2"/>
                    <path d="M10.42 16.273L6.46 12.31l1.41-1.414 2.55 2.548 6.42-6.42 1.414 1.415-7.834 7.834z" fill="white"/>
                  </svg>
                )}
                <span className="text-[10px] text-gray-400 dark:text-white/20 ml-auto">
                  {new Date(msg.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-gray-600 dark:text-white/70 break-words m-0">
                {msg.text_content}
              </p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 border-t border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02] flex-shrink-0">
        {isChatLoggingIn ? (
          <div className="text-center text-xs text-gray-400 dark:text-white/30 py-2">
            Memuat info akun...
          </div>
        ) : chatUser ? (
          <form onSubmit={onSend} className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Kirim sebagai ${chatUser.username}...`}
              maxLength={200}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.06] text-gray-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-brand-500/50 placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className={`px-3 py-2 rounded-lg border-0 flex-shrink-0 transition-all duration-150 flex items-center justify-center ${
                chatInput.trim()
                  ? "bg-brand-500 text-white cursor-pointer hover:bg-brand-600"
                  : "bg-gray-100 dark:bg-white/[0.08] text-gray-400 dark:text-white/30 cursor-not-allowed"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        ) : (
          <div className="text-center text-xs text-gray-500 dark:text-white/35 py-1">
            Hanya bisa melihat chat.{" "}
            <span
              onClick={() => navigate("/signin")}
              className="text-brand-500 cursor-pointer font-bold hover:underline"
            >
              Login
            </span>{" "}
            untuk ikut komen.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main LiveStream Component ──────────────────────────────────────────────────
function LiveStream() {
  const { playbackId } = useParams<{ playbackId: string }>();
  const navigate       = useNavigate();

  const isIdn    = isIdnSlug(playbackId || "");
  const isMember = !isIdn;

  const [idnShow,          setIdnShow]          = useState<any>(null);
  const [qualities,        setQualities]        = useState<QualityOption[]>([]);
  const [qualityMode,      setQualityMode]      = useState<"auto" | "manual">("auto");
  const [currentQuality,   setCurrentQuality]   = useState<QualityOption | null>(null);
  const [hlsUrl,           setHlsUrl]           = useState("");

  const [memberShow,       setMemberShow]       = useState<any>(null);
  const [memberHlsUrl,     setMemberHlsUrl]     = useState("");

  const [membershipLoading, setMembershipLoading] = useState(isIdn);
  const [hasMembership,     setHasMembership]     = useState(false);
  const [isVerified,        setIsVerified]        = useState(false);
  const [showVerification,  setShowVerification]  = useState(false);
  const [verifData,         setVerifData]         = useState({ email: "", code: "" });
  const [verifyError,       setVerifyError]       = useState("");
  const [verifying,         setVerifying]         = useState(false);
  const [clientIP,          setClientIP]          = useState("");

  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [members,  setMembers]  = useState<any[]>([]);

  const [chatMessages,    setChatMessages]    = useState<ChatMessage[]>([]);
  const [chatInput,       setChatInput]       = useState("");
  const [chatUser,        setChatUser]        = useState<any>(null);
  const [isChatLoggingIn, setIsChatLoggingIn] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  const fetchClientIP = async () => {
    try {
      const res  = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      setClientIP(data.ip);
      return data.ip;
    } catch { return "unknown"; }
  };

  const checkMembership = useCallback(async () => {
    setMembershipLoading(true);
    const session = getSession();
    if (!session) { setMembershipLoading(false); return false; }
    const uid   = session.user?.user_id;
    const token = session.token;
    if (!uid || !token) { setMembershipLoading(false); return false; }
    try {
      const res  = await fetch(
        `${API_BASE}/membership/status/${uid}?apikey=${API_KEY}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
      if (!info.verified || !info.timestamp) {
        localStorage.removeItem("stream_verification"); setShowVerification(true); return false;
      }
      const hoursDiff = (Date.now() - info.timestamp) / (1000 * 60 * 60);
      if (hoursDiff > 5) {
        localStorage.removeItem("stream_verification"); setShowVerification(true); return false;
      }
      const ip = await fetchClientIP();
      if (info.ip !== ip) {
        info.ip = ip;
        localStorage.setItem("stream_verification", JSON.stringify(info));
      }
      setIsVerified(true); setShowVerification(false);
      setVerifData({ email: info.email, code: info.code });
      return true;
    } catch {
      localStorage.removeItem("stream_verification"); setShowVerification(true); return false;
    }
  };

  const verifyAccess = async () => {
    if (!verifData.email || !verifData.code) {
      setVerifyError("Email dan code wajib diisi"); return;
    }
    setVerifying(true); setVerifyError("");
    try {
      const ip = clientIP || (await fetchClientIP());
      const verifyRes  = await fetch("https://v2.jkt48connect.com/api/codes/verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: verifData.email, code: verifData.code, apikey: "JKTCONNECT" }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.status) {
        setVerifyError(verifyData.message || "Code tidak valid atau sudah kedaluwarsa");
        setVerifying(false); return;
      }
      const codeData     = verifyData.data;
      if (!codeData.is_active) {
        setVerifyError("Code ini sudah tidak aktif"); setVerifying(false); return;
      }
      const usageCount   = parseInt(codeData.usage_count) || 0;
      const usageLimit   = parseInt(codeData.usage_limit) || 1;
      const hasUsageLeft = usageCount < usageLimit;
      if (codeData.is_used && !hasUsageLeft) {
        const listRes  = await fetch(`https://v2.jkt48connect.com/api/codes/list?email=${verifData.email}&apikey=JKTCONNECT`);
        const listData = await listRes.json();
        if (listData.status && listData.data?.wotatokens) {
          const userCode = listData.data.wotatokens.find((c: any) => c.code === verifData.code);
          if (userCode) {
            if (userCode.ip_address && userCode.ip_address !== "" && userCode.ip_address !== ip) {
              setVerifyError("Code ini sudah digunakan dari IP address yang berbeda");
              setVerifying(false); return;
            }
            localStorage.setItem("stream_verification", JSON.stringify({
              email: verifData.email, code: verifData.code, ip, timestamp: Date.now(), verified: true,
            }));
            setIsVerified(true); setShowVerification(false); setVerifying(false); return;
          }
        }
        setVerifyError("Code sudah tidak dapat digunakan"); setVerifying(false); return;
      }
      const useRes  = await fetch("https://v2.jkt48connect.com/api/codes/use", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: verifData.email, code: verifData.code, apikey: "JKTCONNECT" }),
      });
      const useData = await useRes.json();
      if (useData.status) {
        localStorage.setItem("stream_verification", JSON.stringify({
          email: verifData.email, code: verifData.code, ip, timestamp: Date.now(), verified: true,
        }));
        setIsVerified(true); setShowVerification(false); setVerifying(false);
      } else {
        setVerifyError(useData.message || "Gagal menggunakan code");
        setVerifying(false);
      }
    } catch {
      setVerifyError("Terjadi kesalahan saat verifikasi. Silakan coba lagi.");
      setVerifying(false);
    }
  };

  const loadIdnStream = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const idnRes  = await fetch(IDN_API);
      const idnData = await idnRes.json();
      if (!idnData || idnData.status !== 200 || !Array.isArray(idnData.data)) {
        setError("Gagal mengambil data IDN Plus"); setLoading(false); return;
      }
      const show = idnData.data.find((s: any) => s.slug === playbackId && s.status === "live");
      if (!show) {
        setError("Show tidak ditemukan atau sudah berakhir"); setLoading(false); return;
      }
      setIdnShow(show);
      const showId = show.showId;
      const slug   = show.slug;
      const qualRes  = await fetch(`${PLAY_HOST}/live/idn/${slug}/qualities.json?showId=${showId}`);
      const qualData = await qualRes.json();
      if (qualData.success && Array.isArray(qualData.qualities)) setQualities(qualData.qualities);
      setHlsUrl(`${PLAY_HOST}/live/idn/${slug}/master.m3u8?showId=${showId}`);
      try {
        const theaterRes  = await fetch(`https://v2.jkt48connect.com/api/jkt48/theater?apikey=${API_KEY}`);
        const theaterData = await theaterRes.json();
        if (theaterData.theater?.length > 0) {
          const now   = Date.now();
          let nearest = theaterData.theater[0];
          let minDiff = Math.abs(new Date(nearest.date).getTime() - now);
          theaterData.theater.forEach((s: any) => {
            const diff = Math.abs(new Date(s.date).getTime() - now);
            if (diff < minDiff) { minDiff = diff; nearest = s; }
          });
          const detailRes  = await fetch(`https://v2.jkt48connect.com/api/jkt48/theater/${nearest.id}?apikey=${API_KEY}`);
          const detailData = await detailRes.json();
          if (detailData.shows?.[0]?.members) setMembers(detailData.shows[0].members);
        }
      } catch {}
      setLoading(false);
    } catch {
      setError("Terjadi kesalahan saat memuat stream."); setLoading(false);
    }
  }, [playbackId]);

  const loadMemberStream = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res  = await fetch(LIVE_API);
      const data = await res.json();
      if (!Array.isArray(data)) {
        setError("Gagal mengambil data live member"); setLoading(false); return;
      }
      const show = data.find((s: any) => s.url_key === playbackId);
      if (!show) {
        setError("Member tidak sedang live saat ini"); setLoading(false); return;
      }
      setMemberShow(show);
      const streamUrl = show.streaming_url_list?.[0]?.url || null;
      if (!streamUrl) { setError("URL stream tidak tersedia"); setLoading(false); return; }
      setMemberHlsUrl(streamUrl);
      setLoading(false);
    } catch {
      setError("Terjadi kesalahan saat memuat stream member."); setLoading(false);
    }
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
            const res         = await fetch(`${API_BASE}/profile/${parsed.user.user_id}?apikey=${API_KEY}`, {
              headers: { Authorization: `Bearer ${parsed.token}` },
            });
            const profileData = await res.json();
            userData = profileData.status && profileData.data ? profileData.data : parsed.user;
          } catch { userData = parsed.user; }
        } else {
          userData = parsed?.user || parsed;
        }
      }
    } catch {}
    if (userData && (userData.username || userData.full_name)) {
      const username   = userData.username || userData.full_name;
      const email      = userData.email || `${username.replace(/\s+/g, "").toLowerCase()}@jkt48connect.local`;
      const avatar_url = userData.avatar
        ? userData.avatar
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=7b1c1c&color=fff`;
      try {
        await fetch(`${API_BASE}/chatstream/register?apikey=${API_KEY}`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ username: username.toLowerCase(), email, avatar_url }),
        });
        const { data: supabaseUser, error } = await supabase
          .from("dashboard_v2_users")
          .select("id, username, avatar_url, role, bluetick")
          .eq("username", username.toLowerCase())
          .single();
        if (!error && supabaseUser) {
          setChatUser({ ...supabaseUser, avatar_url });
        } else {
          setChatUser({ id: userData.user_id || username, username: username.toLowerCase(), avatar_url, role: "member", bluetick: false });
        }
      } catch {}
    }
    setIsChatLoggingIn(false);
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !chatUser) return;
    const payload: ChatMessage = {
      user_id:      chatUser.id,
      username:     chatUser.username,
      avatar_url:   chatUser.avatar_url || `https://ui-avatars.com/api/?name=${chatUser.username}`,
      bluetick:     chatUser.bluetick,
      role:         chatUser.role,
      text_content: chatInput.trim(),
      timestamp:    new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, payload]);
    setChatInput("");
    await channelRef.current?.send({ type: "broadcast", event: "pesan_baru", payload });
  };

  useEffect(() => {
    const channel = supabase.channel(`chat-${playbackId}`, {
      config: { broadcast: { ack: true } },
    });
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
  }, [playbackId, initChat]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    if (isMember) {
      loadMemberStream();
    } else {
      const init = async () => {
        await fetchClientIP();
        const hasMember = await checkMembership();
        if (hasMember) {
          setIsVerified(true); setShowVerification(false);
          await loadIdnStream();
        } else {
          const verified = await checkExistingVerification();
          if (verified) await loadIdnStream();
          else setLoading(false);
        }
      };
      init();
    }
  }, [isMember]); // eslint-disable-line

  useEffect(() => {
    if (isIdn && isVerified && !idnShow) loadIdnStream();
  }, [isVerified]); // eslint-disable-line

  const handleLogout = () => {
    localStorage.removeItem("stream_verification");
    setIsVerified(false); setShowVerification(true);
    setIdnShow(null); setHlsUrl(""); setQualities([]);
    setVerifData({ email: "", code: "" });
  };

  const showTitle = isIdn
    ? (idnShow?.title || "Live Stream JKT48")
    : (memberShow?.name || "Live Member JKT48");

  // ── Shared page wrapper (replaces PageBreadcrumb/ComponentCard headers) ─────
  const PageWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">
      {children}
    </div>
  );

  // ── Loading membership ────────────────────────────────────────────────────
  if (isIdn && membershipLoading) {
    return (
      <>
        <PageMeta title="Memeriksa Akses..." description="Live Stream JKT48" />
        <PageWrapper>
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <div className="w-9 h-9 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-white/40">Memeriksa akses...</p>
          </div>
        </PageWrapper>
      </>
    );
  }

  // ── Verification page ─────────────────────────────────────────────────────
  if (isIdn && showVerification && !isVerified) {
    return (
      <>
        <PageMeta title="Verifikasi Akses - Live Stream" description="Verifikasi akses live stream JKT48" />
        <PageWrapper>
          {/* Page Header */}
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "rgba(220,31,46,0.08)", border: "1px solid rgba(220,31,46,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                    stroke="#DC1F2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-800 dark:text-white" style={{ margin: 0 }}>
                    Verifikasi Akses
                  </h1>
                  <p style={{ margin: 0, fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                    Masukkan email dan kode untuk mengakses live stream
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate(-1)}
                style={{
                  padding: "6px 12px", borderRadius: 8,
                  border: "1px solid #e5e7eb", background: "#fff",
                  color: "#6b7280", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                }}
                className="dark:bg-white/[0.04] dark:border-gray-700 dark:text-gray-400"
              >
                ← Kembali
              </button>
            </div>
          </div>

          <div style={{ padding: 24 }}>
            <div className="flex items-center justify-center">
              <div className="w-full max-w-md">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/[0.08] rounded-2xl p-8 shadow-xl">
                  <form
                    onSubmit={(e) => { e.preventDefault(); verifyAccess(); }}
                    className="flex flex-col gap-4"
                  >
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-500 dark:text-white/50">Email</label>
                      <input
                        type="email"
                        value={verifData.email}
                        onChange={(e) => { setVerifData((p) => ({ ...p, email: e.target.value })); setVerifyError(""); }}
                        placeholder="email@example.com"
                        required
                        className="px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.05] text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 placeholder:text-gray-400"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-500 dark:text-white/50">Verification Code</label>
                      <input
                        type="text"
                        value={verifData.code}
                        onChange={(e) => { setVerifData((p) => ({ ...p, code: e.target.value })); setVerifyError(""); }}
                        placeholder="Masukkan kode verifikasi"
                        required
                        className="px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.05] text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 placeholder:text-gray-400 tracking-wider"
                      />
                    </div>
                    {verifyError && (
                      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-error-50 dark:bg-error-500/12 border border-error-200 dark:border-error-500/30 text-error-600 dark:text-error-400 text-xs">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {verifyError}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={verifying}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-0 text-sm font-bold text-white transition-all duration-200 ${
                        verifying
                          ? "bg-brand-400 cursor-not-allowed"
                          : "bg-brand-500 hover:bg-brand-600 cursor-pointer shadow-lg shadow-brand-500/30"
                      }`}
                    >
                      {verifying ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Memverifikasi...
                        </>
                      ) : (
                        <>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Verifikasi Akses
                        </>
                      )}
                    </button>
                  </form>
                  <div className="mt-4 p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-wide mb-2">
                      Informasi
                    </p>
                    <ul className="m-0 pl-4 flex flex-col gap-1">
                      {[
                        "Code verifikasi hanya dapat digunakan sekali",
                        "IP address akan dicatat untuk keamanan",
                        "Akses berlaku selama 5 jam",
                        "Session tetap aktif saat refresh halaman",
                      ].map((info, i) => (
                        <li key={i} className="text-[11px] text-gray-500 dark:text-white/35 leading-relaxed">
                          {info}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2.5 pt-2.5 border-t border-gray-200 dark:border-white/[0.06] text-[11px] text-gray-500 dark:text-white/35">
                      Punya membership monthly?{" "}
                      <span
                        onClick={() => navigate("/signin")}
                        className="text-brand-500 cursor-pointer font-bold hover:underline"
                      >
                        Login di sini
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PageWrapper>
      </>
    );
  }

  // ── Loading stream ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <PageMeta title="Memuat Live Stream..." description="Live Stream JKT48" />
        <PageWrapper>
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <div className="w-9 h-9 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-white/40">
              {isIdn ? "Memuat IDN Live Plus..." : "Memuat live stream member..."}
            </p>
          </div>
        </PageWrapper>
      </>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <>
        <PageMeta title="Error - Live Stream" description="Live Stream JKT48" />
        <PageWrapper>
          <div className="flex flex-col items-center justify-center gap-3 p-4 py-16">
            <div className="w-14 h-14 rounded-full bg-error-50 dark:bg-error-500/12 border border-error-200 dark:border-error-500/25 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="text-error-500">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white m-0">Terjadi Kesalahan</h3>
            <p className="text-sm text-gray-500 dark:text-white/40 text-center m-0">{error}</p>
            <div className="flex gap-2.5 mt-2">
              <button
                onClick={() => { setError(""); isIdn ? loadIdnStream() : loadMemberStream(); }}
                className="px-5 py-2.5 rounded-lg border-0 bg-brand-500 text-white text-sm font-bold cursor-pointer hover:bg-brand-600 shadow-lg shadow-brand-500/30 transition-colors"
              >
                ↺ Coba Lagi
              </button>
              <button
                onClick={() => navigate(-1)}
                className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-transparent text-gray-600 dark:text-white/60 text-sm font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
              >
                ← Kembali
              </button>
            </div>
          </div>
        </PageWrapper>
      </>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <>
      <PageMeta
        title={`${showTitle} - Live Stream JKT48`}
        description={`Tonton live stream ${showTitle} di JKT48Connect`}
      />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">

        {/* ── Page Header ── */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>

            {/* Title + badges */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "rgba(220,31,46,0.08)", border: "1px solid rgba(220,31,46,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="#DC1F2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
                  <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#DC1F2E" stroke="none" />
                </svg>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <h1 className="text-lg font-bold text-gray-800 dark:text-white" style={{ margin: 0 }}>
                    {showTitle}
                  </h1>
                  {/* LIVE badge */}
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "3px 10px", borderRadius: 999,
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                    background: "#DC1F2E", color: "#fff",
                  }}>
                    <span style={{
                      width: 5, height: 5, borderRadius: "50%", background: "#fff",
                      animation: "livePulse 1.5s infinite", display: "inline-block",
                    }} />
                    LIVE
                  </div>
                  {isIdn && (
                    <div style={{
                      padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                      background: "rgba(70,95,255,0.1)", color: "#465FFF",
                      border: "1px solid rgba(70,95,255,0.2)",
                    }}>
                      IDN Live+
                    </div>
                  )}
                  {isMember && (
                    <div style={{
                      padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                      background: "rgba(16,185,129,0.1)", color: "#10b981",
                      border: "1px solid rgba(16,185,129,0.2)",
                    }}>
                      Member Live
                    </div>
                  )}
                  {isIdn && hasMembership && (
                    <div style={{
                      padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                      background: "rgba(245,158,11,0.1)", color: "#f59e0b",
                      border: "1px solid rgba(245,158,11,0.2)",
                    }}>
                      ★ MONTHLY
                    </div>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "#9ca3af", marginTop: 3 }}>
                  {isIdn && idnShow
                    ? `👁 ${idnShow.view_count?.toLocaleString() || 0} penonton`
                    : isMember && memberShow
                    ? `${memberShow.type?.toUpperCase()} · Mulai ${new Date(memberShow.started_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`
                    : "JKT48 Live Stream"
                  }
                </p>
              </div>
            </div>

            {/* Right actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {isIdn && !hasMembership && isVerified && (
                <button
                  onClick={handleLogout}
                  style={{
                    padding: "6px 12px", borderRadius: 8,
                    border: "1px solid #e5e7eb", background: "#fff",
                    color: "#6b7280", fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}
                  className="dark:bg-white/[0.04] dark:border-gray-700 dark:text-gray-400"
                >
                  Logout Verifikasi
                </button>
              )}
              <button
                onClick={() => navigate(-1)}
                style={{
                  padding: "6px 12px", borderRadius: 8,
                  border: "1px solid #e5e7eb", background: "#fff",
                  color: "#6b7280", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                }}
                className="dark:bg-white/[0.04] dark:border-gray-700 dark:text-gray-400"
              >
                ← Kembali
              </button>
            </div>
          </div>
        </div>

        {/* ── Main Content: Left sidebar (info) + Right (player + chat) ── */}
        <div style={{ display: "flex", minHeight: 0 }}>

          {/* ── LEFT SIDEBAR: Show Info ── */}
          <div
            style={{
              width: 300,
              flexShrink: 0,
              borderRight: "1px solid",
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
            className="border-gray-200 dark:border-gray-800 hidden xl:flex"
          >
            {/* Show thumbnail / avatar */}
            <div style={{ padding: "20px 20px 0" }}>
              {isIdn && idnShow?.image_url ? (
                <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", aspectRatio: "16/9" }}>
                  <img
                    src={idnShow.image_url}
                    alt={idnShow.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)",
                  }} />
                  {idnShow.idnliveplus?.liveroom_price > 0 && (
                    <div style={{
                      position: "absolute", bottom: 10, right: 10,
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "3px 8px", borderRadius: 6,
                      fontSize: 10, fontWeight: 700,
                      background: "rgba(245,158,11,0.9)", color: "#fff",
                    }}>
                      🎟️ Rp 7.000
                    </div>
                  )}
                </div>
              ) : isMember && memberShow ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
                  <div style={{ position: "relative" }}>
                    <img
                      src={memberShow.img_alt || memberShow.img}
                      alt={memberShow.name}
                      style={{
                        width: 96, height: 96, borderRadius: "50%", objectFit: "cover",
                        border: "3px solid rgba(220,31,46,0.3)", display: "block",
                      }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <span style={{
                      position: "absolute", bottom: 4, right: 4,
                      width: 14, height: 14, borderRadius: "50%",
                      background: "#DC1F2E", border: "2px solid #fff",
                      animation: "livePulse 1.5s infinite",
                    }} />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Show details */}
            <div style={{ padding: "16px 20px", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>

              {/* IDN: Creator */}
              {isIdn && idnShow?.creator?.name && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <img
                    src={idnShow.creator.image_url}
                    alt={idnShow.creator.name}
                    style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(220,31,46,0.3)" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}
                    className="dark:text-gray-400">
                    {idnShow.creator.name}
                  </span>
                  {idnShow.showId && (
                    <span style={{
                      marginLeft: "auto", fontSize: 10, fontFamily: "monospace", fontWeight: 700,
                      padding: "2px 7px", borderRadius: 6,
                      background: "rgba(0,0,0,0.06)", color: "#9ca3af",
                    }} className="dark:bg-white/[0.06] dark:text-gray-500">
                      #{idnShow.showId}
                    </span>
                  )}
                </div>
              )}

              {/* IDN: Description */}
              {isIdn && idnShow?.idnliveplus?.description && (
                <div style={{
                  padding: "10px 12px", borderRadius: 10,
                  background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.06)",
                }} className="dark:bg-white/[0.03] dark:border-white/[0.06]">
                  <p style={{
                    margin: 0, fontSize: 11, lineHeight: 1.6, color: "#6b7280",
                    whiteSpace: "pre-line",
                    display: "-webkit-box",
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }} className="dark:text-gray-400">
                    {idnShow.idnliveplus.description}
                  </p>
                </div>
              )}

              {/* Member: Type & time */}
              {isMember && memberShow && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
                      background: memberShow.type === "idn" ? "rgba(70,95,255,0.1)" : "rgba(220,31,46,0.1)",
                      color: memberShow.type === "idn" ? "#465FFF" : "#DC1F2E",
                      border: `1px solid ${memberShow.type === "idn" ? "rgba(70,95,255,0.2)" : "rgba(220,31,46,0.2)"}`,
                      textTransform: "uppercase",
                    }}>
                      {memberShow.type === "idn" ? "IDN Live" : memberShow.type}
                    </span>
                    {memberShow.streaming_url_list?.length > 0 && (
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>
                        {memberShow.streaming_url_list[0].label}
                      </span>
                    )}
                  </div>
                  <div style={{
                    padding: "10px 12px", borderRadius: 10,
                    background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.06)",
                    fontSize: 12, color: "#6b7280",
                  }} className="dark:bg-white/[0.03] dark:border-white/[0.06] dark:text-gray-400">
                    Mulai pukul{" "}
                    <span className="font-bold text-gray-800 dark:text-white">
                      {new Date(memberShow.started_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                    </span>
                  </div>
                </div>
              )}

              {/* Divider */}
              <div style={{ height: 1, background: "rgba(0,0,0,0.06)" }} className="dark:bg-white/[0.06]" />

              {/* IDN Lineup */}
              {isIdn && members.length > 0 && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}
                      className="dark:text-gray-400">
                      Lineup · {members.length} Member
                    </span>
                  </div>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(58px, 1fr))",
                    gap: 10,
                  }}>
                    {members.map((m: any) => (
                      <div key={m.id} style={{ textAlign: "center" }}>
                        <img
                          src={m.img}
                          alt={m.name}
                          style={{
                            width: 48, height: 48, borderRadius: "50%",
                            objectFit: "cover", border: "2px solid rgba(220,31,46,0.15)",
                            display: "block", margin: "0 auto 4px",
                          }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        <p style={{
                          margin: 0, fontSize: 9, color: "#6b7280",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }} className="dark:text-gray-400">
                          {m.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: "12px 20px",
              borderTop: "1px solid",
              textAlign: "center",
              fontSize: 10,
              color: "#d1d5db",
            }} className="border-gray-100 dark:border-gray-800 dark:text-gray-600">
              POWERED BY JKT48Connect
            </div>
          </div>

          {/* ── RIGHT CONTENT: Player + Chat ── */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

            {/* Player area */}
            <div style={{ padding: 24, paddingBottom: 0 }}>
              {isIdn && hlsUrl ? (
                <HlsPlayer
                  src={hlsUrl}
                  title={showTitle}
                  qualities={qualities}
                  onQualityChange={handleQualityChange}
                  currentQuality={currentQuality}
                  qualityMode={qualityMode}
                  onModeChange={handleModeChange}
                  isIdn={true}
                />
              ) : isMember && memberHlsUrl ? (
                <HlsPlayer
                  src={memberHlsUrl}
                  title={showTitle}
                  qualities={[]}
                  onQualityChange={() => {}}
                  currentQuality={null}
                  qualityMode="auto"
                  onModeChange={() => {}}
                  isIdn={false}
                />
              ) : (
                <div className="bg-gray-100 dark:bg-white/[0.04] rounded-xl flex items-center justify-center" style={{ height: "320px" }}>
                  <div className="w-9 h-9 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Mobile-only show info (below player, only on small screens) */}
            <div className="xl:hidden" style={{ padding: "16px 24px 0" }}>
              <div style={{
                display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
                paddingBottom: 16, borderBottom: "1px solid rgba(0,0,0,0.06)",
              }} className="dark:border-white/[0.06]">
                {isIdn && idnShow?.creator && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <img
                      src={idnShow.creator.image_url}
                      alt={idnShow.creator.name}
                      style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }}
                    />
                    <span style={{ fontSize: 12, color: "#6b7280" }} className="dark:text-gray-400">
                      {idnShow.creator.name}
                    </span>
                  </div>
                )}
                {isMember && memberShow && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <img
                      src={memberShow.img_alt || memberShow.img}
                      alt={memberShow.name}
                      style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(220,31,46,0.3)" }}
                    />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#111827" }} className="dark:text-white">
                      {memberShow.name}
                    </span>
                  </div>
                )}
                {isIdn && idnShow && (
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>
                    👁 {idnShow.view_count?.toLocaleString() || 0} penonton
                  </span>
                )}
              </div>
            </div>

            {/* Chat panel */}
            <div style={{ flex: 1, minHeight: 0, margin: 24, marginTop: 16 }}>
              <div style={{
                border: "1px solid",
                borderRadius: 12,
                overflow: "hidden",
                height: 480,
                display: "flex",
                flexDirection: "column",
              }} className="border-gray-200 dark:border-gray-800">
                <ChatPanel
                  messages={chatMessages}
                  chatInput={chatInput}
                  setChatInput={setChatInput}
                  chatUser={chatUser}
                  isChatLoggingIn={isChatLoggingIn}
                  onSend={handleSendMessage}
                  chatEndRef={chatEndRef}
                  navigate={navigate}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </>
  );
}

export default LiveStream;
