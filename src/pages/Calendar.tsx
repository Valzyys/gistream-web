import { useEffect, useState } from "react";
import PageMeta from "../components/common/PageMeta";

// ── API ──────────────────────────────────────────────────────────────────────
const IDN_PLUS_API =
  "https://v2.jkt48connect.com/api/jkt48/idnplus?apikey=JKTCONNECT";
const THEATER_API =
  "https://v2.jkt48connect.com/api/jkt48/theater?apikey=JKTCONNECT";

const DEFAULT_IMG =
  "https://res.cloudinary.com/haymzm4wp/image/upload/v1760105848/bi5ej2hgh0cc2uowu5xr.jpg";

const ALLOWED_THEATER_TYPES = ["SHOW", "EVENT"];

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

type FilterType = "all" | "live" | "scheduled";

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
    <div
      style={{
        background: "var(--card-bg, #fff)",
        border: "1px solid var(--card-border, #e5e7eb)",
        borderRadius: 16,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow 0.2s, transform 0.2s",
        cursor: "default",
      }}
      className="show-schedule-card dark:bg-white/[0.03] dark:border-gray-800"
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 8px 24px rgba(0,0,0,0.10)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {/* ── Poster ── */}
      <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", overflow: "hidden", background: "#f3f4f6" }}>
        <img
          src={show.image}
          alt={show.title}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_IMG;
          }}
        />

        {/* Gradient overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)",
        }} />

        {/* Status badge */}
        <div style={{
          position: "absolute", top: 10, left: 10,
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "4px 10px",
          borderRadius: 999,
          fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
          background: isLive ? "#DC1F2E" : "#465FFF",
          color: "#fff",
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%", background: "#fff",
            ...(isLive ? { animation: "pulse 1.5s infinite" } : {}),
          }} />
          {isLive ? "LIVE" : "SCHEDULED"}
        </div>

        {/* Source badge */}
        <div style={{
          position: "absolute", top: 10, right: 10,
          padding: "3px 8px",
          borderRadius: 6,
          fontSize: 10, fontWeight: 700,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          color: "rgba(255,255,255,0.9)",
        }}>
          {show.source === "idn" ? "IDN Live+" : "Theater"}
        </div>

        {/* Show ID */}
        {show.showId && (
          <div style={{
            position: "absolute", bottom: 8, right: 8,
            padding: "2px 7px",
            borderRadius: 6,
            fontSize: 10, fontFamily: "monospace", fontWeight: 700,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(4px)",
            color: "rgba(255,255,255,0.9)",
          }}>
            {show.showId}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>

        {/* Title */}
        <h3 style={{
          margin: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.4,
          color: "var(--title-color, #111827)",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
          className="dark:text-white"
        >
          {show.title}
        </h3>

        {/* Badges row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {/* Type badge (theater) */}
          {show.source === "theater" && show.type && (
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
              padding: "3px 9px", borderRadius: 999,
              background: show.type === "EVENT"
                ? "rgba(255,215,0,0.12)"
                : "rgba(220,31,46,0.12)",
              color: show.type === "EVENT" ? "#b45309" : "#DC1F2E",
              border: `1px solid ${show.type === "EVENT" ? "rgba(255,215,0,0.3)" : "rgba(220,31,46,0.25)"}`,
            }}
              className={show.type === "EVENT" ? "dark:text-yellow-400" : "dark:text-red-400"}
            >
              {show.type}
              {show.referenceCode ? ` · ${show.referenceCode}` : ""}
            </span>
          )}

          {/* Price badge (idn) */}
          {/* Price badge (idn) */}
{show.source === "idn" && show.price !== undefined && (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    fontSize: 10, fontWeight: 700,
    padding: "3px 9px", borderRadius: 999,
    background: "rgba(255,215,0,0.12)",
    color: "#92400e",
    border: "1px solid rgba(255,215,0,0.3)",
  }}
    className="dark:text-yellow-400"
  >
    🎟️ Rp 7.000
  </span>
)}
        </div>

        {/* Birthday members */}
        {show.isBirthday && show.birthdayMembers?.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {show.birthdayMembers.map((m: any) => (
              <div key={m.name} style={{
                display: "flex", alignItems: "center", gap: 4,
                background: "rgba(236,72,153,0.08)",
                border: "1px solid rgba(236,72,153,0.2)",
                borderRadius: 999, padding: "2px 8px 2px 3px",
                fontSize: 11,
              }}>
                <img
                  src={m.img_alt || m.img}
                  alt={m.name}
                  style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <span style={{ color: "#be185d" }} className="dark:text-pink-400">
                  🎂 {m.name}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Countdown */}
        {showCountdown && (
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "8px 10px",
            borderRadius: 10,
            background: "rgba(70,95,255,0.06)",
            border: "1px solid rgba(70,95,255,0.12)",
          }}>
            {[
              { val: cd.days, label: "Hari" },
              { val: cd.hours, label: "Jam" },
              { val: cd.mins, label: "Mnt" },
              { val: cd.secs, label: "Dtk" },
            ].map((u, i) => (
              <div key={u.label} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                {i > 0 && (
                  <span style={{
                    fontSize: 16, fontWeight: 700,
                    color: "rgba(70,95,255,0.4)",
                    marginRight: 4,
                  }}>:</span>
                )}
                <div style={{ textAlign: "center", flex: 1 }}>
                  <div style={{
                    fontSize: 18, fontWeight: 800, lineHeight: 1,
                    color: "#465FFF",
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {String(u.val).padStart(2, "0")}
                  </div>
                  <div style={{
                    fontSize: 9, fontWeight: 600, marginTop: 2,
                    color: "rgba(70,95,255,0.6)",
                    textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>
                    {u.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

                {/* Meta info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: "auto" }}>
          {show.scheduledAt && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span style={{ fontSize: 12, color: "#6b7280" }} className="dark:text-gray-400">
                {formatDate(show.scheduledAt)}
              </span>
            </div>
          )}

          {show.scheduledAt && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span style={{ fontSize: 12, color: "#6b7280" }} className="dark:text-gray-400">
                {formatTime(show.scheduledAt)}
              </span>
            </div>
          )}

          {show.description && (
            <div style={{
              marginTop: 4,
              padding: "8px 10px",
              borderRadius: 8,
              background: "rgba(0,0,0,0.03)",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
              className="dark:bg-white/[0.03] dark:border-white/[0.06]"
            >
              <p style={{
                margin: 0, fontSize: 11, lineHeight: 1.6,
                color: "#6b7280", whiteSpace: "pre-line",
              }}
                className="dark:text-gray-400"
              >
                {show.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Filter Tabs ──────────────────────────────────────────────────────────────
const filterTabs: { key: FilterType; label: string; icon: string }[] = [
  { key: "all", label: "Semua", icon: "" },
  { key: "live", label: "Live", icon: "" },
  { key: "scheduled", label: "Scheduled", icon: "" },
];

// ── Main Page ────────────────────────────────────────────────────────────────
const ShowSchedulePage: React.FC = () => {
  const [shows, setShows] = useState<NormalizedShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [dataSource, setDataSource] = useState<"idn" | "theater" | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      // ── Prioritas 1: IDN Plus ──────────────────────────────────────────────
      try {
        const res = await fetch(IDN_PLUS_API);
        const json = await res.json();

        if (json.status === 200 && Array.isArray(json.data) && json.data.length > 0) {
          const idnShows = json.data
            .filter((s: any) => {
              const name = (s.creator?.name || "").toLowerCase();
              return name.includes("jkt48") || name.includes("jkt 48");
            })
            .map((s: any) => normalizeShow(s, "idn"))
            .sort((a: NormalizedShow, b: NormalizedShow) => {
              if (!a.scheduledAt) return 1;
              if (!b.scheduledAt) return -1;
              return a.scheduledAt - b.scheduledAt;
            });

          if (idnShows.length > 0) {
            setShows(idnShows);
            setDataSource("idn");
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error("Error fetching IDN Plus:", e);
      }

      // ── Fallback: Theater ──────────────────────────────────────────────────
      try {
        const res = await fetch(THEATER_API);
        const json = await res.json();

        if (json.success && Array.isArray(json.data)) {
          const theaterShows = json.data
            .filter((s: any) =>
              ALLOWED_THEATER_TYPES.includes((s.type || "").toUpperCase())
            )
            .map((s: any) => normalizeShow(s, "theater"))
            .filter((s: NormalizedShow) => s.status !== "past")
            .sort((a: NormalizedShow, b: NormalizedShow) => {
              if (!a.scheduledAt) return 1;
              if (!b.scheduledAt) return -1;
              return a.scheduledAt - b.scheduledAt;
            });

          setShows(theaterShows);
          setDataSource("theater");
        }
      } catch (e) {
        console.error("Error fetching Theater:", e);
      }

      setLoading(false);
    };

    fetchAll();
  }, []);

  const filtered =
    filter === "all"
      ? shows
      : shows.filter((s) => s.status === filter);

  const liveCount = shows.filter((s) => s.status === "live").length;
  const scheduledCount = shows.filter((s) => s.status === "scheduled").length;

  return (
    <>
      <PageMeta
        title="Jadwal Show JKT48 | GiStream"
        description="Jadwal show JKT48 dari IDN Live Plus dan Theater — GiStream"
      />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">

        {/* ── Page Header ── */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

            {/* Title */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: "rgba(70,95,255,0.08)",
                border: "1px solid rgba(70,95,255,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="#465FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 10s3.5 4 10 4 10-4 10-4" />
                  <path d="M2 10V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6" />
                  <path d="M2 10v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V10" />
                  <path d="M12 14v4" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800 dark:text-white" style={{ margin: 0 }}>
                  Jadwal Show JKT48
                </h1>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    padding: "2px 8px", borderRadius: 999,
                    background: dataSource === "idn"
                      ? "rgba(70,95,255,0.08)"
                      : "rgba(220,31,46,0.08)",
                    color: dataSource === "idn" ? "#465FFF" : "#DC1F2E",
                    border: `1px solid ${dataSource === "idn"
                      ? "rgba(70,95,255,0.2)"
                      : "rgba(220,31,46,0.2)"}`,
                  }}>
                    {dataSource === "idn"
                      ? "IDN Live Plus"
                      : dataSource === "theater"
                      ? "Theater (Fallback)"
                      : "Memuat..."}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            {!loading && shows.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {liveCount > 0 && (
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "5px 12px", borderRadius: 999,
                    background: "rgba(220,31,46,0.08)",
                    border: "1px solid rgba(220,31,46,0.2)",
                  }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: "#DC1F2E",
                      animation: "pulse 1.5s infinite",
                    }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#DC1F2E" }}>
                      {liveCount} LIVE
                    </span>
                  </div>
                )}
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 12px", borderRadius: 999,
                  background: "rgba(70,95,255,0.08)",
                  border: "1px solid rgba(70,95,255,0.2)",
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="#465FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#465FFF" }}>
                    {scheduledCount} Scheduled
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Filter Tabs ── */}
          <div style={{
            display: "flex", gap: 4, marginTop: 16,
            padding: 4, borderRadius: 12,
            background: "rgba(0,0,0,0.04)",
            width: "fit-content",
          }}
            className="dark:bg-white/[0.04]"
          >
            {filterTabs.map((tab) => {
              const count =
                tab.key === "all"
                  ? shows.length
                  : shows.filter((s) => s.status === tab.key).length;
              const isActive = filter === tab.key;

              return (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 14px", borderRadius: 8,
                    fontSize: 12, fontWeight: 600,
                    border: "none", cursor: "pointer",
                    transition: "all 0.15s",
                    background: isActive ? "#fff" : "transparent",
                    color: isActive ? "#111827" : "#6b7280",
                    boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                  }}
                  className={isActive
                    ? "dark:bg-white/10 dark:text-white"
                    : "dark:text-gray-400 dark:hover:text-gray-300"
                  }
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                  {!loading && count > 0 && (
                    <span style={{
                      padding: "1px 7px", borderRadius: 999,
                      fontSize: 10, fontWeight: 700,
                      background: isActive ? "#465FFF" : "rgba(0,0,0,0.08)",
                      color: isActive ? "#fff" : "#6b7280",
                    }}
                      className={!isActive ? "dark:bg-white/10 dark:text-gray-400" : ""}
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
        <div style={{ padding: 24 }}>
          {loading ? (
            /* Loading */
            <div style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 12, padding: "64px 0",
            }}>
              <div style={{
                width: 36, height: 36,
                border: "3px solid rgba(70,95,255,0.15)",
                borderTop: "3px solid #465FFF",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }} />
              <p style={{ margin: 0, fontSize: 14, color: "#9ca3af" }}>
                Memuat jadwal show...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            /* Empty */
            <div style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 12, padding: "64px 0", textAlign: "center",
            }}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
                stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 4h20v2H2z" />
                <path d="M4 6c0 4 2 8 8 14" />
                <path d="M20 6c0 4-2 8-8 14" />
                <path d="M4 6v14" />
                <path d="M20 6v14" />
              </svg>
              <div>
                <h3 style={{
                  margin: "0 0 6px",
                  fontSize: 16, fontWeight: 700,
                  color: "#374151",
                }}
                  className="dark:text-gray-300"
                >
                  Belum Ada Jadwal Show
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>
                  {filter !== "all"
                    ? `Tidak ada show dengan status "${filter}" saat ini.`
                    : "Jadwal show akan muncul di sini saat tersedia."}
                </p>
              </div>
              {filter !== "all" && (
                <button
                  onClick={() => setFilter("all")}
                  style={{
                    marginTop: 4,
                    padding: "8px 20px",
                    borderRadius: 10,
                    border: "none",
                    background: "#465FFF",
                    color: "#fff",
                    fontSize: 13, fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Lihat Semua Show
                </button>
              )}
            </div>
          ) : (
            /* Grid */
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
            }}>
              {filtered.map((show) => (
                <ShowCard key={show.id} show={show} />
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {!loading && filtered.length > 0 && (
          <div style={{
            padding: "12px 24px",
            borderTop: "1px solid",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
            className="border-gray-100 dark:border-gray-800"
          >
            <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
              Menampilkan{" "}
              <strong style={{ color: "#6b7280" }} className="dark:text-gray-300">
                {filtered.length}
              </strong>{" "}
              show
              {dataSource === "theater" && (
                <span style={{
                  marginLeft: 8,
                  fontSize: 11, fontWeight: 600,
                  padding: "2px 8px", borderRadius: 999,
                  background: "rgba(245,158,11,0.1)",
                  color: "#d97706",
                  border: "1px solid rgba(245,158,11,0.2)",
                }}>
                  ⚠️ Menggunakan data Theater (IDN tidak tersedia)
                </span>
              )}
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#9ca3af" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#DC1F2E", display: "inline-block" }} />
                Live
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#9ca3af" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#465FFF", display: "inline-block" }} />
                Scheduled
              </span>
            </div>
          </div>
        )}

        {/* ── Keyframes ── */}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(0.85); }
          }
          .show-schedule-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.10);
          }
        `}</style>
      </div>
    </>
  );
};

export default ShowSchedulePage;
