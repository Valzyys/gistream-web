import React, { useEffect, useState, useCallback, useRef } from "react";
import PageMeta from "../components/common/PageMeta";
import PixelBlast from "../components/common/PixelBlast"
// ── Constants ────────────────────────────────────────────────────────────────
// SESUDAH — proxy lewat Pages Functions, no CORS issue:
const MEMBERSHIP_API = "/api/membership";
const API_KEY        = "JKTCONNECT";
const q              = `?apikey=${API_KEY}`;
const ADMIN_USER_ID  = "USR-BCCEADBE3FE94ABD08A5691F074027D3";

// ── Types ─────────────────────────────────────────────────────────────────────
interface MembershipProduct {
  id: number;
  product_code: string;
  product_name: string;
  membership_type: string;
  duration_days: number;
  price: number;
  price_sale: number | null;
  description: string | null;
  features: string[];
  stock_per_month: number;
  is_active: boolean;
  is_purchase_open: boolean;
  sort_order: number;
  current_stock: number;
  sold_count: number;
  stock_remaining: number;
}

interface PaymentMethod {
  channel_code: string;
  channel_name: string;
  fee_flat?: number;
  fee_percent?: number;
  fee?: number | string;
  min_amount?: number;
  max_amount?: number;
}

interface PaymentMethods {
  virtual_account?: PaymentMethod[];
  emoney?: PaymentMethod[];
  retail?: PaymentMethod[];
  pulsa?: PaymentMethod[];
  qris?: PaymentMethod[];
  [key: string]: PaymentMethod[] | undefined;
}

interface MembershipOrder {
  order_id: number;
  ref_id: string;
  ybp_trx_id: string;
  product_code: string;
  product_name: string;
  membership_type: string;
  duration_days: number;
  amount: number;
  fee: number;
  amount_to_pay: number;
  method: string;
  method_name: string;
  category: string | null;
  payment_url: string | null;
  checkout_url: string | null;
  nomor_va: string | null;
  qr_image: string | null;
  expired_at: string;
  membership_expired_at?: string;
}

interface UserMembershipStatus {
  membership_type: string;
  membership_expired_at: string | null;
  is_active: boolean;
  days_remaining: number;
}

// ── Admin Types ───────────────────────────────────────────────────────────────
interface AdminOrder {
  id: number;
  ref_id: string;
  user_id: string;
  username?: string;
  user_email?: string;
  product_code: string;
  product_name: string;
  membership_type: string;
  duration_days: number;
  amount: number;
  amount_to_pay: number;
  method: string;
  method_name: string;
  status: "pending" | "paid" | "expired" | "cancelled";
  paid_at: string | null;
  created_at: string;
  expired_at: string;
}

interface AdminStats {
  total: string;
  pending: string;
  paid: string;
  expired: string;
  cancelled: string;
  total_revenue: string;
}

interface AdminStockItem {
  product_id: number;
  product_code: string;
  product_name: string;
  membership_type: string;
  default_stock: number;
  total_stock: number;
  sold_count: number;
  remaining: number;
  stock_record_id: number | null;
  year: number | null;
  month: number | null;
  stock_updated_at: string | null;
}

type AdminTab = "orders" | "products" | "stock";
type ModalStep = "method" | "confirm" | "payment" | "success" | "already_active";

