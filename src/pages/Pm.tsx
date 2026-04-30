import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";

// ─── Constants ─────────────────────────────────────────────────────────────────
const API_BASE = "https://v2.jkt48connect.com/api/shop/pm-shop";
const API_KEY  = "JKTCONNECT";
const SHOP_URL = "https://shop.jkt48connect.com"; // ganti sesuai URL toko PM

// ─── Auth helper ──────────────────────────────────────────────────────────────
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
const IconMessageSquare = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

const IconPlus = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconRefresh = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
  </svg>
);

const IconStar = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
  </svg>
);

const IconClock = ({ size = 11 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconInbox = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
  </svg>
);

// ─── Package Badge ─────────────────────────────────────────────────────────────
const PKG_CONFIG: Record<string, { bg: string; text: string }> = {
  trial:       { bg: "bg-violet-100 dark:bg-violet-500/20", text: "text-violet-700 dark:text-violet-300" },
  weekly:      { bg: "bg-amber-100 dark:bg-amber-500/20",   text: "text-amber-700 dark:text-amber-300" },
  monthly:     { bg: "bg-emerald-100 dark:bg-emerald-500/20", text: "text-emerald-700 dark:text-emerald-300" },
  admin_grant: { bg: "bg-blue-100 dark:bg-blue-500/20",     text: "text-blue-700 dark:text-blue-300" },
};

const PackageBadge = ({ code }: { code: string }) => {
  const key = code.toLowerCase();
  const cfg = PKG_CONFIG[key] ?? { bg: "bg-gray-100 dark:bg-gray-700/50", text: "text-gray-500 dark:text-gray-400" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-widest uppercase ${cfg.bg} ${cfg.text}`}>
      {code}
    </span>
  );
};

// ─── Skeleton ──────────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="animate-pulse rounded-2xl border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-white/[0.03] p-4 flex items-center gap-4">
    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800 shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3.5 w-28 rounded-full bg-gray-200 dark:bg-gray-800" />
      <div className="h-3 w-20 rounded-full bg-gray-200 dark:bg-gray-800" />
      <div className="h-3 w-16 rounded-full bg-gray-200 dark:bg-gray-800" />
    </div>
    <div className="w-[88px] h-9 rounded-xl bg-gray-200 dark:bg-gray-800 shrink-0" />
  </div>
);

// ─── Member Card ───────────────────────────────────────────────────────────────
const MemberCard = ({ member }: { member: AccessMember }) => {
  const navigate = useNavigate();
  const isActive = member.is_active && member.days_remaining > 0;

  return (
    <div className={`group relative flex items-center gap-4 rounded-2xl border bg-white dark:bg-white/[0.03] p-4 transition-all duration-200 ${
      isActive
        ? "border-gray-100 dark:border-gray-800/80 hover:border-pink-200 dark:hover:border-pink-500/30"
        : "border-gray-100/70 dark:border-gray-800/50 opacity-60"
    }`}>

      {/* Active accent strip */}
      {isActive && (
        <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-[#DC1F2E]/70" />
      )}

      {/* Avatar */}
      <div className="relative shrink-0 ml-1">
        <img
          src={member.profile_image}
          alt={member.member_name}
          className="w-12 h-12 rounded-full object-cover border-2 border-gray-100 dark:border-gray-800"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              `https://ui-avatars.com/api/?name=${encodeURIComponent(member.member_name)}&background=DC1F2E&color=fff&size=96`;
          }}
        />
        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${
          isActive ? "bg-emerald-400" : "bg-gray-400 dark:bg-gray-600"
        }`} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-bold text-sm text-gray-800 dark:text-white/90 truncate">
            {member.member_name}
          </span>
          {member.is_popular && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 border border-amber-200/60 dark:border-amber-500/20 text-[9px] font-bold text-amber-700 dark:text-amber-400 shrink-0">
              <IconStar /> Populer
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500">
            #{member.current_rank}
          </span>
          <PackageBadge code={member.last_package_code} />
        </div>

        <div className="flex items-center gap-1.5 mt-1.5">
          {isActive ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <IconClock />
              Aktif {member.days_remaining}h lagi
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-red-500">Expired</span>
          )}
        </div>
      </div>

      {/* Read button */}
<button
  onClick={() => navigate(`/pm/chat/${member.identifier}`)}
  disabled={!isActive}
  className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all duration-150 ${
    isActive
      ? "bg-[#DC1F2E] hover:bg-[#c41929] active:scale-95 text-white"
      : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
  }`}
