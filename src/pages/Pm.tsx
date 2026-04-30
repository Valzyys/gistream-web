import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE = "https://v2.jkt48connect.com/api/shop/pm-shop";
const API_KEY  = "JKTCONNECT";

// ─── Auth helper (matches SignInForm storage pattern) ─────────────────────────
function getStoredSession() {
  try {
    const raw =
      sessionStorage.getItem("userLogin") ||
      localStorage.getItem("userLogin");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.isLoggedIn && parsed?.user ? parsed : null;
  } catch {
    return null;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface AccessSummary {
  total: number;
  active: number;
  expired: number;
}

interface AccessMember {
  identifier: string;
  member_name: string;
  profile_image: string;
  current_rank: string;
  is_popular: boolean;
  is_active: boolean;
  last_package_code: string;
  expired_at: string;
  days_remaining: number;
  hours_remaining: number;
  total_purchases: string;
  total_amount_paid: string;
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const IconStar = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
  </svg>
);

const IconClock = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconMessage = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

const IconFilter = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const IconRefresh = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
  </svg>
);

const IconInbox = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
  </svg>
);

const IconLock = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

// ─── Package Badge ─────────────────────────────────────────────────────────────
const PKG_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  trial:   { bg: "bg-violet-100 dark:bg-violet-500/20", text: "text-violet-700 dark:text-violet-300", label: "TRIAL" },
  weekly:  { bg: "bg-amber-100 dark:bg-amber-500/20",   text: "text-amber-700 dark:text-amber-300",   label: "WEEKLY" },
  monthly: { bg: "bg-emerald-100 dark:bg-emerald-500/20", text: "text-emerald-700 dark:text-emerald-300", label: "MONTHLY" },
};

const PackageBadge = ({ code }: { code: string }) => {
  const cfg = PKG_CONFIG[code] ?? { bg: "bg-gray-100 dark:bg-gray-700/50", text: "text-gray-500 dark:text-gray-400", label: code.toUpperCase() };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
};

// ─── Skeleton Card ─────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-white/[0.03] animate-pulse">
    <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-800 flex-shrink-0" />
    <div className="flex-1 space-y-2.5">
      <div className="h-3.5 w-32 bg-gray-200 dark:bg-gray-800 rounded-full" />
      <div className="h-3 w-24 bg-gray-200 dark:bg-gray-800 rounded-full" />
      <div className="h-3 w-20 bg-gray-200 dark:bg-gray-800 rounded-full" />
    </div>
    <div className="w-20 h-10 bg-gray-200 dark:bg-gray-800 rounded-xl flex-shrink-0" />
  </div>
);

// ─── Summary Pill ──────────────────────────────────────────────────────────────
interface SummaryPillProps { value: number; label: string; color: string }
const SummaryPill = ({ value, label, color }: SummaryPillProps) => (
  <div className={`flex-1 text-center py-3 rounded-xl border ${color}`}>
    <p className="text-xl font-black leading-none">{value}</p>
    <p className="text-[11px] font-semibold mt-1 opacity-70">{label}</p>
  </div>
);

