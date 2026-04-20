import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../components/common/PageMeta";

// ── API ───────────────────────────────────────────────────────────────────────
const IDN_PLUS_API = "https://v2.jkt48connect.com/api/jkt48/idnplus?apikey=JKTCONNECT";
const LIVE_API     = "https://v2.jkt48connect.com/api/jkt48/live?apikey=JKTCONNECT";
const RECENT_API   = "https://v2.jkt48connect.com/api/jkt48/recent?apikey=JKTCONNECT";

const DEFAULT_IMG =
  "https://res.cloudinary.com/haymzm4wp/image/upload/v1760105848/bi5ej2hgh0cc2uowu5xr.jpg";

// ── Types ─────────────────────────────────────────────────────────────────────
interface IdnLiveShow {
  id:             string;
  slug:           string;
  title:          string;
  description:    string | null;
  image:          string;
  creator:        string;
  creatorAvatar:  string;
  viewCount:      number;
  liveAt:         number;
  price:          number;
  currency:       string;
  showId:         string | null;
  roomIdentifier: string;
}

interface MemberLiveShow {
  name:        string;
  img:         string;
  img_alt:     string;
  url_key:     string;
  slug:        string;
  room_id:     number;
  is_graduate: boolean;
  is_group:    boolean;
  started_at:  string;
  type:        string;
  identifier:  string;
  streaming_url_list: {
    label:   string;
    quality: number;
    url:     string;
  }[];
}

interface RecentLiveShow {
  _id:       string;
  data_id:   string;
  type:      string;
  points:    number;
  total_gift: string;
  idn?: {
    id:       string;
    username: string;
    slug:     string;
    title:    string;
    image:    string;
  };
  member: {
    name:        string;
    nickname?:   string;
    img_alt:     string;
    img:         string;
    url:         string;
    is_graduate: boolean;
    is_official: boolean;
  };
  live_info: {
    duration: number;
    viewers: {
      num:           number;
      is_excitement: boolean;
    };
    date: {
      start: string;
      end:   string;
    };
  };
  gift_rate:  number;
  room_id:    number;
}

// ── Normalize IDN ─────────────────────────────────────────────────────────────
function normalizeIdnShow(show: any): IdnLiveShow {
  return {
    id:             show.slug || show.room_identifier,
    slug:           show.slug || "",
    title:          show.title || "Live Show",
    description:    show.idnliveplus?.description || null,
    image:          show.image_url || DEFAULT_IMG,
    creator:        show.creator?.name || "JKT48",
    creatorAvatar:  show.creator?.image_url || DEFAULT_IMG,
    viewCount:      show.view_count || 0,
    liveAt:         show.live_at ? show.live_at * 1000 : Date.now(),
    price:          show.idnliveplus?.liveroom_price || 0,
    currency:       show.idnliveplus?.currency_code || "gold",
    showId:         show.showId || null,
    roomIdentifier: show.room_identifier || "",
  };
}

// ── Live Duration Hook ────────────────────────────────────────────────────────
function useLiveDuration(liveAt: number) {
  const [duration, setDuration] = useState("");
  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, Date.now() - liveAt);
      const h    = Math.floor(diff / (1000 * 60 * 60));
      const m    = Math.floor((diff / (1000 * 60)) % 60);
      const s    = Math.floor((diff / 1000) % 60);
      setDuration(
        h > 0
          ? `${h}j ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}d`
          : `${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}d`
      );
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [liveAt]);
  return duration;
}