// ── Auth helper ───────────────────────────────────────────────────────────────
function getLoginData() {
  try {
    const ls = localStorage.getItem("userLogin");
    if (ls) return JSON.parse(ls);
    const ss = sessionStorage.getItem("userLogin");
    if (ss) return JSON.parse(ss);
  } catch {}
  return null;
}

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtRp(n: number) {
  return `Rp ${Number(n).toLocaleString("id-ID")}`;
}
function formatFee(m: PaymentMethod): string {
  if (m.fee_flat && m.fee_flat > 0) return `Rp ${m.fee_flat.toLocaleString("id-ID")}`;
  if (m.fee_percent && m.fee_percent > 0) return `${m.fee_percent}%`;
  if (typeof m.fee === "number" && m.fee > 0) return `Rp ${m.fee.toLocaleString("id-ID")}`;
  if (typeof m.fee === "string" && m.fee) return m.fee;
  return "Gratis";
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta",
  });
}
function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}
function fmtTimer(s: number) {
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Ic = {
  Check: ({ s = 16, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Clock: ({ s = 16, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  X: ({ s = 16, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Refresh: ({ s = 14, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  ),
  Crown: ({ s = 18, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h20M5 20V10l7-6 7 6v10" /><path d="M12 4l-7 6h14L12 4z" />
    </svg>
  ),
  Star: ({ s = 14, c = "currentColor", filled = false }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={filled ? c : "none"} stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  ChevronRight: ({ s = 16, c = "#9ca3af" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  ChevronLeft: ({ s = 18, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  Alert: ({ s = 14, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  Copy: ({ s = 14, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  Link: ({ s = 14, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  Trash: ({ s = 14, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  ),
  Package: ({ s = 18, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  Moon: ({ s = 14, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  Sparkles: ({ s = 14, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.88 5.47L19 10l-5.12 1.53L12 17l-1.88-5.47L5 10l5.12-1.53L12 3z" />
      <path d="M5 3l.88 2.47L8 6l-2.12.53L5 9l-.88-2.47L2 6l2.12-.53L5 3z" />
      <path d="M19 14l.88 2.47L22 17l-2.12.53L19 20l-.88-2.47L16 17l2.12-.53L19 14z" />
    </svg>
  ),
  Shield: ({ s = 16, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Edit: ({ s = 14, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Plus: ({ s = 14, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  BarChart: ({ s = 16, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  ),
  List: ({ s = 16, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  Toggle: ({ s = 14, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="5" width="22" height="14" rx="7" ry="7" />
      <circle cx="16" cy="12" r="3" fill={c} stroke="none" />
    </svg>
  ),
  DollarSign: ({ s = 14, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
};

// ── Payment Modal ─────────────────────────────────────────────────────────────
interface PaymentModalProps {
  product: MembershipProduct;
  onClose: () => void;
  onSuccess: () => void;
  loginData: any;
}

function PaymentModal({ product, onClose, onSuccess, loginData }: PaymentModalProps) {
  const [step, setStep]                     = useState<ModalStep>("method");
  const [methods, setMethods]               = useState<PaymentMethods>({});
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [order, setOrder]                   = useState<MembershipOrder | null>(null);
  const [creating, setCreating]             = useState(false);
  const [checking, setChecking]             = useState(false);
  const [cancelling, setCancelling]         = useState(false);
  const [pollStatus, setPollStatus]         = useState<"pending" | "paid" | "expired">("pending");
  const [paymentTimer, setPaymentTimer]     = useState(0);
  const [error, setError]                   = useState("");
  const [copied, setCopied]                 = useState(false);
  const pollRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);

  const price = product.price_sale ?? product.price;

  useEffect(() => {
    fetch(`${MEMBERSHIP_API}/methods${q}`)
      .then((r) => r.json())
      .then((d) => {
        const raw = d.data?.payment_methods || {};
        const normalized: PaymentMethods = {};
        for (const [k, v] of Object.entries(raw)) {
          normalized[k === "" ? "qris" : k] = v as PaymentMethod[];
        }
        setMethods(normalized);
      })
      .catch(() => setError("Gagal memuat metode pembayaran"))
      .finally(() => setLoadingMethods(false));
  }, []);

  useEffect(() => {
    if (step !== "payment" || !order) return;
    const expiry = new Date(order.expired_at).getTime();
    const tick   = () => setPaymentTimer(Math.max(0, Math.floor((expiry - Date.now()) / 1000)));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [step, order]);

  useEffect(() => {
    if (step !== "payment" || !order) return;
    stoppedRef.current = false;
    const poll = async () => {
      if (stoppedRef.current) return;
      setChecking(true);
      try {
        const res  = await fetch(`${MEMBERSHIP_API}/check/${order.ref_id}${q}`);
        const data = await res.json();
        if (data.order_status === "paid")    { setPollStatus("paid");    setStep("success"); onSuccess(); return; }
        if (data.order_status === "expired") { setPollStatus("expired"); setChecking(false); return; }
      } catch {}
      setChecking(false);
      if (!stoppedRef.current) pollRef.current = setTimeout(poll, 15000);
    };
    pollRef.current = setTimeout(poll, 5000);
    return () => { stoppedRef.current = true; if (pollRef.current) clearTimeout(pollRef.current); };
  }, [step, order]);

  const handleCreateOrder = async () => {
    if (!selectedMethod) return;
    setCreating(true); setError("");
    try {
      const res  = await fetch(`${MEMBERSHIP_API}/buy${q}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id:        loginData.user.user_id,
          product_code:   product.product_code,
          method:         selectedMethod.channel_code,
          customer_name:  loginData.user.full_name || loginData.user.username,
          customer_email: loginData.user.email,
        }),
      });
      const data = await res.json();
      if (!data.status) {
        if (res.status === 409 || data.message?.includes("sudah")) { setStep("already_active"); return; }
        setError(data.message || "Gagal membuat order"); return;
      }
      setOrder(data.data);
      setStep("payment");
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setCreating(false);
    }
  };

  const handleManualCheck = async () => {
    if (!order || checking) return;
    setChecking(true);
    try {
      const res  = await fetch(`${MEMBERSHIP_API}/check/${order.ref_id}${q}`);
      const data = await res.json();
      if (data.order_status === "paid")    { setPollStatus("paid");    setStep("success"); onSuccess(); }
      if (data.order_status === "expired") { setPollStatus("expired"); }
    } catch {}
    setChecking(false);
  };

  const handleCancel = async () => {
    if (!order || cancelling) return;
    setCancelling(true); setError("");
    try {
      const res  = await fetch(`${MEMBERSHIP_API}/cancel/${order.ref_id}${q}`, { method: "DELETE" });
      const data = await res.json();
      if (data.status) onClose();
      else setError(data.message || "Gagal membatalkan");
    } catch { setError("Koneksi gagal saat membatalkan."); }
    finally { setCancelling(false); }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const categoryOrder = ["emoney", "qris", "pulsa", "virtual_account", "retail"];
  const categoryLabel: Record<string, string> = {
    virtual_account: "Virtual Account",
    emoney:          "E-Money / Dompet Digital",
    qris:            "QRIS",
    retail:          "Gerai Retail",
    pulsa:           "Pulsa",
  };
  const timerDanger = paymentTimer < 300;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && step !== "payment") onClose(); }}
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
        style={{ maxHeight: "92vh", display: "flex", flexDirection: "column" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            {step === "confirm" && (
              <button onClick={() => setStep("method")} className="text-gray-400 hover:text-gray-600 mr-1 p-1">
                <Ic.ChevronLeft />
              </button>
            )}
            <div>
              <h2 className="text-sm font-bold text-gray-800 dark:text-white">
                {step === "method"         && "Pilih Metode Pembayaran"}
                {step === "confirm"        && "Konfirmasi Pembelian"}
                {step === "payment"        && "Selesaikan Pembayaran"}
                {step === "success"        && "Membership Aktif!"}
                {step === "already_active" && "Membership Sudah Aktif"}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">{product.product_name}</p>
            </div>
          </div>
          {step !== "payment" && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">
              <Ic.X />
            </button>
          )}
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* METHOD */}
          {step === "method" && (
            <div>
              <div className="flex gap-3 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/[0.03] mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #465FFF22, #465FFF44)" }}>
                  <Ic.Crown s={22} c="#465FFF" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{product.product_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{product.duration_days} hari akses premium</p>
                  <p className="text-sm font-black text-brand-500 mt-1">{fmtRp(price)}</p>
                </div>
              </div>
              {error && (
                <div className="mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                  <Ic.Alert c="#ef4444" />{error}
                </div>
              )}
              {loadingMethods ? (
                <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
                  <div className="w-5 h-5 border-2 border-gray-200 border-t-brand-500 rounded-full animate-spin" />
                  <span className="text-sm">Memuat metode...</span>
                </div>
              ) : (
                <div className="space-y-5">
                  {categoryOrder.map((cat) => {
                    const items = methods[cat];
                    if (!items || items.length === 0) return null;
                    return (
                      <div key={cat}>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                          {categoryLabel[cat] || cat}
                        </p>
                        <div className="space-y-1.5">
                          {items.map((m) => (
                            <button
                              key={m.channel_code}
                              onClick={() => { setSelectedMethod(m); setStep("confirm"); }}
                              className="w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left border-gray-200 dark:border-gray-700 hover:border-brand-400 dark:hover:border-brand-500/50 bg-white dark:bg-white/[0.02] hover:bg-brand-50/50 dark:hover:bg-brand-500/5"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                                  <span className="text-[10px] font-black text-gray-600 dark:text-gray-300">
                                    {m.channel_code.slice(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-800 dark:text-white">{m.channel_name}</p>
                                  <p className="text-xs text-gray-400">Fee: {formatFee(m)}</p>
                                </div>
                              </div>
                              <Ic.ChevronRight />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* CONFIRM */}
          {step === "confirm" && selectedMethod && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/[0.03] space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #465FFF22, #465FFF44)" }}>
                    <Ic.Crown s={18} c="#465FFF" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-white">{product.product_name}</p>
                    <p className="text-xs text-gray-400">{product.duration_days} hari akses premium</p>
                  </div>
                </div>
                {product.features.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-200 dark:border-gray-700">
                    {product.features.map((f, i) => (
                      <span key={i} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-500/20">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                {[
                  { label: "Harga Membership", value: fmtRp(price) },
                  { label: "Fee Pembayaran",   value: formatFee(selectedMethod) },
                  { label: "Metode",           value: selectedMethod.channel_name },
                  { label: "Durasi",           value: `${product.duration_days} hari` },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{row.label}</span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-white">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-start gap-2">
                <Ic.Alert s={13} c="#d97706" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Total akhir mungkin berbeda sedikit karena fee dihitung oleh payment gateway saat transaksi dibuat.
                </p>
              </div>
              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                  <Ic.Alert />{error}
                </div>
              )}
              <button
                onClick={handleCreateOrder}
                disabled={creating}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50"
                style={{ background: creating ? "#6b7280" : "linear-gradient(135deg, #465FFF, #7c3aed)" }}
              >
                {creating
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Membuat Order...</>
                  : <><Ic.Crown s={14} c="white" />Bayar Sekarang</>}
              </button>
            </div>
          )}

          {/* PAYMENT */}
          {step === "payment" && order && (
            <div className="space-y-4">
              <div className={`flex items-center justify-between p-3 rounded-xl border ${timerDanger
                ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20"
                : "bg-brand-50 dark:bg-brand-500/10 border-brand-200 dark:border-brand-500/20"}`}
              >
                <div className="flex items-center gap-2">
                  <Ic.Clock s={14} c={timerDanger ? "#ef4444" : "#465FFF"} />
                  <span className={`text-xs font-medium ${timerDanger ? "text-red-600 dark:text-red-400" : "text-brand-600 dark:text-brand-400"}`}>
                    Selesaikan dalam
                  </span>
                </div>
                <span className={`text-sm font-black tabular-nums ${timerDanger ? "text-red-600 dark:text-red-400" : "text-brand-600 dark:text-brand-400"}`}>
                  {fmtTimer(paymentTimer)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-gray-700 space-y-2">
                {[
                  { label: "Ref ID",  value: order.ref_id,       mono: true },
                  { label: "Produk",  value: order.product_name, mono: false },
                  { label: "Metode",  value: order.method_name,  mono: false },
                ].map(({ label, value, mono }) => value ? (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                    <span className={`text-xs font-semibold text-gray-700 dark:text-gray-300 ${mono ? "font-mono" : ""}`}>{value}</span>
                  </div>
                ) : null)}
                <div className="flex justify-between items-center pt-1 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Total Bayar</span>
                  <span className="text-base font-black text-gray-800 dark:text-white">{fmtRp(order.amount_to_pay)}</span>
                </div>
              </div>
              {order.nomor_va && (
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03]">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Nomor Virtual Account</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xl font-black text-gray-800 dark:text-white tracking-widest">{order.nomor_va}</span>
                    <button
                      onClick={() => handleCopy(order.nomor_va!)}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${copied
                        ? "bg-green-50 dark:bg-green-500/10 text-green-600 border-green-200 dark:border-green-500/20"
                        : "bg-brand-50 dark:bg-brand-500/10 text-brand-500 border-brand-200 dark:border-brand-500/20"}`}
                    >
                      {copied ? <><Ic.Check s={12} c="#16a34a" />Disalin</> : <><Ic.Copy s={12} />Salin</>}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Bank: <strong className="text-gray-600 dark:text-gray-300">{order.method_name}</strong></p>
                </div>
              )}
              {order.qr_image && (
                <div className="flex flex-col items-center p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03]">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">Scan QR Code</p>
                  <img src={order.qr_image} alt="QR Code" className="w-48 h-48 rounded-xl" />
                </div>
              )}
              {(order.checkout_url || order.payment_url) && !order.nomor_va && !order.qr_image && (
                <a
                  href={order.checkout_url || order.payment_url!}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white text-sm font-bold"
                  style={{ background: "linear-gradient(135deg, #465FFF, #7c3aed)" }}
                >
                  <Ic.Link s={14} c="white" />Buka Halaman Pembayaran
                </a>
              )}
              {pollStatus === "expired" && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center gap-2">
                  <Ic.Clock s={14} c="#ef4444" />
                  <span className="text-xs text-red-600 dark:text-red-400">Order expired. Tutup dan buat order baru.</span>
                </div>
              )}
              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                  <Ic.Alert />{error}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleManualCheck}
                  disabled={checking || pollStatus === "expired"}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04] disabled:opacity-40 transition-colors"
                >
                  {checking
                    ? <><div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />Mengecek...</>
                    : <><Ic.Refresh s={14} />Cek Status</>}
                </button>
                {pollStatus !== "expired" && pollStatus !== "paid" && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-500/30 text-sm font-semibold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-40 transition-colors"
                  >
                    {cancelling
                      ? <div className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                      : <><Ic.Trash s={14} />Batalkan</>}
                  </button>
                )}
              </div>
              <button onClick={onClose} className="w-full py-2 text-xs text-gray-400 hover:text-gray-500 transition-colors">
                Tutup — pembayaran tetap berjalan di background
              </button>
            </div>
          )}

          {/* SUCCESS */}
          {step === "success" && (
            <div className="flex flex-col items-center text-center py-6 gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #465FFF22, #7c3aed22)", border: "2px solid #465FFF44" }}>
                  <Ic.Crown s={36} c="#465FFF" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 flex items-center justify-center border-2 border-white dark:border-gray-900">
                  <Ic.Check s={14} c="white" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Membership Aktif!</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  <strong className="text-gray-700 dark:text-gray-200">{product.product_name}</strong> kamu telah aktif.<br />
                  Nikmati semua fitur premium JKT48Connect.
                </p>
              </div>
              <div className="w-full p-3 rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20 flex items-start gap-2">
                <Ic.Sparkles s={14} c="#465FFF" />
                <p className="text-xs text-brand-700 dark:text-brand-400 text-left">
                  Membership aktif selama <strong>{product.duration_days} hari</strong> mulai sekarang.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl text-white text-sm font-bold"
                style={{ background: "linear-gradient(135deg, #465FFF, #7c3aed)" }}
              >
                Selesai
              </button>
            </div>
          )}

          {/* ALREADY ACTIVE */}
          {step === "already_active" && (
            <div className="flex flex-col items-center text-center py-6 gap-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #465FFF22, #7c3aed22)", border: "2px solid #465FFF44" }}>
                <Ic.Crown s={36} c="#465FFF" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">Sudah Berlangganan</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Kamu sudah memiliki membership aktif.</p>
              </div>
              <button onClick={onClose} className="w-full py-3 rounded-xl text-white text-sm font-bold" style={{ background: "linear-gradient(135deg, #465FFF, #7c3aed)" }}>
                Tutup
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Admin: Edit Product Modal ──────────────────────────────────────────────────
interface AdminEditProductModalProps {
  product: MembershipProduct | null; // null = create new
  onClose: () => void;
  onSaved: () => void;
}

function AdminEditProductModal({ product, onClose, onSaved }: AdminEditProductModalProps) {
  const isNew = !product;
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  // Helper: parse features ke string textarea (defensive)
const parseFeaturesToStr = (raw: any): string => {
  if (Array.isArray(raw)) return raw.join("\n");
  if (typeof raw === "string") {
    try { return JSON.parse(raw).join("\n"); } catch { return raw; }
  }
  return "";
};

// Helper: normalize membership_type — jaga-jaga kalau DB masih punya nilai lama
const VALID_TYPES = ["weekly", "monthly", "ramadhan"];
const normType = (t?: string) =>
  VALID_TYPES.includes(t ?? "") ? t! : "monthly";

const [form, setForm] = useState({
  product_code:     product?.product_code          ?? "",
  product_name:     product?.product_name          ?? "",
  membership_type:  normType(product?.membership_type),
  duration_days:    product?.duration_days         ?? 30,
  price:            product?.price                 ?? 0,
  price_sale:       product?.price_sale            ?? "",
  description:      product?.description           ?? "",
  features:         parseFeaturesToStr(product?.features),
  stock_per_month:  product?.stock_per_month       ?? 100,
  is_active:        product?.is_active             ?? true,
  is_purchase_open: product?.is_purchase_open      ?? true,
  sort_order:       product?.sort_order            ?? 0,
});
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const payload = {
        ...form,
        duration_days:   Number(form.duration_days),
        price:           Number(form.price),
        price_sale:      form.price_sale !== "" && form.price_sale !== null ? Number(form.price_sale) : null,
        stock_per_month: Number(form.stock_per_month),
        sort_order:      Number(form.sort_order),
        features:        form.features.split("\n").map((s) => s.trim()).filter(Boolean),
      };

      let res;
      if (isNew) {
        res = await fetch(`${MEMBERSHIP_API}/admin/products${q}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${MEMBERSHIP_API}/admin/products/${product!.product_code}${q}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!data.status) { setError(data.message || "Gagal menyimpan"); return; }
      onSaved();
    } catch {
      setError("Koneksi gagal.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 transition-all";
  const labelCls = "block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full sm:max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
        style={{ maxHeight: "92vh", display: "flex", flexDirection: "column" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <h2 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Ic.Edit s={15} c="#465FFF" />
            {isNew ? "Tambah Produk Baru" : `Edit: ${product!.product_name}`}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><Ic.X /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls}>Product Code {isNew && <span className="text-red-400">*</span>}</label>
              <input className={inputCls} value={form.product_code} onChange={(e) => set("product_code", e.target.value)} disabled={!isNew} placeholder="e.g. monthly" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls}>Tipe Membership</label>
              <select className={inputCls} value={form.membership_type} onChange={(e) => set("membership_type", e.target.value)}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="ramadhan">Ramadhan</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Nama Produk <span className="text-red-400">*</span></label>
              <input className={inputCls} value={form.product_name} onChange={(e) => set("product_name", e.target.value)} placeholder="e.g. JKT48Connect Membership Monthly" />
            </div>
            <div>
              <label className={labelCls}>Durasi (hari) <span className="text-red-400">*</span></label>
              <input className={inputCls} type="number" min={1} value={form.duration_days} onChange={(e) => set("duration_days", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Stok / Bulan</label>
              <input className={inputCls} type="number" min={0} value={form.stock_per_month} onChange={(e) => set("stock_per_month", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Harga Normal (Rp) <span className="text-red-400">*</span></label>
              <input className={inputCls} type="number" min={0} value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="25000" />
            </div>
            <div>
              <label className={labelCls}>Harga Promo (Rp) <span className="text-gray-300">opsional</span></label>
              <input className={inputCls} type="number" min={0} value={form.price_sale ?? ""} onChange={(e) => set("price_sale", e.target.value)} placeholder="kosongkan jika tidak ada" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Deskripsi</label>
              <textarea className={inputCls} rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Deskripsi singkat produk..." />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Fitur <span className="text-gray-400 font-normal">(satu per baris)</span></label>
              <textarea className={inputCls} rows={4} value={form.features} onChange={(e) => set("features", e.target.value)} placeholder={"Akses semua livestream\nNotifikasi jadwal\nBadge member"} />
            </div>
            <div>
              <label className={labelCls}>Sort Order</label>
              <input className={inputCls} type="number" value={form.sort_order} onChange={(e) => set("sort_order", e.target.value)} />
            </div>
            <div className="flex flex-col gap-2 justify-center">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="w-4 h-4 accent-brand-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Produk Aktif</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.is_purchase_open} onChange={(e) => set("is_purchase_open", e.target.checked)} className="w-4 h-4 accent-brand-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Pembelian Dibuka</span>
              </label>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <Ic.Alert />{error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-colors"
              style={{ background: "linear-gradient(135deg, #465FFF, #7c3aed)" }}
            >
              {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Menyimpan...</> : <><Ic.Check s={14} c="white" />Simpan</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Admin: Edit Price Modal ────────────────────────────────────────────────────
interface AdminPriceModalProps {
  product: MembershipProduct;
  onClose: () => void;
  onSaved: () => void;
}

function AdminPriceModal({ product, onClose, onSaved }: AdminPriceModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [price, setPrice]       = useState(String(product.price));
  const [priceSale, setPriceSale] = useState(product.price_sale !== null ? String(product.price_sale) : "");
  const [reason, setReason]     = useState("");

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const payload: any = { reason };
      if (price !== "")     payload.price      = Number(price);
      if (priceSale !== "") payload.price_sale = Number(priceSale);
      else                  payload.price_sale = null;

      const res  = await fetch(`${MEMBERSHIP_API}/admin/products/${product.product_code}/price${q}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.status) { setError(data.message || "Gagal update harga"); return; }
      onSaved();
    } catch {
      setError("Koneksi gagal.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 transition-all";
  const labelCls = "block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Ic.DollarSign s={15} c="#465FFF" />Update Harga: {product.product_name}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><Ic.X /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Harga Normal (Rp)</label>
            <input className={inputCls} type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Harga Promo (Rp) — kosongkan untuk hapus promo</label>
            <input className={inputCls} type="number" min={0} value={priceSale} onChange={(e) => setPriceSale(e.target.value)} placeholder="kosongkan = hapus promo" />
          </div>
          <div>
            <label className={labelCls}>Alasan perubahan (opsional)</label>
            <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Promo Lebaran" />
          </div>
        </div>
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 text-xs text-red-600 flex items-center gap-2">
            <Ic.Alert />{error}
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300">Batal</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #465FFF, #7c3aed)" }}
          >
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Ic.Check s={14} c="white" />Simpan</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Admin: Edit Stock Modal ───────────────────────────────────────────────────
interface AdminStockModalProps {
  item: AdminStockItem;
  onClose: () => void;
  onSaved: () => void;
}

function AdminStockModal({ item, onClose, onSaved }: AdminStockModalProps) {
  const now   = new Date(Date.now() + 7 * 3600 * 1000);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [totalStock, setTotalStock] = useState(String(item.total_stock));
  const [year, setYear]   = useState(String(item.year   ?? now.getUTCFullYear()));
  const [month, setMonth] = useState(String(item.month  ?? now.getUTCMonth() + 1));

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const res  = await fetch(`${MEMBERSHIP_API}/admin/stock${q}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_code: item.product_code,
          year:         Number(year),
          month:        Number(month),
          total_stock:  Number(totalStock),
        }),
      });
      const data = await res.json();
      if (!data.status) { setError(data.message || "Gagal update stok"); return; }
      onSaved();
    } catch {
      setError("Koneksi gagal.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 transition-all";
  const labelCls = "block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Ic.Package s={15} c="#465FFF" />Atur Stok: {item.product_name}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><Ic.X /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Tahun</label>
            <input className={inputCls} type="number" value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Bulan (1–12)</label>
            <input className={inputCls} type="number" min={1} max={12} value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Total Stok</label>
            <input className={inputCls} type="number" min={0} value={totalStock} onChange={(e) => setTotalStock(e.target.value)} />
          </div>
        </div>
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 text-xs text-red-600 flex items-center gap-2">
            <Ic.Alert />{error}
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300">Batal</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #465FFF, #7c3aed)" }}
          >
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Ic.Check s={14} c="white" />Simpan</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Admin Panel ───────────────────────────────────────────────────────────────
interface AdminPanelProps {
  onRefreshProducts: () => void;
}

function AdminPanel({ onRefreshProducts }: AdminPanelProps) {
  const [tab, setTab]         = useState<AdminTab>("orders");
  const [loading, setLoading] = useState(false);
  const [orders, setOrders]   = useState<AdminOrder[]>([]);
  const [stats, setStats]     = useState<AdminStats | null>(null);
  const [products, setProducts] = useState<MembershipProduct[]>([]);
  const [stock, setStock]     = useState<AdminStockItem[]>([]);
  const [filterStatus, setFilterStatus] = useState("");

  const [editProduct, setEditProduct] = useState<MembershipProduct | null | "new">(undefined as any);
  const [editPrice, setEditPrice]     = useState<MembershipProduct | null>(null);
  const [editStock, setEditStock]     = useState<AdminStockItem | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterStatus ? `&status=${filterStatus}` : "";
      const res    = await fetch(`${MEMBERSHIP_API}/admin/orders${q}${params}&limit=100`);
      const data   = await res.json();
      setOrders(data.data || []);
      setStats(data.statistics || null);
    } catch {}
    setLoading(false);
  }, [filterStatus]);

  const fetchProducts = useCallback(async () => {
  setLoading(true);
  try {
    const res  = await fetch(`${MEMBERSHIP_API}/admin/products${q}`);
    const data = await res.json();
    // Normalize features — sama seperti di main page fetch
    const normalized = (data.data || []).map((p: MembershipProduct) => ({
      ...p,
      features: Array.isArray(p.features)
        ? p.features
        : typeof p.features === "string"
        ? (() => { try { return JSON.parse(p.features); } catch { return []; } })()
        : [],
    }));
    setProducts(normalized);
  } catch {}
  setLoading(false);
}, []);

  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${MEMBERSHIP_API}/admin/stock${q}`);
      const data = await res.json();
      setStock(data.data || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "orders")   fetchOrders();
    if (tab === "products") fetchProducts();
    if (tab === "stock")    fetchStock();
  }, [tab, fetchOrders, fetchProducts, fetchStock]);

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      paid:      "bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400",
      pending:   "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400",
      expired:   "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400",
      cancelled: "bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400",
    };
    return `inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${map[s] ?? "bg-gray-100 text-gray-500"}`;
  };

  const tabs: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: "orders",   label: "Orders",   icon: <Ic.List s={14} /> },
    { key: "products", label: "Produk",   icon: <Ic.Package s={14} /> },
    { key: "stock",    label: "Stok",     icon: <Ic.BarChart s={14} /> },
  ];

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5 overflow-hidden">
      {/* Admin Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-amber-200 dark:border-amber-500/20"
        style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.06))" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
            <Ic.Shield s={16} c="white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800 dark:text-white">Admin Panel</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Membership Management</p>
          </div>
        </div>
        <button
          onClick={() => {
            if (tab === "orders")   fetchOrders();
            if (tab === "products") fetchProducts();
            if (tab === "stock")    fetchStock();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/10 transition-colors"
        >
          <Ic.Refresh s={12} />Refresh
        </button>
      </div>

      {/* Stats row (only on orders tab) */}
      {tab === "orders" && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-amber-100 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/20">
          {[
            { label: "Total",    value: stats.total,          color: "#6b7280" },
            { label: "Paid",     value: stats.paid,           color: "#16a34a" },
            { label: "Pending",  value: stats.pending,        color: "#d97706" },
            { label: "Expired",  value: stats.expired,        color: "#9ca3af" },
            { label: "Revenue",  value: fmtRp(Number(stats.total_revenue)), color: "#465FFF" },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-gray-900 px-4 py-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{s.label}</p>
              <p className="text-sm font-black mt-0.5" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-amber-200 dark:border-amber-500/20 bg-white dark:bg-gray-900">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-5 py-3 text-xs font-semibold border-b-2 transition-colors ${
              tab === t.key
                ? "border-amber-500 text-amber-600 dark:text-amber-400"
                : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900">
        {/* ── ORDERS TAB ── */}
        {tab === "orders" && (
          <div>
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-gray-800">
              <span className="text-xs text-gray-400 font-medium">Filter:</span>
              {["", "paid", "pending", "expired", "cancelled"].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                    filterStatus === s
                      ? "bg-amber-500 text-white"
                      : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
                  }`}
                >
                  {s || "Semua"}
                </button>
              ))}
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
                <div className="w-5 h-5 border-2 border-gray-200 border-t-amber-400 rounded-full animate-spin" />
                <span className="text-sm">Memuat orders...</span>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400">Tidak ada order ditemukan</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      {["Ref ID", "User", "Produk", "Total", "Metode", "Status", "Tanggal"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-semibold text-gray-400 dark:text-gray-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {orders.map((o) => (
                      <tr key={o.ref_id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-300 whitespace-nowrap">{o.ref_id}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          <div>{o.username || o.user_id.slice(0, 12) + "…"}</div>
                          {o.user_email && <div className="text-[10px] text-gray-400">{o.user_email}</div>}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{o.product_name}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white whitespace-nowrap">{fmtRp(o.amount_to_pay)}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{o.method_name}</td>
                        <td className="px-4 py-3 whitespace-nowrap"><span className={statusBadge(o.status)}>{o.status}</span></td>
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmtDateShort(o.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── PRODUCTS TAB ── */}
        {tab === "products" && (
          <div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
              <span className="text-xs text-gray-400">{products.length} produk</span>
              <button
                onClick={() => setEditProduct("new")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                style={{ background: "linear-gradient(135deg, #465FFF, #7c3aed)" }}
              >
                <Ic.Plus s={12} c="white" />Tambah Produk
              </button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
                <div className="w-5 h-5 border-2 border-gray-200 border-t-amber-400 rounded-full animate-spin" />
                <span className="text-sm">Memuat produk...</span>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {products.map((p) => (
                  <div key={p.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-800 dark:text-white">{p.product_name}</span>
                        <span className="text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">{p.product_code}</span>
                        {!p.is_active && <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded-full">NONAKTIF</span>}
                        {!p.is_purchase_open && <span className="text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded-full">TUTUP</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>{p.duration_days} hari</span>
                        <span>·</span>
                        <span className="font-semibold text-gray-600 dark:text-gray-300">{fmtRp(p.price_sale ?? p.price)}</span>
                        {p.price_sale && <span className="line-through">{fmtRp(p.price)}</span>}
                        <span>·</span>
                        <span>Stok: {p.stock_remaining}/{p.current_stock}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => setEditPrice(p)}
                        title="Update Harga"
                        className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-brand-500 hover:border-brand-300 transition-colors"
                      >
                        <Ic.DollarSign s={13} />
                      </button>
                      <button
                        onClick={() => setEditProduct(p)}
                        title="Edit Produk"
                        className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-brand-500 hover:border-brand-300 transition-colors"
                      >
                        <Ic.Edit s={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STOCK TAB ── */}
        {tab === "stock" && (
          <div>
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
              <span className="text-xs text-gray-400">Stok bulan berjalan (klik untuk edit)</span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
                <div className="w-5 h-5 border-2 border-gray-200 border-t-amber-400 rounded-full animate-spin" />
                <span className="text-sm">Memuat stok...</span>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {stock.map((item) => {
                  const pct = item.total_stock > 0 ? (item.remaining / item.total_stock) * 100 : 0;
                  const low = item.remaining <= 10 && item.remaining > 0;
                  const out = item.remaining === 0;
                  return (
                    <div
                      key={item.product_id}
                      className="px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => setEditStock(item)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-sm font-bold text-gray-800 dark:text-white">{item.product_name}</span>
                          <span className="ml-2 text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">{item.product_code}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`font-bold ${out ? "text-red-500" : low ? "text-amber-500" : "text-gray-500 dark:text-gray-400"}`}>
                            {item.remaining} / {item.total_stock}
                          </span>
                          <span className="text-gray-300 dark:text-gray-600">·</span>
                          <span className="text-gray-400">Terjual: {item.sold_count}</span>
                          <Ic.Edit s={12} c="#9ca3af" />
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${100 - pct}%`,
                            background: out ? "#ef4444" : low ? "#f59e0b" : "linear-gradient(90deg, #465FFF, #7c3aed)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Admin Modals */}
      {editProduct !== undefined && editProduct !== null && (
        <AdminEditProductModal
          product={editProduct === "new" ? null : editProduct}
          onClose={() => setEditProduct(undefined as any)}
          onSaved={() => { setEditProduct(undefined as any); fetchProducts(); onRefreshProducts(); }}
        />
      )}
      {editPrice && (
        <AdminPriceModal
          product={editPrice}
          onClose={() => setEditPrice(null)}
          onSaved={() => { setEditPrice(null); fetchProducts(); onRefreshProducts(); }}
        />
      )}
      {editStock && (
        <AdminStockModal
          item={editStock}
          onClose={() => setEditStock(null)}
          onSaved={() => { setEditStock(null); fetchStock(); onRefreshProducts(); }}
        />
      )}
    </div>
  );
}

// ── Product Card ───────────────────────────────────────────────────────────────
interface ProductCardProps {
  product: MembershipProduct;
  isLoggedIn: boolean;
  currentMembership: string;
  onBuy: (p: MembershipProduct) => void;
}

const BADGE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  weekly: {
    label: "Mingguan",
    color: "#059669", bg: "rgba(5,150,105,0.08)", border: "rgba(5,150,105,0.2)",
    icon: <Ic.Sparkles s={11} c="#059669" />,
  },
  monthly: {
    label: "Bulanan",
    color: "#465FFF", bg: "rgba(70,95,255,0.08)", border: "rgba(70,95,255,0.2)",
    icon: <Ic.Star s={11} c="#465FFF" filled />,
  },
  ramadhan: {
    label: "Ramadhan",
    color: "#d97706", bg: "rgba(217,119,6,0.08)", border: "rgba(217,119,6,0.2)",
    icon: <Ic.Moon s={11} c="#d97706" />,
  },
};

function ProductCard({ product, isLoggedIn, currentMembership, onBuy }: ProductCardProps) {
  const badge       = BADGE_CONFIG[product.product_code] ?? BADGE_CONFIG.monthly;
  const price       = product.price_sale ?? product.price;
  const hasDiscount = product.price_sale !== null && product.price_sale < product.price;
  const stockPct    = product.current_stock > 0 ? (product.stock_remaining / product.current_stock) * 100 : 0;
  const stockLow    = product.stock_remaining <= 10 && product.stock_remaining > 0;
  const stockOut    = product.stock_remaining === 0;
  const isActive    = currentMembership !== "free";

  return (
    <div
      className="relative flex flex-col rounded-2xl border bg-white dark:bg-white/[0.03] overflow-hidden transition-all duration-200 hover:shadow-xl dark:hover:shadow-black/30"
      style={{ borderColor: isActive ? "rgba(70,95,255,0.3)" : "#e5e7eb" }}
    >
      {product.product_code === "monthly" && (
        <div className="absolute top-0 right-0 px-3 py-1 text-[10px] font-bold text-white rounded-bl-xl"
          style={{ background: "linear-gradient(135deg, #465FFF, #7c3aed)" }}>
          TERPOPULER
        </div>
      )}
      <div className="h-1.5 w-full" style={{
        background: product.product_code === "monthly"
          ? "linear-gradient(90deg, #465FFF, #7c3aed)"
          : product.product_code === "ramadhan"
          ? "linear-gradient(90deg, #d97706, #f59e0b)"
          : "linear-gradient(90deg, #059669, #10b981)",
      }} />
      <div className="p-5 flex flex-col gap-4 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
                style={{ color: badge.color, background: badge.bg, borderColor: badge.border }}>
                {badge.icon}{badge.label}
              </span>
            </div>
            <h3 className="text-base font-bold text-gray-800 dark:text-white leading-tight">{product.product_name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{product.duration_days} hari akses</p>
          </div>
          <div className="text-right flex-shrink-0">
            {hasDiscount && <p className="text-xs text-gray-400 line-through">{fmtRp(product.price)}</p>}
            <p className="text-xl font-black" style={{ color: badge.color }}>{fmtRp(price)}</p>
            {hasDiscount && (
              <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded-full border border-red-200 dark:border-red-500/20">
                HEMAT {Math.round(((product.price - price) / product.price) * 100)}%
              </span>
            )}
          </div>
        </div>
        {product.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{product.description}</p>
        )}
        {product.features.length > 0 && (
          <ul className="space-y-1.5">
            {product.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
                <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: badge.bg, border: `1px solid ${badge.border}` }}>
                  <Ic.Check s={9} c={badge.color} />
                </span>
                {f}
              </li>
            ))}
          </ul>
        )}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-gray-400">Stok bulan ini</span>
            <span className={`text-[10px] font-bold ${stockOut ? "text-red-500" : stockLow ? "text-amber-500" : "text-gray-500 dark:text-gray-400"}`}>
              {stockOut ? "Habis" : stockLow ? `Sisa ${product.stock_remaining}` : `${product.stock_remaining} tersisa`}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{
              width: `${100 - stockPct}%`,
              background: stockOut ? "#ef4444" : stockLow ? "#f59e0b"
                : product.product_code === "monthly" ? "linear-gradient(90deg, #465FFF, #7c3aed)"
                : product.product_code === "ramadhan" ? "linear-gradient(90deg, #d97706, #f59e0b)"
                : "linear-gradient(90deg, #059669, #10b981)",
            }} />
          </div>
        </div>
        <div className="mt-auto pt-1">
          {!isLoggedIn ? (
            <a href="/signin" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              Login untuk Berlangganan
            </a>
          ) : isActive ? (
            <div
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border dark:text-brand-400"
              style={{ background: "rgba(70,95,255,0.06)", borderColor: "rgba(70,95,255,0.2)", color: "#465FFF" }}
            >
              <Ic.Check s={14} c="#465FFF" /> Membership Aktif
            </div>
          ) : stockOut ? (
            <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border border-gray-200 dark:border-gray-700 text-gray-400">
              Stok Habis Bulan Ini
            </div>
          ) : !product.is_purchase_open ? (
            <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border border-gray-200 dark:border-gray-700 text-gray-400">
              Pembelian Ditutup
            </div>
          ) : (
            <button
              onClick={() => onBuy(product)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                background: product.product_code === "monthly"
                  ? "linear-gradient(135deg, #465FFF, #7c3aed)"
                  : product.product_code === "ramadhan"
                  ? "linear-gradient(135deg, #d97706, #f59e0b)"
                  : "linear-gradient(135deg, #059669, #10b981)",
              }}
            >
              <Ic.Crown s={14} c="white" />Berlangganan Sekarang
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Membership Banner ─────────────────────────────────────────────────────────
function MembershipBanner({ status }: { status: UserMembershipStatus }) {
  if (!status.is_active) return null;
  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-4 mb-6"
      style={{ background: "linear-gradient(135deg, rgba(70,95,255,0.08), rgba(124,58,237,0.08))", border: "1px solid rgba(70,95,255,0.2)" }}
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #465FFF, #7c3aed)" }}>
        <Ic.Crown s={22} c="white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-800 dark:text-white">
          Membership <span className="capitalize">{status.membership_type}</span> Aktif
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Aktif hingga {status.membership_expired_at ? fmtDate(status.membership_expired_at) : "—"} · {status.days_remaining} hari lagi
        </p>
      </div>
      <div className="flex-shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white"
        style={{ background: "linear-gradient(135deg, #465FFF, #7c3aed)" }}>
        AKTIF
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
const MembershipPage: React.FC = () => {
  const [products, setProducts]               = useState<MembershipProduct[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [period, setPeriod]                   = useState<{ year: number; month: number } | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<UserMembershipStatus | null>(null);
  const [buyingProduct, setBuyingProduct]     = useState<MembershipProduct | null>(null);
  const [refreshKey, setRefreshKey]           = useState(0);

  const loginData  = getLoginData();
  const isLoggedIn = !!loginData?.isLoggedIn;
  const userId     = loginData?.user?.user_id;
  const isAdmin    = userId === ADMIN_USER_ID;

useEffect(() => {
  setLoading(true);
  fetch(`${MEMBERSHIP_API}/products${q}`)
    .then((r) => r.json())
    .then((d) => {
      if (d.status) {
        // Normalisasi features — pastikan selalu array
        const normalized = (d.data || []).map((p: MembershipProduct) => ({
          ...p,
          features: Array.isArray(p.features)
            ? p.features
            : typeof p.features === "string"
            ? (() => { try { return JSON.parse(p.features); } catch { return []; } })()
            : [],
        }));
        setProducts(normalized);
        setPeriod(d.period || null);
      }
    })
    .catch(() => {})
    .finally(() => setLoading(false));
}, [refreshKey]);

  useEffect(() => {
    if (!isLoggedIn || !userId) return;
    fetch(`https://v5.jkt48connect.com/api/jkt48connect/membership/status/${userId}${q}`)
      .then((r) => r.json())
      .then((d) => { if (d.status) setMembershipStatus(d.data); })
      .catch(() => {});
  }, [isLoggedIn, userId, refreshKey]);

  const handleSuccess = useCallback(() => {
    setTimeout(() => setRefreshKey((k) => k + 1), 1500);
  }, []);

  const currentMembership = membershipStatus?.is_active ? (membershipStatus?.membership_type || "free") : "free";
  const monthNames = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"];

  return (
    <>
      <PageMeta
        title="Membership JKT48Connect | GiStream"
        description="Berlangganan membership premium untuk akses semua livestream JKT48"
      />
      <div className="space-y-6">
        {/* Page Header */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">
  <div
    className="px-6 py-8 relative overflow-hidden"
    style={{ minHeight: 140 }}
  >
    {/* PixelBlast background */}
    <div className="absolute inset-0 z-0">
      <PixelBlast
        variant="circle"
        pixelSize={5}
        color="#465FFF"
        patternScale={3}
        patternDensity={1.1}
        pixelSizeJitter={0.4}
        enableRipples
        rippleSpeed={0.35}
        rippleThickness={0.1}
        rippleIntensityScale={1.2}
        liquid
        liquidStrength={0.08}
        liquidRadius={1.1}
        liquidWobbleSpeed={4.5}
        speed={0.4}
        edgeFade={0.3}
        transparent
      />
    </div>

    {/* Overlay gelap supaya teks tetap terbaca */}
    <div
      className="absolute inset-0 z-10"
      style={{ background: "linear-gradient(135deg, rgba(70,95,255,0.12) 0%, rgba(124,58,237,0.18) 100%)" }}
    />

    <div className="relative z-20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #465FFF, #7c3aed)" }}
        >
          <Ic.Crown s={26} c="white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Membership Premium</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Akses penuh semua livestream JKT48 tanpa batas
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
        {isAdmin && (
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", color: "#d97706" }}
          >
            <Ic.Shield s={12} c="#d97706" />Admin
          </div>
        )}
        {period && (
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(70,95,255,0.3)", color: "#465FFF" }}
          >
            <Ic.Package s={13} c="#465FFF" />
            Stok {monthNames[period.month - 1]} {period.year}
          </div>
        )}
      </div>
    </div>
  </div>
</div>

        {/* Admin Panel — hanya muncul untuk admin */}
        {isAdmin && (
          <AdminPanel onRefreshProducts={() => setRefreshKey((k) => k + 1)} />
        )}

        {/* Main Content */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="p-6">
            {membershipStatus && <MembershipBanner status={membershipStatus} />}
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16">
                <div className="w-10 h-10 rounded-full animate-spin"
                  style={{ border: "3px solid rgba(70,95,255,0.15)", borderTopColor: "#465FFF" }} />
                <p className="text-sm text-gray-400">Memuat paket membership...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                  <Ic.Package s={28} c="#9ca3af" />
                </div>
                <p className="text-sm text-gray-400">Belum ada paket membership tersedia</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    isLoggedIn={isLoggedIn}
                    currentMembership={currentMembership}
                    onBuy={(prod) => setBuyingProduct(prod)}
                  />
                ))}
              </div>
            )}
            {!isLoggedIn && !loading && products.length > 0 && (
              <div className="mt-6 p-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                    <Ic.Crown s={16} c="#9ca3af" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Punya akun? Login untuk mulai berlangganan.</p>
                </div>
                <a href="/signin" className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #465FFF, #7c3aed)" }}>
                  Login Sekarang
                </a>
              </div>
            )}
            {!loading && products.length > 0 && (
              <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
                Stok membership diperbarui setiap bulan. Pembayaran diproses via yang aman &amp; terenkripsi.
              </p>
            )}
          </div>
        </div>
      </div>

      {buyingProduct && loginData && (
        <PaymentModal
          product={buyingProduct}
          onClose={() => setBuyingProduct(null)}
          onSuccess={handleSuccess}
          loginData={loginData}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
};

export default MembershipPage;
