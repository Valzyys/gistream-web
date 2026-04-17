import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import Hls from "hls.js";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://mzxfuaoihgzxvokwarao.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16eGZ1YW9paGd6eHZva3dhcmFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MDg0NjIsImV4cCI6MjA4OTk4NDQ2Mn0.OFYCkBFXCSfLn-wG94OHHKL5CX8T_BLrbDGPiBdPIog";
const supabase = createClient(supabaseUrl, supabaseKey);

const API_BASE    = "https://v2.jkt48connect.com/api/jkt48connect";
const API_KEY     = "JKTCONNECT";
const PLAY_HOST   = "https://play.jkt48connect.com";
const IDN_API     = "https://v2.jkt48connect.com/api/jkt48/idnplus?apikey=JKTCONNECT";
const LIVE_API    = "https://v2.jkt48connect.com/api/jkt48/live?apikey=JKTCONNECT";

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

// Cek apakah param adalah slug IDN Plus (mengandung tanggal)
const isIdnSlug = (param: string) => {
  if (!param) return false;
  return /\d{4}-\d{2}-\d{2}/.test(param);
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface QualityOption {
  index:       number;
  name:        string;
  quality:     string;
  bandwidth:   number;
  bandwidth_label: string;
  resolution:  string;
  fps:         string;
  manual_url:  string;
  playlist_url: string;
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
}: {
  src:             string;
  title:           string;
  qualities:       QualityOption[];
  onQualityChange: (q: QualityOption | null) => void;
  currentQuality:  QualityOption | null;
  qualityMode:     "auto" | "manual";
  onModeChange:    (mode: "auto" | "manual") => void;
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
    <div style={{ position: "relative", width: "100%", background: "#000", borderRadius: 8, overflow: "hidden" }}>
      <video
        ref={videoRef}
        controls
        autoPlay
        playsInline
        style={{ width: "100%", aspectRatio: "16/9", display: "block" }}
        title={title}
      />

      {/* Quality Button */}
      {qualities.length > 0 && (
        <div style={{ position: "absolute", bottom: 52, right: 8, zIndex: 20 }}>
          <button
            onClick={() => setShowQualityPanel((p) => !p)}
            style={{
              padding:      "5px 10px",
              borderRadius: 6,
              border:       "none",
              background:   "rgba(0,0,0,0.75)",
              color:        "#fff",
              fontSize:     11,
              fontWeight:   700,
              cursor:       "pointer",
              backdropFilter: "blur(4px)",
              display:      "flex",
              alignItems:   "center",
              gap:          5,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
            </svg>
            {qualityMode === "auto" ? `Auto (${currentLevel})` : currentQuality?.name || currentLevel}
            {bandwidth && <span style={{ opacity: 0.7, fontSize: 10 }}>· {bandwidth}</span>}
          </button>

          {/* Quality Panel */}
          {showQualityPanel && (
            <div style={{
              position:       "absolute",
              bottom:         "calc(100% + 6px)",
              right:          0,
              background:     "rgba(15,15,15,0.95)",
              backdropFilter: "blur(12px)",
              border:         "1px solid rgba(255,255,255,0.1)",
              borderRadius:   10,
              padding:        8,
              minWidth:       180,
              boxShadow:      "0 8px 24px rgba(0,0,0,0.5)",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", padding: "4px 8px 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Kualitas Video
              </div>

              {/* Auto option */}
              <button
                onClick={() => { onModeChange("auto"); onQualityChange(null); setShowQualityPanel(false); }}
                style={{
                  width:        "100%",
                  padding:      "8px 10px",
                  borderRadius: 6,
                  border:       "none",
                  background:   qualityMode === "auto" ? "rgba(220,31,46,0.2)" : "transparent",
                  color:        qualityMode === "auto" ? "#DC1F2E" : "rgba(255,255,255,0.8)",
                  fontSize:     12,
                  fontWeight:   qualityMode === "auto" ? 700 : 500,
                  cursor:       "pointer",
                  textAlign:    "left",
                  display:      "flex",
                  alignItems:   "center",
                  justifyContent: "space-between",
                  marginBottom: 2,
                }}
              >
                <span>⚡ Auto</span>
                {qualityMode === "auto" && <span style={{ fontSize: 10, opacity: 0.7 }}>{currentLevel}</span>}
              </button>

              {/* Manual quality options */}
              {qualities.map((q) => {
                const isActive = qualityMode === "manual" && currentQuality?.quality === q.quality;
                return (
                  <button
                    key={q.quality}
                    onClick={() => { onModeChange("manual"); onQualityChange(q); setShowQualityPanel(false); }}
                    style={{
                      width:        "100%",
                      padding:      "8px 10px",
                      borderRadius: 6,
                      border:       "none",
                      background:   isActive ? "rgba(220,31,46,0.2)" : "transparent",
                      color:        isActive ? "#DC1F2E" : "rgba(255,255,255,0.8)",
                      fontSize:     12,
                      fontWeight:   isActive ? 700 : 500,
                      cursor:       "pointer",
                      textAlign:    "left",
                      display:      "flex",
                      alignItems:   "center",
                      justifyContent: "space-between",
                      marginBottom: 2,
                    }}
                  >
                    <span>{q.name}</span>
                    <span style={{ fontSize: 10, opacity: 0.6 }}>{q.bandwidth_label}</span>
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
  chatEndRef:      React.RefObject<HTMLDivElement>;
  navigate:        (path: string) => void;
}) {
  return (
    <div style={{
      display:       "flex",
      flexDirection: "column",
      background:    "#0f0f0f",
      border:        "1px solid rgba(255,255,255,0.08)",
      borderRadius:  12,
      overflow:      "hidden",
      height:        "100%",
      minHeight:     400,
    }}>
      {/* Header */}
      <div style={{
        padding:        "12px 16px",
        borderBottom:   "1px solid rgba(255,255,255,0.08)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        background:     "rgba(255,255,255,0.02)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "#DC1F2E", animation: "livePulse 1.5s infinite", display: "inline-block",
          }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Live Chat</span>
        </div>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
          {messages.length} pesan
        </span>
      </div>

      {/* Messages */}
      <div style={{
        flex:          1,
        overflowY:     "auto",
        padding:       "12px",
        display:       "flex",
        flexDirection: "column",
        gap:           8,
      }}>
        {messages.length === 0 && (
          <div style={{
            flex:           1,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            color:          "rgba(255,255,255,0.2)",
            fontSize:       13,
            textAlign:      "center",
            padding:        "32px 0",
          }}>
            Belum ada pesan.<br />Jadilah yang pertama!
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <img
              src={msg.avatar_url || `https://ui-avatars.com/api/?name=${msg.username}&background=7b1c1c&color=fff`}
              alt={msg.username}
              style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
              onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${msg.username}`; }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Username row */}
              <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", marginBottom: 2 }}>
                {msg.role && msg.role !== "member" && (
                  <span style={{
                    fontSize:     9,
                    fontWeight:   700,
                    padding:      "1px 5px",
                    borderRadius: 4,
                    background:   msg.role === "admin" ? "rgba(220,31,46,0.25)" : "rgba(70,95,255,0.25)",
                    color:        msg.role === "admin" ? "#ff6b6b" : "#7b8fff",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}>
                    {msg.role}
                  </span>
                )}
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
                  {msg.username}
                </span>
                {msg.bluetick && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.79-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.726 2.75 1.83 3.444-.06.315-.09.64-.09.966 0 2.21 1.71 3.998 3.918 3.998.53 0 1.04-.1 1.51-.282.825 1.155 2.15 1.924 3.63 1.924s2.805-.767 3.63-1.924c.47.182.98.282 1.51.282 2.21 0 3.918-1.79 3.918-4 0-.325-.03-.65-.09-.966 1.105-.694 1.83-1.984 1.83-3.444z" fill="#1DA1F2"/>
                    <path d="M10.42 16.273L6.46 12.31l1.41-1.414 2.55 2.548 6.42-6.42 1.414 1.415-7.834 7.834z" fill="white"/>
                  </svg>
                )}
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginLeft: "auto" }}>
                  {new Date(msg.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {/* Message text */}
              <div style={{
                fontSize:   12,
                lineHeight: 1.5,
                color:      "rgba(255,255,255,0.7)",
                wordBreak:  "break-word",
              }}>
                {msg.text_content}
              </div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding:     "10px 12px",
        borderTop:   "1px solid rgba(255,255,255,0.08)",
        background:  "rgba(255,255,255,0.02)",
      }}>
        {isChatLoggingIn ? (
          <div style={{
            textAlign:  "center",
            fontSize:   12,
            color:      "rgba(255,255,255,0.3)",
            padding:    "8px 0",
          }}>
            Memuat info akun...
          </div>
        ) : chatUser ? (
          <form onSubmit={onSend} style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Kirim sebagai ${chatUser.username}...`}
              maxLength={200}
              style={{
                flex:         1,
                padding:      "8px 12px",
                borderRadius: 8,
                border:       "1px solid rgba(255,255,255,0.1)",
                background:   "rgba(255,255,255,0.06)",
                color:        "#fff",
                fontSize:     12,
                outline:      "none",
              }}
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              style={{
                padding:      "8px 12px",
                borderRadius: 8,
                border:       "none",
                background:   chatInput.trim() ? "#DC1F2E" : "rgba(255,255,255,0.08)",
                color:        chatInput.trim() ? "#fff" : "rgba(255,255,255,0.3)",
                cursor:       chatInput.trim() ? "pointer" : "not-allowed",
                transition:   "all 0.15s",
                flexShrink:   0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        ) : (
          <div style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.35)", padding: "4px 0" }}>
            Hanya bisa melihat chat.{" "}
            <span
              onClick={() => navigate("/signin")}
              style={{ color: "#DC1F2E", cursor: "pointer", fontWeight: 700 }}
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

  // ── Mode detection ────────────────────────────────────────────────────────
  const isIdn    = isIdnSlug(playbackId || "");
  // Member live: url_key seperti "jkt48-official"
  const isMember = !isIdn;

  // ── IDN Plus states ───────────────────────────────────────────────────────
  const [idnShow,          setIdnShow]          = useState<any>(null);
  const [qualities,        setQualities]        = useState<QualityOption[]>([]);
  const [qualityMode,      setQualityMode]      = useState<"auto" | "manual">("auto");
  const [currentQuality,   setCurrentQuality]   = useState<QualityOption | null>(null);
  const [hlsUrl,           setHlsUrl]           = useState("");

  // ── Member live states ────────────────────────────────────────────────────
  const [memberShow,       setMemberShow]       = useState<any>(null);
  const [memberHlsUrl,     setMemberHlsUrl]     = useState("");

  // ── Verification states (IDN only) ───────────────────────────────────────
  const [membershipLoading, setMembershipLoading] = useState(isIdn);
  const [hasMembership,     setHasMembership]     = useState(false);
  const [isVerified,        setIsVerified]        = useState(false);
  const [showVerification,  setShowVerification]  = useState(false);
  const [verifData,         setVerifData]         = useState({ email: "", code: "" });
  const [verifyError,       setVerifyError]       = useState("");
  const [verifying,         setVerifying]         = useState(false);
  const [clientIP,          setClientIP]          = useState("");

  // ── Common states ─────────────────────────────────────────────────────────
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState("");
  const [members,          setMembers]          = useState<any[]>([]);

  // ── Chat states ───────────────────────────────────────────────────────────
  const [chatMessages,     setChatMessages]     = useState<ChatMessage[]>([]);
  const [chatInput,        setChatInput]        = useState("");
  const [chatUser,         setChatUser]         = useState<any>(null);
  const [isChatLoggingIn,  setIsChatLoggingIn]  = useState(true);
  const chatEndRef  = useRef<HTMLDivElement>(null);
  const channelRef  = useRef<any>(null);

  // ── Fetch client IP ───────────────────────────────────────────────────────
  const fetchClientIP = async () => {
    try {
      const res  = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      setClientIP(data.ip);
      return data.ip;
    } catch { return "unknown"; }
  };

  // ── Check membership ──────────────────────────────────────────────────────
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

  // ── Check existing verification ───────────────────────────────────────────
  const checkExistingVerification = async () => {
    const stored = localStorage.getItem("stream_verification");
    if (!stored) { setShowVerification(true); return false; }
    try {
      const info      = JSON.parse(stored);
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

    // ── Verify access ─────────────────────────────────────────────────────────
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

      const codeData        = verifyData.data;
      if (!codeData.is_active) {
        setVerifyError("Code ini sudah tidak aktif"); setVerifying(false); return;
      }

      const usageCount      = parseInt(codeData.usage_count) || 0;
      const usageLimit      = parseInt(codeData.usage_limit)  || 1;
      const hasUsageLeft    = usageCount < usageLimit;

      if (codeData.is_used && !hasUsageLeft) {
        // Cek apakah IP sama (izinkan re-use dari IP yang sama)
        const listRes  = await fetch(
          `https://v2.jkt48connect.com/api/codes/list?email=${verifData.email}&apikey=JKTCONNECT`
        );
        const listData = await listRes.json();
        if (listData.status && listData.data?.wotatokens) {
          const userCode = listData.data.wotatokens.find((c: any) => c.code === verifData.code);
          if (userCode) {
            if (userCode.ip_address && userCode.ip_address !== "" && userCode.ip_address !== ip) {
              setVerifyError("Code ini sudah digunakan dari IP address yang berbeda");
              setVerifying(false); return;
            }
            // IP sama → izinkan
            localStorage.setItem("stream_verification", JSON.stringify({
              email: verifData.email, code: verifData.code,
              ip, timestamp: Date.now(), verified: true,
            }));
            setIsVerified(true); setShowVerification(false); setVerifying(false); return;
          }
        }
        setVerifyError("Code sudah tidak dapat digunakan"); setVerifying(false); return;
      }

      // Gunakan code
      const useRes  = await fetch("https://v2.jkt48connect.com/api/codes/use", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: verifData.email, code: verifData.code, apikey: "JKTCONNECT" }),
      });
      const useData = await useRes.json();

      if (useData.status) {
        localStorage.setItem("stream_verification", JSON.stringify({
          email: verifData.email, code: verifData.code,
          ip, timestamp: Date.now(), verified: true,
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

  // ── Load IDN Plus stream ──────────────────────────────────────────────────
  const loadIdnStream = useCallback(async () => {
    setLoading(true); setError("");
    try {
      // 1. Fetch IDN Plus API → cari show yang live & slug cocok
      const idnRes  = await fetch(IDN_API);
      const idnData = await idnRes.json();

      if (!idnData || idnData.status !== 200 || !Array.isArray(idnData.data)) {
        setError("Gagal mengambil data IDN Plus"); setLoading(false); return;
      }

      // Cari berdasarkan slug
      const show = idnData.data.find(
        (s: any) => s.slug === playbackId && s.status === "live"
      );

      if (!show) {
        setError("Show tidak ditemukan atau sudah berakhir"); setLoading(false); return;
      }

      setIdnShow(show);

      const showId = show.showId;
      const slug   = show.slug;

      // 2. Fetch qualities dari play.jkt48connect.com
      const qualRes  = await fetch(
        `${PLAY_HOST}/live/idn/${slug}/qualities.json?showId=${showId}`
      );
      const qualData = await qualRes.json();

      if (qualData.success && Array.isArray(qualData.qualities)) {
        setQualities(qualData.qualities);
      }

      // 3. Set HLS URL (auto = master.m3u8)
      const autoUrl = `${PLAY_HOST}/live/idn/${slug}/master.m3u8?showId=${showId}`;
      setHlsUrl(autoUrl);

      // 4. Fetch members dari theater API (nearest show)
      try {
        const theaterRes  = await fetch(
          `https://v2.jkt48connect.com/api/jkt48/theater?apikey=${API_KEY}`
        );
        const theaterData = await theaterRes.json();
        if (theaterData.theater?.length > 0) {
          const now     = Date.now();
          let nearest   = theaterData.theater[0];
          let minDiff   = Math.abs(new Date(nearest.date).getTime() - now);
          theaterData.theater.forEach((s: any) => {
            const diff = Math.abs(new Date(s.date).getTime() - now);
            if (diff < minDiff) { minDiff = diff; nearest = s; }
          });
          const detailRes  = await fetch(
            `https://v2.jkt48connect.com/api/jkt48/theater/${nearest.id}?apikey=${API_KEY}`
          );
          const detailData = await detailRes.json();
          if (detailData.shows?.[0]?.members) setMembers(detailData.shows[0].members);
        }
      } catch {}

      setLoading(false);
    } catch (e) {
      console.error("loadIdnStream error:", e);
      setError("Terjadi kesalahan saat memuat stream.");
      setLoading(false);
    }
  }, [playbackId]);

  // ── Load Member live stream ───────────────────────────────────────────────
  const loadMemberStream = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res  = await fetch(LIVE_API);
      const data = await res.json();

      if (!Array.isArray(data)) {
        setError("Gagal mengambil data live member"); setLoading(false); return;
      }

      // Cari berdasarkan url_key
      const show = data.find((s: any) => s.url_key === playbackId);

      if (!show) {
        setError("Member tidak sedang live saat ini"); setLoading(false); return;
      }

      setMemberShow(show);

      // Ambil URL stream pertama
      const streamUrl = show.streaming_url_list?.[0]?.url || null;
      if (!streamUrl) {
        setError("URL stream tidak tersedia"); setLoading(false); return;
      }

      setMemberHlsUrl(streamUrl);
      setLoading(false);
    } catch (e) {
      console.error("loadMemberStream error:", e);
      setError("Terjadi kesalahan saat memuat stream member.");
      setLoading(false);
    }
  }, [playbackId]);

  // ── Handle quality change ─────────────────────────────────────────────────
  const handleQualityChange = (q: QualityOption | null) => {
    setCurrentQuality(q);
    if (!q || !idnShow) return;
    setHlsUrl(q.manual_url);
  };

  const handleModeChange = (mode: "auto" | "manual") => {
    setQualityMode(mode);
    if (mode === "auto" && idnShow) {
      const autoUrl = `${PLAY_HOST}/live/idn/${idnShow.slug}/master.m3u8?showId=${idnShow.showId}`;
      setHlsUrl(autoUrl);
      setCurrentQuality(null);
    }
  };

  // ── Init chat ─────────────────────────────────────────────────────────────
  const initChat = useCallback(async () => {
    setIsChatLoggingIn(true);
    let userData: any = null;
    try {
      const rawData = sessionStorage.getItem("userLogin") || localStorage.getItem("userLogin");
      if (rawData) {
        const parsed = JSON.parse(rawData);
        if (parsed?.isLoggedIn && parsed?.token && parsed?.user?.user_id) {
          try {
            const res         = await fetch(
              `${API_BASE}/profile/${parsed.user.user_id}?apikey=${API_KEY}`,
              { headers: { Authorization: `Bearer ${parsed.token}` } }
            );
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

  // ── Handle send message ───────────────────────────────────────────────────
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

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    // Setup realtime chat
    const channel = supabase.channel(`chat-${playbackId}`, {
      config: { broadcast: { ack: true } },
    });
    channel
      .on("broadcast", { event: "pesan_baru" }, ({ payload }: { payload: ChatMessage }) => {
        setChatMessages((prev) => {
          const exists = prev.some(
            (m) => m.timestamp === payload.timestamp && m.username === payload.username
          );
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
      // Member live: langsung load tanpa verifikasi
      loadMemberStream();
    } else {
      // IDN Plus: cek membership / verifikasi dulu
      const init = async () => {
        await fetchClientIP();
        const hasMember = await checkMembership();
        if (hasMember) {
          setIsVerified(true); setShowVerification(false);
          await loadIdnStream();
        } else {
          const verified = await checkExistingVerification();
          if (verified) {
            await loadIdnStream();
          } else {
            setLoading(false);
          }
        }
      };
      init();
    }
  }, [isMember]); // eslint-disable-line

  useEffect(() => {
    if (isIdn && isVerified && !idnShow) {
      loadIdnStream();
    }
  }, [isVerified]); // eslint-disable-line

  // ── Logout / reset verif ──────────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem("stream_verification");
    setIsVerified(false); setShowVerification(true);
    setIdnShow(null); setHlsUrl(""); setQualities([]);
    setVerifData({ email: "", code: "" });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ── RENDER ────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  // Loading membership check
  if (isIdn && membershipLoading) {
    return (
      <div style={styles.fullCenter}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Memeriksa akses...</p>
      </div>
    );
  }

   // Verification page (IDN only)
  if (isIdn && showVerification && !isVerified) {
    return (
      <div style={{
        minHeight:      "100vh",
        background:     "#0a0a0a",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        padding:        16,
      }}>
        <div style={{
          background:   "#111",
          border:       "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding:      "32px 28px",
          width:        "100%",
          maxWidth:     420,
          boxShadow:    "0 24px 64px rgba(0,0,0,0.6)",
        }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{
              display:        "inline-flex",
              alignItems:     "center",
              justifyContent: "center",
              width:          52,
              height:         52,
              borderRadius:   14,
              background:     "rgba(220,31,46,0.12)",
              border:         "1px solid rgba(220,31,46,0.25)",
              marginBottom:   12,
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                stroke="#DC1F2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#fff" }}>
              Verifikasi Akses
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
              Masukkan email dan kode untuk mengakses live stream
            </p>
          </div>

          {/* Form */}
          <form onSubmit={(e) => { e.preventDefault(); verifyAccess(); }}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Email */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>
                Email
              </label>
              <input
                type="email"
                value={verifData.email}
                onChange={(e) => { setVerifData((p) => ({ ...p, email: e.target.value })); setVerifyError(""); }}
                placeholder="email@example.com"
                required
                style={{
                  padding:      "10px 14px",
                  borderRadius: 8,
                  border:       "1px solid rgba(255,255,255,0.1)",
                  background:   "rgba(255,255,255,0.05)",
                  color:        "#fff",
                  fontSize:     13,
                  outline:      "none",
                }}
              />
            </div>

            {/* Code */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>
                Verification Code
              </label>
              <input
                type="text"
                value={verifData.code}
                onChange={(e) => { setVerifData((p) => ({ ...p, code: e.target.value })); setVerifyError(""); }}
                placeholder="Masukkan kode verifikasi"
                required
                style={{
                  padding:      "10px 14px",
                  borderRadius: 8,
                  border:       "1px solid rgba(255,255,255,0.1)",
                  background:   "rgba(255,255,255,0.05)",
                  color:        "#fff",
                  fontSize:     13,
                  outline:      "none",
                  letterSpacing: "0.05em",
                }}
              />
            </div>

            {/* Error */}
            {verifyError && (
              <div style={{
                padding:      "10px 14px",
                borderRadius: 8,
                background:   "rgba(220,31,46,0.12)",
                border:       "1px solid rgba(220,31,46,0.3)",
                fontSize:     12,
                color:        "#ff6b6b",
                display:      "flex",
                alignItems:   "center",
                gap:          8,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {verifyError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={verifying}
              style={{
                padding:        "12px",
                borderRadius:   10,
                border:         "none",
                background:     verifying ? "rgba(220,31,46,0.4)" : "#DC1F2E",
                color:          "#fff",
                fontSize:       14,
                fontWeight:     700,
                cursor:         verifying ? "not-allowed" : "pointer",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                gap:            8,
                transition:     "all 0.2s",
                boxShadow:      verifying ? "none" : "0 4px 16px rgba(220,31,46,0.35)",
              }}
            >
              {verifying ? (
                <>
                  <div style={{
                    width:        16,
                    height:       16,
                    border:       "2px solid rgba(255,255,255,0.3)",
                    borderTop:    "2px solid #fff",
                    borderRadius: "50%",
                    animation:    "spin 0.8s linear infinite",
                  }} />
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

          {/* Info box */}
          <div style={{
            marginTop:    16,
            padding:      "12px 14px",
            borderRadius: 8,
            background:   "rgba(255,255,255,0.03)",
            border:       "1px solid rgba(255,255,255,0.06)",
          }}>
            <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Informasi
            </p>
            <ul style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                "Code verifikasi hanya dapat digunakan sekali",
                "IP address akan dicatat untuk keamanan",
                "Akses berlaku selama 5 jam",
                "Session tetap aktif saat refresh halaman",
              ].map((info, i) => (
                <li key={i} style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>
                  {info}
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
              Punya membership monthly?{" "}
              <span
                onClick={() => navigate("/signin")}
                style={{ color: "#DC1F2E", cursor: "pointer", fontWeight: 700 }}
              >
                Login di sini
              </span>
            </div>
          </div>

          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            style={{
              marginTop:      14,
              width:          "100%",
              padding:        "10px",
              borderRadius:   8,
              border:         "1px solid rgba(255,255,255,0.08)",
              background:     "transparent",
              color:          "rgba(255,255,255,0.4)",
              fontSize:       13,
              cursor:         "pointer",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              gap:            6,
            }}
          >
            ← Kembali
          </button>
        </div>
      </div>
    );
  }

  // Loading stream
  if (loading) {
    return (
      <div style={styles.fullCenter}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>
          {isIdn ? "Memuat IDN Live Plus..." : "Memuat live stream member..."}
        </p>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div style={styles.fullCenter}>
        <div style={{
          width:          52,
          height:         52,
          borderRadius:   "50%",
          background:     "rgba(220,31,46,0.12)",
          border:         "1px solid rgba(220,31,46,0.25)",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          marginBottom:   16,
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="#DC1F2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h3 style={{ margin: "0 0 8px", color: "#fff", fontSize: 16 }}>Terjadi Kesalahan</h3>
        <p style={{ margin: "0 0 20px", color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center" }}>
          {error}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => { setError(""); isIdn ? loadIdnStream() : loadMemberStream(); }}
            style={styles.btnPrimary}
          >
            ↺ Coba Lagi
          </button>
          <button onClick={() => navigate(-1)} style={styles.btnSecondary}>
            ← Kembali
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  const showTitle = isIdn
    ? (idnShow?.title || "Live Stream JKT48")
    : (memberShow?.name || "Live Member JKT48");

  const showImage = isIdn
    ? (idnShow?.image_url || "")
    : (memberShow?.img || memberShow?.img_alt || "");

  return (
    <div style={{
      minHeight:  "100vh",
      background: "#0a0a0a",
      color:      "#fff",
      display:    "flex",
      flexDirection: "column",
    }}>
      {/* ── Top Bar ── */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        gap:            12,
        padding:        "10px 16px",
        background:     "rgba(0,0,0,0.6)",
        backdropFilter: "blur(12px)",
        borderBottom:   "1px solid rgba(255,255,255,0.06)",
        position:       "sticky",
        top:            0,
        zIndex:         100,
      }}>
        <button onClick={() => navigate(-1)} style={{
          padding:      "6px 12px",
          borderRadius: 8,
          border:       "1px solid rgba(255,255,255,0.1)",
          background:   "rgba(255,255,255,0.05)",
          color:        "rgba(255,255,255,0.7)",
          fontSize:     12,
          cursor:       "pointer",
          display:      "flex",
          alignItems:   "center",
          gap:          5,
          flexShrink:   0,
        }}>
          ← Kembali
        </button>

        {/* Show info */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          {showImage && (
            <img src={showImage} alt={showTitle}
              style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize:     13,
              fontWeight:   700,
              color:        "#fff",
              overflow:     "hidden",
              textOverflow: "ellipsis",
              whiteSpace:   "nowrap",
            }}>
              {showTitle}
            </div>
            {isIdn && idnShow && (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
                👁 {idnShow.view_count?.toLocaleString() || 0} penonton
              </div>
            )}
            {isMember && memberShow && (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
                {memberShow.type?.toUpperCase()} · {new Date(memberShow.started_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
              </div>
            )}
          </div>
        </div>

                {/* Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{
            display:      "inline-flex",
            alignItems:   "center",
            gap:          5,
            padding:      "4px 10px",
            borderRadius: 999,
            background:   "#DC1F2E",
            fontSize:     11,
            fontWeight:   700,
          }}>
            <span style={{
              width:        6,
              height:       6,
              borderRadius: "50%",
              background:   "#fff",
              animation:    "livePulse 1.5s infinite",
              display:      "inline-block",
            }} />
            LIVE
          </div>

          {isIdn && (
            <div style={{
              padding:      "4px 10px",
              borderRadius: 999,
              background:   "rgba(70,95,255,0.15)",
              border:       "1px solid rgba(70,95,255,0.3)",
              fontSize:     11,
              fontWeight:   700,
              color:        "#7b8fff",
            }}>
              IDN Live+
            </div>
          )}

          {isMember && (
            <div style={{
              padding:      "4px 10px",
              borderRadius: 999,
              background:   "rgba(34,197,94,0.12)",
              border:       "1px solid rgba(34,197,94,0.25)",
              fontSize:     11,
              fontWeight:   700,
              color:        "#4ade80",
            }}>
              Member Live
            </div>
          )}

          {isIdn && hasMembership && (
            <div style={{
              padding:      "4px 10px",
              borderRadius: 999,
              background:   "rgba(220,31,46,0.12)",
              border:       "1px solid rgba(220,31,46,0.25)",
              fontSize:     11,
              fontWeight:   700,
              color:        "#DC1F2E",
            }}>
              ★ MONTHLY
            </div>
          )}

          {isIdn && !hasMembership && isVerified && (
            <button
              onClick={handleLogout}
              style={{
                padding:      "4px 10px",
                borderRadius: 999,
                border:       "1px solid rgba(255,255,255,0.1)",
                background:   "rgba(255,255,255,0.05)",
                color:        "rgba(255,255,255,0.4)",
                fontSize:     11,
                fontWeight:   600,
                cursor:       "pointer",
              }}
            >
              Logout
            </button>
          )}
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div style={{
        flex:    1,
        display: "grid",
        gridTemplateColumns: "1fr 340px",
        gap:     0,
        height:  "calc(100vh - 53px)",
      }}
        className="live-layout"
      >
        {/* ── Left: Player + Info ── */}
        <div style={{
          overflowY: "auto",
          padding:   "16px",
          display:   "flex",
          flexDirection: "column",
          gap:       16,
        }}>
          {/* Player */}
          {isIdn && hlsUrl ? (
            <HlsPlayer
              src={hlsUrl}
              title={showTitle}
              qualities={qualities}
              onQualityChange={handleQualityChange}
              currentQuality={currentQuality}
              qualityMode={qualityMode}
              onModeChange={handleModeChange}
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
            />
          ) : (
            <div style={{
              aspectRatio:    "16/9",
              background:     "#111",
              borderRadius:   8,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
            }}>
              <div style={styles.spinner} />
            </div>
          )}

          {/* IDN Show Info */}
          {isIdn && idnShow && (
            <div style={{
              padding:      "14px 16px",
              background:   "rgba(255,255,255,0.03)",
              border:       "1px solid rgba(255,255,255,0.07)",
              borderRadius: 10,
              display:      "flex",
              gap:          14,
              alignItems:   "flex-start",
            }}>
              {idnShow.image_url && (
                <img
                  src={idnShow.image_url}
                  alt={idnShow.title}
                  style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800, color: "#fff" }}>
                  {idnShow.title}
                </h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                  <span>👁 {idnShow.view_count?.toLocaleString() || 0} penonton</span>
                  {idnShow.showId && <span>🎫 {idnShow.showId}</span>}
                  {idnShow.idnliveplus?.liveroom_price && (
                    <span>🎟️ Rp 7.000</span>
                  )}
                </div>
                {idnShow.idnliveplus?.description && (
                  <p style={{
                    margin:     "8px 0 0",
                    fontSize:   12,
                    lineHeight: 1.6,
                    color:      "rgba(255,255,255,0.4)",
                    whiteSpace: "pre-line",
                  }}>
                    {idnShow.idnliveplus.description}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Member Show Info */}
          {isMember && memberShow && (
            <div style={{
              padding:      "14px 16px",
              background:   "rgba(255,255,255,0.03)",
              border:       "1px solid rgba(255,255,255,0.07)",
              borderRadius: 10,
              display:      "flex",
              gap:          14,
              alignItems:   "center",
            }}>
              <img
                src={memberShow.img_alt || memberShow.img}
                alt={memberShow.name}
                style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid rgba(220,31,46,0.3)" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: "#fff" }}>
                  {memberShow.name}
                </h2>
                <div style={{ display: "flex", gap: 10, fontSize: 12, color: "rgba(255,255,255,0.4)", flexWrap: "wrap" }}>
                  <span style={{
                    padding:      "2px 8px",
                    borderRadius: 999,
                    background:   "rgba(34,197,94,0.1)",
                    border:       "1px solid rgba(34,197,94,0.2)",
                    color:        "#4ade80",
                    fontWeight:   700,
                    fontSize:     10,
                  }}>
                    {memberShow.type?.toUpperCase()}
                  </span>
                  <span>
                    Mulai: {new Date(memberShow.started_at).toLocaleTimeString("id-ID", {
                      hour: "2-digit", minute: "2-digit",
                    })} WIB
                  </span>
                  {memberShow.streaming_url_list?.length > 0 && (
                    <span>{memberShow.streaming_url_list[0].label}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Members lineup (IDN only) */}
          {isIdn && members.length > 0 && (
            <div style={{
              padding:      "14px 16px",
              background:   "rgba(255,255,255,0.03)",
              border:       "1px solid rgba(255,255,255,0.07)",
              borderRadius: 10,
            }}>
              <div style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "space-between",
                marginBottom:   12,
              }}>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
                  Lineup Show
                </h3>
                <span style={{
                  fontSize:     11,
                  fontWeight:   700,
                  padding:      "2px 8px",
                  borderRadius: 999,
                  background:   "rgba(220,31,46,0.12)",
                  color:        "#DC1F2E",
                }}>
                  {members.length} Member
                </span>
              </div>
              <div style={{
                display:             "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
                gap:                 10,
              }}>
                {members.map((m: any) => (
                  <div key={m.id} style={{ textAlign: "center" }}>
                    <img
                      src={m.img}
                      alt={m.name}
                      style={{
                        width:        52,
                        height:       52,
                        borderRadius: "50%",
                        objectFit:    "cover",
                        border:       "2px solid rgba(220,31,46,0.2)",
                        display:      "block",
                        margin:       "0 auto 4px",
                      }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <p style={{
                      margin:       0,
                      fontSize:     10,
                      color:        "rgba(255,255,255,0.55)",
                      overflow:     "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace:   "nowrap",
                    }}>
                      {m.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ textAlign: "center", padding: "8px 0 16px", fontSize: 11, color: "rgba(255,255,255,0.15)" }}>
            POWERED BY JKT48Connect
          </div>
        </div>

        {/* ── Right: Chat ── */}
        <div style={{
          borderLeft: "1px solid rgba(255,255,255,0.06)",
          display:    "flex",
          flexDirection: "column",
          overflow:   "hidden",
        }}>
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

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.8); }
        }
        @media (max-width: 768px) {
          .live-layout {
            grid-template-columns: 1fr !important;
            grid-template-rows: auto 400px;
            height: auto !important;
          }
        }
      `}</style>
    </div>
  );
}

// ── Shared Styles ─────────────────────────────────────────────────────────────
const styles = {
  fullCenter: {
    minHeight:      "100vh",
    background:     "#0a0a0a",
    display:        "flex",
    flexDirection:  "column" as const,
    alignItems:     "center",
    justifyContent: "center",
    gap:            12,
    padding:        16,
  },
  spinner: {
    width:        36,
    height:       36,
    border:       "3px solid rgba(220,31,46,0.2)",
    borderTop:    "3px solid #DC1F2E",
    borderRadius: "50%",
    animation:    "spin 0.8s linear infinite",
  },
  loadingText: {
    margin:    0,
    fontSize:  14,
    color:     "rgba(255,255,255,0.4)",
    textAlign: "center" as const,
  },
  btnPrimary: {
    padding:      "10px 20px",
    borderRadius: 8,
    border:       "none",
    background:   "#DC1F2E",
    color:        "#fff",
    fontSize:     13,
    fontWeight:   700,
    cursor:       "pointer",
    boxShadow:    "0 4px 14px rgba(220,31,46,0.35)",
  },
  btnSecondary: {
    padding:      "10px 20px",
    borderRadius: 8,
    border:       "1px solid rgba(255,255,255,0.1)",
    background:   "rgba(255,255,255,0.05)",
    color:        "rgba(255,255,255,0.6)",
    fontSize:     13,
    fontWeight:   600,
    cursor:       "pointer",
  },
};

export default LiveStream;