// ── Format Duration (ms → "1j 23m" string) ───────────────────────────────────
function formatDurationMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}j ${String(m).padStart(2, "0")}m`;
  return `${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}d`;
}

// ── Format Viewer ──────────────────────────────────────────────────────────────
function formatViewer(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "jt";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

// ── IDN Live Card ─────────────────────────────────────────────────────────────
function IdnLiveCard({ show }: { show: IdnLiveShow }) {
  const navigate  = useNavigate();
  const duration  = useLiveDuration(show.liveAt);
  const [hovered, setHovered] = useState(false);

  const fmt = (n: number) =>
    n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n);

  return (
    <div
      style={{
        background:    "#fff",
        border:        `1px solid ${hovered ? "rgba(220,31,46,0.35)" : "#e5e7eb"}`,
        borderRadius:  16,
        overflow:      "hidden",
        display:       "flex",
        flexDirection: "column",
        transition:    "all 0.2s",
        transform:     hovered ? "translateY(-3px)" : "translateY(0)",
        boxShadow:     hovered
          ? "0 12px 32px rgba(220,31,46,0.15)"
          : "0 1px 4px rgba(0,0,0,0.06)",
      }}
      className="dark:bg-white/[0.03] dark:border-gray-800"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail */}
      <div style={{
        position:    "relative",
        width:       "100%",
        aspectRatio: "16/9",
        overflow:    "hidden",
        background:  "#0a0a0a",
      }}>
        <img
          src={show.image}
          alt={show.title}
          style={{
            width:      "100%",
            height:     "100%",
            objectFit:  "cover",
            display:    "block",
            transition: "transform 0.3s",
            transform:  hovered ? "scale(1.04)" : "scale(1)",
          }}
          onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }}
        />
        <div style={{
          position:   "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)",
        }} />

        {/* LIVE badge */}
        <div style={{
          position:   "absolute", top: 10, left: 10,
          display:    "inline-flex", alignItems: "center", gap: 5,
          padding:    "4px 10px", borderRadius: 999,
          fontSize:   11, fontWeight: 700, letterSpacing: "0.06em",
          background: "#DC1F2E", color: "#fff",
          boxShadow:  "0 2px 8px rgba(220,31,46,0.5)",
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#fff", animation: "livePulse 1.5s infinite",
          }} />
          LIVE
        </div>

        {/* IDN Live+ badge */}
        <div style={{
          position:       "absolute", top: 10, right: 10,
          padding:        "3px 8px", borderRadius: 6,
          fontSize:       10, fontWeight: 700,
          background:     "rgba(70,95,255,0.85)",
          backdropFilter: "blur(6px)", color: "#fff",
        }}>
          IDN Live+
        </div>

        {/* Viewer */}
        <div style={{
          position:       "absolute", bottom: 10, left: 10,
          display:        "inline-flex", alignItems: "center", gap: 4,
          padding:        "3px 8px", borderRadius: 999,
          fontSize:       11, fontWeight: 600,
          background:     "rgba(0,0,0,0.6)",
          backdropFilter: "blur(6px)", color: "rgba(255,255,255,0.9)",
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {fmt(show.viewCount)}
        </div>

        {/* Duration */}
        <div style={{
          position:       "absolute", bottom: 10, right: 10,
          display:        "inline-flex", alignItems: "center", gap: 4,
          padding:        "3px 8px", borderRadius: 6,
          fontSize:       10, fontWeight: 600,
          background:     "rgba(0,0,0,0.6)",
          backdropFilter: "blur(6px)", color: "rgba(255,255,255,0.85)",
          fontVariantNumeric: "tabular-nums",
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {duration}
        </div>
      </div>

      {/* Body */}
      <div style={{
        padding:       "14px 16px 16px",
        display:       "flex",
        flexDirection: "column",
        gap:           10,
        flex:          1,
      }}>
        {/* Creator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img
            src={show.creatorAvatar}
            alt={show.creator}
            style={{
              width: 28, height: 28, borderRadius: "50%",
              objectFit: "cover", border: "2px solid rgba(220,31,46,0.3)",
            }}
            onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }}
          />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}
            className="dark:text-gray-400">
            {show.creator}
          </span>
          {show.showId && (
            <span style={{
              marginLeft: "auto",
              fontSize: 10, fontFamily: "monospace", fontWeight: 700,
              padding: "2px 7px", borderRadius: 6,
              background: "rgba(0,0,0,0.06)", color: "#9ca3af",
            }} className="dark:bg-white/[0.06] dark:text-gray-500">
              {show.showId}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 style={{
          margin: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.4,
          color: "#111827",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }} className="dark:text-white">
          {show.title}
        </h3>

        {/* Price */}
        {show.price > 0 && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 999,
            background: "rgba(255,215,0,0.1)",
            border: "1px solid rgba(255,215,0,0.25)",
            width: "fit-content",
          }}>
            <span style={{ fontSize: 13 }}>🎟️</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#92400e" }}
              className="dark:text-yellow-400">
              Rp 7.000
            </span>
          </div>
        )}

        {/* Description */}
        {show.description && (
          <p style={{
            margin: 0, fontSize: 11, lineHeight: 1.6,
            color: "#6b7280", whiteSpace: "pre-line",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }} className="dark:text-gray-400">
            {show.description}
          </p>
        )}

        {/* Watch Button */}
        <button
          onClick={() => navigate(`/live/${show.slug}`)}
          style={{
            marginTop:     "auto",
            padding:       "10px 0",
            borderRadius:  10,
            border:        "none",
            background:    hovered
              ? "linear-gradient(135deg, #DC1F2E, #ff4757)"
              : "rgba(220,31,46,0.08)",
            color:         hovered ? "#fff" : "#DC1F2E",
            fontSize:      13,
            fontWeight:    700,
            cursor:        "pointer",
            transition:    "all 0.2s",
            display:       "flex",
            alignItems:    "center",
            justifyContent: "center",
            gap:           6,
            boxShadow:     hovered ? "0 4px 16px rgba(220,31,46,0.35)" : "none",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          Tonton Sekarang
        </button>
      </div>
    </div>
  );
}

// ── Member Live Card ──────────────────────────────────────────────────────────
function MemberLiveCard({ show }: { show: MemberLiveShow }) {
  const navigate  = useNavigate();
  const [hovered, setHovered] = useState(false);

  const liveAt   = show.started_at ? new Date(show.started_at).getTime() : Date.now();
  const duration = useLiveDuration(liveAt);

  return (
    <div
      style={{
        background:    "#fff",
        border:        `1px solid ${hovered ? "rgba(70,95,255,0.35)" : "#e5e7eb"}`,
        borderRadius:  14,
        overflow:      "hidden",
        display:       "flex",
        alignItems:    "center",
        gap:           14,
        padding:       "14px 16px",
        transition:    "all 0.2s",
        transform:     hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow:     hovered
          ? "0 8px 24px rgba(70,95,255,0.12)"
          : "0 1px 4px rgba(0,0,0,0.05)",
        cursor:        "default",
      }}
      className="dark:bg-white/[0.03] dark:border-gray-800"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <img
          src={show.img_alt || show.img}
          alt={show.name}
          style={{
            width:        56,
            height:       56,
            borderRadius: "50%",
            objectFit:    "cover",
            border:       "2px solid rgba(70,95,255,0.25)",
            display:      "block",
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_IMG;
          }}
        />
        {/* Live dot */}
        <span style={{
          position:     "absolute",
          bottom:       1,
          right:        1,
          width:        12,
          height:       12,
          borderRadius: "50%",
          background:   "#DC1F2E",
          border:       "2px solid #fff",
          animation:    "livePulse 1.5s infinite",
        }} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            fontSize:   13,
            fontWeight: 700,
            color:      "#111827",
            overflow:   "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }} className="dark:text-white">
            {show.name}
          </span>
          {show.is_graduate && (
            <span style={{
              fontSize:   9,
              fontWeight: 700,
              padding:    "1px 6px",
              borderRadius: 999,
              background: "rgba(156,163,175,0.15)",
              color:      "#9ca3af",
              border:     "1px solid rgba(156,163,175,0.25)",
              flexShrink: 0,
            }}>
              GRAD
            </span>
          )}
        </div>

        {/* Type & Duration */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{
            fontSize:   10,
            fontWeight: 700,
            padding:    "2px 7px",
            borderRadius: 999,
            background: show.type === "idn"
              ? "rgba(70,95,255,0.1)"
              : "rgba(220,31,46,0.1)",
            color: show.type === "idn" ? "#465FFF" : "#DC1F2E",
            border: `1px solid ${show.type === "idn"
              ? "rgba(70,95,255,0.2)"
              : "rgba(220,31,46,0.2)"}`,
            textTransform: "uppercase",
          }}>
            {show.type === "idn" ? "IDN Live" : show.type}
          </span>

          <span style={{
            display:    "inline-flex",
            alignItems: "center",
            gap:        3,
            fontSize:   10,
            color:      "#9ca3af",
            fontVariantNumeric: "tabular-nums",
          }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {duration}
          </span>
        </div>

        {/* Streaming URL label */}
        {show.streaming_url_list?.length > 0 && (
          <span style={{
            fontSize:     10,
            color:        "#9ca3af",
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
          }}>
            {show.streaming_url_list[0].label} · {show.streaming_url_list[0].url.split("/").slice(-2, -1)[0]}
          </span>
        )}
      </div>

      {/* Watch Button */}
      <button
        onClick={() => navigate(`/live/${show.url_key}`)}
        style={{
          flexShrink:     0,
          padding:        "8px 14px",
          borderRadius:   10,
          border:         "none",
          background:     hovered
            ? "linear-gradient(135deg, #465FFF, #6b7fff)"
            : "rgba(70,95,255,0.08)",
          color:          hovered ? "#fff" : "#465FFF",
          fontSize:       12,
          fontWeight:     700,
          cursor:         "pointer",
          transition:     "all 0.2s",
          display:        "flex",
          alignItems:     "center",
          gap:            5,
          boxShadow:      hovered ? "0 4px 14px rgba(70,95,255,0.35)" : "none",
          whiteSpace:     "nowrap",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        Tonton
      </button>
    </div>
  );
}

// ── Recent Live Card ──────────────────────────────────────────────────────────
function RecentLiveCard({ show }: { show: RecentLiveShow }) {
  const navigate  = useNavigate();
  const [hovered, setHovered] = useState(false);

  const isIdn      = show.type === "idn";
  const accentColor = isIdn ? "#465FFF" : "#DC1F2E";
  const accentBg    = isIdn ? "rgba(70,95,255,0.08)"  : "rgba(220,31,46,0.08)";
  //const accentHover = isIdn
    //? "linear-gradient(135deg, #465FFF, #6b7fff)"
    //: "linear-gradient(135deg, #DC1F2E, #ff4757)";

  const endTime  = show.live_info?.date?.end
    ? new Date(show.live_info.date.end).toLocaleString("id-ID", {
        day:    "2-digit",
        month:  "short",
        hour:   "2-digit",
        minute: "2-digit",
      })
    : "-";

  const durationStr = show.live_info?.duration
    ? formatDurationMs(show.live_info.duration)
    : "-";

  const viewerCount = show.live_info?.viewers?.num ?? 0;
  const isExcitement = show.live_info?.viewers?.is_excitement ?? false;

  const thumbnail = isIdn && show.idn?.image ? show.idn.image : (show.member.img_alt || show.member.img);
 // const title     = isIdn && show.idn?.title ? show.idn.title : show.member.name;

  return (
    <div
      onClick={() => navigate(`/recent/${show.data_id}`)}
      style={{
        background:    "#fff",
        border:        `1px solid ${hovered ? `${accentColor}55` : "#e5e7eb"}`,
        borderRadius:  14,
        overflow:      "hidden",
        display:       "flex",
        alignItems:    "center",
        gap:           12,
        padding:       "12px 14px",
        transition:    "all 0.2s",
        transform:     hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow:     hovered
          ? `0 8px 24px ${accentColor}22`
          : "0 1px 4px rgba(0,0,0,0.05)",
        cursor:        "pointer",
      }}
      className="dark:bg-white/[0.03] dark:border-gray-800"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail / Avatar */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <img
          src={thumbnail}
          alt={show.member.name}
          style={{
            width:        52,
            height:       52,
            borderRadius: isIdn ? 10 : "50%",
            objectFit:    "cover",
            border:       `2px solid ${accentColor}40`,
            display:      "block",
            transition:   "transform 0.2s",
            transform:    hovered ? "scale(1.05)" : "scale(1)",
          }}
          onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }}
        />
        {/* Finished indicator */}
        <span style={{
          position:     "absolute",
          bottom:       -2,
          right:        -2,
          width:        14,
          height:       14,
          borderRadius: "50%",
          background:   "#6b7280",
          border:       "2px solid #fff",
          display:      "flex",
          alignItems:   "center",
          justifyContent: "center",
        }}>
          <svg width="7" height="7" viewBox="0 0 24 24" fill="#fff">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        </span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Name */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{
            fontSize:     13,
            fontWeight:   700,
            color:        "#111827",
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
          }} className="dark:text-white">
            {show.member.nickname || show.member.name}
          </span>
          {show.member.is_official && (
            <span style={{
              fontSize:   9,
              fontWeight: 700,
              padding:    "1px 5px",
              borderRadius: 999,
              background: "rgba(59,130,246,0.12)",
              color:      "#3b82f6",
              border:     "1px solid rgba(59,130,246,0.2)",
              flexShrink: 0,
            }}>
              OFFICIAL
            </span>
          )}
          {show.member.is_graduate && (
            <span style={{
              fontSize:   9,
              fontWeight: 700,
              padding:    "1px 5px",
              borderRadius: 999,
              background: "rgba(156,163,175,0.15)",
              color:      "#9ca3af",
              border:     "1px solid rgba(156,163,175,0.25)",
              flexShrink: 0,
            }}>
              GRAD
            </span>
          )}
        </div>

        {/* Title (for IDN) */}
        {isIdn && show.idn?.title && (
          <span style={{
            fontSize:     11,
            color:        "#6b7280",
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
          }} className="dark:text-gray-400">
            {show.idn.title}
          </span>
        )}

        {/* Meta row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Type badge */}
          <span style={{
            fontSize:     9,
            fontWeight:   700,
            padding:      "2px 6px",
            borderRadius: 999,
            background:   accentBg,
            color:        accentColor,
            border:       `1px solid ${accentColor}33`,
            textTransform: "uppercase",
          }}>
            {show.type === "idn" ? "IDN Live" : show.type}
          </span>

          {/* Duration */}
          <span style={{
            display:    "inline-flex",
            alignItems: "center",
            gap:        3,
            fontSize:   10,
            color:      "#9ca3af",
            fontVariantNumeric: "tabular-nums",
          }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {durationStr}
          </span>

          {/* Viewer */}
          <span style={{
            display:    "inline-flex",
            alignItems: "center",
            gap:        3,
            fontSize:   10,
            color:      isExcitement ? "#f59e0b" : "#9ca3af",
            fontVariantNumeric: "tabular-nums",
          }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {formatViewer(viewerCount)}
            {isExcitement && " 🔥"}
          </span>

          {/* End time */}
          <span style={{
            fontSize:   10,
            color:      "#9ca3af",
            marginLeft: "auto",
          }}>
            {endTime}
          </span>
        </div>
      </div>

      {/* Gift & Points */}
      <div style={{
        flexShrink:     0,
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "flex-end",
        gap:            4,
        minWidth:       80,
      }}>
        <span style={{
          fontSize:   12,
          fontWeight: 700,
          color:      "#10b981",
          whiteSpace: "nowrap",
        }}>
          {show.total_gift}
        </span>
        <div style={{
          display:    "inline-flex",
          alignItems: "center",
          gap:        3,
          padding:    "2px 7px",
          borderRadius: 999,
          background: "rgba(245,158,11,0.1)",
          border:     "1px solid rgba(245,158,11,0.2)",
        }}>
          <span style={{ fontSize: 9 }}>⭐</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#d97706" }}>
            {show.points.toLocaleString("id-ID")} pts
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      display:        "flex",
      flexDirection:  "column",
      alignItems:     "center",
      justifyContent: "center",
      gap:            10,
      padding:        "40px 0",
      textAlign:      "center",
    }}>
      <div style={{
        width:        48,
        height:       48,
        borderRadius: 12,
        background:   "rgba(0,0,0,0.04)",
        display:      "flex",
        alignItems:   "center",
        justifyContent: "center",
      }} className="dark:bg-white/[0.04]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
          stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
          <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#9ca3af" stroke="none" />
        </svg>
      </div>
      <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>{message}</p>
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({
  title,
  count,
  color = "#DC1F2E",
  icon,
  showLiveIndicator = true,
}: {
  title:               string;
  count:               number;
  color?:              string;
  icon:                React.ReactNode;
  showLiveIndicator?:  boolean;
}) {
  return (
    <div style={{
      display:     "flex",
      alignItems:  "center",
      gap:         10,
      marginBottom: 16,
    }}>
      <div style={{
        width:          36,
        height:         36,
        borderRadius:   10,
        background:     `${color}14`,
        border:         `1px solid ${color}28`,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        flexShrink:     0,
      }}>
        {icon}
      </div>
      <div>
        <h2 style={{
          margin:     0,
          fontSize:   15,
          fontWeight: 800,
          color:      "#111827",
          display:    "flex",
          alignItems: "center",
          gap:        8,
        }} className="dark:text-white">
          {title}
          {count > 0 && (
            <span style={{
              fontSize:     11,
              fontWeight:   700,
              padding:      "2px 8px",
              borderRadius: 999,
              background:   `${color}14`,
              color,
              border:       `1px solid ${color}28`,
            }}>
              {count} {showLiveIndicator ? "Live" : "Data"}
            </span>
          )}
        </h2>
      </div>

      {/* Animated live indicator */}
      {count > 0 && showLiveIndicator && (
        <div style={{
          marginLeft:  "auto",
          display:     "flex",
          alignItems:  "center",
          gap:         5,
          fontSize:    11,
          fontWeight:  600,
          color:       "#9ca3af",
        }}>
          <span style={{
            width:        7,
            height:       7,
            borderRadius: "50%",
            background:   color,
            animation:    "livePulse 1.5s infinite",
            display:      "inline-block",
          }} />
          Sedang Siaran
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const LivePage: React.FC = () => {
  const [idnShows,      setIdnShows]      = useState<IdnLiveShow[]>([]);
  const [memberShows,   setMemberShows]   = useState<MemberLiveShow[]>([]);
  const [recentShows,   setRecentShows]   = useState<RecentLiveShow[]>([]);
  const [loadingIdn,    setLoadingIdn]    = useState(true);
  const [loadingMember, setLoadingMember] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [lastUpdated,   setLastUpdated]   = useState<Date | null>(null);

  const fetchIdnPlus = async () => {
    try {
      const res  = await fetch(IDN_PLUS_API);
      const json = await res.json();
      if (json.status === 200 && Array.isArray(json.data)) {
        const live = json.data
          .filter((s: any) => s.status === "live")
          .map(normalizeIdnShow);
        setIdnShows(live);
      }
    } catch (e) {
      console.error("Error fetching IDN Plus:", e);
    } finally {
      setLoadingIdn(false);
    }
  };

  const fetchMemberLive = async () => {
    try {
      const res  = await fetch(LIVE_API);
      const json = await res.json();
      if (Array.isArray(json)) {
        setMemberShows(json);
      }
    } catch (e) {
      console.error("Error fetching Member Live:", e);
    } finally {
      setLoadingMember(false);
    }
  };

  const fetchRecentLive = async () => {
    try {
      const res  = await fetch(RECENT_API);
      const json = await res.json();
      // API bisa mengembalikan array langsung atau { data: [...] }
      const arr = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
      setRecentShows(arr);
    } catch (e) {
      console.error("Error fetching Recent Live:", e);
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    fetchIdnPlus();
    fetchMemberLive();
    fetchRecentLive();
    setLastUpdated(new Date());

    // Auto-refresh setiap 60 detik
    const interval = setInterval(() => {
      fetchIdnPlus();
      fetchMemberLive();
      fetchRecentLive();
      setLastUpdated(new Date());
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  const totalLive = idnShows.length + memberShows.length;

  return (
    <>
      <PageMeta
        title="Live Sekarang | JKT48Connect"
        description="Tonton live stream JKT48 dari IDN Live Plus dan Member Live"
      />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">

        {/* ── Page Header ── */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>

            {/* Title */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width:          44,
                height:         44,
                borderRadius:   12,
                background:     "rgba(220,31,46,0.08)",
                border:         "1px solid rgba(220,31,46,0.15)",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                flexShrink:     0,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="#DC1F2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
                  <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#DC1F2E" stroke="none" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800 dark:text-white" style={{ margin: 0 }}>
                  Live Sekarang
                </h1>
                <p style={{ margin: 0, fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                  JKT48 Theater & Member Live Stream
                </p>
              </div>
            </div>

            {/* Right: total + refresh */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {totalLive > 0 && (
                <div style={{
                  display:     "inline-flex",
                  alignItems:  "center",
                  gap:         6,
                  padding:     "5px 12px",
                  borderRadius: 999,
                  background:  "rgba(220,31,46,0.08)",
                  border:      "1px solid rgba(220,31,46,0.2)",
                }}>
                  <span style={{
                    width:        7,
                    height:       7,
                    borderRadius: "50%",
                    background:   "#DC1F2E",
                    animation:    "livePulse 1.5s infinite",
                    display:      "inline-block",
                  }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#DC1F2E" }}>
                    {totalLive} Sedang Live
                  </span>
                </div>
              )}

              {/* Last updated */}
              {lastUpdated && (
                <span style={{ fontSize: 11, color: "#9ca3af" }}>
                  Update: {lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              )}

              {/* Refresh button */}
              <button
                onClick={() => {
                  setLoadingIdn(true);
                  setLoadingMember(true);
                  setLoadingRecent(true);
                  fetchIdnPlus();
                  fetchMemberLive();
                  fetchRecentLive();
                  setLastUpdated(new Date());
                }}
                style={{
                  padding:      "6px 12px",
                  borderRadius: 8,
                  border:       "1px solid #e5e7eb",
                  background:   "#fff",
                  color:        "#6b7280",
                  fontSize:     12,
                  fontWeight:   600,
                  cursor:       "pointer",
                  display:      "flex",
                  alignItems:   "center",
                  gap:          5,
                  transition:   "all 0.15s",
                }}
                className="dark:bg-white/[0.04] dark:border-gray-700 dark:text-gray-400"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 32 }}>

          {/* ══ Section 1: IDN Live Plus ══ */}
          <div>
            <SectionHeader
              title="IDN Live Plus"
              count={idnShows.length}
              color="#DC1F2E"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="#DC1F2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
                  <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#DC1F2E" stroke="none" />
                </svg>
              }
            />

            {loadingIdn ? (
              <div style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                gap:            10,
                padding:        "32px 0",
              }}>
                <div style={{
                  width:        28,
                  height:       28,
                  border:       "3px solid rgba(220,31,46,0.15)",
                  borderTop:    "3px solid #DC1F2E",
                  borderRadius: "50%",
                  animation:    "spin 0.8s linear infinite",
                }} />
                <span style={{ fontSize: 13, color: "#9ca3af" }}>Memuat IDN Live Plus...</span>
              </div>
            ) : idnShows.length === 0 ? (
              <EmptyState message="Tidak ada show IDN Live Plus yang sedang live saat ini." />
            ) : (
              <div style={{
                display:             "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap:                 16,
              }}>
                {idnShows.map((show) => (
                  <IdnLiveCard key={show.id} show={show} />
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{
            height:     1,
            background: "linear-gradient(to right, transparent, #e5e7eb, transparent)",
          }} className="dark:bg-gradient-to-r dark:from-transparent dark:via-gray-700 dark:to-transparent" />

          {/* ══ Section 2: Live Member ══ */}
          <div>
            <SectionHeader
              title="Live Member"
              count={memberShows.length}
              color="#465FFF"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="#465FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              }
            />

            {loadingMember ? (
              <div style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                gap:            10,
                padding:        "32px 0",
              }}>
                <div style={{
                  width:        28,
                  height:       28,
                  border:       "3px solid rgba(70,95,255,0.15)",
                  borderTop:    "3px solid #465FFF",
                  borderRadius: "50%",
                  animation:    "spin 0.8s linear infinite",
                }} />
                <span style={{ fontSize: 13, color: "#9ca3af" }}>Memuat Live Member...</span>
              </div>
            ) : memberShows.length === 0 ? (
              <EmptyState message="Tidak ada member yang sedang live saat ini." />
            ) : (
              <div style={{
                display:             "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap:                 10,
              }}>
                {memberShows.map((show) => (
                  <MemberLiveCard key={show.identifier || show.url_key} show={show} />
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{
            height:     1,
            background: "linear-gradient(to right, transparent, #e5e7eb, transparent)",
          }} className="dark:bg-gradient-to-r dark:from-transparent dark:via-gray-700 dark:to-transparent" />

          {/* ══ Section 3: Recent Live ══ */}
          <div>
            <SectionHeader
              title="Recent Live"
              count={recentShows.length}
              color="#10b981"
              showLiveIndicator={false}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              }
            />

            {loadingRecent ? (
              <div style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                gap:            10,
                padding:        "32px 0",
              }}>
                <div style={{
                  width:        28,
                  height:       28,
                  border:       "3px solid rgba(16,185,129,0.15)",
                  borderTop:    "3px solid #10b981",
                  borderRadius: "50%",
                  animation:    "spin 0.8s linear infinite",
                }} />
                <span style={{ fontSize: 13, color: "#9ca3af" }}>Memuat Recent Live...</span>
              </div>
            ) : recentShows.length === 0 ? (
              <EmptyState message="Tidak ada data recent live saat ini." />
            ) : (
              <div style={{
                display:             "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                gap:                 10,
              }}>
                {recentShows.map((show) => (
                  <RecentLiveCard key={show._id} show={show} />
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── Footer ── */}
        <div style={{
          padding:     "12px 24px",
          borderTop:   "1px solid",
          display:     "flex",
          alignItems:  "center",
          justifyContent: "space-between",
          flexWrap:    "wrap",
          gap:         8,
        }} className="border-gray-100 dark:border-gray-800">
          <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
            Auto-refresh setiap{" "}
            <strong style={{ color: "#6b7280" }} className="dark:text-gray-300">
              60 detik
            </strong>
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#9ca3af" }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "#DC1F2E", display: "inline-block",
              }} />
              IDN Live+
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#9ca3af" }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "#465FFF", display: "inline-block",
              }} />
              Member Live
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#9ca3af" }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "#10b981", display: "inline-block",
              }} />
              Recent Live
            </span>
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
        `}</style>
      </div>
    </>
  );
};

export default LivePage;
