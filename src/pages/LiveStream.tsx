import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import Hls from "hls.js";

const API_BASE  = "https://v2.jkt48connect.com/api/jkt48connect";
const API_KEY   = "JKTCONNECT";
const PLAY_HOST = "https://play.jkt48connect.com";
const LIVE_API  = "https://v2.jkt48connect.com/api/jkt48/live?apikey=JKTCONNECT";
const IDN_API   = "https://v2.jkt48connect.com/api/jkt48/idnplus?apikey=JKTCONNECT";

const isIdnSlug = (param: string) => {
  if (!param) return false;
  return /\d{4}-\d{2}-\d{2}/.test(param);
};

// ─── UUID helper ──────────────────────────────────────────────────────────────
const makeUuid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });

// ─── Types ────────────────────────────────────────────────────────────────────
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

// IDN IRC chat message
interface IdnChatMessage {
  id:          string;
  userName:    string;
  userAvatar?: string;
  colorCode?:  string;
  levelTier?:  number;
  message:     string;
  timestamp:   number;
}

// Showroom comment
interface SRComment {
  id:          string;
  name:        string;
  avatar_url:  string;
  comment:     string;
  created_at:  number;
  class_level: number;
  user_id:     number;
}

// ─── Showroom comment polling hook ───────────────────────────────────────────
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
          id:          `${c.user_id}-${c.created_at}`,
          name:        c.name        ?? "Unknown",
          avatar_url:  c.avatar_url  ?? "",
          comment:     c.comment     ?? "",
          created_at:  c.created_at  ?? 0,
          class_level: c.class_level ?? 1,
          user_id:     c.user_id     ?? 0,
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

