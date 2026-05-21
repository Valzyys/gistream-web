import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";

const API_BASE   = "https://v2.jkt48connect.com/api/jkt48connect";
const API_KEY    = "JKTCONNECT";
const TICKET_API = "https://v2.jkt48connect.com/api/tickets";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Order dari membership API */
interface MembershipOrder {
  order_id: string;
  plan_name: string;
  final_amount: number | string;
  status: string;
  created_at: string;
  paid_at?: string;
  membership_expired_at?: string;
}

/** Tiket dari tickets API */
interface TicketOrder {
  ticket_id: string;
  show_id: string;
  show_title: string;
  show_source: string;
  show_image: string;
  show_date: string;
  ref_id: string;
  amount: number;
  method: string;
  method_name: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  expired_at: string;
}

/** Row yang dinormalisasi untuk tabel — bisa dari dua sumber */
interface NormalizedRow {
  id: string;
  type: "membership" | "ticket";
  title: string;
  subtitle: string;         // order_id tail / ref_id tail
  amount: number;
  status: string;
  created_at: string;
  paid_at?: string | null;
  extra?: string;           // membership_expired_at / show_date
  image?: string;           // show_image untuk tiket
  method_name?: string;     // metode pembayaran tiket
}

interface Session {
  isLoggedIn: boolean;
  token: string;
  user?: { user_id: string };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const getSession = (): Session | null => {
  try {
    const d =
      (JSON.parse(sessionStorage.getItem("userLogin") || "null") as Session | null) ||
      (JSON.parse(localStorage.getItem("userLogin") || "null") as Session | null);
    if (d && d.isLoggedIn && d.token) return d;
    return null;
  } catch { return null; }
};

const formatDate = (s: string | null | undefined): string => {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("id-ID", {
    year: "numeric", month: "short", day: "numeric",
  });
};

const formatRelative = (s: string | null | undefined): string => {
  if (!s) return "—";
  const diff = Date.now() - new Date(s).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} hari lalu`;
  return formatDate(s);
};

const getStatusBadgeColor = (
  status: string
): "success" | "warning" | "error" | "info" => {
  if (status === "paid") return "success";
  if (status === "pending") return "warning";
  if (status === "failed" || status === "expired" || status === "cancelled") return "error";
  return "info";
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case "paid":      return "Berhasil";
    case "pending":   return "Pending";
    case "failed":    return "Gagal";
    case "expired":   return "Expired";
    case "cancelled": return "Dibatalkan";
    default:          return status.toUpperCase();
  }
};

/** Normalisasi membership order → NormalizedRow */
const normalizeMembership = (o: MembershipOrder): NormalizedRow => ({
  id:         o.order_id,
  type:       "membership",
  title:      o.plan_name,
  subtitle:   `#${o.order_id.slice(-10)}`,
  amount:     Number(o.final_amount),
  status:     o.status,
  created_at: o.created_at,
  paid_at:    o.paid_at,
  extra:      o.membership_expired_at,
});

/** Normalisasi ticket order → NormalizedRow */
const normalizeTicket = (t: TicketOrder): NormalizedRow => ({
  id:          t.ticket_id,
  type:        "ticket",
  title:       t.show_title,
  subtitle:    `#${t.ref_id.slice(-12)}`,
  amount:      t.amount,
  status:      t.status,
  created_at:  t.created_at,
  paid_at:     t.paid_at,
  extra:       t.show_date,
  image:       t.show_image,
  method_name: t.method_name,
});

// ── Icons ─────────────────────────────────────────────────────────────────────

const IconTicket = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-gray-400">
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconStar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-gray-400">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconRefresh = () => (
  <svg className="stroke-current fill-white dark:fill-gray-800" width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M23 4v6h-6M1 20v-6h6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Component ─────────────────────────────────────────────────────────────────

type TabType = "all" | "membership" | "ticket";