>
  <IconMessageSquare size={13} />
  Baca Pesan
</button>
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function PMAccessPage() {
  const navigate = useNavigate();
  const [userId, setUserId]         = useState<string | null>(null);
  const [members, setMembers]       = useState<AccessMember[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeOnly, setActiveOnly] = useState(true);
  const [error, setError]           = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    const session = getStoredSession();
    if (!session) { navigate("/signin"); return; }
    setUserId(session.user.user_id);
  }, [navigate]);

  // Fetch
  const fetchAccess = useCallback(async (uid: string, active: boolean) => {
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/access/${uid}?apikey=${API_KEY}&active_only=${active}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.status) {
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
    if (userId) { setLoading(true); fetchAccess(userId, activeOnly); }
  }, [userId, activeOnly, fetchAccess]);

  const handleRefresh = () => {
    if (!userId) return;
    setRefreshing(true);
    fetchAccess(userId, activeOnly);
  };

  const activeCount  = members.filter(m => m.is_active && m.days_remaining > 0).length;
  const expiredCount = members.length - activeCount;

  return (
    <div>
      <PageMeta
        title="Private Message | GiStream"
        description="Akses Private Message member JKT48 yang kamu miliki."
      />
      <PageBreadcrumb pageTitle="Private Message" />

      <div className="space-y-4">

        {/* ── Top toolbar ── */}
        <div className="flex items-center justify-between gap-3">
          {/* Filter pills */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { if (!activeOnly) { setActiveOnly(true); } }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeOnly
                  ? "bg-[#DC1F2E] text-white shadow-sm shadow-red-500/20"
                  : "bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.1]"
              }`}
            >
              Aktif
              {activeOnly && activeCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/25 text-white text-[10px] font-black">
                  {activeCount}
                </span>
              )}
            </button>
            <button
              onClick={() => { if (activeOnly) { setActiveOnly(false); } }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                !activeOnly
                  ? "bg-[#DC1F2E] text-white shadow-sm shadow-red-500/20"
                  : "bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.1]"
              }`}
            >
              Semua
              {!activeOnly && members.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/25 text-white text-[10px] font-black">
                  {members.length}
                </span>
              )}
            </button>

            {/* Mini stats */}
            {!loading && members.length > 0 && (
              <span className="hidden sm:inline-flex items-center gap-3 ml-1 text-xs text-gray-400 dark:text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  {activeCount} aktif
                </span>
                {expiredCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                    {expiredCount} expired
                  </span>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              title="Refresh"
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.07] transition-all disabled:opacity-40"
            >
              <span className={refreshing ? "animate-spin" : ""}><IconRefresh /></span>
            </button>

            {/* Add / Buy PM */}
            <a
              href={SHOP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#DC1F2E] hover:bg-[#c41929] active:scale-95 text-white text-xs font-bold transition-all shadow-sm shadow-red-500/20"
            >
              <IconPlus size={14} />
              <span>Beli PM</span>
            </a>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="rounded-2xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            ⚠️ {error}
          </div>
        )}

        {/* ── List ── */}
        <div className="space-y-2.5">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-gray-300 dark:text-gray-700">
              <IconInbox />
              <div className="text-center">
                <p className="text-sm font-bold text-gray-500 dark:text-gray-500 mb-1">
                  {activeOnly ? "Tidak ada PM aktif" : "Belum ada PM"}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-600">
                  {activeOnly
                    ? "Semua PM sudah expired atau kamu belum punya PM aktif."
                    : "Kamu belum pernah membeli paket Private Message."}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {activeOnly && (
                  <button
                    onClick={() => setActiveOnly(false)}
                    className="text-xs text-pink-500 hover:underline font-semibold"
                  >
                    Lihat semua
                  </button>
                )}
                <a
                  href={SHOP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#DC1F2E] text-white text-xs font-bold hover:bg-[#c41929] transition-all"
                >
                  <IconPlus size={12} /> Beli PM Sekarang
                </a>
              </div>
            </div>
          ) : (
            members.map((member) => (
  <MemberCard key={member.identifier} member={member} />
))
          )}
        </div>

      </div>

      {/* ── FAB Beli PM (mobile) ── */}
      <a
        href={SHOP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-[#DC1F2E] text-white font-bold text-sm shadow-lg shadow-red-500/30 hover:bg-[#c41929] active:scale-95 transition-all xl:hidden"
      >
        <IconPlus size={18} />
        Beli PM
      </a>
    </div>
  );
}
