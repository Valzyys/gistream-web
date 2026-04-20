import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import PageMeta from "../components/common/PageMeta";

// ── Types ─────────────────────────────────────────────────────────────────────
interface GiftItem {
  name: string;
  point: number;
  id: string;
  free: boolean;
  img: string;
  user_count: number;
  num: number;
}
interface GiftLog {
  gifts: { id: string; num: number; date: string }[];
  total: number;
  user_id: string | number;
}
interface User {
  id: string | number;
  name: string;
  avatar_url?: string;
  avatar_id?: number;
  comments: number;
}
interface FanItem {
  id: number;
  name: string;
  avatar_id: number;
  fans_point: number;
}
interface RecentDetail {
  author: string;
  data_id: string;
  live_id: number | string;
  room_id: number;
  room_info: {
    name: string;
    nickname: string;
    fullname: string;
    img: string;
    img_alt: string;
    url: string;
    is_graduate: boolean;
    is_group: boolean;
    banner: string;
    jikosokai: string;
    generation: string;
    group: string;
  };
  total_gifts: number;
  gift_rate: number;
  created_at: string;
  fans?: FanItem[];
  idn?: {
    id: string;
    username: string;
    slug: string;
    title: string;
    image: string;
  };
  live_info: {
    duration: number;
    gift: { log: GiftLog[]; next_page: boolean; list: GiftItem[] };
    viewers: { num: number; active: number; is_excitement: boolean };
    comments: { num: number; users: number };
    screenshot: { folder: string; format: string; list: number[] };
    date: { start: string; end: string };
    background_image?: string;
  };
  users: User[];
  type: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const DEFAULT_IMG = "https://res.cloudinary.com/haymzm4wp/image/upload/v1760105848/bi5ej2hgh0cc2uowu5xr.jpg";

const getAvatarUrl = (user: User): string => {
  if (user.avatar_url) return user.avatar_url;
  if (user.avatar_id) {
    return user.avatar_id >= 1_000_000
      ? `https://static.showroom-live.com/image/avatar/${user.avatar_id}.png`
      : `https://stg.showroom-live.com/assets/img/avatar/${user.avatar_id}.png`;
  }
  return `https://stg.showroom-live.com/assets/img/avatar/1.png`;
};

const getFanAvatarUrl = (avatar_id: number): string =>
  avatar_id >= 1_000_000
    ? `https://static.showroom-live.com/image/avatar/${avatar_id}.png`
    : `https://stg.showroom-live.com/assets/img/avatar/${avatar_id}.png`;

const getScreenshotUrl = (folder: string, ts: number, format: string) =>
  `https://screenshot.jkt48connect.com/${encodeURIComponent(folder).replace(/%2F/g, "/")}/${ts}.${format}`;

const formatDuration = (ms: number) => {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  if (h > 0) return `${h}j ${m}m`;
  if (m > 0) return `${m}m ${s}d`;
  return `${s}d`;
};
const formatNum = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
};
const formatTime = (str: string) =>
  new Date(str).toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
  }) + " WIB";
const formatDate = (str: string) =>
  new Date(str).toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

const downloadImage = async (url: string, filename: string) => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank");
  }
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const BackIcon = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
  </svg>
);
const ClockIcon = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
  </svg>
);
const EyeIcon = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const ChatIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
);
const GiftIconSvg = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <rect x="3" y="8" width="18" height="14" rx="2"/><path d="M21 8H3M12 8V22M12 8C12 8 9 3 6 4.5S4 8 6 8h6zM12 8c0 0 3-5 6-3.5S20 8 18 8h-6z"/>
  </svg>
);
const UsersIcon = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
);
const StarIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);
const TrophyIcon = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 21h8M12 17v4M17 3H7v7a5 5 0 0010 0V3z"/>
    <path d="M7 5H4a2 2 0 000 4h3M17 5h3a2 2 0 010 4h-3"/>
  </svg>
);
const ImageIcon = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
    <path d="M21 15l-5-5L5 21"/>
  </svg>
);
const XIcon = () => (
  <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);
const ChevLeftIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6"/>
  </svg>
);
const ChevRightIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6"/>
  </svg>
);
const DownloadIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Skeleton = ({ style = {} }: { style?: React.CSSProperties }) => (
  <div style={{
    background: "linear-gradient(90deg, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.04) 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
    borderRadius: 10,
    ...style,
  }} className="dark:bg-gradient-to-r" />
);

// ── Section Header ────────────────────────────────────────────────────────────
const SectionHeader = ({ icon, title, color, badge }: {
  icon: React.ReactNode; title: string; color: string; badge?: React.ReactNode;
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
    <div style={{
      width: 36, height: 36, borderRadius: 10,
      background: `${color}14`, border: `1px solid ${color}28`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color, flexShrink: 0,
    }}>
      {icon}
    </div>
    <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#111827", flex: 1 }}
      className="dark:text-white">
      {title}
    </h2>
    {badge}
  </div>
);

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: string;
}) => (
  <div style={{
    background: "#fff", border: `1px solid ${color}20`,
    borderRadius: 12, padding: "12px 14px",
    display: "flex", flexDirection: "column", gap: 5,
    flex: "1 1 120px", minWidth: 0,
  }} className="dark:bg-white/[0.03]">
    <div style={{
      width: 30, height: 30, borderRadius: 8,
      background: `${color}18`, display: "flex",
      alignItems: "center", justifyContent: "center", color,
    }}>
      {icon}
    </div>
    <span style={{ fontSize: 19, fontWeight: 800, color: "#111827", lineHeight: 1 }}
      className="dark:text-white">
      {value}
    </span>
    <span style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px" }}>
      {label}
    </span>
  </div>
);

// ── Gift Card ─────────────────────────────────────────────────────────────────
const GiftCard = ({ g }: { g: GiftItem }) => (
  <div style={{
    background: "#fff", border: "1px solid #e5e7eb",
    borderRadius: 10, padding: "8px 6px",
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 4, position: "relative",
    width: "calc(20% - 7px)", minWidth: 68,
  }} className="dark:bg-white/[0.03] dark:border-gray-800">
    <img src={g.img} alt={g.name}
      style={{ width: 36, height: 36, objectFit: "contain" }}
      onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
    {g.num > 1 && (
      <div style={{
        position: "absolute", top: 4, right: 4,
        background: "#DC1F2E", borderRadius: 4, padding: "1px 5px",
        fontSize: 8, fontWeight: 800, color: "#fff",
      }}>×{g.num}</div>
    )}
    {g.free && (
      <div style={{
        position: "absolute", top: 4, left: 4,
        background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)",
        borderRadius: 4, padding: "1px 4px",
        fontSize: 7, fontWeight: 700, color: "#22C55E",
      }}>FREE</div>
    )}
    <span style={{ color: "#6b7280", fontSize: 8, textAlign: "center", lineHeight: 1.3 }}
      className="dark:text-gray-500" title={g.name}>
      {g.name.length > 12 ? g.name.slice(0, 11) + "…" : g.name}
    </span>
    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
      <span style={{ color: "#A855F7", fontSize: 9, fontWeight: 700 }}>{g.point}pt</span>
      <span style={{ color: "#9ca3af", fontSize: 8 }}>{g.user_count}u</span>
    </div>
  </div>
);

// ── Rank Medal ────────────────────────────────────────────────────────────────
const RankMedal = ({ rank }: { rank: number }) => {
  const colors = ["#F59E0B", "#94A3B8", "#B45309"];
  return (
    <div style={{
      width: 22, height: 22, borderRadius: "50%",
      background: rank < 3 ? colors[rank] : "#e5e7eb",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }} className={rank >= 3 ? "dark:bg-white/[0.06]" : ""}>
      <span style={{ color: rank < 3 ? "#fff" : "#6b7280", fontSize: 10, fontWeight: 800 }}>{rank + 1}</span>
    </div>
  );
};

