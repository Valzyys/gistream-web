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

interface OrderItem {
  id: string;
  title: string;
  type: string;
  amount: number;
  status: "success" | "pending" | "failed" | "expired";
  payment_method: string;
  created_at: string;
  show_date?: string;
}

interface OrderResponse {
  status: boolean;
  data: OrderItem[];
}

const getSession = () => {
  try {
    const d =
      JSON.parse(sessionStorage.getItem("userLogin") || "null") ||
      JSON.parse(localStorage.getItem("userLogin") || "null");
    if (d && d.isLoggedIn && d.token) return d;
    return null;
  } catch {
    return null;
  }
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatPrice = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "success":
      return "success";
    case "pending":
      return "warning";
    case "failed":
    case "expired":
      return "error";
    default:
      return "warning";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "success":
      return "Berhasil";
    case "pending":
      return "Pending";
    case "failed":
      return "Gagal";
    case "expired":
      return "Expired";
    default:
      return status;
  }
};

const getTypeIcon = (type: string) => {
  switch (type?.toLowerCase()) {
    case "show":
    case "theater":
      return "🎭";
    case "membership":
      return "⭐";
    case "event":
      return "🎪";
    default:
      return "🎫";
  }
};

export default function RecentOrders() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      const session = getSession();
      if (!session) {
        setError("Silakan login untuk melihat riwayat order");
        setLoading(false);
        return;
      }

      const uid = session.user?.user_id;
      const token = session.token;

      if (!uid || !token) {
        setError("Sesi tidak valid");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `${API_BASE}/orders/${uid}?apikey=${API_KEY}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data: OrderResponse = await res.json();

        if (data.status && Array.isArray(data.data)) {
          // Ambil 5 order terbaru
          setOrders(data.data.slice(0, 5));
        } else {
          setOrders([]);
        }
      } catch (err) {
        setError("Gagal memuat riwayat order");
        console.error("Failed to fetch orders:", err);
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
            5 transaksi terbaru
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            <svg
              className="stroke-current"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M23 4v6h-6M1 20v-6h6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        // Skeleton Loading
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 py-3 animate-pulse"
            >
              <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
              <div className="h-3.5 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        // Error State
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="text-4xl">🔒</div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {error}
          </p>
        </div>
      ) : orders.length === 0 ? (
        // Empty State
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="text-4xl">🎫</div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Belum ada riwayat order
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Order tiket show atau membership untuk memulai
          </p>
        </div>
      ) : (
        // Table
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
              <TableRow>
                <TableCell
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Item
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
                <TableRow key={order.id}>
                  {/* Item */}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xl flex-shrink-0">
                        {getTypeIcon(order.type)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90 line-clamp-1 max-w-[160px]">
                          {order.title || "Order"}
                        </p>
                        <span className="text-gray-500 text-theme-xs dark:text-gray-400 capitalize">
                          {order.type || "Tiket"} ·{" "}
                          {order.payment_method || "QRIS"}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Tanggal */}
                  <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                    {formatDate(order.created_at)}
                  </TableCell>

                  {/* Total */}
                  <TableCell className="py-3 text-gray-800 text-theme-sm dark:text-white/90 font-medium">
                    {formatPrice(order.amount)}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="py-3">
                    <Badge
                      size="sm"
                      color={getStatusColor(order.status) as any}
                    >
                      {getStatusLabel(order.status)}
                    </Badge>
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