// ─── Member Card ──────────────────────────────────────────────────────────────
interface MemberCardProps { member: AccessMember; userId: string }
const MemberCard = ({ member, userId }: MemberCardProps) => {
  const navigate = useNavigate();
  const isActive = member.is_active && member.days_remaining > 0;

  const handleReadPM = () => {
    navigate(`/pm/${member.identifier}?user_id=${userId}`);
  };

  return (
    <div className="group flex items-center gap-4 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-white/[0.03] hover:border-pink-200 dark:hover:border-pink-500/30 hover:bg-pink-50/30 dark:hover:bg-pink-500/5 transition-all duration-200">

      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <img
          src={member.profile_image}
          alt={member.member_name}
          className="w-14 h-14 rounded-full object-cover border-2 border-gray-100 dark:border-gray-800 group-hover:border-pink-200 dark:group-hover:border-pink-500/40 transition-colors"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.member_name)}&background=DC1F2E&color=fff`;
          }}
        />
        {/* Active dot */}
        {isActive && (
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white dark:border-gray-900" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Name + Popular */}
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-gray-800 dark:text-white/90 text-sm truncate">{member.member_name}</p>
          {member.is_popular && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/25 text-[10px] font-bold text-amber-700 dark:text-amber-400">
              <IconStar /> Populer
            </span>
          )}
        </div>

        {/* Rank + Package */}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500">
            #{member.current_rank}
          </span>
          <PackageBadge code={member.last_package_code} />
        </div>

        {/* Expiry */}
        <div className="flex items-center gap-1.5 mt-1.5">
          {isActive ? (
            <>
              <span className="text-emerald-500"><IconClock /></span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                Aktif {member.days_remaining}h {member.hours_remaining}j lagi
              </span>
            </>
          ) : (
            <span className="text-[11px] font-semibold text-red-500">Expired</span>
          )}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={handleReadPM}
        disabled={!isActive}
        className={`flex-shrink-0 flex flex-col items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-150 ${
          isActive
            ? "bg-[#DC1F2E] hover:bg-[#c41929] active:scale-95 text-white shadow-sm shadow-red-500/20"
            : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
        }`}
      >
        <IconMessage />
        <span>Baca Pesan</span>
      </button>
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function PMAccessPage() {
  const navigate = useNavigate();
  const [userId, setUserId]       = useState<string | null>(null);
  const [summary, setSummary]     = useState<AccessSummary | null>(null);
  const [members, setMembers]     = useState<AccessMember[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeOnly, setActiveOnly] = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // ── Auth check ──
  useEffect(() => {
    const session = getStoredSession();
    if (!session) {
      navigate("/signin");
      return;
    }
    setUserId(session.user.user_id);
  }, [navigate]);

  // ── Fetch ──
  const fetchAccess = useCallback(async (uid: string, active: boolean) => {
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/access/${uid}?apikey=${API_KEY}&active_only=${active}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.status) {
        setSummary(json.summary ?? null);
        setMembers(json.data ?? []);
      } else {
        setError(json.message || "Gagal memuat data.");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      setLoading(true);
      fetchAccess(userId, activeOnly);
    }
  }, [userId, activeOnly, fetchAccess]);

  const handleRefresh = () => {
    if (!userId) return;
    setRefreshing(true);
    fetchAccess(userId, activeOnly);
  };

  // ── Not logged in (redirect pending) ──
  if (!userId && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400 dark:text-gray-600">
        <IconLock />
        <p className="text-sm font-semibold">Silakan login terlebih dahulu</p>
        <Link to="/signin" className="text-xs text-pink-500 hover:underline">Ke halaman login →</Link>
      </div>
    );
  }

  return (
    <div>
      <PageMeta
        title="Private Message Saya | GiStream"
        description="Daftar akses Private Message member JKT48 yang kamu miliki di GiStream."
      />
      <PageBreadcrumb pageTitle="Private Message" />

      <div className="space-y-5">

        {/* ── Header Card ── */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-6 py-6 xl:px-8">
          {/* Decorative blob */}
          <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-pink-400/10 to-red-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-gradient-to-tr from-orange-400/10 to-pink-400/10 blur-2xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">💌</span>
                <h1 className="text-xl font-black text-gray-800 dark:text-white/90">
                  Private Message Saya
                </h1>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                Daftar akses PM member JKT48 yang kamu miliki. Klik <strong className="text-pink-600 dark:text-pink-400">Baca Pesan</strong> untuk membuka pesan member.
              </p>
            </div>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/[0.04] hover:bg-gray-100 dark:hover:bg-white/[0.07] text-gray-500 dark:text-gray-400 text-xs font-semibold transition-all disabled:opacity-50"
            >
              <span className={refreshing ? "animate-spin" : ""}><IconRefresh /></span>
              Refresh
            </button>
          </div>

          {/* Summary pills */}
          {summary && (
            <div className="relative flex gap-3 mt-5">
              <SummaryPill
                value={summary.total}
                label="Total PM"
                color="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
              />
              <SummaryPill
                value={summary.active}
                label="Aktif"
                color="border-emerald-200 dark:border-emerald-700/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/5"
              />
              <SummaryPill
                value={summary.expired}
                label="Expired"
                color="border-red-200 dark:border-red-700/40 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-500/5"
              />
            </div>
          )}
        </div>

        {/* ── Filter Toggle ── */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <IconFilter /> Filter:
          </span>
          <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => !activeOnly && setActiveOnly(true)}
              className={`px-4 py-1.5 text-xs font-bold transition-all ${
                activeOnly
                  ? "bg-[#DC1F2E] text-white"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
              }`}
            >
              Aktif Saja
            </button>
            <button
              onClick={() => activeOnly && setActiveOnly(false)}
              className={`px-4 py-1.5 text-xs font-bold transition-all border-l border-gray-200 dark:border-gray-700 ${
                !activeOnly
                  ? "bg-[#DC1F2E] text-white"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
              }`}
            >
              Semua
            </button>
          </div>

          {/* Count badge */}
          {!loading && (
            <span className="ml-auto text-xs font-semibold text-gray-400 dark:text-gray-600">
              {members.length} item
            </span>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="rounded-2xl border border-red-200 dark:border-red-700/40 bg-red-50/50 dark:bg-red-500/5 px-5 py-4 text-sm text-red-600 dark:text-red-400">
            ⚠️ {error}
          </div>
        )}

        {/* ── List ── */}
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-300 dark:text-gray-700">
              <IconInbox />
              <p className="text-base font-bold text-gray-500 dark:text-gray-500">
                {activeOnly ? "Tidak ada akses PM aktif" : "Belum ada PM sama sekali"}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-600 text-center max-w-xs">
                {activeOnly
                  ? "Coba tampilkan semua untuk melihat PM yang sudah expired."
                  : "Kamu belum pernah membeli paket Private Message."}
              </p>
              {activeOnly && (
                <button
                  onClick={() => setActiveOnly(false)}
                  className="mt-1 text-xs text-pink-500 hover:underline font-semibold"
                >
                  Tampilkan semua →
                </button>
              )}
            </div>
          ) : (
            members.map((member) => (
              <MemberCard key={member.identifier} member={member} userId={userId!} />
            ))
          )}
        </div>

      </div>
    </div>
  );
}
