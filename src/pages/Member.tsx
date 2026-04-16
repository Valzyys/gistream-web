import { useEffect, useState, useMemo } from "react";
import PageMeta from "../components/common/PageMeta";

// ── API ──────────────────────────────────────────────────────────────────────
const MEMBERS_API = "https://v2.jkt48connect.com/api/jkt48/members";
const API_KEY = "JKTCONNECT";

// ── Types ────────────────────────────────────────────────────────────────────
interface Social {
  title: string;
  url: string;
}

interface Member {
  _id: string;
  jkt48_id?: string;
  name: string;
  nicknames: string[];
  img: string;
  img_alt: string;
  url: string;
  group: string;
  socials: Social[];
  sr_exists: boolean;
  is_graduate: boolean;
  generation?: string;
  team?: string;
  room_id?: number;
  idn_username?: string;
}

type FilterMode = "active" | "graduated" | "all";
type SortMode = "name" | "generation" | "team";

// ── Helpers ──────────────────────────────────────────────────────────────────
const genLabel = (gen?: string): string => {
  if (!gen) return "—";
  const match = gen.match(/gen(\d+)/i);
  return match ? `Gen ${match[1]}` : gen;
};

const teamColor: Record<string, { bg: string; color: string; border: string }> = {
  passion: { bg: "rgba(220,31,46,0.08)", color: "#DC1F2E", border: "rgba(220,31,46,0.2)" },
  dream:   { bg: "rgba(70,95,255,0.08)", color: "#465FFF", border: "rgba(70,95,255,0.2)" },
  love:    { bg: "rgba(236,72,153,0.08)", color: "#EC4899", border: "rgba(236,72,153,0.2)" },
  trainee: { bg: "rgba(245,158,11,0.08)", color: "#D97706", border: "rgba(245,158,11,0.2)" },
};

// ── SVG Icons ────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const UsersIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="#EC4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const GraduateIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

const InstagramIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
  </svg>
);

const TwitterIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const TikTokIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
  </svg>
);

const YoutubeIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const ShowroomIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const IdnIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const LinkIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const getSocialIcon = (title: string) => {
  const t = title.toLowerCase();
  if (t === "instagram") return <InstagramIcon />;
  if (t === "twitter" || t === "x") return <TwitterIcon />;
  if (t === "tiktok") return <TikTokIcon />;
  if (t === "youtube" || t === "youtube channel") return <YoutubeIcon />;
  if (t === "showroom") return <ShowroomIcon />;
  if (t === "idn") return <IdnIcon />;
  return <LinkIcon />;
};