// ─── IDN IRC WebSocket chat hook (view-only) ──────────────────────────────────
// Connects to wss://chat.idn.app/ using IRC protocol — exactly like the RN app.
// View-only: connects, joins, and receives messages. No send capability.
function useIdnIrcChat(chatRoomId: string | null) {
  const [messages, setMessages]     = useState<IdnChatMessage[]>([]);
  const [connected, setConnected]   = useState(false);
  const [status, setStatus]         = useState<"idle"|"connecting"|"connected"|"reconnecting"|"error">("idle");
  const [latencyMs, setLatencyMs]   = useState<number | null>(null);

  const wsRef           = useRef<WebSocket | null>(null);
  const mountedRef      = useRef(true);
  const reconnectTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roomIdRef       = useRef<string | null>(chatRoomId);
  const lastPingAt      = useRef<number>(0);

  const pushMessage = useCallback((msg: IdnChatMessage) => {
    setMessages(prev => {
      const next = [...prev, msg];
      return next.length > 150 ? next.slice(next.length - 150) : next;
    });
  }, []);

  const wsSend = useCallback((socket: WebSocket, line: string) => {
    if (socket.readyState !== WebSocket.OPEN) return;
    socket.send(line);
  }, []);

  const createSocket = useCallback((roomId: string) => {
    if (wsRef.current) {
      try { wsRef.current.close(1000, "reconnect"); } catch {}
      wsRef.current = null;
    }
    setStatus("connecting");
    setConnected(false);

    // Generate a random guest short_id (view-only, no identity needed)
    const guestShortId = Array.from(
      { length: 6 },
      () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]
    ).join("");
    const nick = `idn-${guestShortId}-web`;
    const uuid = makeUuid();

    const socket = new WebSocket("wss://chat.idn.app/");
    wsRef.current = socket;

    socket.onopen = () => {
      if (!mountedRef.current) return;
      wsSend(socket, "CAP LS 302");
      wsSend(socket, `NICK ${nick}`);
      wsSend(socket, `USER ${uuid} 0 * null`);
      wsSend(
        socket,
        "CAP REQ :account-notify account-tag away-notify batch cap-notify " +
        "chghost echo-message extended-join invite-notify labeled-response " +
        "message-tags multi-prefix server-time setname userhost-in-names"
      );
      wsSend(socket, "CAP END");
    };

    socket.onmessage = (evt) => {
      if (!mountedRef.current) return;
      const raw: string = evt.data;

      // Welcome → join the room
      if (raw.includes(" 001 ") || raw.includes(":Welcome")) {
        wsSend(socket, `@label=1 JOIN #${roomId}`);
        setStatus("connected");
        setConnected(true);
        return;
      }

      // PING → PONG (keep-alive)
      if (raw.includes(" PING ") || raw.startsWith("PING ")) {
        lastPingAt.current = Date.now();
        const m = raw.match(/PING\s+:?(\S+)/);
        wsSend(socket, `PONG :${m ? m[1] : "irc-1.idn.app"}`);
        setLatencyMs(Date.now() - lastPingAt.current);
        return;
      }

      // CHAT event — parse the JSON payload
      if (raw.includes(`CHAT #${roomId}`)) {
        try {
          const marker  = `:CHAT #${roomId} `;
          const chatIdx = raw.indexOf(marker);
          if (chatIdx !== -1) {
            const jsonStr = raw.slice(chatIdx + marker.length);
            const event   = JSON.parse(jsonStr);
            if (event.chat?.message) {
              pushMessage({
                id:         makeUuid(),
                userName:   event.user?.name ?? event.user?.username ?? "Unknown",
                userAvatar: event.user?.avatar_url ?? undefined,
                colorCode:  event.user?.color_code
                  ? `#${event.user.color_code}`.replace("##", "#")
                  : undefined,
                levelTier:  event.user?.level_tier ?? undefined,
                message:    String(event.chat.message),
                timestamp:  Date.now(),
              });
            }
          }
        } catch {}
        return;
      }

      // Fallback: try parsing any room-related JSON
      if (raw.includes(roomId)) {
        try {
          const parts = raw.split(`${roomId} :`);
          if (parts.length > 1) {
            const event = JSON.parse(parts[parts.length - 1]);
            if (event.chat?.message) {
              pushMessage({
                id:         makeUuid(),
                userName:   event.user?.name ?? "Unknown",
                userAvatar: event.user?.avatar_url ?? undefined,
                colorCode:  event.user?.color_code
                  ? `#${event.user.color_code}`.replace("##", "#")
                  : undefined,
                levelTier:  event.user?.level_tier ?? undefined,
                message:    String(event.chat.message),
                timestamp:  Date.now(),
              });
            }
          }
        } catch {}
      }
    };

    socket.onclose = (e) => {
      if (!mountedRef.current) return;
      wsRef.current = null;
      setConnected(false);
      if (e.code !== 1000) {
        setStatus("reconnecting");
        reconnectTimer.current = setTimeout(() => {
          if (mountedRef.current && roomIdRef.current)
            createSocket(roomIdRef.current);
        }, 4000);
      } else {
        setStatus("idle");
      }
    };

    socket.onerror = () => {
      if (!mountedRef.current) return;
      setConnected(false);
      setStatus("reconnecting");
      wsRef.current = null;
      reconnectTimer.current = setTimeout(() => {
        if (mountedRef.current && roomIdRef.current)
          createSocket(roomIdRef.current);
      }, 4000);
    };
  }, [pushMessage, wsSend]);

  useEffect(() => {
    mountedRef.current = true;
    roomIdRef.current  = chatRoomId;
    if (!chatRoomId) { setStatus("error"); return; }
    createSocket(chatRoomId);
    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        try { wsRef.current.close(1000, "unmount"); } catch {}
        wsRef.current = null;
      }
    };
  }, [chatRoomId]);

  const retry = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    setMessages([]);
    setConnected(false);
    if (roomIdRef.current) createSocket(roomIdRef.current);
  }, [createSocket]);

  return { messages, connected, status, latencyMs, retry };
}

