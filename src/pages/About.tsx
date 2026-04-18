import { Link } from "react-router";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";

// ─── SVG Icons ───────────────────────────────────────────────────────────────

const IconPlay = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const IconLink = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const IconSmartphone = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);

const IconGlobe = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const IconTag = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconZap = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const IconTheater = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 10s3-3 3-8h14c0 5 3 8 3 8" />
    <path d="M6 17c.83 1.17 1.79 2 3 2h6c1.21 0 2.17-.83 3-2" />
    <path d="M2 10h20v7a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5v-7z" />
  </svg>
);

const IconAlertTriangle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconInfo = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────

type BadgeColor = "pink" | "blue" | "green" | "orange" | "gray";

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  icon?: React.ReactNode;
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

interface StatCardProps {
  value: string;
  label: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const Badge = ({ children, color = "pink", icon }: BadgeProps) => {
  const colors: Record<BadgeColor, string> = {
    pink: "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
    green: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
    gray: "bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${colors[color]}`}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
};

const FeatureCard = ({ icon, title, desc }: FeatureCardProps) => (
  <div className="group flex gap-4 p-4 rounded-xl bg-gray-50 dark:bg-white/[0.04] hover:bg-pink-50 dark:hover:bg-pink-500/10 transition-colors duration-200 border border-transparent hover:border-pink-200 dark:hover:border-pink-500/20">
    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-white/10 shadow-sm text-pink-500 dark:text-pink-400">
      {icon}
    </div>
    <div>
      <p className="font-semibold text-gray-800 dark:text-white/90 text-sm mb-0.5">{title}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
    </div>
  </div>
);

const StatCard = ({ value, label }: StatCardProps) => (
  <div className="text-center p-4 rounded-xl bg-gradient-to-b from-pink-50 to-white dark:from-pink-500/10 dark:to-transparent border border-pink-100 dark:border-pink-500/20">
    <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">{value}</p>
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AboutGiStream() {
  return (
    <div>
      <PageMeta
        title="About GiStream | Platform Nonton Live Theater JKT48"
        description="Informasi lengkap tentang GiStream, platform unofficial menonton live stream theater JKT48 dengan harga terjangkau, didukung oleh JKT48Connect."
      />
      <PageBreadcrumb pageTitle="About GiStream" />

      <div className="space-y-6">

        {/* ── Hero ── */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-6 py-8 xl:px-10 xl:py-10">
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-gradient-to-br from-pink-400/10 to-orange-400/10 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-gradient-to-tr from-red-400/10 to-pink-400/10 blur-2xl" />
          </div>

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Logo */}
            <div className="relative flex-shrink-0">
              <Link to="/" className="block">
                <img
                  width={231}
                  height={48}
                  src="/images/logo/auth-logo.svg"
                  alt="GiStream Logo"
                  className="h-12 w-auto"
                />
              </Link>
              {/* Live dot */}
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 border-2 border-white dark:border-gray-900 animate-pulse" />
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90 sm:text-3xl">
                  GiStream
                </h1>
                <Badge
                  color="green"
                  icon={<span className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400 inline-block" />}
                >
                  Live Now
                </Badge>
                <Badge color="gray">Unofficial</Badge>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base leading-relaxed max-w-xl">
                Platform streaming tidak resmi untuk menonton{" "}
                <span className="font-semibold text-pink-600 dark:text-pink-400">
                  Live Theater JKT48
                </span>{" "}
                kapan saja dan di mana saja, dengan harga yang terjangkau untuk semua fans.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge color="orange" icon={<IconSmartphone />}>Android App</Badge>
                <Badge color="blue" icon={<IconGlobe />}>Website</Badge>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="relative grid grid-cols-3 gap-3 mt-8">
            <StatCard value="48+" label="Member JKT48" />
            <StatCard value="2x" label="Lebih Hemat" />
            <StatCard value="HD" label="Kualitas Stream" />
          </div>
        </div>

        {/* ── About Cards ── */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* What is GiStream */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-6 py-7 xl:px-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-pink-500 flex items-center justify-center shadow shadow-pink-500/30 text-white">
                <IconTheater />
              </div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
                Apa itu GiStream?
              </h2>
            </div>
            <div className="space-y-3 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              <p>
                <span className="font-semibold text-gray-700 dark:text-gray-300">GiStream</span> adalah
                platform <em>unofficial</em> yang memungkinkan para fans JKT48 — khususnya{" "}
                <strong className="text-pink-600 dark:text-pink-400">Wota</strong> — untuk menikmati
                siaran live theater JKT48 dengan harga yang jauh lebih terjangkau dibandingkan
                platform resmi.
              </p>
              <p>
                Theater JKT48 dikenal sebagai salah satu pengalaman terbaik bagi penggemar idol
                Indonesia. Namun tidak semua fans bisa hadir langsung atau membeli tiket stream
                dengan harga tinggi. GiStream hadir sebagai solusi alternatif yang ramah di kantong.
              </p>
              <p>
                Tersedia dalam dua platform:{" "}
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  aplikasi mobile Android
                </span>{" "}
                dan{" "}
                <span className="font-semibold text-blue-600 dark:text-blue-400">website</span>,
                sehingga fans bisa menonton dari perangkat manapun dengan nyaman.
              </p>
            </div>
          </div>

          {/* JKT48Connect */}
          <div className="rounded-2xl border border-blue-200 dark:border-blue-800/50 bg-gradient-to-b from-blue-50/50 to-white dark:from-blue-500/5 dark:to-white/[0.02] px-6 py-7 xl:px-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow shadow-blue-500/30 text-white">
                <IconLink />
              </div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
                Apa itu JKT48Connect?
              </h2>
            </div>
            <div className="space-y-3 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              <p>
                <span className="font-semibold text-blue-700 dark:text-blue-400">JKT48Connect</span>{" "}
                adalah ekosistem layanan dan API tidak resmi yang dikembangkan oleh komunitas
                fans JKT48. Platform ini menjadi jembatan antara data dan konten JKT48 dengan
                berbagai aplikasi fan-made.
              </p>
              <p>
                JKT48Connect menyediakan infrastruktur seperti{" "}
                <strong className="text-gray-700 dark:text-gray-300">
                  data member, jadwal pertunjukan, informasi setlist theater
                </strong>
                , hingga akses stream — yang kemudian dimanfaatkan oleh GiStream untuk menyajikan
                konten kepada para pengguna secara real-time.
              </p>
              <div className="mt-4 p-3 rounded-xl bg-blue-100/60 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                <div className="flex items-center gap-1.5 mb-1 text-blue-600 dark:text-blue-400">
                  <IconInfo />
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                    Peran JKT48Connect di GiStream
                  </p>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                  Website dan aplikasi Android GiStream menggunakan layanan JKT48Connect sebagai
                  backbone untuk mengambil data dan konten live stream theater secara real-time.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Features ── */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-6 py-7 xl:px-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center shadow shadow-pink-500/30 text-white">
              <IconZap />
            </div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
              Fitur Unggulan GiStream
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <FeatureCard
              icon={<IconTag />}
              title="Harga Terjangkau"
              desc="Nikmati live theater JKT48 dengan biaya yang lebih hemat, tanpa mengurangi kualitas pengalaman menonton."
            />
            <FeatureCard
              icon={<IconSmartphone />}
              title="Aplikasi Android"
              desc="Tersedia sebagai aplikasi mobile Android yang ringan dan mudah digunakan oleh semua kalangan fans."
            />
            <FeatureCard
              icon={<IconGlobe />}
              title="Versi Website"
              desc="Bisa diakses langsung lewat browser tanpa perlu install aplikasi apapun di perangkatmu."
            />
            <FeatureCard
              icon={<IconPlay />}
              title="Live Streaming"
              desc="Tonton siaran langsung pertunjukan theater JKT48 secara real-time dari manapun kamu berada."
            />
            <FeatureCard
              icon={<IconLink />}
              title="Didukung JKT48Connect"
              desc="Memanfaatkan ekosistem JKT48Connect untuk data member, jadwal, dan akses konten yang selalu up-to-date."
            />
            <FeatureCard
              icon={<IconUsers />}
              title="Untuk Semua Wota"
              desc="Dibangun oleh fans, untuk fans — agar semua Wota JKT48 bisa menikmati momen theater tanpa batas."
            />
          </div>
        </div>

        {/* ── Disclaimer ── */}
        <div className="rounded-2xl border border-amber-200 dark:border-amber-700/40 bg-amber-50/50 dark:bg-amber-500/5 px-6 py-5 xl:px-8">
          <div className="flex gap-3">
            <div className="flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400">
              <IconAlertTriangle />
            </div>
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-400 text-sm mb-1">
                Disclaimer
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed">
                GiStream adalah platform{" "}
                <strong>tidak resmi (unofficial)</strong> dan tidak berafiliasi langsung dengan
                JKT48 maupun manajemennya. Platform ini dibuat oleh komunitas fans sebagai bentuk
                dedikasi kepada JKT48. Selalu dukung JKT48 melalui kanal resmi mereka juga ya.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
