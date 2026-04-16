import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../components/common/PageMeta";

// ── API ──────────────────────────────────────────────────────────────────────
const NEWS_API = "https://v2.jkt48connect.com/api/jkt48/NEWS";
const API_KEY = "JKTCONNECT";

const DEFAULT_IMG =
  "https://res.cloudinary.com/haymzm4wp/image/upload/v1760105848/bi5ej2hgh0cc2uowu5xr.jpg";

// ── Types ────────────────────────────────────────────────────────────────────
interface NewsItem {
  id: number;
  title: string;
  category: string;
  link: string;
  url: string;
  background_image: string;
  date: string;
  is_published: boolean;
  status: boolean;
}

interface NewsResponse {
  success: boolean;
  page: number;
  limit: number;
  total_page: number;
  total_count: number;
  news: NewsItem[];
}

// ── Category colors ───────────────────────────────────────────────────────────
const categoryStyle: Record<
  string,
  { bg: string; color: string; border: string }
> = {
  Theater: {
    bg: "rgba(220,31,46,0.08)",
    color: "#DC1F2E",
    border: "rgba(220,31,46,0.2)",
  },
  Event: {
    bg: "rgba(70,95,255,0.08)",
    color: "#465FFF",
    border: "rgba(70,95,255,0.2)",
  },
  Birthday: {
    bg: "rgba(236,72,153,0.08)",
    color: "#EC4899",
    border: "rgba(236,72,153,0.2)",
  },
  Other: {
    bg: "rgba(107,114,128,0.08)",
    color: "#6b7280",
    border: "rgba(107,114,128,0.2)",
  },
};

const getCategoryStyle = (cat: string) =>
  categoryStyle[cat] ?? {
    bg: "rgba(245,158,11,0.08)",
    color: "#D97706",
    border: "rgba(245,158,11,0.2)",
  };

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });



// ── SVG Icons ─────────────────────────────────────────────────────────────────
const CalendarIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const NewsIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#465FFF"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
    <path d="M18 14h-8" />
    <path d="M15 18h-5" />
    <path d="M10 6h8v4h-8V6z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

// ── Tambahkan fungsi ini di News.tsx (setelah DEFAULT_IMG) ───────────────────
function proxyImg(url: string): string {
  if (!url) return DEFAULT_IMG;
  if (!url.includes("jkt48.com")) return url;
  return `https://autumn-limit-898f.aslannarnia806.workers.dev/?url=${encodeURIComponent(url)}`;
}