// ─── HLS Player ───────────────────────────────────────────────────────────────
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
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showQualityPanel, setShowQualityPanel] = useState(false);
  const [currentLevel, setCurrentLevel]         = useState<string>("Auto");
  const [bandwidth, setBandwidth]               = useState<string>("");

  const destroyHls = useCallback(() => {
    if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
    if (hlsRef.current)   { hlsRef.current.destroy();       hlsRef.current = null;   }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    destroyHls();

    if (!Hls.isSupported()) {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
        video.load();
        video.play().catch(() => {});
      }
      return;
    }

    const hls = new Hls({
      enableWorker:           true,
      lowLatencyMode:         false,
      maxBufferLength:        30,
      maxMaxBufferLength:     60,
      maxBufferSize:          60 * 1000 * 1000,
      backBufferLength:       30,
      liveSyncDurationCount:  3,
      liveMaxLatencyDurationCount: 10,
      liveDurationInfinity:   true,
      fragLoadingTimeOut:     10000,
      fragLoadingMaxRetry:    6,
      fragLoadingRetryDelay:  1000,
      manifestLoadingTimeOut: 10000,
      manifestLoadingMaxRetry:4,
      levelLoadingTimeOut:    10000,
      levelLoadingMaxRetry:   4,
      startLevel:             qualityMode === "auto" ? -1 : undefined,
      abrBandWidthFactor:     0.8,
      abrBandWidthUpFactor:   0.7,
    });

    hlsRef.current = hls;
    hls.loadSource(src);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {});
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
      const lvl = hls.levels[data.level];
      if (lvl) {
        setCurrentLevel(lvl.name || `${lvl.height}p`);
        const bw = hls.bandwidthEstimate;
        if (bw > 0) setBandwidth(
          bw >= 1_000_000
            ? (bw / 1_000_000).toFixed(1) + " Mbps"
            : Math.round(bw / 1_000) + " Kbps"
        );
      }
    });

    hls.on(Hls.Events.ERROR, (_, data) => {
      if (!data.fatal) return;
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        hls.startLoad();
      } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        hls.recoverMediaError();
      } else {
        destroyHls();
        retryRef.current = setTimeout(() => {
          const v = videoRef.current;
          if (!v) return;
          const newHls = new Hls({ lowLatencyMode: false, maxBufferLength: 30 });
          newHls.loadSource(src);
          newHls.attachMedia(v);
          newHls.on(Hls.Events.MANIFEST_PARSED, () => v.play().catch(() => {}));
          hlsRef.current = newHls;
        }, 2000);
      }
    });

    return destroyHls;
  }, [src, destroyHls]); // eslint-disable-line

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-black shadow-2xl">
      <style>{`
        video.live-player::-webkit-media-controls-timeline,
        video.live-player::-webkit-media-controls-time-remaining-display,
        video.live-player::-webkit-media-controls-current-time-display { display: none !important; }
      `}</style>
      <div className={isIdn ? "aspect-video" : ""}>
        <video
          ref={videoRef}
          controls
          autoPlay
          playsInline
          className={`live-player w-full ${isIdn ? "h-full" : ""} block`}
          title={title}
        />
      </div>

      {qualities.length > 0 && (
        <div className="absolute bottom-12 right-3 z-20">
          <button
            onClick={() => setShowQualityPanel(p => !p)}
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
              {qualities.map(q => {
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

// ─── IDN IRC Chat Panel (view-only) ──────────────────────────────────────────
function IdnIrcChatPanel({
  messages, connected, status, latencyMs, retry,
}: {
  messages:  IdnChatMessage[];
  connected: boolean;
  status:    string;
  latencyMs: number | null;
  retry:     () => void;
}) {
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const statusText =
    status === "connected"    ? "Terhubung"      :
    status === "connecting"   ? "Menghubungkan..." :
    status === "reconnecting" ? "Reconnecting..."  :
    status === "error"        ? "Gagal terhubung"  : "Offline";

  const statusColor =
    connected            ? "bg-emerald-500" :
    status === "reconnecting" ? "bg-amber-400"  : "bg-gray-600";

  const getLevelColor = (level?: number) => {
    if (!level) return "#929CC3";
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
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${connected ? "bg-red-400" : "bg-gray-400"} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${connected ? "bg-red-500" : "bg-gray-500"}`} />
          </span>
          <span className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">Live Chat · IDN</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Connection status badge */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
            <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{statusText}</span>
            {latencyMs !== null && connected && (
              <span className={`text-[10px] font-bold ${latencyMs < 100 ? "text-emerald-500" : "text-amber-500"}`}>
                {latencyMs}ms
              </span>
            )}
          </div>
          {/* Retry button */}
          {(status === "error" || status === "reconnecting") && (
            <button
              onClick={retry}
              className="flex items-center gap-1 text-[11px] text-red-500 font-bold hover:opacity-75 transition-opacity"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              Retry
            </button>
          )}
          <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
            {messages.length} pesan
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 scroll-smooth">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                {status === "connecting" ? "Menghubungkan ke chat..." : "Belum ada pesan"}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {status === "connected" ? "Menunggu komentar masuk" : "Mohon tunggu sebentar"}
              </p>
            </div>
          </div>
        )}

        {messages.map(msg => {
          const accent = msg.colorCode ?? "#DC2626";
          const initials = (msg.userName ?? "?").slice(0, 2).toUpperCase();
          return (
            <div key={msg.id} className="flex gap-2.5 items-start group">
              <div
                className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold overflow-hidden ring-2 ring-white dark:ring-gray-900"
                style={{ backgroundColor: accent + "22", border: `1.5px solid ${accent}55` }}
              >
                {msg.userAvatar ? (
                  <img
                    src={msg.userAvatar}
                    alt={msg.userName}
                    className="w-full h-full object-cover"
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span style={{ color: accent }}>{initials}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                  {/* Level badge */}
                  {msg.levelTier !== undefined && (
                    <span
                      className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md"
                      style={{
                        backgroundColor: getLevelColor(msg.levelTier) + "22",
                        color:           getLevelColor(msg.levelTier),
                        border:          `1px solid ${getLevelColor(msg.levelTier)}44`,
                      }}
                    >
                      Lv{msg.levelTier}
                    </span>
                  )}
                  <span className="text-xs font-bold leading-none" style={{ color: accent }}>
                    {msg.userName}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    {new Date(msg.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400 break-words m-0">
                  {msg.message}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Footer — view only notice */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-center gap-2 py-1">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            IRC live chat · hanya bisa melihat
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Showroom Comment Panel ───────────────────────────────────────────────────
function ShowroomChatPanel({
  comments, loading, error, lastPoll, retry,
}: {
  comments: SRComment[];
  loading:  boolean;
  error:    boolean;
  lastPoll: Date | null;
  retry:    () => void;
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
          <span className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">Komentar · Showroom</span>
        </div>
        <div className="flex items-center gap-2">
          {lastPoll && !error && (
            <span className="text-[10px] text-gray-400 dark:text-gray-600">
              {lastPoll.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
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

      {/* Comments */}
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

        {comments.map(msg => (
          <div key={msg.id} className="flex gap-2.5 items-start group">
            <img
              src={msg.avatar_url || `https://ui-avatars.com/api/?name=${msg.name}&background=22c55e&color=fff`}
              alt={msg.name}
              className="w-7 h-7 rounded-full object-cover flex-shrink-0 ring-2 ring-white dark:ring-gray-900"
              onError={e => {
                (e.target as HTMLImageElement).src =
                  `https://ui-avatars.com/api/?name=${msg.name}&background=22c55e&color=fff`;
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <span
                  className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md"
                  style={{
                    backgroundColor: getLevelColor(msg.class_level) + "22",
                    color:           getLevelColor(msg.class_level),
                    border:          `1px solid ${getLevelColor(msg.class_level)}44`,
                  }}
                >
                  ★ {msg.class_level}
                </span>
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-none">
                  {msg.name}
                </span>
                <span className="text-[10px] text-gray-400 dark:text-gray-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  {formatTime(msg.created_at)}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400 break-words m-0">
                {msg.comment}
              </p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-center gap-2 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Showroom polling · auto-refresh 5 detik
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function LiveStream() {
  const { playbackId } = useParams<{ playbackId: string }>();
  const navigate       = useNavigate();

  const isIdn    = isIdnSlug(playbackId || "");
  const isMember = !isIdn;

  // IDN stream state
  const [idnShow,        setIdnShow]        = useState<any>(null);
  const [qualities,      setQualities]      = useState<QualityOption[]>([]);
  const [qualityMode,    setQualityMode]    = useState<"auto" | "manual">("auto");
  const [currentQuality, setCurrentQuality] = useState<QualityOption | null>(null);
  const [hlsUrl,         setHlsUrl]         = useState("");
  // IDN IRC chat room ID (comes from live data, not hardcoded)
  const [idnChatRoomId,  setIdnChatRoomId]  = useState<string | null>(null);

  // Member (Showroom) stream state
  const [memberShow,    setMemberShow]    = useState<any>(null);
  const [memberHlsUrl,  setMemberHlsUrl]  = useState("");
  const [memberRoomId,  setMemberRoomId]  = useState<number | null>(null);

  // Common
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [members, setMembers] = useState<any[]>([]);

  // ── Hooks: use the right chat source per stream type ─────────────────────
  // IDN → IRC WebSocket (real-time push)
  const {
    messages:  idnMessages,
    connected: idnConnected,
    status:    idnStatus,
    latencyMs: idnLatency,
    retry:     idnRetry,
  } = useIdnIrcChat(isIdn ? idnChatRoomId : null);

  // Member → Showroom polling
  const {
    comments: srComments,
    loading:  srLoading,
    error:    srError,
    lastPoll: srLastPoll,
    retry:    srRetry,
  } = useShowroomComments(isMember ? memberRoomId : null);

  // ── Load IDN stream ───────────────────────────────────────────────────────
  const loadIdnStream = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const idnRes  = await fetch(IDN_API);
      const idnData = await idnRes.json();
      if (!idnData || idnData.status !== 200 || !Array.isArray(idnData.data)) {
        setError("Gagal mengambil data IDN Plus");
        setLoading(false);
        return;
      }
      const show = idnData.data.find(
        (s: any) => s.slug === playbackId && s.status === "live"
      );
      if (!show) {
        setError("Show tidak ditemukan atau sudah berakhir");
        setLoading(false);
        return;
      }
      setIdnShow(show);

      // Set chat_room_id for IRC hook — this is what we join on wss://chat.idn.app/
      // The IDN API returns chat_room_id directly on each live show object
      if (show.chat_room_id) setIdnChatRoomId(String(show.chat_room_id));

      // Qualities
      const qualRes  = await fetch(
        `${PLAY_HOST}/live/idn/${show.slug}/qualities.json?showId=${show.showId}`
      );
      const qualData = await qualRes.json();
      if (qualData.success && Array.isArray(qualData.qualities))
        setQualities(qualData.qualities);

      setHlsUrl(`${PLAY_HOST}/live/idn/${show.slug}/master.m3u8?showId=${show.showId}`);

      // Theater lineup (optional)
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
    } catch {
      setError("Terjadi kesalahan saat memuat stream.");
      setLoading(false);
    }
  }, [playbackId]);

  // ── Load Member (Showroom) stream ─────────────────────────────────────────
  const loadMemberStream = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(LIVE_API);
      const data = await res.json();
      if (!Array.isArray(data)) {
        setError("Gagal mengambil data live member");
        setLoading(false);
        return;
      }
      // Member streams have type "showroom"
      const show = data.find(
        (s: any) => s.url_key === playbackId && s.type?.toLowerCase() === "showroom"
      );
      if (!show) {
        setError("Member tidak sedang live saat ini");
        setLoading(false);
        return;
      }
      setMemberShow(show);

      const streamUrl = show.streaming_url_list?.[0]?.url ?? null;
      if (!streamUrl) {
        setError("URL stream tidak tersedia");
        setLoading(false);
        return;
      }
      setMemberHlsUrl(streamUrl);

      // For Showroom polling we need room_id (NOT live_id — that's only for posting)
      if (show.room_id) setMemberRoomId(show.room_id);

      setLoading(false);
    } catch {
      setError("Terjadi kesalahan saat memuat stream member.");
      setLoading(false);
    }
  }, [playbackId]);

  // ── Quality controls (IDN only) ───────────────────────────────────────────
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

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isMember) {
      loadMemberStream();
    } else {
      loadIdnStream();
    }
  }, [isMember]); // eslint-disable-line

  const showTitle = isIdn
    ? (idnShow?.title  || "Live Stream JKT48")
    : (memberShow?.name || "Live Member JKT48");

  // ── Loading state ─────────────────────────────────────────────────────────
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

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
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

        {/* Top nav */}
        <div className="flex items-center gap-2.5 mb-6 flex-wrap">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-600 dark:text-gray-400 text-xs font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
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
            <span className="px-3 py-1.5 rounded-full bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/20 text-pink-600 dark:text-pink-400 text-[11px] font-bold">
              Showroom
            </span>
          )}

          {isIdn && idnShow && (
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {idnShow.view_count?.toLocaleString() || 0} penonton
            </span>
          )}
          {isMember && memberShow && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Mulai {new Date(memberShow.started_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
            </span>
          )}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">

          {/* Left: video + detail */}
          <div className="flex flex-col gap-5">
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
              <div className="aspect-video bg-gray-100 dark:bg-gray-800/50 rounded-2xl flex items-center justify-center border border-gray-200 dark:border-gray-700">
                <div className="w-10 h-10 border-[3px] border-gray-200 dark:border-gray-700 border-t-red-500 rounded-full animate-spin" />
              </div>
            )}

            {/* IDN show detail */}
            {isIdn && idnShow && (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 p-5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Detail Show</p>
                <div className="flex gap-4 items-start">
                  {idnShow.image_url && (
                    <img
                      src={idnShow.image_url}
                      alt={idnShow.title}
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-800 dark:text-white/90 mb-2">
                      {idnShow.title}
                    </h3>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2">
                      <span className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        {idnShow.view_count?.toLocaleString() || 0}
                      </span>
                      {idnShow.showId && <span>#{idnShow.showId}</span>}
                      {/* Show chat_room_id for debug / confirmation */}
                      {idnChatRoomId && (
                        <span className="text-[10px] opacity-60">room #{idnChatRoomId}</span>
                      )}
                    </div>
                    {idnShow.idnliveplus?.description && (
                      <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400 m-0 whitespace-pre-line">
                        {idnShow.idnliveplus.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Member show detail */}
            {isMember && memberShow && (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 p-5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Detail Member</p>
                <div className="flex gap-4 items-center">
                  <img
                    src={memberShow.img_alt || memberShow.img}
                    alt={memberShow.name}
                    className="w-14 h-14 rounded-full object-cover flex-shrink-0 border-2 border-gray-200 dark:border-gray-700"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <div>
                    <h3 className="text-base font-bold text-gray-800 dark:text-white/90 mb-2">
                      {memberShow.name}
                    </h3>
                    <div className="flex gap-2 flex-wrap items-center">
                      <span className="px-2.5 py-1 rounded-full bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/20 text-pink-600 dark:text-pink-400 font-bold text-[10px] uppercase">
                        Showroom
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Mulai: {new Date(memberShow.started_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                      </span>
                      {memberRoomId && (
                        <span className="text-[10px] text-gray-400 opacity-60">
                          room #{memberRoomId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Theater lineup (IDN only) */}
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
                          src={m.img}
                          alt={m.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700 group-hover:border-red-400 transition-colors"
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                      <p className="m-0 text-[10px] font-medium text-gray-500 dark:text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap leading-tight">
                        {m.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-center text-[10px] font-semibold text-gray-300 dark:text-gray-700 uppercase tracking-widest pb-1">
              Powered by JKT48Connect
            </p>
          </div>

          {/* Right: chat panel */}
          <div className="xl:sticky xl:top-4 xl:self-start">
            <div
              className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.02] overflow-hidden"
              style={{ height: "580px" }}
            >
              <div className="h-full flex flex-col">
                {isIdn ? (
                  // IDN → IRC WebSocket (real-time, view-only)
                  <IdnIrcChatPanel
                    messages={idnMessages}
                    connected={idnConnected}
                    status={idnStatus}
                    latencyMs={idnLatency}
                    retry={idnRetry}
                  />
                ) : (
                  // Member → Showroom polling (view-only)
                  <ShowroomChatPanel
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
