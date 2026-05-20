import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import PageMeta from "../components/common/PageMeta";

// ── Config ────────────────────────────────────────────────────────────────────
const THEATER_DETAIL_API = "https://v2.jkt48connect.com/api/jkt48/theater";
const API_KEY = "JKTCONNECT";

const DEFAULT_IMG =
  "https://res.cloudinary.com/haymzm4wp/image/upload/v1760105848/bi5ej2hgh0cc2uowu5xr.jpg";

// ── Types ─────────────────────────────────────────────────────────────────────
interface MemberLineup {
  id: string;
  name: string;
  url_key: string;
}

interface Jkt48Member {
  name: string;
  type: string;
  member_id: number;
  img: string;
  img_alt: string;
  jikosokai: string | null;
}

interface SalesPricingItem {
  label: string;
  price: number;
  quota: number;
  is_ofc_only: boolean;
}

interface SalesPeriod {
  label: string;
  start_date: string;
  end_date: string;
  sales_method: string;
  pricing: SalesPricingItem[];
}

interface TheaterShowDetail {
  success: boolean;
  author: string;
  detail_type: string;
  reference_code: string;
  banner: string;
  poster: string;
  lineup: MemberLineup[];
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  status: boolean;
  content_body: string | null;
  short_description: string | null;
  jkt48_member_type: string;
  jkt48_member: Jkt48Member[];
  default_price: number;
  total_quota: number;
  max_purchase: number;
  sales_period: SalesPeriod[];
  valid_date_from: string;
  valid_date_to: string | null;
  theater_show_id: number;
  set_list: string;
  seating_layout: string;
  reception_start_time: string;
  reception_end_time: string | null;
  is_birthday_show: boolean;
  birthday_members: any[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDate = (dateStr: string, timeStr?: string) => {
  const date = new Date(dateStr);
  const formatted = date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return timeStr ? `${formatted}, ${timeStr} WIB` : formatted;
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);

const formatDateShort = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

const formatTime = (dateStr: string) =>
  new Date(dateStr).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const IconCalendar = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const IconClock = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconTicket = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);
const IconUsers = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconMapPin = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
);
const IconMusic = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
  </svg>
);
const IconInfo = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);
const IconTag = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);
const IconChevronLeft = ({ size = 18, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const IconAlert = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const IconStar = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const IconExternalLink = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

// ── Notice Box ────────────────────────────────────────────────────────────────
function NoticeBox() {
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
      <div className="bg-[#0e8080] dark:bg-[#0a6060] px-4 py-3 flex items-center gap-2">
        <IconAlert size={15} color="#fff" />
        <span className="text-sm font-bold text-white">Harap diperhatikan</span>
      </div>
      <div className="bg-[#e8f7f7] dark:bg-[#0a2f2f] px-5 py-4">
        <ul className="space-y-2.5 text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#0e8080] flex-shrink-0" />
            Satu email hanya berlaku untuk satu orang
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#0e8080] flex-shrink-0" />
            <span>
              Pemesanan akan dianggap batal apabila:<br />
              <span className="text-gray-600 dark:text-gray-400">Nama yang tertulis di email pemesanan tidak sama dengan nama yang ada di ID.</span><br />
              <span className="text-gray-600 dark:text-gray-400">Pemesan tidak datang untuk mengambil tiket pada hari H.</span>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#0e8080] flex-shrink-0" />
            Pendaftar wajib mendaftar sebagai anggota gratis atau fan club terlebih dahulu. Pembelian berlipat ganda yang dilakukan oleh pendaftar dan pendamping akan dianggap sebagai pembelian satu kali.
          </li>
        </ul>
      </div>
    </div>
  );
}

// ── Member Card ───────────────────────────────────────────────────────────────
function MemberCard({ member }: { member: Jkt48Member }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <div className="flex flex-col items-center gap-2 group">
      <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm group-hover:shadow-md transition-shadow">
        <img
          src={imgErr ? DEFAULT_IMG : member.img}
          alt={member.name}
          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
          onError={() => setImgErr(true)}
        />
        {member.type && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-[#DC1F2E] text-white tracking-wide">
            {member.type}
          </div>
        )}
      </div>
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight line-clamp-2">
        {member.name}
      </p>
    </div>
  );
}

