import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import Hls from "hls.js";
import { Backlight } from "@/components/ui/videos/Backlight";

const LIVE_API = "https://v5.jkt48connect.com/api/jkt48/live?apikey=JKTCONNECT";

// ─── Types ────────────────────────────────────────────────────────────────────
interface StreamingUrl {
  label: string;
  quality: number;
  url: string;
}

interface MemberShow {
  name: string;
  img: string;
  img_alt: string;
  url_key: string;
  slug: string;
  room_id: number | null;
  chat_room_id: string | null;
  started_at: string;
  streaming_url_list: StreamingUrl[];
  type: "idn" | "showroom";
  is_group: boolean;
}

interface IrcChatMessage {
  id: string;
  userName: string;
  userAvatar?: string;
  colorCode?: string;
  levelTier?: number;
  message: string;
  timestamp: number;
}

interface SRComment {
  id: string;
  name: string;
  avatar_url: string;
  comment: string;
  created_at: number;
  class_level: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const makeId = () => Math.random().toString(36).slice(2);

const formatTime = (ts: number) => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// ─── IRC Chat Hook (browser WebSocket) — port dari mobile ────────────────────
function useIdnIrcChat(chatRoomId: string | null) {
  const [messages,      setMessages]      = useState<IrcChatMessage[]>([]);
  const [status,        setStatus]        = useState<"idle" | "connecting" | "connected" | "reconnecting">("idle");
  const [joinConfirmed, setJoinConfirmed] = useState(false);
  const [latencyMs,     setLatencyMs]     = useState<number | null>(null);

  const wsRef        = useRef<WebSocket | null>(null);
  const mountedRef   = useRef(true);
  const retryTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roomIdRef    = useRef(chatRoomId);
  const nickRef      = useRef("");
  const lastPingAt   = useRef(0);

  const pushMsg = useCallback((msg: IrcChatMessage) => {
    setMessages(prev => {
      const next = [...prev, msg];
      return next.length > 150 ? next.slice(-150) : next;
    });
  }, []);

  // Try to parse a chat JSON payload from an IRC line, returns msg or null
  const tryParseChat = useCallback((raw: string, roomId: string): IrcChatMessage | null => {
    // Primary pattern: `:CHAT #roomId {json}`
    const marker   = `:CHAT #${roomId} `;
    const markerIdx = raw.indexOf(marker);
    if (markerIdx !== -1) {
      try {
        const event = JSON.parse(raw.slice(markerIdx + marker.length));
        if (event?.chat?.message) {
          return {
            id:         makeId(),
            userName:   event.user?.name ?? event.user?.username ?? "Unknown",
            userAvatar: event.user?.avatar_url ?? undefined,
            colorCode:  event.user?.color_code
              ? "#" + String(event.user.color_code).replace(/^#/, "")
              : undefined,
            levelTier:  event.user?.level_tier ?? undefined,
            message:    String(event.chat.message),
            timestamp:  Date.now(),
          };
        }
      } catch {}
    }
    // Fallback: split on `roomId :` to grab trailing JSON
    if (raw.includes(roomId)) {
      try {
        const parts = raw.split(`${roomId} :`);
        if (parts.length > 1) {
          const event = JSON.parse(parts[parts.length - 1]);
          if (event?.chat?.message) {
            return {
              id:         makeId(),
              userName:   event.user?.name ?? "Unknown",
              userAvatar: event.user?.avatar_url ?? undefined,
              colorCode:  event.user?.color_code
                ? "#" + String(event.user.color_code).replace(/^#/, "")
                : undefined,
              levelTier:  event.user?.level_tier ?? undefined,
              message:    String(event.chat.message),
              timestamp:  Date.now(),
            };
          }
        }
      } catch {}
    }
    return null;
  }, []);

  const connect = useCallback((roomId: string) => {
    if (wsRef.current) {
      try { wsRef.current.close(1000, "reconnect"); } catch {}
      wsRef.current = null;
    }

    setStatus("connecting");
    setJoinConfirmed(false);
    setLatencyMs(null);

    // Mirror mobile: short_id-based nick
    const shortId = Array.from({ length: 5 }, () =>
      "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]
    ).join("");
    const nick = `idn-${shortId}-web`;
    nickRef.current = nick;
    const uuid = makeId() + makeId();

    const ws = new WebSocket("wss://chat.idn.app/");
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      ws.send("CAP LS 302");
      ws.send(`NICK ${nick}`);
      ws.send(`USER ${uuid} 0 * null`);
      ws.send(
        "CAP REQ :account-notify account-tag away-notify batch cap-notify " +
        "chghost echo-message extended-join invite-notify labeled-response " +
        "message-tags multi-prefix server-time setname userhost-in-names"
      );
      ws.send("CAP END");
    };

    ws.onmessage = ({ data: raw }: { data: string }) => {
      if (!mountedRef.current) return;

      // PING → PONG (measure latency like mobile)
      if (raw.startsWith("PING ") || raw.includes(" PING ")) {
        lastPingAt.current = Date.now();
        const m = raw.match(/PING\s+:?(\S+)/);
        ws.send(`PONG :${m ? m[1] : "irc-1.idn.app"}`);
        setLatencyMs(Date.now() - lastPingAt.current);
        return;
      }

      // 001 Welcome → send @label=1 JOIN (same as mobile)
      if (raw.includes(" 001 ") || raw.includes(":Welcome")) {
        ws.send(`@label=1 JOIN #${roomId}`);
        setStatus("connected");
        return;
      }

      // Join ack — mirror mobile's three conditions
      const isJoinAck =
        (raw.includes(`JOIN #${roomId}`) && raw.includes(nickRef.current)) ||
        raw.includes("JOINED") ||
        (raw.includes("366") && raw.includes(roomId));
      if (isJoinAck) {
        setJoinConfirmed(true);
        return;
      }

      // Chat message
      if (raw.includes(`CHAT #${roomId}`) || raw.includes(roomId)) {
        const msg = tryParseChat(raw, roomId);
        if (msg) pushMsg(msg);
      }
    };

    ws.onclose = (e) => {
      if (!mountedRef.current) return;
      wsRef.current = null;
      setJoinConfirmed(false);
      if (e.code !== 1000) {
        setStatus("reconnecting");
        retryTimer.current = setTimeout(() => {
          if (mountedRef.current && roomIdRef.current) connect(roomIdRef.current);
        }, 4000);
      } else {
        setStatus("idle");
      }
    };

    ws.onerror = () => {
      if (!mountedRef.current) return;
      wsRef.current = null;
      setJoinConfirmed(false);
      setStatus("reconnecting");
      retryTimer.current = setTimeout(() => {
        if (mountedRef.current && roomIdRef.current) connect(roomIdRef.current);
      }, 4000);
    };
  }, [pushMsg, tryParseChat]);

  useEffect(() => {
    mountedRef.current = true;
    roomIdRef.current  = chatRoomId;
    if (!chatRoomId) { setStatus("idle"); return; }
    connect(chatRoomId);
    return () => {
      mountedRef.current = false;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      try { wsRef.current?.close(1000, "unmount"); } catch {}
      wsRef.current = null;
    };
  }, [chatRoomId, connect]);

  return { messages, status, joinConfirmed, latencyMs };
}

// ─── Showroom Comment Hook ────────────────────────────────────────────────────
function useShowroomComments(roomId: number | null) {
  const [comments, setComments] = useState<SRComment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
  const mountedRef = useRef(true);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch_ = useCallback(async () => {
    if (!roomId || !mountedRef.current) return;
    try {
      const res  = await fetch(
        `https://www.showroom-live.com/api/live/comment_log?room_id=${roomId}`,
        { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" } }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      const parsed: SRComment[] = (data?.comment_log ?? [])
        .map((c: any) => ({
          id:          `${c.user_id}-${c.created_at}`,
          name:        c.name ?? "Unknown",
          avatar_url:  c.avatar_url ?? "",
          comment:     c.comment ?? "",
          created_at:  c.created_at ?? 0,
          class_level: c.class_level ?? 1,
        }))
        .sort((a: SRComment, b: SRComment) => a.created_at - b.created_at);
      if (!mountedRef.current) return;
      setComments(parsed);
      setLastPoll(new Date());
      setError(false);
    } catch {
      if (mountedRef.current) setError(true);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    mountedRef.current = true;
    if (!roomId) { setLoading(false); return; }
    fetch_();
    timerRef.current = setInterval(fetch_, 5000);
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [roomId, fetch_]);

  return { comments, loading, error, lastPoll, retry: fetch_ };
}

// ─── HLS Player ───────────────────────────────────────────────────────────────
function HlsPlayer({ src, title }: { src: string; title: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef   = useRef<Hls | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const destroy = useCallback(() => {
    if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
    if (hlsRef.current)   { hlsRef.current.destroy(); hlsRef.current = null; }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    destroy();

    if (!Hls.isSupported()) {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
        video.load();
        video.play().catch(() => {});
      }
      return;
    }

    const hls = new Hls({
      enableWorker:                true,
      lowLatencyMode:              false,
      maxBufferLength:             30,
      maxMaxBufferLength:          60,
      liveSyncDurationCount:       3,
      liveMaxLatencyDurationCount: 10,
      liveDurationInfinity:        true,
      fragLoadingTimeOut:          10000,
      fragLoadingMaxRetry:         6,
      manifestLoadingTimeOut:      10000,
      manifestLoadingMaxRetry:     4,
    });

    hlsRef.current = hls;
    hls.loadSource(src);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
    hls.on(Hls.Events.ERROR, (_, data) => {
      if (!data.fatal) return;
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        hls.startLoad();
      } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        hls.recoverMediaError();
      } else {
        destroy();
        retryRef.current = setTimeout(() => {
          const v = videoRef.current;
          if (!v) return;
          const h2 = new Hls({ lowLatencyMode: false, maxBufferLength: 30 });
          h2.loadSource(src);
          h2.attachMedia(v);
          h2.on(Hls.Events.MANIFEST_PARSED, () => v.play().catch(() => {}));
          hlsRef.current = h2;
        }, 2000);
      }
    });

    return destroy;
  }, [src, destroy]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-black shadow-2xl">
      <style>{`
        video.stream-player::-webkit-media-controls-timeline,
        video.stream-player::-webkit-media-controls-time-remaining-display,
        video.stream-player::-webkit-media-controls-current-time-display { display: none !important; }
      `}</style>
      <Backlight blur={50} className="w-full">
        <video
          ref={videoRef}
          controls
          autoPlay
          playsInline
          className="stream-player w-full block"
          title={title}
        />
      </Backlight>
    </div>
  );
}

// ─── IDN IRC Chat Panel ───────────────────────────────────────────────────────
function IrcChatPanel({
  messages,
  status,
  joinConfirmed,
  latencyMs,
}: {
  messages:      IrcChatMessage[];
  status:        string;
  joinConfirmed: boolean;
  latencyMs:     number | null;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const connected = status === "connected";

  const statusColor =
    connected && joinConfirmed  ? "bg-emerald-500" :
    connected && !joinConfirmed ? "bg-amber-500"   :
    status === "reconnecting"   ? "bg-amber-500"   :
    status === "connecting"     ? "bg-blue-500"    : "bg-gray-500";

  const statusLabel =
    connected && joinConfirmed  ? `Terhubung${latencyMs !== null ? ` · ${latencyMs}ms` : ""}` :
    connected && !joinConfirmed ? "Join room..." :
    status === "reconnecting"   ? "Reconnecting..." :
    status === "connecting"     ? "Menghubungkan..." : "Offline";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusColor}`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${statusColor}`} />
          </span>
          <span className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">Live Chat · IDN</span>
        </div>
        <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
          {statusLabel}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 scroll-smooth">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              {!connected || !joinConfirmed ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                {!connected         ? (status === "connecting" ? "Menghubungkan ke IRC..." : status === "reconnecting" ? "Mencoba ulang..." : "Offline") :
                 !joinConfirmed     ? "Bergabung ke room chat..." :
                 "Belum ada pesan"}
              </p>
              {connected && joinConfirmed && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Tunggu komentar masuk</p>
              )}
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const accent = msg.colorCode ?? "#dc2626";
          return (
            <div key={msg.id} className="flex gap-2.5 items-start group">
              <div
                className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold overflow-hidden ring-2 ring-white dark:ring-gray-900"
                style={{ backgroundColor: accent + "22", color: accent, border: `1.5px solid ${accent}55` }}
              >
                {msg.userAvatar ? (
                  <img src={msg.userAvatar} alt={msg.userName} className="w-full h-full object-cover rounded-full"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  msg.userName.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                  {msg.levelTier !== undefined && (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md"
                      style={{ backgroundColor: accent + "22", color: accent, border: `1px solid ${accent}44` }}>
                      Lv{msg.levelTier}
                    </span>
                  )}
                  <span className="text-xs font-bold leading-none" style={{ color: accent }}>
                    {msg.userName}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400 break-words m-0">
                  {msg.message}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-center gap-2 py-1">
          <span className={`w-1.5 h-1.5 rounded-full ${statusColor} animate-pulse`} />
          <span className="text-xs text-gray-400 dark:text-gray-500">IDN Live Chat · IRC WebSocket</span>
        </div>
      </div>
    </div>
  );
}

// ─── Showroom Chat Panel ──────────────────────────────────────────────────────
function ShowroomChatPanel({
  comments, loading, error, lastPoll, retry,
}: {
  comments: SRComment[];
  loading:  boolean;
  error:    boolean;
  lastPoll: Date | null;
  retry:    () => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [comments.length]);

  const getLevelColor = (level: number) => {
    if (level >= 20) return "#7B4FFF";
    if (level >= 10) return "#158DE8";
    return "#929CC3";
  };

  return (
    <div className="flex flex-col h-full">
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
          <button onClick={retry}
            className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hover:opacity-75 transition-opacity cursor-pointer bg-transparent border-0">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
          <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
            {comments.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 scroll-smooth">
        {loading && comments.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12">
            <div className="w-8 h-8 border-2 border-gray-200 dark:border-gray-700 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Memuat komentar...</p>
          </div>
        )}
        {error && comments.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12 text-center">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Gagal memuat komentar</p>
            <button onClick={retry} className="text-xs text-red-500 font-bold hover:underline cursor-pointer bg-transparent border-0">Coba Lagi</button>
          </div>
        )}
        {!loading && !error && comments.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12 text-center">
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
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md"
                  style={{
                    backgroundColor: getLevelColor(msg.class_level) + "22",
                    color: getLevelColor(msg.class_level),
                    border: `1px solid ${getLevelColor(msg.class_level)}44`
                  }}>
                  ★ {msg.class_level}
                </span>
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-none">{msg.name}</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  {new Date(msg.created_at * 1000).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400 break-words m-0">{msg.comment}</p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-center gap-2 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-gray-400 dark:text-gray-500">Showroom · auto-refresh 5 detik</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MemberStream() {
  const { playbackId } = useParams<{ playbackId: string }>();
  const navigate       = useNavigate();

  const [show,    setShow]    = useState<MemberShow | null>(null);
  const [hlsUrl,  setHlsUrl]  = useState("");
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  // Chat — only activate relevant hook based on stream type
  const isIdn      = show?.type === "idn";
  const isShowroom = show?.type === "showroom";

  const { messages: ircMessages, status: ircStatus, joinConfirmed: ircJoinConfirmed, latencyMs: ircLatency } =
    useIdnIrcChat(isIdn && show?.chat_room_id ? show.chat_room_id : null);

  const { comments: srComments, loading: srLoading, error: srError, lastPoll: srLastPoll, retry: srRetry } =
    useShowroomComments(isShowroom && show?.room_id ? show.room_id : null);

  const load = useCallback(async () => {
    if (!playbackId) return;
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(LIVE_API);
      const data = await res.json();

      if (!Array.isArray(data)) {
        setError("Gagal mengambil data live"); setLoading(false); return;
      }

      const found = data.find((s: any) =>
        s.url_key   === playbackId ||
        s.slug      === playbackId ||
        s.identifier === playbackId
      );

      if (!found) {
        setError("Member tidak sedang live saat ini"); setLoading(false); return;
      }

      setShow(found);

      const url = found.streaming_url_list?.[0]?.url ?? "";
      if (!url) {
        setError("URL stream tidak tersedia"); setLoading(false); return;
      }
      setHlsUrl(url);
      setLoading(false);
    } catch (e: any) {
      setError(e?.message || "Terjadi kesalahan"); setLoading(false);
    }
  }, [playbackId]);

  useEffect(() => { load(); }, [load]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-gray-200 dark:border-gray-700 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Memuat live stream...</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
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
            <button onClick={load}
              className="px-5 py-2.5 rounded-xl border-0 bg-red-500 text-white text-sm font-bold cursor-pointer hover:bg-red-600 shadow-lg shadow-red-500/25 transition-all hover:-translate-y-0.5">
              Coba Lagi
            </button>
            <button onClick={() => navigate(-1)}
              className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-600 dark:text-gray-400 text-sm font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              Kembali
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03] xl:px-8 xl:py-7">

        {/* Header bar */}
        <div className="flex items-center gap-2.5 mb-6 flex-wrap">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-600 dark:text-gray-400 text-xs font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
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
              IDN Live
            </span>
          )}
          {isShowroom && (
            <span className="px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
              Showroom
            </span>
          )}

          {show && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Mulai {new Date(show.started_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
            </span>
          )}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">

          {/* Left: player + info */}
          <div className="flex flex-col gap-5">
            {hlsUrl ? (
              <HlsPlayer src={hlsUrl} title={show?.name ?? "Live Stream"} />
            ) : (
              <div className="aspect-video bg-gray-100 dark:bg-gray-800/50 rounded-2xl flex items-center justify-center border border-gray-200 dark:border-gray-700">
                <div className="w-10 h-10 border-[3px] border-gray-200 dark:border-gray-700 border-t-red-500 rounded-full animate-spin" />
              </div>
            )}

            {/* Member info card */}
            {show && (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 p-5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Detail Member</p>
                <div className="flex gap-4 items-center">
                  <img
                    src={show.img_alt || show.img}
                    alt={show.name}
                    className="w-14 h-14 rounded-full object-cover flex-shrink-0 border-2 border-gray-200 dark:border-gray-700"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <div>
                    <h3 className="text-base font-bold text-gray-800 dark:text-white/90 mb-2">{show.name}</h3>
                    <div className="flex gap-2 flex-wrap items-center">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase border ${
                        isIdn
                          ? "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400"
                          : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      }`}>
                        {show.type.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Mulai: {new Date(show.started_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                      </span>
                    </div>
                  </div>
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
              style={{ height: "540px" }}
            >
              {isIdn ? (
                <IrcChatPanel
                  messages={ircMessages}
                  status={ircStatus}
                  joinConfirmed={ircJoinConfirmed}
                  latencyMs={ircLatency}
                />
              ) : (
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
  );
}