// ── Update NewsCard — ganti imgSrc ───────────────────────────────────────────
function NewsCard({ item }: { item: NewsItem }) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const cs = getCategoryStyle(item.category);

  // Gunakan proxy untuk gambar dari jkt48.com
  const imgSrc = imgError || !item.background_image
    ? DEFAULT_IMG
    : proxyImg(item.background_image);

  return (
    <div
      onClick={() => navigate(`/news/${item.link}`)}
      style={{
        background: "var(--card-bg,#fff)",
        border: "1px solid var(--card-border,#e5e7eb)",
        borderRadius: 16,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
      className="dark:bg-white/[0.03] dark:border-gray-800"
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 10px 28px rgba(0,0,0,0.10)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {/* ── Thumbnail ── */}
      <div style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16/9",
        background: "#f3f4f6",
        overflow: "hidden",
        flexShrink: 0,
      }}>
        <img
          src={imgSrc}
          alt={item.title}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
          onError={() => setImgError(true)}
        />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)",
        }} />

        {/* Category badge */}
        <div style={{
          position: "absolute", top: 10, left: 10,
          padding: "3px 10px", borderRadius: 999,
          fontSize: 10, fontWeight: 700,
          background: "rgba(255,255,255,0.90)",
          color: cs.color,
          border: `1px solid ${cs.border}`,
          backdropFilter: "blur(6px)",
        }}>
          {item.category}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{
        padding: "12px 14px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        flex: 1,
      }}>
        {/* Title */}
        <h3 style={{
          margin: 0, fontSize: 13, fontWeight: 700,
          lineHeight: 1.5, color: "#111827",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
          className="dark:text-white"
        >
          {item.title}
        </h3>

        {/* Date + arrow */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          marginTop: "auto",
        }}>
          <div style={{
            display: "flex", alignItems: "center",
            gap: 5, color: "#9ca3af", fontSize: 11,
          }}>
            <CalendarIcon />
            <span>{formatDate(item.date)}</span>
          </div>
          <span style={{
            display: "flex", alignItems: "center",
            color: "#465FFF", opacity: 0.7,
          }}>
            <ArrowRightIcon />
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({
  current,
  total,
  onChange,
}: {
  current: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const pages = useMemo(() => {
    const arr: (number | "...")[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) arr.push(i);
    } else {
      arr.push(1);
      if (current > 3) arr.push("...");
      for (
        let i = Math.max(2, current - 1);
        i <= Math.min(total - 1, current + 1);
        i++
      )
        arr.push(i);
      if (current < total - 2) arr.push("...");
      arr.push(total);
    }
    return arr;
  }, [current, total]);

  const btnBase: React.CSSProperties = {
    minWidth: 36,
    height: 36,
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "transparent",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s",
    color: "#6b7280",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        flexWrap: "wrap",
        justifyContent: "center",
      }}
    >
      {/* Prev */}
      <button
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        style={{
          ...btnBase,
          opacity: current === 1 ? 0.4 : 1,
          cursor: current === 1 ? "not-allowed" : "pointer",
        }}
        className="dark:border-gray-700 dark:text-gray-400"
      >
        <ChevronLeftIcon />
      </button>

      {pages.map((p, i) =>
        p === "..." ? (
          <span
            key={`dot-${i}`}
            style={{ ...btnBase, border: "none", cursor: "default" }}
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p as number)}
            style={{
              ...btnBase,
              background: current === p ? "#465FFF" : "transparent",
              color: current === p ? "#fff" : "#6b7280",
              border:
                current === p
                  ? "1px solid #465FFF"
                  : "1px solid #e5e7eb",
            }}
            className={
              current !== p ? "dark:border-gray-700 dark:text-gray-400" : ""
            }
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        onClick={() => onChange(current + 1)}
        disabled={current === total}
        style={{
          ...btnBase,
          opacity: current === total ? 0.4 : 1,
          cursor: current === total ? "not-allowed" : "pointer",
        }}
        className="dark:border-gray-700 dark:text-gray-400"
      >
        <ChevronRightIcon />
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const NewsPage: React.FC = () => {
  const [data, setData] = useState<NewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Fetch
  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${NEWS_API}?apikey=${API_KEY}&page=${page}`);
        const json: NewsResponse = await res.json();
        if (json.success) setData(json);
      } catch (e) {
        console.error("Error fetching news:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  // Reset category filter when page changes
  useEffect(() => {
    setCategoryFilter("all");
  }, [page]);

  // Derived
  const allCategories = useMemo(() => {
    if (!data) return [];
    const cats = new Set(data.news.map((n) => n.category));
    return Array.from(cats).sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (categoryFilter === "all") return data.news;
    return data.news.filter((n) => n.category === categoryFilter);
  }, [data, categoryFilter]);

  const handlePageChange = (p: number) => {
    setPage(p);
  };

  return (
    <>
      <PageMeta
        title="News JKT48 | GiStream"
        description="Berita dan pengumuman terbaru JKT48 — GiStream"
      />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">

        {/* ── Header ── */}
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
                <NewsIcon />
              </div>
              <div>
                <h1
                  className="text-lg font-bold text-gray-800 dark:text-white"
                  style={{ margin: 0 }}
                >
                  News JKT48
                </h1>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "#9ca3af" }}>
                  {data
                    ? `${data.total_count.toLocaleString()} berita · Halaman ${data.page} dari ${data.total_page}`
                    : "Memuat..."}
                </p>
              </div>
            </div>

            {/* Page badge */}
            {data && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "5px 14px", borderRadius: 999,
                background: "rgba(70,95,255,0.08)",
                border: "1px solid rgba(70,95,255,0.2)",
                fontSize: 12, fontWeight: 700, color: "#465FFF",
                alignSelf: "flex-start",
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Hal. {page} / {data.total_page}
              </div>
            )}
          </div>

          {/* ── Category Filter ── */}
          {!loading && allCategories.length > 0 && (
            <div style={{
              display: "flex", gap: 4,
              marginTop: 16, flexWrap: "wrap",
            }}>
              {/* All */}
              <button
                onClick={() => setCategoryFilter("all")}
                style={{
                  padding: "5px 14px", borderRadius: 999,
                  fontSize: 11, fontWeight: 600,
                  border: categoryFilter === "all"
                    ? "1px solid rgba(70,95,255,0.3)"
                    : "1px solid rgba(0,0,0,0.08)",
                  cursor: "pointer", transition: "all 0.15s",
                  background: categoryFilter === "all"
                    ? "rgba(70,95,255,0.08)" : "transparent",
                  color: categoryFilter === "all" ? "#465FFF" : "#6b7280",
                }}
                className={
                  categoryFilter !== "all"
                    ? "dark:border-white/10 dark:text-gray-400"
                    : ""
                }
              >
                Semua
                <span style={{
                  marginLeft: 5, padding: "1px 6px",
                  borderRadius: 999, fontSize: 10, fontWeight: 700,
                  background: categoryFilter === "all"
                    ? "#465FFF" : "rgba(0,0,0,0.07)",
                  color: categoryFilter === "all" ? "#fff" : "#6b7280",
                }}
                  className={
                    categoryFilter !== "all"
                      ? "dark:bg-white/10 dark:text-gray-400"
                      : ""
                  }
                >
                  {data?.news.length ?? 0}
                </span>
              </button>

              {/* Per category */}
              {allCategories.map((cat) => {
                const cs = getCategoryStyle(cat);
                const isActive = categoryFilter === cat;
                const count =
                  data?.news.filter((n) => n.category === cat).length ?? 0;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    style={{
                      padding: "5px 14px", borderRadius: 999,
                      fontSize: 11, fontWeight: 600,
                      border: isActive
                        ? `1px solid ${cs.border}`
                        : "1px solid rgba(0,0,0,0.08)",
                      cursor: "pointer", transition: "all 0.15s",
                      background: isActive ? cs.bg : "transparent",
                      color: isActive ? cs.color : "#6b7280",
                    }}
                    className={
                      !isActive ? "dark:border-white/10 dark:text-gray-400" : ""
                    }
                  >
                    {cat}
                    <span style={{
                      marginLeft: 5, padding: "1px 6px",
                      borderRadius: 999, fontSize: 10, fontWeight: 700,
                      background: isActive ? cs.color : "rgba(0,0,0,0.07)",
                      color: isActive ? "#fff" : "#6b7280",
                    }}
                      className={
                        !isActive ? "dark:bg-white/10 dark:text-gray-400" : ""
                      }
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Content ── */}
        <div style={{ padding: 24 }}>
          {loading ? (
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
                Memuat berita...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 12, padding: "64px 0", textAlign: "center",
            }}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
                stroke="#d1d5db" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
                <path d="M18 14h-8" />
                <path d="M15 18h-5" />
                <path d="M10 6h8v4h-8V6z" />
              </svg>
              <div>
                <h3
                  style={{
                    margin: "0 0 6px", fontSize: 16,
                    fontWeight: 700, color: "#374151",
                  }}
                  className="dark:text-gray-300"
                >
                  Tidak Ada Berita
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>
                  {categoryFilter !== "all"
                    ? `Tidak ada berita dengan kategori "${categoryFilter}".`
                    : "Berita akan muncul di sini."}
                </p>
              </div>
              {categoryFilter !== "all" && (
                <button
                  onClick={() => setCategoryFilter("all")}
                  style={{
                    marginTop: 4, padding: "8px 20px",
                    borderRadius: 10, border: "none",
                    background: "#465FFF", color: "#fff",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Lihat Semua Berita
                </button>
              )}
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
            }}>
              {filtered.map((item) => (
                <NewsCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* ── Pagination ── */}
        {!loading && data && data.total_page > 1 && (
          <div style={{
            padding: "16px 24px",
            borderTop: "1px solid",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
            className="border-gray-100 dark:border-gray-800"
          >
            <Pagination
              current={page}
              total={data.total_page}
              onChange={handlePageChange}
            />
            <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
              Menampilkan{" "}
              <strong style={{ color: "#6b7280" }} className="dark:text-gray-300">
                {filtered.length}
              </strong>{" "}
              berita di halaman ini ·{" "}
              <strong style={{ color: "#6b7280" }} className="dark:text-gray-300">
                {data.total_count.toLocaleString()}
              </strong>{" "}
              total berita
            </p>
          </div>
        )}

        {/* ── Footer (no pagination) ── */}
        {!loading && data && data.total_page <= 1 && filtered.length > 0 && (
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
              berita
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {allCategories.map((cat) => {
                const cs = getCategoryStyle(cat);
                return (
                  <span key={cat} style={{
                    display: "flex", alignItems: "center",
                    gap: 5, fontSize: 11, color: "#9ca3af",
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: cs.color, display: "inline-block",
                      flexShrink: 0,
                    }} />
                    {cat}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Keyframes ── */}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </>
  );
};

export default NewsPage;
