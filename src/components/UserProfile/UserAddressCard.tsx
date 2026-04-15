import { useEffect, useState } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";

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

interface StatusStyle {
  color: string;
  bg: string;
  border: string;
}

interface ApiResponse {
  status: boolean;
  data?: {
    orders?: Order[];
  };
}

const formatDate = (s: string): string => {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
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

const getOrderStatusColor = (status: string): StatusStyle => {
  if (status === "paid")
    return {
      color: "#16a34a",
      bg: "rgba(22,163,74,0.1)",
      border: "rgba(22,163,74,0.3)",
    };
  if (status === "pending")
    return {
      color: "#d97706",
      bg: "rgba(217,119,6,0.1)",
      border: "rgba(217,119,6,0.3)",
    };
  if (status === "failed" || status === "expired")
    return {
      color: "#dc2626",
      bg: "rgba(220,38,38,0.1)",
      border: "rgba(220,38,38,0.3)",
    };
  return {
    color: "#6b7280",
    bg: "rgba(107,114,128,0.1)",
    border: "rgba(107,114,128,0.3)",
  };
};

// ── Fix: cek sessionStorage DAN localStorage ──────────────────────────────────
const getSession = (): Session | null => {
  try {
    const fromSession = JSON.parse(
      sessionStorage.getItem("userLogin") || "null"
    ) as Session | null;
    if (fromSession && fromSession.isLoggedIn && fromSession.token)
      return fromSession;

    const fromLocal = JSON.parse(
      localStorage.getItem("userLogin") || "null"
    ) as Session | null;
    if (fromLocal && fromLocal.isLoggedIn && fromLocal.token)
      return fromLocal;

    return null;
  } catch {
    return null;
  }
};

export default function UserOrdersCard() {
  const { isOpen, openModal, closeModal } = useModal();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async (): Promise<void> => {
      const session = getSession();
      if (!session) {
        setError("Sesi tidak ditemukan.");
        setLoading(false);
        return;
      }
      const uid = session.user?.user_id;
      const token = session.token;
      if (!uid || !token) {
        setError("Data sesi tidak valid.");
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
          const fetched: Order[] = data.data?.orders ?? [];
          setOrders(fetched);
        } else {
          setError("Gagal memuat data order.");
        }
      } catch {
        setError("Terjadi kesalahan jaringan.");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  return (
    <>
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
              Riwayat Order
            </h4>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
              {loading && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Memuat...
                </p>
              )}
              {error && !loading && (
                <p className="text-sm text-red-500 dark:text-red-400">
                  {error}
                </p>
              )}
              {!loading && !error && orders.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Belum ada order.
                </p>
              )}
              {!loading &&
                !error &&
                orders.slice(0, 4).map((order: Order) => {
                  const statusStyle = getOrderStatusColor(order.status);
                  return (
                    <div key={order.order_id}>
                      <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                        {order.plan_name}
                      </p>
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                        Rp{Number(order.final_amount).toLocaleString("id-ID")}
                      </p>
                      <span
                        className="mt-1 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          color: statusStyle.color,
                          backgroundColor: statusStyle.bg,
                          border: `1px solid ${statusStyle.border}`,
                        }}
                      >
                        {order.status.toUpperCase()}
                      </span>
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        {formatRelative(order.created_at)}
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>

          <button
            onClick={openModal}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
          >
            <svg
              className="fill-current"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M3 5a1 1 0 0 1 1-1h16a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1zm0 7a1 1 0 0 1 1-1h16a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1zm0 7a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1z"
                fill=""
              />
            </svg>
            Lihat Semua
          </button>
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="relative w-full p-4 overflow-y-auto bg-white no-scrollbar rounded-3xl dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Riwayat Order
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Daftar seluruh transaksi membership kamu.
            </p>
          </div>

          <div className="px-2 overflow-y-auto custom-scrollbar">
            {loading && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                Memuat...
              </p>
            )}
            {error && !loading && (
              <p className="text-sm text-red-500 dark:text-red-400 text-center py-6">
                {error}
              </p>
            )}
            {!loading && !error && orders.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                Belum ada order.
              </p>
            )}
            {!loading && !error && orders.length > 0 && (
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                {orders.map((order: Order) => {
                  const statusStyle = getOrderStatusColor(order.status);
                  return (
                    <div
                      key={order.order_id}
                      className="p-4 border border-gray-100 rounded-xl dark:border-gray-800"
                    >
                      <p className="mb-1 text-sm font-medium text-gray-800 dark:text-white/90 truncate">
                        {order.plan_name}
                      </p>
                      <p className="mb-1 text-xs text-gray-400 dark:text-gray-500 font-mono">
                        #{order.order_id.slice(-10)}
                      </p>
                      <p className="mb-2 text-xs text-gray-400 dark:text-gray-500">
                        {formatRelative(order.created_at)}
                      </p>
                      {order.membership_expired_at && (
                        <p className="mb-2 text-xs text-gray-400 dark:text-gray-500">
                          Berlaku hingga:{" "}
                          {formatDate(order.membership_expired_at)}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                          Rp
                          {Number(order.final_amount).toLocaleString("id-ID")}
                        </p>
                        <span
                          className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                          style={{
                            color: statusStyle.color,
                            backgroundColor: statusStyle.bg,
                            border: `1px solid ${statusStyle.border}`,
                          }}
                        >
                          {order.status.toUpperCase()}
                        </span>
                      </div>
                      {order.paid_at && (
                        <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                          Dibayar: {formatRelative(order.paid_at)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
            <Button size="sm" variant="outline" onClick={closeModal}>
              Tutup
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