// ── Gifter Row ────────────────────────────────────────────────────────────────
const GifterRow = ({ log, user, rank }: { log: GiftLog; user: User; rank: number }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 10,
    padding: "11px 14px", borderBottom: "1px solid #f3f4f6",
  }} className="dark:border-gray-800/60">
    <RankMedal rank={rank} />
    <img src={getAvatarUrl(user)} alt={user.name}
      style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0, background: "#f3f4f6" }}
      onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ color: "#111827", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        className="dark:text-white">{user.name}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2, color: "#9ca3af" }}>
        <ChatIcon size={10} /><span style={{ fontSize: 10 }}>{user.comments} komentar</span>
      </div>
    </div>
    <div style={{ textAlign: "right", flexShrink: 0 }}>
      <div style={{ color: "#F59E0B", fontSize: 13, fontWeight: 700 }}>{log.total}pt</div>
      <div style={{ color: "#9ca3af", fontSize: 10 }}>{log.gifts.length} gift</div>
    </div>
  </div>
);

// ── Fan Row ───────────────────────────────────────────────────────────────────
const FanRow = ({ fan, rank }: { fan: FanItem; rank: number }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 10,
    padding: "11px 14px", borderBottom: "1px solid #f3f4f6",
  }} className="dark:border-gray-800/60">
    <RankMedal rank={rank} />
    <img src={getFanAvatarUrl(fan.avatar_id)} alt={fan.name}
      style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0, background: "#f3f4f6" }}
      onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ color: "#111827", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        className="dark:text-white">{fan.name}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
        <StarIcon size={10} /><span style={{ fontSize: 10, color: "#d97706" }}>{fan.fans_point.toLocaleString()} pts</span>
      </div>
    </div>
    <div style={{ textAlign: "right", flexShrink: 0 }}>
      <div style={{ color: "#F59E0B", fontSize: 13, fontWeight: 700 }}>{formatNum(fan.fans_point)}</div>
      <div style={{ color: "#9ca3af", fontSize: 10 }}>fans pts</div>
    </div>
  </div>
);