// ── Sales Period Timeline ─────────────────────────────────────────────────────
function SalesPeriodRow({ period, isLast }: { period: SalesPeriod; isLast: boolean }) {
  const now = Date.now();
  const start = new Date(period.start_date).getTime();
  const end = new Date(period.end_date).getTime();
  const isActive = now >= start && now <= end;
  const isEnded = now > end;

  return (
    <div className={`relative flex gap-4 pb-${isLast ? "0" : "5"}`}>
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
      )}
      {/* Dot */}
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border-2 z-10 ${
        isActive
          ? "bg-green-500 border-green-400 shadow-lg shadow-green-500/30"
          : isEnded
          ? "bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
          : "bg-white dark:bg-gray-900 border-[#DC1F2E]"
      }`}>
        {isActive ? (
          <div className="w-2.5 h-2.5 rounded-full bg-white" />
        ) : isEnded ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <div className="w-2.5 h-2.5 rounded-full bg-[#DC1F2E]" />
        )}
      </div>

      <div className="flex-1 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-gray-800 dark:text-white">{period.label}</span>
          {isActive && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30">
              AKTIF
            </span>
          )}
          {isEnded && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              SELESAI
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
            {period.sales_method}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2.5">
          {formatDateShort(period.start_date)} {formatTime(period.start_date)} — {formatDateShort(period.end_date)} {formatTime(period.end_date)}
        </p>
        <div className="flex flex-col gap-1.5">
          {period.pricing.map((price, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{price.label}</span>
                {price.is_ofc_only && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                    OFC
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-gray-400 dark:text-gray-500">{price.quota} tiket</span>
                <span className="text-sm font-black text-[#DC1F2E]">{formatPrice(price.price)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="w-full aspect-[21/9] rounded-2xl bg-gray-200 dark:bg-gray-800" />
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-4">
          <div className="h-8 w-2/3 rounded-xl bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-1/2 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-gray-200 dark:bg-gray-800" />)}
          </div>
        </div>
        <div className="h-64 rounded-2xl bg-gray-200 dark:bg-gray-800" />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const TheaterShowDetailPage: React.FC = () => {
  const { showId } = useParams<{ showId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<TheaterShowDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bannerLoaded, setBannerLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "lineup" | "penjualan">("info");

  useEffect(() => {
    if (!showId) { setError("Show ID tidak ditemukan"); setLoading(false); return; }
    const fetchDetail = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${THEATER_DETAIL_API}/${showId}?apikey=${API_KEY}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: TheaterShowDetail = await res.json();
        if (!json.success) throw new Error("API returned error");
        setData(json);
      } catch (e: any) {
        setError(e.message || "Gagal memuat data show");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [showId]);

  // ── Error ──
  if (!loading && error) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] min-h-[60vh] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <IconAlert size={24} color="#DC1F2E" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white/90 mb-2">Show Tidak Ditemukan</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate("/jadwal")}
            className="px-5 py-2.5 rounded-xl bg-[#DC1F2E] text-white text-sm font-bold cursor-pointer hover:bg-red-700 shadow-lg shadow-red-500/25 transition-all hover:-translate-y-0.5 border-0"
          >
            Kembali ke Jadwal
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {data && (
        <PageMeta
          title={`${data.title} | JKT48Connect`}
          description={`Detail jadwal show ${data.title} — ${formatDate(data.date, data.start_time)}`}
        />
      )}

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">

        {/* ── Back bar ── */}
        <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
          <button
            onClick={() => navigate("/jadwal")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-600 dark:text-gray-400 text-xs font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <IconChevronLeft size={13} />
            Jadwal
          </button>
          {data && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-[11px] font-black px-2 py-1 rounded-lg bg-[#DC1F2E]/10 text-[#DC1F2E] border border-[#DC1F2E]/20">
                {data.detail_type}
              </span>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300 truncate">{data.title}</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-5 xl:p-7"><Skeleton /></div>
        ) : data ? (
          <>
            {/* ── Banner ── */}
            <div className="relative w-full" style={{ aspectRatio: "21/9", maxHeight: 420, overflow: "hidden" }}>
              {!bannerLoaded && (
                <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse" />
              )}
              <img
                src={data.banner || data.poster || DEFAULT_IMG}
                alt={data.title}
                className="w-full h-full object-cover"
                style={{ display: bannerLoaded ? "block" : "none" }}
                onLoad={() => setBannerLoaded(true)}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = data.poster || DEFAULT_IMG;
                  setBannerLoaded(true);
                }}
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {/* Overlay badges */}
              <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1.5 rounded-full text-xs font-black bg-[#DC1F2E] text-white shadow-lg">
                  {data.detail_type}
                </span>
                {data.is_birthday_show && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-black bg-amber-500 text-white shadow-lg flex items-center gap-1">
                    <IconStar size={11} color="#fff" /> Birthday Show
                  </span>
                )}
                {data.jkt48_member_type && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-black bg-white/20 backdrop-blur-sm text-white border border-white/30">
                    {data.jkt48_member_type}
                  </span>
                )}
              </div>

              {/* Bottom title on banner */}
              <div className="absolute bottom-0 left-0 right-0 px-5 py-5">
                <h1 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-lg mb-1">
                  {data.title}
                </h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1.5 text-white/80 text-xs font-semibold">
                    <IconCalendar size={13} color="rgba(255,255,255,0.7)" />
                    {formatDate(data.date, data.start_time)}
                  </span>
                  <span className="flex items-center gap-1.5 text-white/80 text-xs font-semibold">
                    <IconTag size={13} color="rgba(255,255,255,0.7)" />
                    {data.reference_code}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Content ── */}
            <div className="p-5 xl:p-7">
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-7">

                {/* ── LEFT ── */}
                <div className="flex flex-col gap-6">

                  {/* Tabs */}
                  <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-white/[0.04] w-fit">
                    {(["info", "lineup", "penjualan"] as const).map((tab) => {
                      const labels = { info: "Info", lineup: `Lineup (${data.lineup.length})`, penjualan: "Penjualan" };
                      return (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`px-4 py-2 rounded-lg text-xs font-bold border-0 cursor-pointer transition-all ${
                            activeTab === tab
                              ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                              : "bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                          }`}
                        >
                          {labels[tab]}
                        </button>
                      );
                    })}
                  </div>

                  {/* TAB: INFO */}
                  {activeTab === "info" && (
                    <div className="flex flex-col gap-5">

                      {/* Quick stats */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          {
                            icon: <IconCalendar size={18} color="#465FFF" />,
                            label: "Tanggal",
                            value: new Date(data.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
                            bg: "rgba(70,95,255,0.06)", border: "rgba(70,95,255,0.15)",
                          },
                          {
                            icon: <IconClock size={18} color="#0e8080" />,
                            label: "Waktu",
                            value: `${data.start_time}–${data.end_time} WIB`,
                            bg: "rgba(14,128,128,0.06)", border: "rgba(14,128,128,0.15)",
                          },
                          {
                            icon: <IconTicket size={18} color="#DC1F2E" />,
                            label: "Harga",
                            value: formatPrice(data.default_price),
                            bg: "rgba(220,31,46,0.06)", border: "rgba(220,31,46,0.15)",
                          },
                          {
                            icon: <IconUsers size={18} color="#f59e0b" />,
                            label: "Kuota",
                            value: `${data.total_quota} tiket`,
                            bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.15)",
                          },
                        ].map((item, i) => (
                          <div
                            key={i}
                            className="flex flex-col gap-2.5 p-4 rounded-2xl border"
                            style={{ background: item.bg, borderColor: item.border }}
                          >
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: item.bg, border: `1px solid ${item.border}` }}>
                              {item.icon}
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">{item.label}</p>
                              <p className="text-sm font-black text-gray-800 dark:text-white leading-tight">{item.value}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Detail rows */}
                      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-gray-800">
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Detail Teknis</p>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                          {[
                            { label: "Reference Code", value: data.reference_code, mono: true },
                            { label: "Theater Show ID", value: String(data.theater_show_id), mono: true },
                            { label: "Set List", value: data.set_list, mono: true },
                            { label: "Seating Layout", value: data.seating_layout },
                            { label: "Waktu Resepsi", value: data.reception_start_time + (data.reception_end_time ? ` – ${data.reception_end_time}` : "") },
                            { label: "Maks Pembelian", value: `${data.max_purchase} tiket per orang` },
                            { label: "Member Type", value: data.jkt48_member_type },
                          ].map((row, i) => (
                            <div key={i} className="flex items-center justify-between px-4 py-3">
                              <span className="text-sm text-gray-500 dark:text-gray-400">{row.label}</span>
                              <span className={`text-sm font-semibold text-gray-800 dark:text-white ${row.mono ? "font-mono" : ""}`}>
                                {row.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Notice */}
                      <NoticeBox />

                      {/* Description */}
                      {data.content_body && (
                        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Deskripsi</p>
                          <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: data.content_body }} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: LINEUP */}
                  {activeTab === "lineup" && (
                    <div className="flex flex-col gap-4">
                      {data.jkt48_member.length === 0 ? (
                        <div className="flex flex-col items-center py-16 gap-3">
                          <IconUsers size={40} color="#d1d5db" />
                          <p className="text-sm text-gray-400 dark:text-gray-500">Lineup belum tersedia</p>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                              {data.jkt48_member.length} Member Tampil
                            </p>
                            <span className="text-[11px] px-2 py-1 rounded-full bg-[#DC1F2E]/10 text-[#DC1F2E] font-bold border border-[#DC1F2E]/20">
                              {data.jkt48_member_type}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                            {data.jkt48_member.map((member) => (
                              <MemberCard key={member.member_id} member={member} />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* TAB: PENJUALAN */}
                  {activeTab === "penjualan" && (
                    <div className="flex flex-col gap-4">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Periode Penjualan
                      </p>
                      {data.sales_period.length === 0 ? (
                        <div className="flex flex-col items-center py-16 gap-3">
                          <IconTicket size={40} color="#d1d5db" />
                          <p className="text-sm text-gray-400 dark:text-gray-500">Tidak ada periode penjualan</p>
                        </div>
                      ) : (
                        <div className="pl-2">
                          {data.sales_period.map((period, idx) => (
                            <SalesPeriodRow
                              key={idx}
                              period={period}
                              isLast={idx === data.sales_period.length - 1}
                            />
                          ))}
                        </div>
                      )}

                      {/* Valid dates */}
                      <div className="mt-2 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-gray-800">
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Masa Berlaku</p>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                          <div className="flex items-center justify-between px-4 py-3">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Mulai Berlaku</span>
                            <span className="text-sm font-semibold text-gray-800 dark:text-white">
                              {formatDateShort(data.valid_date_from)} {formatTime(data.valid_date_from)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between px-4 py-3">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Berakhir</span>
                            <span className="text-sm font-semibold text-gray-800 dark:text-white">
                              {data.valid_date_to ? `${formatDateShort(data.valid_date_to)} ${formatTime(data.valid_date_to)}` : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* ── RIGHT SIDEBAR ── */}
                <div className="flex flex-col gap-4 xl:sticky xl:top-4 xl:self-start">

                  {/* Poster */}
                  <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm">
                    <img
                      src={data.poster || DEFAULT_IMG}
                      alt={data.title}
                      className="w-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }}
                    />
                  </div>

                  {/* Buy button area */}
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-gray-800">
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Tiket</p>
                    </div>
                    <div className="p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Harga</span>
                        <span className="text-lg font-black text-[#DC1F2E]">{formatPrice(data.default_price)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Total Kuota</span>
                        <span className="text-sm font-bold text-gray-800 dark:text-white">{data.total_quota} tiket</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Maks. Beli</span>
                        <span className="text-sm font-bold text-gray-800 dark:text-white">{data.max_purchase} tiket</span>
                      </div>

                      <div className="pt-1 pb-0.5 border-t border-gray-100 dark:border-gray-800 mt-1">
                        {/* Check if any active sale period */}
                        {(() => {
                          const now = Date.now();
                          const hasActiveSale = data.sales_period.some(
                            (p) => now >= new Date(p.start_date).getTime() && now <= new Date(p.end_date).getTime()
                          );
                          const allEnded = data.sales_period.length > 0 && data.sales_period.every(
                            (p) => now > new Date(p.end_date).getTime()
                          );
                          if (allEnded) {
                            return (
                              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                                <IconAlert size={14} color="#9ca3af" />
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                  Maaf, tidak ada tiket yang dapat dibeli saat ini
                                </span>
                              </div>
                            );
                          }
                          return (
                            <a
                              href="https://jkt48.com/theater/schedule"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#e84c8b] hover:bg-[#d43d7b] text-white text-sm font-bold cursor-pointer shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:-translate-y-0.5 transition-all duration-200 no-underline"
                              style={{ textDecoration: "none" }}
                            >
                              <IconTicket size={15} color="white" />
                              Beli Tiket Show
                              <IconExternalLink size={13} color="rgba(255,255,255,0.7)" />
                            </a>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Set list & layout info */}
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-gray-800">
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Show Info</p>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                          <IconMusic size={14} color="#8b5cf6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Set List</p>
                          <p className="text-sm font-bold text-gray-800 dark:text-white">{data.set_list}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                          <IconMapPin size={14} color="#3b82f6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Seating</p>
                          <p className="text-sm font-bold text-gray-800 dark:text-white">{data.seating_layout}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-500/10 flex items-center justify-center flex-shrink-0">
                          <IconClock size={14} color="#22c55e" />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Waktu Resepsi</p>
                          <p className="text-sm font-bold text-gray-800 dark:text-white">{data.reception_start_time} WIB</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                          <IconInfo size={14} color="#f59e0b" />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Author</p>
                          <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">{data.author}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
};

export default TheaterShowDetailPage;
