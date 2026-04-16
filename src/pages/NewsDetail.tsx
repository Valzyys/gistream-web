import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import PageMeta from "../components/common/PageMeta";

// ── API ───────────────────────────────────────────────────────────────────────
const NEWS_DETAIL_API = "https://v2.jkt48connect.com/api/jkt48/NEWS";
const API_KEY = "JKTCONNECT";
const PROXY = "https://autumn-limit-898f.aslannarnia806.workers.dev/?url=";

// ── Types ─────────────────────────────────────────────────────────────────────
interface NewsDetail {
  author: string;
  date: string;
  id: string;
  title: string;
  category: string;
  url: string;
  content: string;
  slug: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const categoryStyle: Record<string, { bg: string; color: string; border: string }> = {
  Theater: { bg: "rgba(220,31,46,0.08)", color: "#DC1F2E", border: "rgba(220,31,46,0.2)" },
  Event:   { bg: "rgba(70,95,255,0.08)",  color: "#465FFF", border: "rgba(70,95,255,0.2)" },
  Birthday:{ bg: "rgba(236,72,153,0.08)", color: "#EC4899", border: "rgba(236,72,153,0.2)" },
  Other:   { bg: "rgba(107,114,128,0.08)",color: "#6b7280", border: "rgba(107,114,128,0.2)" },
};

const getCategoryStyle = (cat: string) =>
  categoryStyle[cat] ?? {
    bg: "rgba(245,158,11,0.08)",
    color: "#D97706",
    border: "rgba(245,158,11,0.2)",
  };

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// Proxy semua src gambar dari jkt48.com di dalam HTML content
function proxyContentImages(html: string): string {
  return html.replace(
    /src="(https?:\/\/jkt48\.com[^"]+)"/g,
    (_, url) => `src="${PROXY}${encodeURIComponent(url)}"`
  );
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const AuthorIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const ExternalIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const NewsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="#465FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
    <path d="M18 14h-8" />
    <path d="M15 18h-5" />
    <path d="M10 6h8v4h-8V6z" />
  </svg>
);