// ── Lightbox ──────────────────────────────────────────────────────────────────
const Lightbox = ({ urls, index, memberName, onClose, onPrev, onNext, onGoto }: {
  urls: string[]; index: number; memberName: string;
  onClose: () => void; onPrev: () => void; onNext: () => void;
  onGoto: (i: number) => void;
}) => {
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onPrev, onNext]);

  const handleDownload = async () => {
    setDownloading(true);
    const ext = urls[index].split(".").pop()?.split("?")[0] || "jpg";
    await downloadImage(urls[index], `${memberName}_screenshot_${index + 1}.${ext}`);
    setDownloading(false);
  };

  // Visible thumbnail range
  const thumbStart = Math.max(0, Math.min(index - 4, urls.length - 9));
  const thumbEnd = Math.min(urls.length, thumbStart + 9);
  const thumbUrls = urls.slice(thumbStart, thumbEnd);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.96)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      {/* ── Top bar ── */}
      <div
        style={{
          position: "absolute", top: 0, left: 0, right: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)",
          zIndex: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Counter badge */}
        <div style={{
          fontSize: 12, fontWeight: 600,
          color: "rgba(255,255,255,0.6)",
          background: "rgba(255,255,255,0.08)",
          borderRadius: 999, padding: "4px 12px",
          border: "1px solid rgba(255,255,255,0.1)",
        }}>
          {index + 1} / {urls.length}
        </div>

        {/* Right actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8,
              background: downloading ? "rgba(70,95,255,0.25)" : "rgba(70,95,255,0.9)",
              border: "1px solid rgba(70,95,255,0.5)",
              color: "#fff", fontSize: 12, fontWeight: 700,
              cursor: downloading ? "wait" : "pointer",
              transition: "all 0.15s",
              opacity: downloading ? 0.7 : 1,
            }}
          >
            <DownloadIcon />
            {downloading ? "Mengunduh..." : "Download"}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s",
            }}
          >
            <XIcon />
          </button>
        </div>
      </div>

      {/* ── Main image ── */}
      <img
        src={urls[index]}
        alt={`Screenshot ${index + 1}`}
        style={{
          maxWidth: "88vw", maxHeight: "78vh",
          objectFit: "contain", borderRadius: 8,
          userSelect: "none",
        }}
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />

      {/* ── Prev btn ── */}
      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          style={{
            position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
            width: 44, height: 44, borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#fff", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s",
          }}
        >
          <ChevLeftIcon />
        </button>
      )}

      {/* ── Next btn ── */}
      {index < urls.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          style={{
            position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
            width: 44, height: 44, borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#fff", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s",
          }}
        >
          <ChevRightIcon />
        </button>
      )}

      {/* ── Bottom thumbnail strip ── */}
      <div
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "16px 18px",
          background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)",
          display: "flex", justifyContent: "center", gap: 5,
          zIndex: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {thumbUrls.map((url, i) => {
          const realIdx = thumbStart + i;
          const isActive = realIdx === index;
          return (
            <div
              key={realIdx}
              onClick={() => onGoto(realIdx)}
              style={{
                width: 46, height: 30, borderRadius: 5, overflow: "hidden",
                border: isActive ? "2px solid #465FFF" : "2px solid rgba(255,255,255,0.15)",
                cursor: "pointer", flexShrink: 0,
                opacity: isActive ? 1 : 0.5,
                transition: "opacity 0.15s, border-color 0.15s",
                boxShadow: isActive ? "0 0 0 2px rgba(70,95,255,0.4)" : "none",
              }}
            >
              <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Divider ───────────────────────────────────────────────────────────────────
const Divider = () => (
  <div style={{ height: 1, background: "linear-gradient(to right, transparent, #e5e7eb, transparent)" }}
    className="dark:opacity-20" />
);

// ── Main Page ─────────────────────────────────────────────────────────────────
const RecentDetailPage: React.FC = () => {
  const { data_id } = useParams<{ data_id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<RecentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);
  const [lbOpen, setLbOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(false);
      const r = await fetch(`https://v2.jkt48connect.com/api/jkt48/recent/${data_id}?apikey=JKTCONNECT`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d: RecentDetail = await r.json();
      setData(d);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [data_id]);

  useEffect(() => { if (data_id) fetchData(); }, [data_id, fetchData]);

  const isIDN = data?.type === "idn";
  const isShowroom = data?.type === "showroom";
  // Warna mengikuti Live.tsx: IDN = #465FFF, Showroom = #DC1F2E
  const typeColor = isIDN ? "#465FFF" : "#DC1F2E";
  const typeLabel = isIDN ? "IDN Live" : "Showroom";

  const heroImage = useMemo(() => {
    if (!data) return "";
    if (isIDN && data.idn?.image) return data.idn.image;
    return data.room_info.img_alt || data.room_info.img || "";
  }, [data, isIDN]);

  const screenshots = useMemo(() => {
    if (!data?.live_info.screenshot.list?.length) return [];
    return data.live_info.screenshot.list.map((ts) =>
      getScreenshotUrl(data.live_info.screenshot.folder, ts, data.live_info.screenshot.format)
    );
  }, [data]);

  const sortedGifters = useMemo(() => {
    if (!data) return [];
    return [...data.live_info.gift.log]
      .sort((a, b) => b.total - a.total).slice(0, 10)
      .map((log) => ({ log, user: data.users.find((u) => String(u.id) === String(log.user_id)) }))
      .filter((x): x is { log: GiftLog; user: User } => x.user !== undefined);
  }, [data]);

  const topFans = useMemo(() => {
    if (!data?.fans?.length) return [];
    return [...data.fans].sort((a, b) => b.fans_point - a.fans_point).slice(0, 10);
  }, [data]);

  const openLb = useCallback((i: number) => { setLbIndex(i); setLbOpen(true); }, []);

  return (
    <>
      <PageMeta
        title={data ? `${data.room_info.nickname} — Recent Live | JKT48Connect` : "Recent Live | JKT48Connect"}
        description="Detail recent live JKT48"
      />

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ss-thumb { transition: transform 0.18s, box-shadow 0.18s; cursor: pointer; }
        .ss-thumb:hover { transform: scale(1.04); box-shadow: 0 4px 18px rgba(0,0,0,0.15); }
      `}</style>

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">

        {/* ── Header ── */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                width: 36, height: 36, borderRadius: 10,
                border: "1px solid #e5e7eb", background: "#fff",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: "#374151", flexShrink: 0, transition: "all 0.15s",
              }}
              className="dark:bg-white/[0.04] dark:border-gray-700 dark:text-gray-300"
            >
              <BackIcon />
            </button>

            <h1 style={{ flex: 1, margin: 0, fontSize: 16, fontWeight: 800, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              className="dark:text-white">
              {loading ? "Memuat..." : data?.room_info.nickname || "Detail Live"}
            </h1>

            {data && (
              <div style={{
                padding: "4px 10px", borderRadius: 6,
                background: `${typeColor}14`, border: `1px solid ${typeColor}28`,
                fontSize: 10, fontWeight: 800, color: typeColor, letterSpacing: "0.5px", flexShrink: 0,
              }}>
                {typeLabel}
              </div>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 22 }}>

          {/* Loading Skeleton */}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Skeleton style={{ height: 220, borderRadius: 16 }} />
              <div style={{ display: "flex", gap: 8 }}>
                {[0,1,2,3,4,5].map(i => <Skeleton key={i} style={{ height: 88, flex: 1, minWidth: 0 }} />)}
              </div>
              {[0,1].map(i => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  <Skeleton style={{ height: 20, width: "32%" }} />
                  <Skeleton style={{ height: i === 0 ? 260 : 180, borderRadius: 14 }} />
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && (error || !data) && (
            <div style={{ textAlign: "center", padding: "56px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 36 }}>😵</span>
              <p style={{ margin: 0, fontSize: 14, color: "#9ca3af" }}>Gagal memuat data live</p>
              <button
                onClick={() => { setLoading(true); fetchData(); }}
                style={{
                  padding: "9px 22px", borderRadius: 10,
                  background: "#DC1F2E", border: "none",
                  color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}
              >
                Coba Lagi
              </button>
            </div>
          )}

          {/* ── Main Content ── */}
          {!loading && !error && data && (
            <div style={{ display: "flex", flexDirection: "column", gap: 22, animation: "fadeIn 0.35s ease" }}>

              {/* Hero */}
              <div style={{
                position: "relative", borderRadius: 16, overflow: "hidden",
                height: 220, background: "#f3f4f6",
              }} className="dark:bg-white/[0.04]">
                <img src={heroImage} alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }} />
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.25) 55%, transparent 100%)",
                }} />

                {data.live_info.viewers.is_excitement && (
                  <div style={{
                    position: "absolute", top: 12, right: 12,
                    background: "rgba(245,158,11,0.18)", border: "1px solid rgba(245,158,11,0.4)",
                    backdropFilter: "blur(8px)", padding: "4px 10px", borderRadius: 999,
                    display: "inline-flex", alignItems: "center", gap: 5,
                    fontSize: 11, fontWeight: 700, color: "#F59E0B",
                  }}>
                    🔥 Excitement
                  </div>
                )}

                {data.room_info.is_graduate && (
                  <div style={{
                    position: "absolute", top: 12, left: 12,
                    background: "rgba(156,163,175,0.18)", border: "1px solid rgba(156,163,175,0.3)",
                    backdropFilter: "blur(8px)", padding: "3px 9px", borderRadius: 6,
                    fontSize: 9, fontWeight: 800, color: "#9ca3af", letterSpacing: "0.5px",
                  }}>
                    GRADUATE
                  </div>
                )}

                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  padding: "16px 18px", display: "flex", alignItems: "flex-end", gap: 14,
                }}>
                  <img src={data.room_info.img_alt || data.room_info.img} alt=""
                    style={{
                      width: 60, height: 60, borderRadius: "50%", objectFit: "cover",
                      border: `2.5px solid ${typeColor}80`, background: "#222", flexShrink: 0,
                    }}
                    onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>
                      {data.room_info.fullname}
                    </div>
                    <div style={{ fontSize: 13, color: typeColor, fontWeight: 600, marginTop: 2 }}>
                      @{data.room_info.nickname}
                    </div>
                    {data.room_info.generation && (
                      <div style={{
                        display: "inline-block", marginTop: 6,
                        background: `${typeColor}18`, border: `1px solid ${typeColor}35`,
                        borderRadius: 5, padding: "2px 8px",
                        fontSize: 9, fontWeight: 800, color: typeColor,
                        letterSpacing: "0.6px", textTransform: "uppercase",
                      }}>
                        {data.room_info.generation.replace(/-/g, " ")}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Info Card */}
              <div style={{
                background: "#fff", border: "1px solid #e5e7eb",
                borderRadius: 12, padding: "14px 16px",
                display: "flex", flexDirection: "column", gap: 9,
              }} className="dark:bg-white/[0.03] dark:border-gray-800">
                {isIDN && data.idn?.title && (
                  <div style={{
                    color: "#6b7280", fontSize: 13, fontStyle: "italic",
                    paddingBottom: 9, borderBottom: "1px solid #f3f4f6",
                  }} className="dark:text-gray-400 dark:border-gray-800">
                    "{data.idn.title}"
                  </div>
                )}
                {isShowroom && data.room_info.jikosokai && (
                  <div style={{
                    color: "#6b7280", fontSize: 12, lineHeight: 1.5,
                    paddingBottom: 9, borderBottom: "1px solid #f3f4f6",
                  }} className="dark:text-gray-400 dark:border-gray-800">
                    {data.room_info.jikosokai}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#9ca3af" }}>
                  <ClockIcon />
                  <span style={{ fontSize: 12 }}>
                    {formatDate(data.live_info.date.start)} · {formatTime(data.live_info.date.start)} – {formatTime(data.live_info.date.end)}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#9ca3af" }}>
                  <ClockIcon />
                  <span style={{ fontSize: 12 }}>
                    Durasi: <strong style={{ color: "#6b7280" }} className="dark:text-gray-300">{formatDuration(data.live_info.duration)}</strong>
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <StatCard icon={<EyeIcon />}    label="Penonton"   value={formatNum(data.live_info.viewers.num)}    color="#22C55E" />
                <StatCard icon={<UsersIcon />}  label="Aktif"      value={formatNum(data.live_info.viewers.active)} color="#F59E0B" />
                <StatCard icon={<ChatIcon />}   label="Komentar"   value={formatNum(data.live_info.comments.num)}  color="#A855F7" />
                <StatCard icon={<GiftIconSvg />} label="Total Gift" value={`${data.total_gifts}`}                  color="#DC1F2E" />
                <StatCard icon={<UsersIcon />}  label="Pengirim"   value={`${data.live_info.comments.users}`}      color="#F97316" />
                <StatCard icon={<StarIcon />}   label="Gift Rate"  value={`${data.gift_rate}`}                     color="#22D3EE" />
              </div>

              <Divider />

              {/* Gift List */}
              {data.live_info.gift.list?.length > 0 && (
                <div>
                  <SectionHeader icon={<GiftIconSvg />} title="Gift Diterima" color="#A855F7"
                    badge={
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                        background: "rgba(168,85,247,0.1)", color: "#A855F7", border: "1px solid rgba(168,85,247,0.2)",
                      }}>{data.live_info.gift.list.length} jenis</span>
                    } />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {data.live_info.gift.list.map((g) => <GiftCard key={`gift-${g.id}`} g={g} />)}
                  </div>
                </div>
              )}

              <Divider />

              {/* Top Gifters */}
              {sortedGifters.length > 0 && (
                <div>
                  <SectionHeader icon={<GiftIconSvg />} title="Top Gifter" color="#DC1F2E"
                    badge={
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                        background: "rgba(220,31,46,0.08)", color: "#DC1F2E", border: "1px solid rgba(220,31,46,0.2)",
                      }}>{sortedGifters.length} gifter</span>
                    } />
                  <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #e5e7eb" }}
                    className="dark:border-gray-800">
                    {sortedGifters.map(({ log, user }, i) => (
                      <GifterRow key={`gifter-${log.user_id}`} log={log} user={user} rank={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* Top Fans (Showroom) */}
              {isShowroom && topFans.length > 0 && (
                <div>
                  <SectionHeader icon={<TrophyIcon />} title="Top Fans" color="#F59E0B"
                    badge={
                      <div style={{
                        background: "rgba(233,66,125,0.08)", border: "1px solid rgba(233,66,125,0.2)",
                        borderRadius: 5, padding: "2px 8px",
                        fontSize: 9, fontWeight: 800, color: "#E9427D", letterSpacing: "0.5px",
                      }}>SHOWROOM</div>
                    } />
                  <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #e5e7eb" }}
                    className="dark:border-gray-800">
                    {topFans.map((fan, i) => <FanRow key={`fan-${fan.id}`} fan={fan} rank={i} />)}
                  </div>
                </div>
              )}

              <Divider />

              {/* Screenshots */}
              <div>
                <SectionHeader icon={<ImageIcon />} title="Screenshot Live" color="#22D3EE"
                  badge={
                    screenshots.length > 0 ? (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                        background: "rgba(34,211,238,0.08)", color: "#22D3EE", border: "1px solid rgba(34,211,238,0.2)",
                      }}>{screenshots.length} foto</span>
                    ) : undefined
                  } />

                {screenshots.length === 0 ? (
                  <div style={{
                    borderRadius: 14, border: "1px solid #e5e7eb",
                    padding: "36px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                  }} className="dark:border-gray-800">
                    <span style={{ fontSize: 28, opacity: 0.3 }}>📷</span>
                    <span style={{ color: "#9ca3af", fontSize: 13, fontWeight: 600 }}>Tidak ada screenshot</span>
                    <span style={{ color: "#d1d5db", fontSize: 11 }} className="dark:text-gray-700">
                      Screenshot tidak tersedia untuk live ini
                    </span>
                  </div>
                ) : (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                    gap: 6,
                  }}>
                    {screenshots.map((url, i) => (
                      <div
                        key={`ss-${i}`}
                        className="ss-thumb"
                        onClick={() => openLb(i)}
                        style={{
                          aspectRatio: "16/10",
                          borderRadius: 8, overflow: "hidden",
                          border: "1px solid #e5e7eb",
                          background: "#f3f4f6",
                        }}
                      >
                        <img src={url} alt={`Screenshot ${i + 1}`}
                          loading="lazy"
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lbOpen && (
        <Lightbox
          urls={screenshots}
          index={lbIndex}
          memberName={data?.room_info.nickname || "jkt48"}
          onClose={() => setLbOpen(false)}
          onPrev={() => setLbIndex(i => Math.max(0, i - 1))}
          onNext={() => setLbIndex(i => Math.min(screenshots.length - 1, i + 1))}
          onGoto={(i) => setLbIndex(i)}
        />
      )}
    </>
  );
};

export default RecentDetailPage;
