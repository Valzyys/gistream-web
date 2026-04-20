import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router";

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
    stage_list?: { date: string; list: number[] }[];
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
  `https://img.crstlnz.my.id/${encodeURIComponent(folder).replace(/%2F/g, "/")}/${ts}.${format}`;

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
const ChatIcon = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
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
const StarIcon = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
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
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);
const ChevLeftIcon = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6"/>
  </svg>
);
const ChevRightIcon = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6"/>
  </svg>
);


// ── Skeleton ──────────────────────────────────────────────────────────────────
const Skeleton = ({ style = {} }: { style?: React.CSSProperties }) => (
  <div style={{
    background: "linear-gradient(90deg, #111 25%, #1a1a1a 50%, #111 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
    borderRadius: 10,
    ...style,
  }} />
);

// ── Section Header ─────────────────────────────────────────────────────────────
const SectionHeader = ({ icon, title, color, badge }: {
  icon: React.ReactNode; title: string; color: string; badge?: React.ReactNode;
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
    <div style={{
      width: 3, height: 20, borderRadius: 2, background: color, flexShrink: 0,
    }} />
    <div style={{
      width: 32, height: 32, borderRadius: 9,
      background: color + "18", border: `1px solid ${color}30`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color, flexShrink: 0,
    }}>
      {icon}
    </div>
    <span style={{ color: "#fff", fontSize: 15, fontWeight: 700, flex: 1, fontFamily: "'DM Sans', sans-serif" }}>
      {title}
    </span>
    {badge}
  </div>
);

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: string;
}) => (
  <div style={{
    background: "#0a0a0a", border: `1px solid ${color}20`,
    borderRadius: 12, padding: "12px 14px",
    display: "flex", flexDirection: "column", gap: 6, flex: "1 1 140px",
    minWidth: 0,
  }}>
    <div style={{
      width: 30, height: 30, borderRadius: 8,
      background: color + "18", display: "flex",
      alignItems: "center", justifyContent: "center", color,
    }}>
      {icon}
    </div>
    <span style={{ color: "#fff", fontSize: 20, fontWeight: 800, fontFamily: "'DM Sans', sans-serif", lineHeight: 1 }}>
      {value}
    </span>
    <span style={{ color: "#444", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px" }}>
      {label}
    </span>
  </div>
);

// ── Gift Card ─────────────────────────────────────────────────────────────────
const GiftCard = ({ g }: { g: GiftItem }) => (
  <div style={{
    background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 10,
    padding: "8px 6px", display: "flex", flexDirection: "column",
    alignItems: "center", gap: 4, position: "relative",
    width: "calc(20% - 7px)", minWidth: 70,
  }}>
    <img
      src={g.img} alt={g.name}
      style={{ width: 38, height: 38, objectFit: "contain" }}
      onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
    />
    {g.num > 1 && (
      <div style={{
        position: "absolute", top: 4, right: 4,
        background: "#DC1F2E", borderRadius: 4,
        padding: "1px 5px",
        fontSize: 8, fontWeight: 800, color: "#fff",
      }}>
        ×{g.num}
      </div>
    )}
    {g.free && (
      <div style={{
        position: "absolute", top: 4, left: 4,
        background: "#22C55E18", border: "1px solid #22C55E40",
        borderRadius: 4, padding: "1px 4px",
        fontSize: 7, fontWeight: 700, color: "#22C55E",
      }}>
        FREE
      </div>
    )}
    <span style={{ color: "#777", fontSize: 8, textAlign: "center", lineHeight: 1.3 }} title={g.name}>
      {g.name.length > 12 ? g.name.slice(0, 11) + "…" : g.name}
    </span>
    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
      <span style={{ color: "#A855F7", fontSize: 9, fontWeight: 700 }}>{g.point}pt</span>
      <span style={{ color: "#333", fontSize: 8 }}>{g.user_count}u</span>
    </div>
  </div>
);

// ── Rank Medal ────────────────────────────────────────────────────────────────
const RankMedal = ({ rank }: { rank: number }) => {
  const colors = ["#F59E0B", "#94A3B8", "#B45309"];
  const bg = rank < 3 ? colors[rank] : "#1a1a1a";
  return (
    <div style={{
      width: 24, height: 24, borderRadius: "50%",
      background: bg, display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <span style={{ color: "#fff", fontSize: 10, fontWeight: 800 }}>{rank + 1}</span>
    </div>
  );
};

// ── Gifter Row ────────────────────────────────────────────────────────────────
const GifterRow = ({ log, user, rank }: { log: GiftLog; user: User; rank: number }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 10,
    padding: "11px 14px", borderBottom: "1px solid #111",
  }}>
    <RankMedal rank={rank} />
    <img
      src={getAvatarUrl(user)} alt={user.name}
      style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", background: "#111", flexShrink: 0 }}
      onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }}
    />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ color: "#eee", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {user.name}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
        <ChatIcon />
        <span style={{ color: "#444", fontSize: 10 }}>{user.comments} komentar</span>
      </div>
    </div>
    <div style={{ textAlign: "right", flexShrink: 0 }}>
      <div style={{ color: "#F59E0B", fontSize: 13, fontWeight: 700 }}>{log.total}pt</div>
      <div style={{ color: "#333", fontSize: 10 }}>{log.gifts.length} gift</div>
    </div>
  </div>
);

