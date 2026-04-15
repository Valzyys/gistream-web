import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";

const API_BASE = "https://v2.jkt48connect.com/api/jkt48connect";
const API_KEY = "JKTCONNECT";

interface Order {
  order_id: string;
  plan_name: string;
  final_amount: number | string;
  status: string;
  created_at: string;
  paid_at?: string;
  membership_expired_at?: string;
}

interface Session {
  isLoggedIn: boolean;
  token: string;
  user?: {
    user_id: string;
  };
}

interface ApiResponse {
  status: boolean;
  data?: {
    orders?: Order[];
  };
}

const getSession = (): Session | null => {
  try {
    const d =
      (JSON.parse(sessionStorage.getItem("userLogin") || "null") as Session | null) ||
      (JSON.parse(localStorage.getItem("userLogin") || "null") as Session | null);
    if (d && d.isLoggedIn && d.token) return d;
    return null;
  } catch {
    return null;
  }
};

const formatDate = (s: string): string => {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
  return formatDate(s);
};

const getStatusBadgeColor = (
  status: string
): "success" | "warning" | "error" | "info" => {
  if (status === "paid") return "success";
  if (status === "pending") return "warning";
  if (status === "failed" || status === "expired") return "error";
  return "info";
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case "paid": return "Berhasil";
    case "pending": return "Pending";
    case "failed": return "Gagal";
    case "expired": return "Expired";
    default: return status.toUpperCase();
  }
};

export default function RecentOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async (): Promise<void> => {
      const session = getSession();
      if (!session) {
        setError("Silakan login untuk melihat riwayat order");
        setLoading(false);
        return;
      }

      const uid = session.user?.user_id;
      const token = session.token;

      if (!uid || !token) {
        setError("Data sesi tidak valid");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `${API_BASE}/order/list/${uid}?limit=10&apikey=${API_KEY}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = (await res.json()) as ApiResponse;

        if (data.status) {
          setOrders(data.data?.orders ?? []);
        } else {
          setError("Gagal memuat data order");
        }
      } catch {
        setError("Terjadi kesalahan jaringan");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Riwayat Order
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            10 transaksi terbaru
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              // re-trigger useEffect
              setOrders([]);
              setTimeout(() => window.location.reload(), 100);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            <svg
              className="stroke-current fill-white dark:fill-gray-800"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M23 4v6h-6M1 20v-6h6"
                stroke=""
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
                stroke=""
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>

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
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {error}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="text-4xl">🎫</div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Belum ada riwayat order
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Order tiket show atau membership untuk memulai
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && orders.length > 0 && (
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
              <TableRow>
                <TableCell
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Order
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Tanggal
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Total
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Status
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {orders.map((order) => (
                <TableRow key={order.order_id}>
                  {/* Order Info */}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="text-gray-400"
                        >
                          <path
                            d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90 line-clamp-1 max-w-[180px]">
                          {order.plan_name}
                        </p>
                        <span className="text-gray-400 text-theme-xs dark:text-gray-500 font-mono">
                          #{order.order_id.slice(-10)}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Tanggal */}
                  <TableCell className="py-3">
                    <p className="text-gray-700 text-theme-sm dark:text-gray-300">
                      {formatDate(order.created_at)}
                    </p>
                    <p className="text-gray-400 text-theme-xs dark:text-gray-500 mt-0.5">
                      {formatRelative(order.created_at)}
                    </p>
                  </TableCell>

                  {/* Total */}
                  <TableCell className="py-3">
                    <p className="font-semibold text-gray-800 text-theme-sm dark:text-white/90">
                      Rp{Number(order.final_amount).toLocaleString("id-ID")}
                    </p>
                    {order.membership_expired_at && (
                      <p className="text-gray-400 text-theme-xs dark:text-gray-500 mt-0.5">
                        s/d {formatDate(order.membership_expired_at)}
                      </p>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="py-3">
                    <Badge
                      size="sm"
                      color={getStatusBadgeColor(order.status)}
                    >
                      {getStatusLabel(order.status)}
                    </Badge>
                    {order.paid_at && (
                      <p className="text-gray-400 text-theme-xs dark:text-gray-500 mt-1">
                        {formatRelative(order.paid_at)}
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
