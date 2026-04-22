import { useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { MoreDotIcon } from "../../icons";

const VIDEO_URL =
  "https://img.jkt48connect.com/videos/jkt48/YTDown.com_YouTube_JKT48-FIGHT_Media_4ckrU8qqblY_001_1080p.mp4";

// ─── Icons (SVG inline) ─────────────────────────────────────────────
const TheaterIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 10s3-3 3-8" />
    <path d="M22 10s-3-3-3-8" />
    <path d="M10 2c0 4.4-3.6 8-8 8" />
    <path d="M14 2c0 4.4 3.6 8 8 8" />
    <path d="M2 10s2 2 2 5" />
    <path d="M22 10s-2 2-2 5" />
    <path d="M8 15h8" />
    <path d="M2 22s2-4 8-4 8 4 8 4" />
  </svg>
);

const UsersIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const MicIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const MapPinIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const CalendarIcon = () => (
  <svg
    className="w-4 h-4"
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

const MusicIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const BuildingIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <line x1="9" y1="6" x2="9" y2="6" />
    <line x1="15" y1="6" x2="15" y2="6" />
    <line x1="9" y1="10" x2="9" y2="10" />
    <line x1="15" y1="10" x2="15" y2="10" />
    <line x1="9" y1="14" x2="9" y2="14" />
    <line x1="15" y1="14" x2="15" y2="14" />
    <path d="M10 22v-4h4v4" />
  </svg>
);

const StarIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export default function VideoOpening() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="px-5 pt-5 bg-white shadow-default rounded-2xl pb-8 dark:bg-gray-900 sm:px-6 sm:pt-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 sm:text-xl">
              JKT48
            </h3>
            <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
              Indonesia's Largest Idol Group
            </p>
          </div>
          <div className="relative inline-block">
            <button
              className="dropdown-toggle"
              onClick={() => setIsOpen(!isOpen)}
            >
              <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 size-6" />
            </button>
            <Dropdown
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              className="w-40 p-2"
            >
              <DropdownItem
                onItemClick={() => setIsOpen(false)}
                className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
              >
                Refresh
              </DropdownItem>
            </Dropdown>
          </div>
        </div>

        {/* Content Grid: Video + Description */}
        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8 lg:items-center">
          {/* Video */}
          <div
            className="relative overflow-hidden rounded-xl w-full"
            style={{ aspectRatio: "16/9" }}
          >
            <video
              src={VIDEO_URL}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          </div>

          {/* Description + Tagline */}
          <div className="flex flex-col justify-center text-center lg:text-left">
            <div className="flex items-center gap-2 justify-center lg:justify-start">
              <div className="p-2 rounded-lg bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400">
                <TheaterIcon />
              </div>
              <h4 className="text-xl font-bold text-gray-800 dark:text-white/90 sm:text-2xl">
                Tentang JKT48
              </h4>
            </div>

            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 sm:text-base leading-relaxed">
              JKT48 adalah grup idola asal Jakarta yang berdiri sejak{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                2011
              </span>
              , menjadi{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                sister group internasional pertama AKB48
              </span>{" "}
              di luar Jepang. Dengan konsep "Idol You Can Meet", JKT48 rutin
              menggelar pertunjukan theater di JKT48 Theater, fX Sudirman.
            </p>

            {/* Badges */}
            <div className="mt-4 flex flex-wrap gap-2 justify-center lg:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-50 px-3 py-1 text-xs font-medium text-pink-600 dark:bg-pink-500/10 dark:text-pink-400">
                <TheaterIcon />
                Theater Show
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                <UsersIcon />
                50+ Member
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <MicIcon />
                14 Generasi
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                <StarIcon />
                Sister Group AKB48
              </span>
            </div>

            {/* Stats Mini */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-white/[0.02]">
                <p className="text-xs text-gray-500 dark:text-gray-400">Active Since</p>
                <p className="mt-1 text-lg font-bold text-gray-800 dark:text-white/90">
                  13+ Thn
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-white/[0.02]">
                <p className="text-xs text-gray-500 dark:text-gray-400">Single</p>
                <p className="mt-1 text-lg font-bold text-gray-800 dark:text-white/90">
                  26th
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-white/[0.02]">
                <p className="text-xs text-gray-500 dark:text-gray-400">Setlist</p>
                <p className="mt-1 text-lg font-bold text-gray-800 dark:text-white/90">
                  30
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom — JKT48 Info (6 kolom) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 px-5 py-5 sm:px-6 sm:py-6">
        {/* Grup */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-2 p-2 rounded-lg bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400">
            <UsersIcon />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Grup</p>
          <p className="text-sm font-semibold text-gray-800 dark:text-white/90 sm:text-base whitespace-nowrap">
            JKT48
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 whitespace-nowrap">
            Jakarta, Indonesia
          </p>
        </div>

        {/* Debut */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-2 p-2 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
            <CalendarIcon />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Debut</p>
          <p className="text-sm font-semibold text-gray-800 dark:text-white/90 sm:text-base whitespace-nowrap">
            2011
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 whitespace-nowrap">
            Sister AKB48
          </p>
        </div>

        {/* Theater */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-2 p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
            <BuildingIcon />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Theater</p>
          <p className="text-sm font-semibold text-gray-800 dark:text-white/90 sm:text-base whitespace-nowrap">
            fX Sudirman
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 whitespace-nowrap">
            Jakarta Pusat
          </p>
        </div>

        {/* Lokasi */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-2 p-2 rounded-lg bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400">
            <MapPinIcon />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Lokasi</p>
          <p className="text-sm font-semibold text-gray-800 dark:text-white/90 sm:text-base whitespace-nowrap">
            Lt. 4 fX
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 whitespace-nowrap">
            Sudirman, Jaksel
          </p>
        </div>

        {/* Genre */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-2 p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
            <MusicIcon />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Genre</p>
          <p className="text-sm font-semibold text-gray-800 dark:text-white/90 sm:text-base whitespace-nowrap">
            J-Pop Idol
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 whitespace-nowrap">
            Pop & Dance
          </p>
        </div>

        {/* Agensi */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-2 p-2 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
            <StarIcon />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Agensi</p>
          <p className="text-sm font-semibold text-gray-800 dark:text-white/90 sm:text-base whitespace-nowrap">
            IDN
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 whitespace-nowrap">
            Sejak 2020
          </p>
        </div>
      </div>
    </div>
  );
}
