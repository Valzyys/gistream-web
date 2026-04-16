import { useEffect, useState } from "react";
import PageMeta from "../components/common/PageMeta";

// ── API ─────────────────────────────────────────────────────────────────────
const IDN_PLUS_API =
  "https://v2.jkt48connect.com/api/jkt48/idnplus?apikey=JKTCONNECT";
const THEATER_API =
  "https://v2.jkt48connect.com/api/jkt48/theater?apikey=JKTCONNECT";

const DEFAULT_IMG =
  "https://res.cloudinary.com/haymzm4wp/image/upload/v1760105848/bi5ej2hgh0cc2uowu5xr.jpg";

const ALLOWED_THEATER_TYPES = ["SHOW", "EVENT"];

// ── Icons ────────────────────────────────────────────────────────────────────
const CalendarIcon = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ClockIcon = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CoinIcon = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v12" />
    <path d="M15 9.5a3.5 3.5 0 0 0-6 0" />
    <path d="M9 14.5a3.5 3.5 0 0 0 6 0" />
  </svg>
);

const TheaterIcon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 10s3.5 4 10 4 10-4 10-4" />
    <path d="M2 10V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6" />
    <path d="M2 10v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V10" />
    <path d="M12 14v4" />
  </svg>
);

const CurtainIcon = () => (
  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.35">
    <path d="M2 4h20v2H2z" />
    <path d="M4 6c0 4 2 8 8 14" />
    <path d="M20 6c0 4-2 8-8 14" />
    <path d="M4 6v14" />
    <path d="M20 6v14" />
  </svg>
);

// ── Types ────────────────────────────────────────────────────────────────────
interface NormalizedShow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  scheduledAt: number | null;
  image: string;
  creator: string;
  type: string | null;
  referenceCode: string | null;
  isBirthday: boolean;
  birthdayMembers: any[];
  source: "idn" | "theater";
  price?: number;
  currency?: string;
  showId?: string;
}

// ── Normalize ────────────────────────────────────────────────────────────────
function normalizeShow(show: any, src: "idn" | "theater"): NormalizedShow {
  if (src === "idn") {
    return {
      id: show.slug || `idn-${show.id}`,
      title: show.title,
      description: show.idnliveplus?.description || null,
      status: show.status,
      scheduledAt: show.scheduled_at ? show.scheduled_at * 1000 : null,
      image: show.image_url || DEFAULT_IMG,
      creator: show.creator?.name || "JKT48",
      type: null,
      referenceCode: null,
      isBirthday: false,
      birthdayMembers: [],
      source: "idn",
      price: show.idnliveplus?.liveroom_price,
      currency: show.idnliveplus?.currency_code,
      showId: show.showId,
    };
  }

  let scheduledAt: number | null = null;
  if (show.date && show.start_time) {
    const datePart = show.date.split("T")[0];
    scheduledAt = new Date(`${datePart}T${show.start_time}+07:00`).getTime();
  } else if (show.date) {
    scheduledAt = new Date(show.date).getTime();
  }

  const isPast = scheduledAt ? scheduledAt < Date.now() : false;

  return {
    id: show.link || `theater-${show.schedule_id}`,
    title: show.title,
    description: show.short_description || null,
    status: isPast ? "past" : "scheduled",
    scheduledAt,
    image: show.poster || show.banner || DEFAULT_IMG,
    creator: "JKT48",
    type: show.type || "SHOW",
    referenceCode: show.reference_code || null,
    isBirthday: show.is_birthday_show || false,
    birthdayMembers: show.birthday_members || [],
    source: "theater",
  };
}

