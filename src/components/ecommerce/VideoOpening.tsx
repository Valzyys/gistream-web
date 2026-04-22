import { useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { MoreDotIcon } from "../../icons";

const VIDEO_URL =
  "https://img.jkt48connect.com/videos/jkt48/YTDown.com_YouTube_JKT48-FIGHT_Media_4ckrU8qqblY_001_1080p.mp4";

export default function VideoOpening() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="px-5 pt-5 bg-white shadow-default rounded-2xl pb-11 dark:bg-gray-900 sm:px-6 sm:pt-6">
        {/* Header */}
        <div className="flex justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              JKT48
            </h3>
            <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
              Indonesia's Largest Idol Group
            </p>
          </div>
          <div className="relative inline-block">
            <button className="dropdown-toggle" onClick={() => setIsOpen(!isOpen)}>
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

        {/* Video */}
        <div className="relative mt-4 overflow-hidden rounded-xl" style={{ aspectRatio: "16/9" }}>
          <video
            src={VIDEO_URL}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        </div>

        {/* Description */}
        <p className="mx-auto mt-6 w-full max-w-[380px] text-center text-sm text-gray-500 sm:text-base">
          Grup idola asal Jakarta yang berdiri sejak 2011, sister group pertama AKB48 di luar Jepang.
        </p>
      </div>

      {/* Bottom — JKT48 Info */}
      <div className="flex items-center justify-center gap-5 px-6 py-3.5 sm:gap-8 sm:py-5">
        <div className="text-center">
          <p className="mb-1 text-gray-500 text-theme-xs dark:text-gray-400 sm:text-sm">Grup</p>
          <p className="text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">JKT48</p>
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-0.5">Jakarta, Indonesia</p>
        </div>

        <div className="w-px bg-gray-200 h-7 dark:bg-gray-800" />

        <div className="text-center">
          <p className="mb-1 text-gray-500 text-theme-xs dark:text-gray-400 sm:text-sm">Debut</p>
          <p className="text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">2011</p>
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-0.5">sister group AKB48</p>
        </div>

        <div className="w-px bg-gray-200 h-7 dark:bg-gray-800" />

        <div className="text-center">
          <p className="mb-1 text-gray-500 text-theme-xs dark:text-gray-400 sm:text-sm">Theater</p>
          <p className="text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">FX Sudirman</p>
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-0.5">Jakarta Pusat</p>
        </div>
      </div>
    </div>
  );
}
