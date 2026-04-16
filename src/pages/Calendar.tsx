import { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventInput, EventClickArg } from "@fullcalendar/core";
import { Modal } from "../components/ui/modal";
import { useModal } from "../hooks/useModal";
import PageMeta from "../components/common/PageMeta";

const API_URL =
  "https://v2.jkt48connect.com/api/jkt48/idnplus?apikey=JKTCONNECT";

interface IdnShow {
  slug: string;
  title: string;
  image_url: string;
  status: "scheduled" | "live" | string;
  scheduled_at: number;
  live_at: number;
  end_at: number;
  showId: string;
  idnliveplus: {
    liveroom_price: number;
    currency_code: string;
    description: string;
    audience_limit: number | null;
    exp: number;
  };
  creator: {
    name: string;
    image_url: string;
  };
}

interface CalendarEvent extends EventInput {
  extendedProps: {
    show: IdnShow;
  };
}

const statusColor: Record<string, string> = {
  live: "#DC1F2E",
  scheduled: "#465FFF",
};

const ShowSchedule: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedShow, setSelectedShow] = useState<IdnShow | null>(null);
  const [loading, setLoading] = useState(true);
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();

  useEffect(() => {
    const fetchShows = async () => {
      try {
        const res = await fetch(API_URL);
        const json = await res.json();
        if (json.status === 200 && Array.isArray(json.data)) {
          const mapped: CalendarEvent[] = json.data.map((show: IdnShow) => {
            const startDate = show.scheduled_at
              ? new Date(show.scheduled_at * 1000)
              : new Date(show.live_at * 1000);

            return {
              id: show.slug,
              title: show.title,
              start: startDate.toISOString(),
              backgroundColor:
                statusColor[show.status] ?? "#6b7280",
              borderColor:
                statusColor[show.status] ?? "#6b7280",
              textColor: "#ffffff",
              extendedProps: { show },
            };
          });
          setEvents(mapped);
        }
      } catch (e) {
        console.error("Error fetching shows:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchShows();
  }, []);

  const handleEventClick = (clickInfo: EventClickArg) => {
    const show = clickInfo.event.extendedProps.show as IdnShow;
    setSelectedShow(show);
    openModal();
  };

  const formatDate = (ts: number) => {
    if (!ts) return "-";
    return new Date(ts * 1000).toLocaleString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }) + " WIB";
  };

  return (
    <>
      <PageMeta
        title="Jadwal Show JKT48 | GiStream"
        description="Jadwal show JKT48 dari IDN Live Plus — GiStream JKT48Connect"
      />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-500/10">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#465FFF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-white">
                Jadwal Show JKT48
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Data dari IDN Live Plus
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="hidden sm:flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DC1F2E]" />
              Live
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#465FFF]" />
              Scheduled
            </span>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center gap-3 py-16 text-gray-400 dark:text-gray-500">
            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Memuat jadwal show...</span>
          </div>
        )}

        {/* Calendar */}
        {!loading && (
          <div className="custom-calendar p-2">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              locale="id"
              buttonText={{
                today: "Hari Ini",
                month: "Bulan",
                week: "Minggu",
                day: "Hari",
              }}
              events={events}
              eventClick={handleEventClick}
              eventContent={renderEventContent}
              height="auto"
            />
          </div>
        )}
      </div>

      {/* Modal Detail Show */}
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-[560px] p-0 overflow-hidden"
      >
        {selectedShow && (
          <div className="flex flex-col">
            {/* Poster */}
            <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <img
                src={selectedShow.image_url}
                alt={selectedShow.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://res.cloudinary.com/haymzm4wp/image/upload/v1760105848/bi5ej2hgh0cc2uowu5xr.jpg";
                }}
              />
              {/* Status badge */}
              <span
                className={`absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white ${
                  selectedShow.status === "live"
                    ? "bg-[#DC1F2E]"
                    : "bg-[#465FFF]"
                }`}
              >
                {selectedShow.status === "live" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
                {selectedShow.status === "live" ? "LIVE" : "SCHEDULED"}
              </span>

              {/* Show ID */}
              <span className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs font-mono px-2 py-1 rounded-md">
                {selectedShow.showId}
              </span>
            </div>

            {/* Content */}
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">
                {selectedShow.title}
              </h3>

              {selectedShow.idnliveplus?.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 whitespace-pre-line">
                  {selectedShow.idnliveplus.description}
                </p>
              )}

              {/* Info grid */}
              <div className="grid grid-cols-1 gap-3 mb-5">
                {/* Scheduled */}
                {selectedShow.scheduled_at > 0 && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex-shrink-0">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#465FFF"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">
                        Jadwal Show
                      </p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {formatDate(selectedShow.scheduled_at)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Price */}
                {selectedShow.idnliveplus && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-yellow-50 dark:bg-yellow-500/10 flex-shrink-0">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v12" />
                        <path d="M15 9.5a3.5 3.5 0 0 0-6 0" />
                        <path d="M9 14.5a3.5 3.5 0 0 0 6 0" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">
                        Harga Tiket
                      </p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {selectedShow.idnliveplus.liveroom_price}{" "}
                        <span className="uppercase text-yellow-500 font-semibold">
                          {selectedShow.idnliveplus.currency_code}
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Audience limit */}
                {selectedShow.idnliveplus?.audience_limit !== null && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-50 dark:bg-green-500/10 flex-shrink-0">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">
                        Batas Penonton
                      </p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {selectedShow.idnliveplus.audience_limit ?? "Tidak terbatas"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {/* Footer buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
                >
                  Tutup
                </button>
                <a
                  href={`/live/${selectedShow.slug}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-sm font-semibold text-white transition-colors"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="white"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Tonton Show
                </a>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

const renderEventContent = (eventInfo: any) => {
  const show: IdnShow = eventInfo.event.extendedProps.show;
  const isLive = show.status === "live";

  return (
    <div className="flex items-center gap-1.5 px-1.5 py-0.5 w-full overflow-hidden">
      {isLive && (
        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
      )}
      <span className="text-xs font-medium text-white truncate">
        {eventInfo.event.title}
      </span>
    </div>
  );
};

export default ShowSchedule;