export default function RecentOrders() {
  const [rows,    setRows]    = useState<NormalizedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [tab,     setTab]     = useState<TabType>("all");

  const fetchAll = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    const session = getSession();
    if (!session) {
      setError("Silakan login untuk melihat riwayat order");
      setLoading(false);
      return;
    }

    const uid   = session.user?.user_id;
    const token = session.token;

    if (!uid || !token) {
      setError("Data sesi tidak valid");
      setLoading(false);
      return;
    }

    // Fetch kedua API secara paralel
    const [membershipResult, ticketResult] = await Promise.allSettled([
      fetch(`${API_BASE}/order/list/${uid}?limit=100&apikey=${API_KEY}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch(`${TICKET_API}/user/${uid}?apikey=${API_KEY}`).then((r) => r.json()),
    ]);

    const membershipRows: NormalizedRow[] = [];
    const ticketRows: NormalizedRow[]     = [];

    if (membershipResult.status === "fulfilled" && membershipResult.value?.status) {
      const orders: MembershipOrder[] = membershipResult.value.data?.orders ?? [];
      orders.forEach((o) => membershipRows.push(normalizeMembership(o)));
    }

    if (ticketResult.status === "fulfilled" && ticketResult.value?.status) {
      const tickets: TicketOrder[] = ticketResult.value.data ?? [];
      tickets.forEach((t) => ticketRows.push(normalizeTicket(t)));
    }

    if (membershipRows.length === 0 && ticketRows.length === 0) {
      // Kedua API gagal atau kosong — tetap tampilkan empty state, bukan error
      if (membershipResult.status === "rejected" && ticketResult.status === "rejected") {
        setError("Terjadi kesalahan jaringan");
      }
    }

    // Gabungkan dan urutkan terbaru di atas
    const merged = [...membershipRows, ...ticketRows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setRows(merged);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered =
    tab === "all"        ? rows :
    tab === "membership" ? rows.filter((r) => r.type === "membership") :
                           rows.filter((r) => r.type === "ticket");

  const membershipCount = rows.filter((r) => r.type === "membership").length;
  const ticketCount     = rows.filter((r) => r.type === "ticket").length;

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: "all",        label: "Semua",      count: rows.length },
    { key: "membership", label: "Membership", count: membershipCount },
    { key: "ticket",     label: "Tiket Show", count: ticketCount },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">

      {/* Header */}
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Riwayat Order
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {loading
              ? "Memuat..."
              : `${rows.length} transaksi · ${membershipCount} membership · ${ticketCount} tiket`}
          </p>
        </div>
        <button
          onClick={fetchAll}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
        >
          <IconRefresh />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      {!loading && !error && rows.length > 0 && (
        <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 w-fit mb-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border-0 cursor-pointer ${
                tab === t.key
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  tab === t.key
                    ? "bg-brand-500 text-white"
                    : "bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
              <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
              <div className="h-3.5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="text-4xl">🔒</div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="text-4xl">🎫</div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {tab === "all" ? "Belum ada riwayat order" : `Belum ada riwayat ${tab === "membership" ? "membership" : "tiket show"}`}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Order tiket show atau membership untuk memulai
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && filtered.length > 0 && (
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
              <TableRow>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Order
                </TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Tanggal
                </TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Total
                </TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Status
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((row) => (
                <TableRow key={row.id}>

                  {/* Order Info */}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3">
                      {/* Icon / thumbnail */}
                      <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {row.type === "ticket" && row.image ? (
                          <img
                            src={row.image}
                            alt={row.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : row.type === "ticket" ? (
                          <IconTicket />
                        ) : (
                          <IconStar />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {/* Type badge */}
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                            row.type === "ticket"
                              ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          }`}>
                            {row.type === "ticket" ? "Tiket" : "Membership"}
                          </span>
                          {row.type === "ticket" && row.method_name && (
                            <span className="text-[9px] text-gray-400 dark:text-gray-500">
                              · {row.method_name}
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90 line-clamp-1 max-w-[180px]">
                          {row.title}
                        </p>
                        <span className="text-gray-400 text-theme-xs dark:text-gray-500 font-mono">
                          {row.subtitle}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Tanggal */}
                  <TableCell className="py-3">
                    <p className="text-gray-700 text-theme-sm dark:text-gray-300">
                      {formatDate(row.created_at)}
                    </p>
                    <p className="text-gray-400 text-theme-xs dark:text-gray-500 mt-0.5">
                      {formatRelative(row.created_at)}
                    </p>
                  </TableCell>

                  {/* Total */}
                  <TableCell className="py-3">
                    <p className="font-semibold text-gray-800 text-theme-sm dark:text-white/90">
                      Rp{row.amount.toLocaleString("id-ID")}
                    </p>
                    {row.extra && (
                      <p className="text-gray-400 text-theme-xs dark:text-gray-500 mt-0.5">
                        {row.type === "membership"
                          ? `s/d ${formatDate(row.extra)}`
                          : formatDate(row.extra)}
                      </p>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="py-3">
                    <Badge size="sm" color={getStatusBadgeColor(row.status)}>
                      {getStatusLabel(row.status)}
                    </Badge>
                    {row.paid_at && (
                      <p className="text-gray-400 text-theme-xs dark:text-gray-500 mt-1">
                        {formatRelative(row.paid_at)}
                      </p>
                    )}
                  </TableCell>

                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