// ── Countdown Hook ───────────────────────────────────────────────────────────
function useCountdown(target: number | null, active: boolean) {
  const [cd, setCd] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });

  useEffect(() => {
    if (!target || !active) return;
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setCd({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        mins: Math.floor((diff / (1000 * 60)) % 60),
        secs: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [target, active]);

  return cd;
}

// ── Show Card ────────────────────────────────────────────────────────────────
const typeLabelColor: Record<string, { bg: string; color: string }> = {
  SHOW: { bg: "rgba(220,31,46,0.15)", color: "#DC1F2E" },
  EVENT: { bg: "rgba(255,215,0,0.15)", color: "#FFD700" },
};

function ShowCard({ show }: { show: NormalizedShow }) {
  const isLive = show.status === "live";
  const showCountdown =
    !!show.scheduledAt && !isLive && show.scheduledAt > Date.now();
  const cd = useCountdown(show.scheduledAt, showCountdown);

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }) + " WIB";

  return (
    <div className="show-grid-card">
      {/* Poster */}
      <div className="show-grid-poster">
        <img
          src={show.image}
          alt={show.title}
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_IMG;
          }}
        />
        <div
          className={`next-show-status-badge ${isLive ? "live" : "scheduled"}`}
        >
          <span className="status-dot" />
          {isLive ? "LIVE" : "SCHEDULED"}
        </div>

        {/* Show ID badge */}
        {show.showId && (
          <span
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
              color: "rgba(255,255,255,0.9)",
              fontSize: 10,
              fontFamily: "monospace",
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 6,
            }}
          >
            {show.showId}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="show-grid-info">
        <h3 className="show-grid-title">{show.title}</h3>

        {/* Type badge (theater) */}
        {show.source === "theater" && show.type && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.04em",
              padding: "2px 8px",
              borderRadius: 999,
              background:
                typeLabelColor[show.type]?.bg || "rgba(255,255,255,0.1)",
              color:
                typeLabelColor[show.type]?.color || "rgba(255,255,255,0.7)",
              display: "inline-block",
              marginBottom: 6,
            }}
          >
            {show.type}
            {show.referenceCode ? ` · ${show.referenceCode}` : ""}
          </span>
        )}

        {/* Price badge (idn) */}
        {show.source === "idn" && show.price !== undefined && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 999,
              background: "rgba(255,215,0,0.15)",
              color: "#FFD700",
              marginBottom: 6,
            }}
          >
            <CoinIcon size={11} color="#FFD700" />
            {show.price} {show.currency?.toUpperCase()}
          </span>
        )}

        {/* Birthday members */}
        {show.isBirthday && show.birthdayMembers?.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 4,
              flexWrap: "wrap",
              marginBottom: 6,
            }}
          >
            {show.birthdayMembers.map((m: any) => (
              <div
                key={m.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "rgba(255,255,255,0.07)",
                  borderRadius: 999,
                  padding: "2px 8px 2px 2px",
                  fontSize: 11,
                }}
              >
                <img
                  src={m.img_alt || m.img}
                  alt={m.name}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <span style={{ color: "rgba(255,255,255,0.85)" }}>
                  🎂 {m.name}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Countdown */}
        {showCountdown && (
          <div className="show-grid-countdown">
            {[
              { val: cd.days, label: "H" },
              { val: cd.hours, label: "J" },
              { val: cd.mins, label: "M" },
              { val: cd.secs, label: "D" },
            ].map((u, i) => (
              <div
                key={u.label}
                style={{ display: "flex", alignItems: "center" }}
              >
                {i > 0 && (
                  <span
                    className="countdown-separator"
                    style={{ fontSize: 14, padding: "0 1px" }}
                  >
                    :
                  </span>
                )}
                <div className="show-grid-countdown-unit">
                  <div className="show-grid-countdown-value">
                    {String(u.val).padStart(2, "0")}
                  </div>
                  <span className="show-grid-countdown-label">{u.label}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Meta */}
        <div className="show-grid-meta">
          {show.scheduledAt && (
            <div className="show-grid-meta-row">
              <CalendarIcon size={12} color="rgba(255,255,255,0.4)" />
              <span>{formatDate(show.scheduledAt)}</span>
            </div>
          )}
          {show.scheduledAt && (
            <div className="show-grid-meta-row">
              <ClockIcon size={12} color="rgba(255,255,255,0.4)" />
              <span>{formatTime(show.scheduledAt)}</span>
            </div>
          )}
          {show.description && (
            <div
              className="show-grid-meta-row"
              style={{ marginTop: 4, opacity: 0.6, fontSize: 11 }}
            >
              <span style={{ whiteSpace: "pre-line" }}>{show.description}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Filter Tabs ──────────────────────────────────────────────────────────────
type FilterType = "all" | "idn" | "theater";

const filterTabs: { key: FilterType; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "idn", label: "IDN Live Plus" },
  { key: "theater", label: "Theater" },
];

// ── Main Page ────────────────────────────────────────────────────────────────
const ShowSchedulePage: React.FC = () => {
  const [shows, setShows] = useState<NormalizedShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [source, setSource] = useState<"idn" | "theater" | "both">("both");

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const result: NormalizedShow[] = [];

      // ── IDN Plus ──
      try {
        const res = await fetch(IDN_PLUS_API);
        const json = await res.json();
        if (json.status === 200 && Array.isArray(json.data)) {
          const idnShows = json.data
            .filter((s: any) => {
              const name = (s.creator?.name || "").toLowerCase();
              return name.includes("jkt48") || name.includes("jkt 48");
            })
            .map((s: any) => normalizeShow(s, "idn"));
          result.push(...idnShows);
        }
      } catch (e) {
        console.error("Error fetching IDN Plus:", e);
      }

      // ── Theater ──
      try {
        const res = await fetch(THEATER_API);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const idnIds = new Set(result.map((s) => s.id));
          const theaterShows = json.data
            .filter((s: any) =>
              ALLOWED_THEATER_TYPES.includes((s.type || "").toUpperCase())
            )
            .map((s: any) => normalizeShow(s, "theater"))
            .filter(
              (s: NormalizedShow) =>
                s.status !== "past" && !idnIds.has(s.id)
            );
          result.push(...theaterShows);
        }
      } catch (e) {
        console.error("Error fetching Theater:", e);
      }

      // Sort by scheduledAt ascending
      result.sort((a, b) => {
        if (!a.scheduledAt) return 1;
        if (!b.scheduledAt) return -1;
        return a.scheduledAt - b.scheduledAt;
      });

      const hasIdn = result.some((s) => s.source === "idn");
      const hasTheater = result.some((s) => s.source === "theater");
      setSource(
        hasIdn && hasTheater ? "both" : hasIdn ? "idn" : "theater"
      );
      setShows(result);
      setLoading(false);
    };

    fetchAll();
  }, []);

  const filtered =
    filter === "all"
      ? shows
      : shows.filter((s) => s.source === filter);

  const liveCount = filtered.filter((s) => s.status === "live").length;
  const scheduledCount = filtered.filter(
    (s) => s.status === "scheduled"
  ).length;

  return (
    <>
      <PageMeta
        title="Jadwal Show JKT48 | GiStream"
        description="Jadwal show JKT48 dari IDN Live Plus dan Theater — GiStream"
      />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">
        {/* ── Page Header ── */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Title */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex-shrink-0">
                <TheaterIcon size={20} color="#465FFF" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800 dark:text-white">
                  Jadwal Show JKT48
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {source === "both"
                    ? "IDN Live Plus & Theater"
                    : source === "idn"
                    ? "IDN Live Plus"
                    : "JKT48 Theater"}
                </p>
              </div>
            </div>

            {/* Stats badges */}
            {!loading && shows.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {liveCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border border-red-100 dark:border-red-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    {liveCount} LIVE
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 border border-brand-100 dark:border-brand-500/20">
                  <CalendarIcon size={11} color="currentColor" />
                  {scheduledCount} Scheduled
                </span>
              </div>
            )}
          </div>

          {/* ── Filter Tabs ── */}
          <div className="flex items-center gap-1 mt-4 p-1 rounded-xl bg-gray-100 dark:bg-white/[0.04] w-fit">
            {filterTabs.map((tab) => {
              const count =
                tab.key === "all"
                  ? shows.length
                  : shows.filter((s) => s.source === tab.key).length;

              return (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filter === tab.key
                      ? "bg-white dark:bg-white/10 text-gray-800 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  {tab.label}
                  {!loading && count > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        filter === tab.key
                          ? "bg-brand-500 text-white"
                          : "bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="p-6">
          {loading ? (
            /* Skeleton loading */
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400 dark:text-gray-500">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Memuat jadwal show...</p>
            </div>
          ) : filtered.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400 dark:text-gray-500">
              <CurtainIcon />
              <div className="text-center">
                <h3 className="text-base font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Belum Ada Jadwal Show
                </h3>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  {filter !== "all"
                    ? `Tidak ada show dari ${
                        filter === "idn" ? "IDN Live Plus" : "Theater"
                      } saat ini.`
                    : "Jadwal show akan muncul di sini saat tersedia."}
                </p>
              </div>
              {filter !== "all" && (
                <button
                  onClick={() => setFilter("all")}
                  className="mt-2 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors"
                >
                  Lihat Semua
                </button>
              )}
            </div>
          ) : (
            /* Show grid */
            <div className="upcoming-shows-grid">
              {filtered.map((show) => (
                <ShowCard key={show.id} show={show} />
              ))}
            </div>
          )}
        </div>

        {/* ── Footer info ── */}
        {!loading && filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Menampilkan {filtered.length} show
            </p>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Live
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                <span className="w-2 h-2 rounded-full bg-brand-500" />
                Scheduled
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ShowSchedulePage;
//