// ── Member Card ──────────────────────────────────────────────────────────────
function MemberCard({ member }: { member: Member }) {
  const [imgSrc, setImgSrc] = useState(member.img_alt || member.img);
  const tc = member.team ? teamColor[member.team.toLowerCase()] : null;

  return (
    <div
      style={{
        background: "var(--card-bg, #fff)",
        border: "1px solid var(--card-border, #e5e7eb)",
        borderRadius: 16,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
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
      {/* ── Photo ── */}
      <div style={{
        position: "relative",
        width: "100%",
        aspectRatio: "3/4",
        background: "#f3f4f6",
        overflow: "hidden",
      }}>
        <img
          src={imgSrc}
          alt={member.name}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={() => setImgSrc(member.img)}
        />

        {/* Gradient */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.70) 0%, transparent 55%)",
        }} />

        {/* Graduate badge */}
        {member.is_graduate && (
          <div style={{
            position: "absolute", top: 8, left: 8,
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 8px", borderRadius: 999,
            fontSize: 10, fontWeight: 700,
            background: "rgba(0,0,0,0.60)",
            backdropFilter: "blur(4px)",
            color: "rgba(255,255,255,0.9)",
          }}>
            <GraduateIcon />
            Alumni
          </div>
        )}

        {/* Team badge */}
        {member.team && (
          <div style={{
            position: "absolute", top: 8, right: 8,
            padding: "3px 8px", borderRadius: 999,
            fontSize: 10, fontWeight: 700,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(4px)",
            color: "#fff",
            textTransform: "capitalize",
          }}>
            {member.team}
          </div>
        )}

        {/* Name overlay */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "10px 12px",
        }}>
          <p style={{
            margin: 0, fontSize: 13, fontWeight: 700,
            color: "#fff", lineHeight: 1.3,
          }}>
            {member.name}
          </p>
          {member.nicknames.length > 0 && (
            <p style={{
              margin: "2px 0 0", fontSize: 11,
              color: "rgba(255,255,255,0.65)",
            }}>
              {member.nicknames.slice(0, 2).join(" · ")}
            </p>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 8 }}>

        {/* Gen + Team badges */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {member.generation && (
            <span style={{
              fontSize: 10, fontWeight: 700,
              padding: "2px 8px", borderRadius: 999,
              background: "rgba(70,95,255,0.08)",
              color: "#465FFF",
              border: "1px solid rgba(70,95,255,0.15)",
            }}>
              {genLabel(member.generation)}
            </span>
          )}
          {member.team && tc && (
            <span style={{
              fontSize: 10, fontWeight: 700,
              padding: "2px 8px", borderRadius: 999,
              background: tc.bg,
              color: tc.color,
              border: `1px solid ${tc.border}`,
              textTransform: "capitalize",
            }}>
              {member.team}
            </span>
          )}
        </div>

                {/* Social icons */}
        {member.socials.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {member.socials.slice(0, 6).map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                title={s.title}
                style={{
                  width: 28, height: 28,
                  borderRadius: 8,
                  background: "rgba(0,0,0,0.04)",
                  border: "1px solid rgba(0,0,0,0.07)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#6b7280",
                  textDecoration: "none",
                  transition: "all 0.15s",
                  flexShrink: 0,
                }}
                className="dark:bg-white/[0.05] dark:border-white/[0.08] dark:text-gray-400"
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "rgba(70,95,255,0.10)";
                  (e.currentTarget as HTMLAnchorElement).style.color = "#465FFF";
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(70,95,255,0.25)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "rgba(0,0,0,0.04)";
                  (e.currentTarget as HTMLAnchorElement).style.color = "#6b7280";
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,0,0,0.07)";
                }}
              >
                {getSocialIcon(s.title)}
              </a>
            ))}
          </div>
        )}

        {/* Platform indicators */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {member.sr_exists && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 10, fontWeight: 600,
              padding: "2px 8px", borderRadius: 999,
              background: "rgba(239,68,68,0.07)",
              color: "#EF4444",
              border: "1px solid rgba(239,68,68,0.15)",
            }}>
              <ShowroomIcon />
              SHOWROOM
            </span>
          )}
          {member.idn_username && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 10, fontWeight: 600,
              padding: "2px 8px", borderRadius: 999,
              background: "rgba(245,158,11,0.07)",
              color: "#D97706",
              border: "1px solid rgba(245,158,11,0.15)",
            }}>
              <IdnIcon />
              IDN Live
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
const MembersPage: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>("active");
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState<string>("all");

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      try {
        const [activeRes, gradRes] = await Promise.all([
          fetch(`${MEMBERS_API}?apikey=${API_KEY}`),
          fetch(`${MEMBERS_API}?apikey=${API_KEY}&graduated_only=true`),
        ]);
        const activeJson = await activeRes.json();
        const gradJson = await gradRes.json();

        const activeData: Member[] = Array.isArray(activeJson) ? activeJson : [];
        const gradData: Member[] = Array.isArray(gradJson) ? gradJson : [];

        // Merge & deduplicate by _id
        const map = new Map<string, Member>();
        [...activeData, ...gradData].forEach((m) => map.set(m._id, m));
        setMembers(Array.from(map.values()));
      } catch (e) {
        console.error("Error fetching members:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const teams = useMemo(() => {
    const t = new Set<string>();
    members
      .filter((m) => !m.is_graduate)
      .forEach((m) => { if (m.team) t.add(m.team.toLowerCase()); });
    return Array.from(t).sort();
  }, [members]);

  const filtered = useMemo(() => {
    let list = members;

    if (filterMode === "active") list = list.filter((m) => !m.is_graduate);
    else if (filterMode === "graduated") list = list.filter((m) => m.is_graduate);

    if (teamFilter !== "all") {
      list = list.filter((m) => (m.team || "").toLowerCase() === teamFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.nicknames.some((n) => n.toLowerCase().includes(q))
      );
    }

    list = [...list].sort((a, b) => {
      if (sortMode === "name") return a.name.localeCompare(b.name);
      if (sortMode === "generation") {
        const ga = parseInt((a.generation || "").match(/\d+/)?.[0] || "99");
        const gb = parseInt((b.generation || "").match(/\d+/)?.[0] || "99");
        return ga - gb;
      }
      if (sortMode === "team") {
        return (a.team || "zzz").localeCompare(b.team || "zzz");
      }
      return 0;
    });

    return list;
  }, [members, filterMode, teamFilter, search, sortMode]);

  const activeCount = members.filter((m) => !m.is_graduate).length;
  const graduatedCount = members.filter((m) => m.is_graduate).length;

  return (
    <>
      <PageMeta
        title="Members JKT48 | GiStream"
        description="Daftar member JKT48 aktif dan alumni — GiStream"
      />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">

        {/* ── Header ── */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

            {/* Title */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: "rgba(236,72,153,0.08)",
                border: "1px solid rgba(236,72,153,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <UsersIcon />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800 dark:text-white" style={{ margin: 0 }}>
                  Members JKT48
                </h1>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "#9ca3af" }}>
                  {activeCount} aktif · {graduatedCount} alumni
                </p>
              </div>
            </div>

            {/* Search */}
            <div style={{ position: "relative", minWidth: 220 }}>
              <span style={{
                position: "absolute", left: 10, top: "50%",
                transform: "translateY(-50%)",
                color: "#9ca3af", pointerEvents: "none",
                display: "flex", alignItems: "center",
              }}>
                <SearchIcon />
              </span>
              <input
                type="text"
                placeholder="Cari member..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 32px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  fontSize: 13,
                  outline: "none",
                  background: "transparent",
                  color: "inherit",
                }}
                className="dark:border-gray-700 dark:text-white dark:placeholder-gray-500"
              />
            </div>
          </div>

          {/* ── Controls ── */}
          <div style={{
            display: "flex", gap: 8, marginTop: 16,
            flexWrap: "wrap", alignItems: "center",
          }}>

            {/* Filter Mode Tabs */}
            <div style={{
              display: "flex", gap: 3,
              padding: 3, borderRadius: 10,
              background: "rgba(0,0,0,0.04)",
            }}
              className="dark:bg-white/[0.04]"
            >
              {(
                [
                  { key: "active", label: "Aktif" },
                  { key: "graduated", label: "Alumni" },
                  { key: "all", label: "Semua" },
                ] as { key: FilterMode; label: string }[]
              ).map((tab) => {
                const count =
                  tab.key === "active" ? activeCount
                  : tab.key === "graduated" ? graduatedCount
                  : members.length;
                const isActive = filterMode === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setFilterMode(tab.key);
                      setTeamFilter("all");
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "5px 12px", borderRadius: 7,
                      fontSize: 12, fontWeight: 600,
                      border: "none", cursor: "pointer",
                      transition: "all 0.15s",
                      background: isActive ? "#fff" : "transparent",
                      color: isActive ? "#111827" : "#6b7280",
                      boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                    }}
                    className={isActive
                      ? "dark:bg-white/10 dark:text-white"
                      : "dark:text-gray-400"
                    }
                  >
                    {tab.label}
                    {!loading && (
                      <span style={{
                        padding: "1px 6px", borderRadius: 999,
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

            {/* Team Filter — hanya tampil saat mode active/all */}
            {filterMode !== "graduated" && teams.length > 0 && (
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                {["all", ...teams].map((t) => {
                  const isActive = teamFilter === t;
                  const tc = t !== "all" ? teamColor[t] : null;
                  return (
                    <button
                      key={t}
                      onClick={() => setTeamFilter(t)}
                      style={{
                        padding: "5px 12px", borderRadius: 999,
                        fontSize: 11, fontWeight: 600,
                        border: isActive
                          ? `1px solid ${tc?.border || "rgba(70,95,255,0.3)"}`
                          : "1px solid rgba(0,0,0,0.08)",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        background: isActive ? (tc?.bg || "rgba(70,95,255,0.08)") : "transparent",
                        color: isActive ? (tc?.color || "#465FFF") : "#6b7280",
                        textTransform: "capitalize",
                      }}
                      className={!isActive ? "dark:border-white/10 dark:text-gray-400" : ""}
                    >
                      {t === "all" ? "Semua Tim" : t}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Sort */}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>Urutkan:</span>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                style={{
                  padding: "5px 10px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 12, fontWeight: 600,
                  background: "transparent",
                  color: "inherit",
                  cursor: "pointer",
                  outline: "none",
                }}
                className="dark:border-gray-700 dark:text-white"
              >
                <option value="name">Nama</option>
                <option value="generation">Generasi</option>
                <option value="team">Tim</option>
              </select>
            </div>
          </div>
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
                border: "3px solid rgba(236,72,153,0.15)",
                borderTop: "3px solid #EC4899",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }} />
              <p style={{ margin: 0, fontSize: 14, color: "#9ca3af" }}>
                Memuat data member...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 12, padding: "64px 0", textAlign: "center",
            }}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
                stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <div>
                <h3 style={{
                  margin: "0 0 6px",
                  fontSize: 16, fontWeight: 700,
                  color: "#374151",
                }}
                  className="dark:text-gray-300"
                >
                  Member Tidak Ditemukan
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>
                  {search
                    ? `Tidak ada member dengan nama "${search}"`
                    : "Tidak ada member yang sesuai filter."}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    style={{
                      padding: "7px 18px", borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      background: "transparent",
                      fontSize: 13, fontWeight: 600,
                      color: "#6b7280", cursor: "pointer",
                    }}
                    className="dark:border-gray-700 dark:text-gray-400"
                  >
                    Hapus Pencarian
                  </button>
                )}
                <button
                  onClick={() => {
                    setFilterMode("active");
                    setTeamFilter("all");
                    setSearch("");
                  }}
                  style={{
                    padding: "7px 18px", borderRadius: 10,
                    border: "none",
                    background: "#EC4899",
                    fontSize: 13, fontWeight: 600,
                    color: "#fff", cursor: "pointer",
                  }}
                >
                  Reset Filter
                </button>
              </div>
            </div>
          ) : (
            /* ── Grid ── */
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 16,
            }}>
              {filtered.map((member) => (
                <MemberCard key={member._id} member={member} />
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
              dari{" "}
              <strong style={{ color: "#6b7280" }} className="dark:text-gray-300">
                {members.length}
              </strong>{" "}
              member
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {Object.entries(teamColor).map(([team, tc]) => (
                <span
                  key={team}
                  style={{
                    display: "flex", alignItems: "center",
                    gap: 5, fontSize: 11, color: "#9ca3af",
                    textTransform: "capitalize",
                  }}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: tc.color, display: "inline-block",
                    flexShrink: 0,
                  }} />
                  {team}
                </span>
              ))}
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

export default MembersPage;