// ── Fan Row ───────────────────────────────────────────────────────────────────
const FanRow = ({ fan, rank }: { fan: FanItem; rank: number }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 10,
    padding: "11px 14px", borderBottom: "1px solid #111",
  }}>
    <RankMedal rank={rank} />
    <img
      src={getFanAvatarUrl(fan.avatar_id)} alt={fan.name}
      style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", background: "#111", flexShrink: 0 }}
      onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }}
    />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ color: "#eee", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {fan.name}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2, color: "#F59E0B" }}>
        <StarIcon />
        <span style={{ color: "#8a6800", fontSize: 10 }}>{fan.fans_point.toLocaleString()} pts</span>
      </div>
    </div>
    <div style={{ textAlign: "right", flexShrink: 0 }}>
      <div style={{ color: "#F59E0B", fontSize: 13, fontWeight: 700 }}>{formatNum(fan.fans_point)}</div>
      <div style={{ color: "#333", fontSize: 10 }}>fans pts</div>
    </div>
  </div>
);

// ── Lightbox ──────────────────────────────────────────────────────────────────
const Lightbox = ({ urls, index, onClose, onPrev, onNext }: {
  urls: string[]; index: number;
  onClose: () => void; onPrev: () => void; onNext: () => void;
}) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onPrev, onNext]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.97)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      {/* Counter */}
      <div style={{
        position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)",
        color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600,
        background: "rgba(255,255,255,0.06)", padding: "4px 14px", borderRadius: 999,
      }}>
        {index + 1} / {urls.length}
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: 16, right: 16,
          width: 40, height: 40, borderRadius: "50%",
          background: "rgba(255,255,255,0.1)", border: "none",
          color: "#fff", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <XIcon />
      </button>

      {/* Image */}
      <img
        src={urls[index]} alt=""
        style={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain", borderRadius: 8 }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Prev */}
      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          style={{
            position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
            width: 48, height: 48, borderRadius: "50%",
            background: "rgba(255,255,255,0.1)", border: "none",
            color: "#fff", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <ChevLeftIcon />
        </button>
      )}

      {/* Next */}
      {index < urls.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          style={{
            position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
            width: 48, height: 48, borderRadius: "50%",
            background: "rgba(255,255,255,0.1)", border: "none",
            color: "#fff", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <ChevRightIcon />
        </button>
      )}
    </div>
  );
};

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

  useEffect(() => {
    if (data_id) fetchData();
  }, [data_id, fetchData]);

  const isIDN = data?.type === "idn";
  const isShowroom = data?.type === "showroom";
  const typeColor = isIDN ? "#E5342A" : "#E9427D";
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
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map((log) => ({ log, user: data.users.find((u) => String(u.id) === String(log.user_id)) }))
      .filter((x): x is { log: GiftLog; user: User } => x.user !== undefined);
  }, [data]);

  const topFans = useMemo(() => {
    if (!data?.fans?.length) return [];
    return [...data.fans].sort((a, b) => b.fans_point - a.fans_point).slice(0, 10);
  }, [data]);

  const openLb = useCallback((i: number) => { setLbIndex(i); setLbOpen(true); }, []);

  return (
    <div style={{ background: "#000", minHeight: "100vh", color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }
        .ss-img:hover { transform: scale(1.03); }
        .ss-img { transition: transform 0.2s; }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(0,0,0,0.85)", backdropFilter: "blur(14px)",
        borderBottom: "1px solid #111",
        padding: "14px 20px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "#111", border: "1px solid #222",
            color: "#fff", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <BackIcon />
        </button>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {loading ? "Memuat..." : data?.room_info.nickname || "Detail Live"}
        </span>
        {data && (
          <div style={{
            padding: "4px 10px", borderRadius: 6,
            background: typeColor + "18", border: `1px solid ${typeColor}40`,
            fontSize: 10, fontWeight: 800, color: typeColor, letterSpacing: "0.6px",
          }}>
            {typeLabel}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 60px" }}>

        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 20 }}>
            <Skeleton style={{ height: 220, borderRadius: 16 }} />
            <div style={{ display: "flex", gap: 10 }}>
              {[0,1,2,3,4,5].map(i => <Skeleton key={i} style={{ height: 90, flex: 1, minWidth: 0 }} />)}
            </div>
            <Skeleton style={{ height: 18, width: "35%" }} />
            <Skeleton style={{ height: 320, borderRadius: 14 }} />
            <Skeleton style={{ height: 18, width: "35%" }} />
            <Skeleton style={{ height: 200, borderRadius: 14 }} />
          </div>
        )}

        {/* Error */}
        {!loading && (error || !data) && (
          <div style={{
            textAlign: "center", paddingTop: 80,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
          }}>
            <div style={{ fontSize: 40 }}>😵</div>
            <p style={{ color: "#555", fontSize: 14, margin: 0 }}>Gagal memuat data live</p>
            <button
              onClick={() => { setLoading(true); fetchData(); }}
              style={{
                padding: "10px 24px", borderRadius: 10,
                background: "#DC1F2E", border: "none",
                color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Data */}
        {!loading && !error && data && (
          <div style={{ animation: "fadeIn 0.4s ease", display: "flex", flexDirection: "column", gap: 16, paddingTop: 16 }}>

            {/* ── Hero ── */}
            <div style={{
              position: "relative", borderRadius: 16, overflow: "hidden",
              height: 240, background: "#0a0a0a",
              animation: "heroFade 0.5s ease",
            }}>
              <img
                src={heroImage} alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }}
              />
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
              }} />

              {/* Excitement badge */}
              {data.live_info.viewers.is_excitement && (
                <div style={{
                  position: "absolute", top: 12, right: 12,
                  background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.35)",
                  backdropFilter: "blur(8px)",
                  padding: "4px 10px", borderRadius: 999,
                  display: "flex", alignItems: "center", gap: 5,
                  fontSize: 11, fontWeight: 700, color: "#F59E0B",
                }}>
                  🔥 Excitement
                </div>
              )}

              {/* Member info */}
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                padding: "16px 18px",
                display: "flex", alignItems: "flex-end", gap: 14,
              }}>
                <img
                  src={data.room_info.img_alt || data.room_info.img} alt=""
                  style={{
                    width: 64, height: 64, borderRadius: "50%", objectFit: "cover",
                    border: `2px solid ${typeColor}60`, background: "#111", flexShrink: 0,
                  }}
                  onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>
                    {data.room_info.fullname}
                  </div>
                  <div style={{ fontSize: 13, color: typeColor, fontWeight: 600, marginTop: 2 }}>
                    @{data.room_info.nickname}
                  </div>
                  {data.room_info.generation && (
                    <div style={{
                      display: "inline-block", marginTop: 5,
                      background: typeColor + "18", border: `1px solid ${typeColor}35`,
                      borderRadius: 5, padding: "2px 8px",
                      fontSize: 9, fontWeight: 800, color: typeColor, letterSpacing: "0.7px",
                      textTransform: "uppercase",
                    }}>
                      {data.room_info.generation.replace(/-/g, " ")}
                    </div>
                  )}
                </div>
                {data.room_info.is_graduate && (
                  <div style={{
                    background: "rgba(156,163,175,0.12)", border: "1px solid rgba(156,163,175,0.25)",
                    borderRadius: 6, padding: "3px 8px",
                    fontSize: 9, fontWeight: 800, color: "#9ca3af", letterSpacing: "0.5px",
                    flexShrink: 0,
                  }}>
                    GRAD
                  </div>
                )}
              </div>
            </div>

            {/* ── Info Card ── */}
            <div style={{
              background: "#0a0a0a", border: "1px solid #1a1a1a",
              borderRadius: 12, padding: "14px 16px",
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              {isIDN && data.idn?.title && (
                <div style={{
                  color: "#888", fontSize: 13, fontStyle: "italic",
                  lineHeight: 1.5, paddingBottom: 8, borderBottom: "1px solid #111",
                  marginBottom: 2,
                }}>
                  "{data.idn.title}"
                </div>
              )}
              {isShowroom && data.room_info.jikosokai && (
                <div style={{
                  color: "#666", fontSize: 12, lineHeight: 1.5,
                  paddingBottom: 8, borderBottom: "1px solid #111",
                }}>
                  {data.room_info.jikosokai}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#555" }}>
                <ClockIcon />
                <span style={{ fontSize: 12 }}>
                  {formatDate(data.live_info.date.start)} · {formatTime(data.live_info.date.start)} – {formatTime(data.live_info.date.end)}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#555" }}>
                <ClockIcon />
                <span style={{ fontSize: 12 }}>
                  Durasi: <strong style={{ color: "#888" }}>{formatDuration(data.live_info.duration)}</strong>
                </span>
              </div>
            </div>

            {/* ── Stats ── */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <StatCard icon={<EyeIcon />} label="Penonton" value={formatNum(data.live_info.viewers.num)} color="#22C55E" />
              <StatCard icon={<UsersIcon />} label="Aktif" value={formatNum(data.live_info.viewers.active)} color="#F59E0B" />
              <StatCard icon={<ChatIcon />} label="Komentar" value={formatNum(data.live_info.comments.num)} color="#A855F7" />
              <StatCard icon={<GiftIconSvg />} label="Total Gift" value={`${data.total_gifts}`} color="#DC1F2E" />
              <StatCard icon={<UsersIcon />} label="Pengirim" value={`${data.live_info.comments.users}`} color="#F97316" />
              <StatCard icon={<StarIcon />} label="Gift Rate" value={`${data.gift_rate}`} color="#22D3EE" />
            </div>

            {/* ── Gift List ── */}
            {data.live_info.gift.list?.length > 0 && (
              <div>
                <SectionHeader
                  icon={<GiftIconSvg />} title="Gift Diterima" color="#A855F7"
                  badge={
                    <span style={{ fontSize: 11, color: "#444" }}>
                      {data.live_info.gift.list.length} jenis
                    </span>
                  }
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {data.live_info.gift.list.map((g) => (
                    <GiftCard key={`gift-${g.id}`} g={g} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Top Gifters ── */}
            {sortedGifters.length > 0 && (
              <div>
                <SectionHeader icon={<GiftIconSvg />} title="Top Gifter" color="#DC1F2E" />
                <div style={{
                  background: "#0a0a0a", border: "1px solid #1a1a1a",
                  borderRadius: 14, overflow: "hidden",
                }}>
                  {sortedGifters.map(({ log, user }, i) => (
                    <GifterRow key={`gifter-${log.user_id}`} log={log} user={user} rank={i} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Top Fans (Showroom only) ── */}
            {isShowroom && topFans.length > 0 && (
              <div>
                <SectionHeader
                  icon={<TrophyIcon />} title="Top Fans" color="#F59E0B"
                  badge={
                    <div style={{
                      background: "rgba(233,66,125,0.1)", border: "1px solid rgba(233,66,125,0.2)",
                      borderRadius: 5, padding: "2px 8px",
                      fontSize: 9, fontWeight: 800, color: "#E9427D", letterSpacing: "0.5px",
                    }}>
                      SHOWROOM
                    </div>
                  }
                />
                <div style={{
                  background: "#0a0a0a", border: "1px solid #1a1a1a",
                  borderRadius: 14, overflow: "hidden",
                }}>
                  {topFans.map((fan, i) => (
                    <FanRow key={`fan-${fan.id}`} fan={fan} rank={i} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Screenshots ── */}
            <div>
              <SectionHeader
                icon={<ImageIcon />} title="Screenshot Live" color="#22D3EE"
                badge={
                  screenshots.length > 0
                    ? <span style={{ fontSize: 11, color: "#444" }}>{screenshots.length} foto</span>
                    : undefined
                }
              />
              {screenshots.length === 0 ? (
                <div style={{
                  background: "#0a0a0a", border: "1px solid #1a1a1a",
                  borderRadius: 14, padding: "36px 0",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                }}>
                  <div style={{ fontSize: 28, opacity: 0.3 }}>📷</div>
                  <span style={{ color: "#333", fontSize: 13, fontWeight: 700 }}>Tidak ada screenshot</span>
                  <span style={{ color: "#222", fontSize: 11 }}>Screenshot tidak tersedia untuk live ini</span>
                </div>
              ) : (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                  gap: 4,
                }}>
                  {screenshots.map((url, i) => (
                    <div
                      key={`ss-${i}`}
                      onClick={() => openLb(i)}
                      className="ss-img"
                      style={{
                        aspectRatio: "16/10",
                        borderRadius: 6, overflow: "hidden",
                        background: "#111", cursor: "pointer",
                      }}
                    >
                      <img
                        src={url} alt={`Screenshot ${i + 1}`}
                        loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lbOpen && (
        <Lightbox
          urls={screenshots}
          index={lbIndex}
          onClose={() => setLbOpen(false)}
          onPrev={() => setLbIndex(i => Math.max(0, i - 1))}
          onNext={() => setLbIndex(i => Math.min(screenshots.length - 1, i + 1))}
        />
      )}
    </div>
  );
};

export default RecentDetailPage;