// ── News Detail Page ──────────────────────────────────────────────────────────
const NewsDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<NewsDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const fetchDetail = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(
          `${NEWS_DETAIL_API}/${slug}?apikey=${API_KEY}`
        );
        const json = await res.json();
        if (json && json.slug) {
          setData(json);
        } else {
          setError(true);
        }
      } catch (e) {
        console.error("Error fetching news detail:", e);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [slug]);

  const cs = data ? getCategoryStyle(data.category) : null;

  return (
    <>
      <PageMeta
        title={data ? `${data.title} | GiStream` : "News Detail | GiStream"}
        description={data ? `${data.title} — GiStream` : ""}
      />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">

        {/* ── Top Bar ── */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800"
          style={{ display: "flex", alignItems: "center", gap: 12 }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "transparent",
              fontSize: 13, fontWeight: 600,
              color: "#6b7280", cursor: "pointer",
              transition: "all 0.15s",
            }}
            className="dark:border-gray-700 dark:text-gray-400"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(70,95,255,0.06)";
              (e.currentTarget as HTMLButtonElement).style.color = "#465FFF";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(70,95,255,0.25)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "#6b7280";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb";
            }}
          >
            <BackIcon />
            Kembali
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "rgba(70,95,255,0.08)",
              border: "1px solid rgba(70,95,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <NewsIcon />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#6b7280" }}
              className="dark:text-gray-400">
              News JKT48
            </span>
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ padding: "32px 24px", maxWidth: 800, margin: "0 auto" }}>

          {/* Loading */}
          {loading && (
            <div style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 12, padding: "80px 0",
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
          )}

          {/* Error */}
          {!loading && error && (
            <div style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 12, padding: "80px 0", textAlign: "center",
            }}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
                stroke="#d1d5db" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "#374151" }}
                  className="dark:text-gray-300">
                  Berita Tidak Ditemukan
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>
                  Berita yang kamu cari tidak tersedia atau telah dihapus.
                </p>
              </div>
              <button
                onClick={() => navigate("/news")}
                style={{
                  marginTop: 4, padding: "8px 20px",
                  borderRadius: 10, border: "none",
                  background: "#465FFF", color: "#fff",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Kembali ke News
              </button>
            </div>
          )}

          {/* Article */}
          {!loading && !error && data && cs && (
            <article>

              {/* ── Category + Meta ── */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                <span style={{
                  display: "inline-flex", alignItems: "center",
                  padding: "4px 12px", borderRadius: 999,
                  fontSize: 11, fontWeight: 700,
                  background: cs.bg, color: cs.color,
                  border: `1px solid ${cs.border}`,
                }}>
                  {data.category}
                </span>
                <span style={{
                  display: "inline-flex", alignItems: "center",
                  padding: "4px 12px", borderRadius: 999,
                  fontSize: 11, fontWeight: 600,
                  background: "rgba(0,0,0,0.04)",
                  color: "#6b7280",
                  border: "1px solid rgba(0,0,0,0.07)",
                }}
                  className="dark:bg-white/[0.04] dark:border-white/[0.08] dark:text-gray-400"
                >
                  #{data.id}
                </span>
              </div>

              {/* ── Title ── */}
              <h1 style={{
                margin: "0 0 20px",
                fontSize: 22, fontWeight: 800,
                lineHeight: 1.4, color: "#111827",
              }}
                className="dark:text-white"
              >
                {data.title}
              </h1>

              {/* ── Meta row ── */}
              <div style={{
                display: "flex", flexWrap: "wrap", gap: 16,
                padding: "14px 16px",
                borderRadius: 12,
                background: "rgba(0,0,0,0.03)",
                border: "1px solid rgba(0,0,0,0.06)",
                marginBottom: 28,
              }}
                className="dark:bg-white/[0.03] dark:border-white/[0.06]"
              >
                {/* Date */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  fontSize: 12, color: "#6b7280",
                }}
                  className="dark:text-gray-400"
                >
                  <CalendarIcon />
                  <span>{formatDate(data.date)}</span>
                </div>

                {/* Author */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  fontSize: 12, color: "#6b7280",
                }}
                  className="dark:text-gray-400"
                >
                  <AuthorIcon />
                  <span>{data.author}</span>
                </div>

                {/* Source link */}
                <a
                  href={data.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: 12, color: "#465FFF",
                    textDecoration: "none", marginLeft: "auto",
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline";
                  }}
                                    onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.textDecoration = "none";
                  }}
                >
                  <ExternalIcon />
                  Sumber Asli
                </a>
              </div>

              {/* ── Divider ── */}
              <div style={{
                height: 1,
                background: "linear-gradient(to right, rgba(70,95,255,0.2), transparent)",
                marginBottom: 28,
              }} />

              {/* ── Article Content ── */}
              <div
                className="news-detail-content dark:text-gray-300"
                dangerouslySetInnerHTML={{
                  __html: proxyContentImages(data.content),
                }}
              />

              {/* ── Bottom Source Button ── */}
              <div style={{
                marginTop: 40,
                paddingTop: 24,
                borderTop: "1px solid rgba(0,0,0,0.07)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
                className="dark:border-white/[0.07]"
              >
                <button
                  onClick={() => navigate("/news")}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 16px", borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "transparent",
                    fontSize: 13, fontWeight: 600,
                    color: "#6b7280", cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  className="dark:border-gray-700 dark:text-gray-400"
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(70,95,255,0.06)";
                    (e.currentTarget as HTMLButtonElement).style.color = "#465FFF";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(70,95,255,0.25)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    (e.currentTarget as HTMLButtonElement).style.color = "#6b7280";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb";
                  }}
                >
                  <BackIcon />
                  Kembali ke News
                </button>

                <a
                  href={data.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "8px 16px", borderRadius: 10,
                    border: "none",
                    background: "#465FFF",
                    fontSize: 13, fontWeight: 600,
                    color: "#fff", cursor: "pointer",
                    textDecoration: "none",
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.opacity = "0.85";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.opacity = "1";
                  }}
                >
                  <ExternalIcon />
                  Baca di JKT48.com
                </a>
              </div>
            </article>
          )}
        </div>

        {/* ── Keyframes ── */}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          /* ── Article content styling ── */
          .news-detail-content {
            font-size: 14px;
            line-height: 1.8;
            color: #374151;
            word-break: break-word;
          }

          .news-detail-content p {
            margin: 0 0 16px;
          }

          .news-detail-content ul,
          .news-detail-content ol {
            margin: 0 0 16px;
            padding-left: 24px;
          }

          .news-detail-content li {
            margin-bottom: 6px;
          }

          .news-detail-content b,
          .news-detail-content strong {
            font-weight: 700;
            color: #111827;
          }

          .dark .news-detail-content b,
          .dark .news-detail-content strong {
            color: #f9fafb;
          }

          .news-detail-content img {
            max-width: 100%;
            height: auto;
            border-radius: 12px;
            margin: 16px 0;
            display: block;
            border: 1px solid rgba(0,0,0,0.07);
          }

          .dark .news-detail-content img {
            border-color: rgba(255,255,255,0.07);
          }

          .news-detail-content a {
            color: #465FFF;
            text-decoration: underline;
            text-underline-offset: 2px;
          }

          .news-detail-content a:hover {
            opacity: 0.8;
          }

          .news-detail-content h1,
          .news-detail-content h2,
          .news-detail-content h3,
          .news-detail-content h4 {
            font-weight: 700;
            line-height: 1.4;
            margin: 24px 0 12px;
            color: #111827;
          }

          .dark .news-detail-content h1,
          .dark .news-detail-content h2,
          .dark .news-detail-content h3,
          .dark .news-detail-content h4 {
            color: #f9fafb;
          }

          .news-detail-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
            font-size: 13px;
          }

          .news-detail-content th,
          .news-detail-content td {
            padding: 8px 12px;
            border: 1px solid rgba(0,0,0,0.1);
            text-align: left;
          }

          .dark .news-detail-content th,
          .dark .news-detail-content td {
            border-color: rgba(255,255,255,0.1);
          }

          .news-detail-content th {
            background: rgba(70,95,255,0.06);
            font-weight: 700;
          }

          /* Override inline color dari JKT48 agar readable di dark mode */
          .dark .news-detail-content span,
          .dark .news-detail-content font,
          .dark .news-detail-content p {
            color: #d1d5db !important;
          }

          .dark .news-detail-content b span,
          .dark .news-detail-content strong span {
            color: #f9fafb !important;
          }
        `}</style>
      </div>
    </>
  );
};

export default NewsDetailPage;
