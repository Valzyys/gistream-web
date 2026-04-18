import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../components/common/PageMeta";

// ── API ───────────────────────────────────────────────────────────────────────
const SHOWS_API = "https://asset.gstreamlive.com/shows";

const DEFAULT_IMG =
  "https://res.cloudinary.com/haymzm4wp/image/upload/v1760105848/bi5ej2hgh0cc2uowu5xr.jpg";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ReplayShow {
  id:        string;
  title:     string;
  image_url: string | null;
  lineup:    string[];
  url:       string;
}

// ── Replay Card ───────────────────────────────────────────────────────────────
function ReplayCard({ show }: { show: ReplayShow }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  const visibleLineup = show.lineup.slice(0, 6);
  const extraCount    = show.lineup.length - visibleLineup.length;

  return (
    <div
      onClick={() => navigate(`/replay/${show.id}`)}
      style={{
        background:    "#fff",
        border:        `1px solid ${hovered ? "rgba(220,31,46,0.35)" : "#e5e7eb"}`,
        borderRadius:  16,
        overflow:      "hidden",
        display:       "flex",
        flexDirection: "column",
        transition:    "all 0.22s",
        transform:     hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow:     hovered
          ? "0 14px 36px rgba(220,31,46,0.13)"
          : "0 1px 4px rgba(0,0,0,0.06)",
        cursor:        "pointer",
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
        flexShrink:  0,
      }}>
        <img
          src={show.image_url || DEFAULT_IMG}
          alt={show.title}
          style={{
            width:      "100%",
            height:     "100%",
            objectFit:  "cover",
            display:    "block",
            transition: "transform 0.35s",
            transform:  hovered ? "scale(1.05)" : "scale(1)",
          }}
          onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }}
        />

        {/* Gradient overlay */}
        <div style={{
          position:   "absolute",
          inset:      0,
          background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)",
        }} />

        {/* Play overlay on hover */}
        <div style={{
          position:       "absolute",
          inset:          0,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          opacity:        hovered ? 1 : 0,
          transition:     "opacity 0.22s",
          background:     "rgba(0,0,0,0.25)",
        }}>
          <div style={{
            width:          52,
            height:         52,
            borderRadius:   "50%",
            background:     "rgba(220,31,46,0.9)",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            boxShadow:      "0 4px 20px rgba(220,31,46,0.5)",
            transform:      hovered ? "scale(1)" : "scale(0.8)",
            transition:     "transform 0.22s",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        </div>

        {/* REPLAY badge */}
        <div style={{
          position:       "absolute",
          top:            10,
          left:           10,
          display:        "inline-flex",
          alignItems:     "center",
          gap:            5,
          padding:        "4px 10px",
          borderRadius:   999,
          fontSize:       10,
          fontWeight:     700,
          letterSpacing:  "0.07em",
          background:     "rgba(0,0,0,0.65)",
          backdropFilter: "blur(6px)",
          color:          "#fff",
          border:         "1px solid rgba(255,255,255,0.12)",
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          REPLAY
        </div>

        {/* ID badge */}
        <div style={{
          position:       "absolute",
          top:            10,
          right:          10,
          padding:        "3px 8px",
          borderRadius:   6,
          fontSize:       10,
          fontWeight:     700,
          fontFamily:     "monospace",
          background:     "rgba(0,0,0,0.55)",
          backdropFilter: "blur(6px)",
          color:          "rgba(255,255,255,0.7)",
          border:         "1px solid rgba(255,255,255,0.1)",
        }}>
          {show.id}
        </div>

        {/* Member count */}
        {show.lineup.length > 0 && (
          <div style={{
            position:       "absolute",
            bottom:         10,
            right:          10,
            display:        "inline-flex",
            alignItems:     "center",
            gap:            4,
            padding:        "3px 8px",
            borderRadius:   999,
            fontSize:       10,
            fontWeight:     600,
            background:     "rgba(0,0,0,0.6)",
            backdropFilter: "blur(6px)",
            color:          "rgba(255,255,255,0.85)",
          }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {show.lineup.length} Member
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{
        padding:       "14px 16px 16px",
        display:       "flex",
        flexDirection: "column",
        gap:           10,
        flex:          1,
      }}>
        {/* Title */}
        <h3 style={{
          margin:          0,
          fontSize:        14,
          fontWeight:      700,
          lineHeight:      1.45,
          color:           "#111827",
          display:         "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow:        "hidden",
        }} className="dark:text-white">
          {show.title}
        </h3>

        {/* Lineup pills */}
        {show.lineup.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 2 }}>
            {visibleLineup.map((name) => (
              <span key={name} style={{
                fontSize:     10,
                fontWeight:   600,
                padding:      "3px 8px",
                borderRadius: 999,
                background:   "rgba(220,31,46,0.07)",
                color:        "#DC1F2E",
                border:       "1px solid rgba(220,31,46,0.15)",
                whiteSpace:   "nowrap",
              }}>
                {name}
              </span>
            ))}
            {extraCount > 0 && (
              <span style={{
                fontSize:     10,
                fontWeight:   600,
                padding:      "3px 8px",
                borderRadius: 999,
                background:   "rgba(0,0,0,0.04)",
                color:        "#9ca3af",
                border:       "1px solid rgba(0,0,0,0.08)",
              }} className="dark:bg-white/[0.04] dark:text-gray-500 dark:border-white/[0.08]">
                +{extraCount} lainnya
              </span>
            )}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 11, color: "#d1d5db", fontStyle: "italic" }}
            className="dark:text-gray-600">
            Lineup belum tersedia
          </p>
        )}

        {/* Watch button */}
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/replay/${show.id}`); }}
          style={{
            marginTop:      "auto",
            padding:        "10px 0",
            borderRadius:   10,
            border:         "none",
            background:     hovered
              ? "linear-gradient(135deg, #DC1F2E, #ff4757)"
              : "rgba(220,31,46,0.08)",
            color:          hovered ? "#fff" : "#DC1F2E",
            fontSize:       13,
            fontWeight:     700,
            cursor:         "pointer",
            transition:     "all 0.22s",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            gap:            6,
            boxShadow:      hovered ? "0 4px 16px rgba(220,31,46,0.35)" : "none",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          Tonton Replay
        </button>
      </div>
    </div>
  );
}

// ── Skeleton Card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background:   "#fff",
      border:       "1px solid #e5e7eb",
      borderRadius: 16,
      overflow:     "hidden",
    }} className="dark:bg-white/[0.03] dark:border-gray-800">
      <div style={{
        width: "100%", aspectRatio: "16/9",
        background: "linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)",
        backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
      }} />
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{
          height: 14, width: "80%", borderRadius: 6,
          background: "linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)",
          backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
        }} />
        <div style={{
          height: 14, width: "55%", borderRadius: 6,
          background: "linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)",
          backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite 0.1s",
        }} />
        <div style={{ display: "flex", gap: 5, marginTop: 4 }}>
          {[60, 50, 70, 45].map((w, i) => (
            <div key={i} style={{
              height: 22, width: w, borderRadius: 999,
              background: "linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)",
              backgroundSize: "200% 100%", animation: `shimmer 1.4s infinite ${i * 0.07}s`,
            }} />
          ))}
        </div>
        <div style={{
          height: 38, borderRadius: 10, marginTop: 4,
          background: "linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)",
          backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite 0.2s",
        }} />
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{
      gridColumn:     "1 / -1",
      display:        "flex",
      flexDirection:  "column",
      alignItems:     "center",
      justifyContent: "center",
      gap:            12,
      padding:        "60px 0",
      textAlign:      "center",
    }}>
      <div style={{
        width:          56,
        height:         56,
        borderRadius:   16,
        background:     "rgba(220,31,46,0.06)",
        border:         "1px solid rgba(220,31,46,0.12)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
      }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
          stroke="#DC1F2E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ opacity: 0.5 }}>
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#374151" }}
          className="dark:text-gray-300">
          Belum ada replay tersedia
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9ca3af" }}>
          Replay show theater akan muncul di sini setelah selesai
        </p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const ReplayPage: React.FC = () => {
  const [shows,       setShows]       = useState<ReplayShow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [search,      setSearch]      = useState("");

  const fetchShows = async () => {
    try {
      setError(null);
      const res  = await fetch(SHOWS_API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ReplayShow[] = await res.json();
      setShows(json);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShows();
  }, []);

  const filtered = shows.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.lineup.some((m) => m.toLowerCase().includes(q))
    );
  });

  return (
    <>
      <PageMeta
        title="Replay Theater | JKT48Connect"
        description="Tonton kembali show theater JKT48"
      />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">

        {/* ── Header ── */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>

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
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800 dark:text-white" style={{ margin: 0 }}>
                  Replay Theater
                </h1>
                <p style={{ margin: 0, fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                  {loading ? "Memuat..." : `${shows.length} show tersedia`}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {/* Search */}
              <div style={{ position: "relative" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Cari judul / member..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    paddingLeft:   34,
                    paddingRight:  12,
                    paddingTop:    7,
                    paddingBottom: 7,
                    borderRadius:  8,
                    border:        "1px solid #e5e7eb",
                    background:    "#fff",
                    color:         "#111827",
                    fontSize:      12,
                    outline:       "none",
                    width:         200,
                  }}
                  className="dark:bg-white/[0.04] dark:border-gray-700 dark:text-white dark:placeholder-gray-500"
                />
              </div>

              {lastUpdated && (
                <span style={{ fontSize: 11, color: "#9ca3af" }}>
                  Update: {lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}

              <button
                onClick={() => { setLoading(true); fetchShows(); }}
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

          {search && !loading && (
            <p style={{ margin: "12px 0 0", fontSize: 12, color: "#9ca3af" }}>
              Menampilkan{" "}
              <strong style={{ color: "#374151" }} className="dark:text-gray-200">
                {filtered.length}
              </strong>{" "}
              hasil untuk "{search}"
            </p>
          )}
        </div>

        {/* ── Content ── */}
        <div style={{ padding: 24 }}>
          {error ? (
            <div style={{
              display:        "flex",
              flexDirection:  "column",
              alignItems:     "center",
              gap:            10,
              padding:        "40px 0",
              textAlign:      "center",
            }}>
              <div style={{
                width:          48,
                height:         48,
                borderRadius:   12,
                background:     "rgba(220,31,46,0.08)",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="#DC1F2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#374151" }}
                  className="dark:text-gray-300">
                  Gagal memuat data
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9ca3af" }}>{error}</p>
              </div>
              <button
                onClick={() => { setLoading(true); fetchShows(); }}
                style={{
                  marginTop:    4,
                  padding:      "8px 18px",
                  borderRadius: 8,
                  border:       "none",
                  background:   "rgba(220,31,46,0.1)",
                  color:        "#DC1F2E",
                  fontSize:     12,
                  fontWeight:   700,
                  cursor:       "pointer",
                }}
              >
                Coba Lagi
              </button>
            </div>
          ) : (
            <div style={{
              display:             "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
              gap:                 16,
            }}>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                : filtered.length === 0
                  ? <EmptyState />
                  : filtered.map((show) => <ReplayCard key={show.id} show={show} />)
              }
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {!loading && !error && shows.length > 0 && (
          <div style={{
            padding:        "12px 24px",
            borderTop:      "1px solid",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            flexWrap:       "wrap",
            gap:            8,
          }} className="border-gray-100 dark:border-gray-800">
            <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
              {filtered.length} dari{" "}
              <strong style={{ color: "#6b7280" }} className="dark:text-gray-300">
                {shows.length}
              </strong>{" "}
              show ditampilkan
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "#d1d5db" }} className="dark:text-gray-600">
              Klik kartu untuk menonton replay
            </p>
          </div>
        )}

        {/* ── Keyframes ── */}
        <style>{`
          @keyframes shimmer {
            0%   { background-position: -200% 0; }
            100% { background-position:  200% 0; }
          }
        `}</style>
      </div>
    </>
  );
};

export default ReplayPage;
