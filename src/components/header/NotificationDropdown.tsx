import { useState, useEffect, useRef } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Link } from "react-router";

const API_BASE = "https://v2.jkt48connect.com/api/jkt48connect";
const API_KEY = "JKTCONNECT";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  category: string;
  is_read: boolean;
  created_at: string;
  action_url?: string;
}

interface Session {
  isLoggedIn: boolean;
  token: string;
  user?: { user_id: string };
}

// ── Ganti fungsi getSession ────────────────────────────────────────────────
const getSession = (): Session | null => {
  try {
    // Cek sessionStorage dulu, lalu fallback ke localStorage
    const fromSession = JSON.parse(
      sessionStorage.getItem("userLogin") || "null"
    ) as Session | null;

    if (fromSession && fromSession.isLoggedIn && fromSession.token) {
      return fromSession;
    }

    const fromLocal = JSON.parse(
      localStorage.getItem("userLogin") || "null"
    ) as Session | null;

    if (fromLocal && fromLocal.isLoggedIn && fromLocal.token) {
      return fromLocal;
    }

    return null;
  } catch {
    return null;
  }
};

const formatRelative = (s: string): string => {
  if (!s) return "—";
  const diff = Date.now() - new Date(s).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} hari lalu`;
  return new Date(s).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const getTypeColor = (type: string): string => {
  if (type === "success") return "bg-success-500";
  if (type === "warning") return "bg-warning-500";
  if (type === "error") return "bg-error-500";
  return "bg-blue-500";
};

const getCategoryIcon = (category: string): string => {
  if (category === "membership") return "⭐";
  if (category === "payment") return "💳";
  if (category === "security") return "🔒";
  return "🔔";
};

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Cek session sinkron saat pertama render
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return getSession() !== null;
  });

  const hasFetched = useRef(false);

  const fetchNotifications = async () => {
    const session = getSession();
    if (!session) {
      setIsLoggedIn(false);
      return;
    }
    setIsLoggedIn(true);
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/notifications/${session.user?.user_id}?limit=10&apikey=${API_KEY}`,
        { headers: { Authorization: `Bearer ${session.token}` } }
      );
      const data = await res.json();
      if (data.status) {
        setNotifications(data.data?.notifications || []);
        setUnreadCount(data.data?.unread_count || 0);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const session = getSession();
    if (session) {
      setIsLoggedIn(true);
      if (!hasFetched.current) {
        hasFetched.current = true;
        fetchNotifications();
      }
    } else {
      setIsLoggedIn(false);
    }
  }, []);

  const markAllRead = async () => {
    const session = getSession();
    if (!session) return;
    try {
      await fetch(`${API_BASE}/notifications/read?apikey=${API_KEY}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          user_id: session.user?.user_id,
          mark_all: true,
        }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      /* silent */
    }
  };

  const markOneRead = async (id: number) => {
    const session = getSession();
    if (!session) return;
    try {
      await fetch(`${API_BASE}/notifications/read?apikey=${API_KEY}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          user_id: session.user?.user_id,
          notification_id: id,
        }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      /* silent */
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    fetchNotifications();
  };

  const closeDropdown = () => setIsOpen(false);

  const toggleDropdown = () => {
    if (!isOpen) handleOpen();
    else closeDropdown();
  };

  // ── Render: not logged in ──────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="relative">
        <button
          className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          onClick={toggleDropdown}
        >
          <BellIcon />
        </button>
        <Dropdown
          isOpen={isOpen}
          onClose={closeDropdown}
          className="absolute -right-[240px] mt-[17px] flex h-[200px] w-[350px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <BellIcon size={36} muted />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Login untuk melihat notifikasi.
            </p>
            <Link
              to="/signin"
              onClick={closeDropdown}
              className="px-4 py-2 text-xs font-semibold text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors"
            >
              Login Sekarang
            </Link>
          </div>
        </Dropdown>
      </div>
    );
  }

  // ── Render: logged in ──────────────────────────────────────────────────
  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full dropdown-toggle hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={toggleDropdown}
      >
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 flex">
            <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping" />
          </span>
        )}
        <BellIcon />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Notifikasi
            </h5>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-orange-400 text-white text-[10px] font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 font-medium transition"
              >
                Tandai dibaca
              </button>
            )}
            <button
              onClick={closeDropdown}
              className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Body */}
        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar gap-0.5">
          {loading && (
            <li className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-orange-400 rounded-full animate-spin" />
            </li>
          )}

          {!loading && notifications.length === 0 && (
            <li className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400 dark:text-gray-500">
              <BellIcon size={36} muted />
              <p className="text-sm">Belum ada notifikasi</p>
            </li>
          )}

          {!loading &&
            notifications.map((notif) => (
              <li key={notif.id}>
                <DropdownItem
                  onItemClick={() => {
                    if (!notif.is_read) markOneRead(notif.id);
                    closeDropdown();
                  }}
                  className={`flex gap-3 rounded-xl px-3 py-3 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer
                    ${!notif.is_read ? "bg-orange-50 dark:bg-orange-500/5" : ""}`}
                >
                  {/* Icon badge */}
                  <div className="relative flex-shrink-0 mt-0.5">
                    <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-base">
                      {getCategoryIcon(notif.category)}
                    </div>
                    {!notif.is_read && (
                      <span
                        className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-dark ${getTypeColor(notif.type)}`}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <span className="block flex-1 min-w-0">
                    <span
                      className={`mb-1 block text-sm leading-snug truncate
                        ${
                          !notif.is_read
                            ? "font-semibold text-gray-800 dark:text-white/90"
                            : "font-medium text-gray-700 dark:text-gray-300"
                        }`}
                    >
                      {notif.title}
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </span>
                    <span className="flex items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">
                      <span className="capitalize">
                        {notif.category || notif.type}
                      </span>
                      <span className="w-1 h-1 bg-gray-400 rounded-full" />
                      <span>{formatRelative(notif.created_at)}</span>
                    </span>
                  </span>
                </DropdownItem>
              </li>
            ))}
        </ul>

        {/* Footer */}
        <Link
          to="/profile"
          onClick={closeDropdown}
          className="block px-4 py-2 mt-3 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
        >
          Lihat Semua Notifikasi
        </Link>
      </Dropdown>
    </div>
  );
}

// ── Local icon components ──────────────────────────────────────────────────
function BellIcon({
  size = 20,
  muted = false,
}: {
  size?: number;
  muted?: boolean;
}) {
  return (
    <svg
      className={muted ? "text-gray-300 dark:text-gray-600" : "fill-current"}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className="fill-current"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
        fill="currentColor"
      />
    </svg>
  );
}
