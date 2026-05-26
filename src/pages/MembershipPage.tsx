import { useEffect, useState, useCallback, useRef } from "react";
import PageMeta from "../components/common/PageMeta";

// ── Constants ────────────────────────────────────────────────────────────────
const MEMBERSHIP_API = "https://v5.jkt48connect.com/api/membership";
const API_KEY        = "JKTCONNECT";
const q              = `?apikey=${API_KEY}`;

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
  return `Rp ${n.toLocaleString("id-ID")}`;
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
    day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta"
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
};

// ── Payment Modal ─────────────────────────────────────────────────────────────
interface PaymentModalProps {
  product: MembershipProduct;
  onClose: () => void;
  onSuccess: () => void;
  loginData: any;
}

function PaymentModal({ product, onClose, onSuccess, loginData }: PaymentModalProps) {
  const [step, setStep]                   = useState<ModalStep>("method");
  const [methods, setMethods]             = useState<PaymentMethods>({});
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [order, setOrder]                 = useState<MembershipOrder | null>(null);
  const [creating, setCreating]           = useState(false);
  const [checking, setChecking]           = useState(false);
  const [cancelling, setCancelling]       = useState(false);
  const [pollStatus, setPollStatus]       = useState<"pending" | "paid" | "expired">("pending");
  const [paymentTimer, setPaymentTimer]   = useState(0);
  const [error, setError]                 = useState("");
  const [copied, setCopied]               = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);

  const price = product.price_sale ?? product.price;

  // Load payment methods
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

  // Payment timer countdown
  useEffect(() => {
    if (step !== "payment" || !order) return;
    const expiry = new Date(order.expired_at).getTime();
    const tick = () => setPaymentTimer(Math.max(0, Math.floor((expiry - Date.now()) / 1000)));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [step, order]);

  // Auto-poll payment status
  useEffect(() => {
    if (step !== "payment" || !order) return;
    stoppedRef.current = false;
    const poll = async () => {
      if (stoppedRef.current) return;
      setChecking(true);
      try {
        const res = await fetch(`${MEMBERSHIP_API}/check/${order.ref_id}${q}`);
        const data = await res.json();
        if (data.order_status === "paid") {
          setPollStatus("paid"); setStep("success"); onSuccess(); return;
        }
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
      const res = await fetch(`${MEMBERSHIP_API}/buy${q}`, {
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
      const res = await fetch(`${MEMBERSHIP_API}/check/${order.ref_id}${q}`);
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
      const res = await fetch(`${MEMBERSHIP_API}/cancel/${order.ref_id}${q}`, { method: "DELETE" });
      const data = await res.json();
      if (data.status) { onClose(); }
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
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            {step === "confirm" && (
              <button onClick={() => setStep("method")} className="text-gray-400 hover:text-gray-600 mr-1 p-1">
                <Ic.ChevronLeft />
              </button>
            )}
            <div>
              <h2 className="text-sm font-bold text-gray-800 dark:text-white">
                {step === "method"       && "Pilih Metode Pembayaran"}
                {step === "confirm"      && "Konfirmasi Pembelian"}
                {step === "payment"      && "Selesaikan Pembayaran"}
                {step === "success"      && "Membership Aktif!"}
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

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* ── METHOD ── */}
          {step === "method" && (
            <div>
              {/* Product summary */}
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
                              className="w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left
                                border-gray-200 dark:border-gray-700
                                hover:border-brand-400 dark:hover:border-brand-500/50
                                bg-white dark:bg-white/[0.02]
                                hover:bg-brand-50/50 dark:hover:bg-brand-500/5"
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

          {/* ── CONFIRM ── */}
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

          {/* ── PAYMENT ── */}
          {step === "payment" && order && (
            <div className="space-y-4">
              {/* Timer */}
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

              {/* Order info */}
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-gray-700 space-y-2">
                {[
                  { label: "Ref ID",    value: order.ref_id,          mono: true },
                  { label: "Produk",    value: order.product_name,    mono: false },
                  { label: "Metode",    value: order.method_name,     mono: false },
                ].map(({ label, value, mono }) => value ? (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                    <span className={`text-xs font-semibold text-gray-700 dark:text-gray-300 ${mono ? "font-mono" : ""}`}>{value}</span>
                  </div>
                ) : null)}
                <div className="flex justify-between items-center pt-1 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Total Bayar</span>
                  <span className="text-base font-black text-gray-800 dark:text-white">
                    {fmtRp(order.amount_to_pay)}
                  </span>
                </div>
              </div>

              {/* Virtual Account */}
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

              {/* QR Code */}
              {order.qr_image && (
                <div className="flex flex-col items-center p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03]">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">Scan QR Code</p>
                  <img src={order.qr_image} alt="QR Code" className="w-48 h-48 rounded-xl" />
                </div>
              )}

              {/* Checkout URL */}
              {(order.checkout_url || order.payment_url) && !order.nomor_va && !order.qr_image && (
                <a
                  href={order.checkout_url || order.payment_url!}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white text-sm font-bold transition-colors"
                  style={{ background: "linear-gradient(135deg, #465FFF, #7c3aed)" }}
                >
                  <Ic.Link s={14} c="white" />
                  Buka Halaman Pembayaran
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

          {/* ── SUCCESS ── */}
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
                  Membership aktif selama <strong>{product.duration_days} hari</strong> mulai sekarang. Cek status di halaman profil.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl text-white text-sm font-bold transition-colors"
                style={{ background: "linear-gradient(135deg, #465FFF, #7c3aed)" }}
              >
                Selesai
              </button>
            </div>
          )}

          {/* ── ALREADY ACTIVE ── */}
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
  const badge      = BADGE_CONFIG[product.product_code] ?? BADGE_CONFIG.monthly;
  const price      = product.price_sale ?? product.price;
  const hasDiscount = product.price_sale !== null && product.price_sale < product.price;
  const stockPct   = product.current_stock > 0 ? (product.stock_remaining / product.current_stock) * 100 : 0;
  const stockLow   = product.stock_remaining <= 10 && product.stock_remaining > 0;
  const stockOut   = product.stock_remaining === 0;
  const isActive   = currentMembership !== "free";

  return (
    <div
      className="relative flex flex-col rounded-2xl border bg-white dark:bg-white/[0.03] overflow-hidden transition-all duration-200 hover:shadow-xl dark:hover:shadow-black/30"
      style={{
        borderColor: isActive ? "rgba(70,95,255,0.3)" : "#e5e7eb",
        transform: "translateY(0)",
      }}
    >
      {/* Popular badge for monthly */}
      {product.product_code === "monthly" && (
        <div
          className="absolute top-0 right-0 px-3 py-1 text-[10px] font-bold text-white rounded-bl-xl"
          style={{ background: "linear-gradient(135deg, #465FFF, #7c3aed)" }}
        >
          TERPOPULER
        </div>
      )}

      {/* Header gradient strip */}
      <div className="h-1.5 w-full" style={{
        background: product.product_code === "monthly"
          ? "linear-gradient(90deg, #465FFF, #7c3aed)"
          : product.product_code === "ramadhan"
          ? "linear-gradient(90deg, #d97706, #f59e0b)"
          : "linear-gradient(90deg, #059669, #10b981)",
      }} />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
                style={{ color: badge.color, background: badge.bg, borderColor: badge.border }}
              >
                {badge.icon}{badge.label}
              </span>
            </div>
            <h3 className="text-base font-bold text-gray-800 dark:text-white leading-tight">{product.product_name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{product.duration_days} hari akses</p>
          </div>
          <div className="text-right flex-shrink-0">
            {hasDiscount && (
              <p className="text-xs text-gray-400 line-through">{fmtRp(product.price)}</p>
            )}
            <p className="text-xl font-black" style={{ color: badge.color }}>{fmtRp(price)}</p>
            {hasDiscount && (
              <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded-full border border-red-200 dark:border-red-500/20">
                HEMAT {Math.round(((product.price - price) / product.price) * 100)}%
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{product.description}</p>
        )}

        {/* Features */}
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

        {/* Stock bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-gray-400">Stok bulan ini</span>
            <span className={`text-[10px] font-bold ${stockOut ? "text-red-500" : stockLow ? "text-amber-500" : "text-gray-500 dark:text-gray-400"}`}>
              {stockOut ? "Habis" : stockLow ? `Sisa ${product.stock_remaining}` : `${product.stock_remaining} tersisa`}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${100 - stockPct}%`,
                background: stockOut ? "#ef4444" : stockLow ? "#f59e0b"
                  : product.product_code === "monthly"
                  ? "linear-gradient(90deg, #465FFF, #7c3aed)"
                  : product.product_code === "ramadhan"
                  ? "linear-gradient(90deg, #d97706, #f59e0b)"
                  : "linear-gradient(90deg, #059669, #10b981)",
              }}
            />
          </div>
        </div>

        {/* CTA */}
        <div className="mt-auto pt-1">
          {!isLoggedIn ? (
            <a
              href="/signin"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
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
              <Ic.Crown s={14} c="white" />
              Berlangganan Sekarang
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Current Membership Banner ─────────────────────────────────────────────────
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
  const [products, setProducts]             = useState<MembershipProduct[]>([]);
  const [loading, setLoading]               = useState(true);
  const [period, setPeriod]                 = useState<{ year: number; month: number } | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<UserMembershipStatus | null>(null);
  const [buyingProduct, setBuyingProduct]   = useState<MembershipProduct | null>(null);
  const [refreshKey, setRefreshKey]         = useState(0);

  const loginData  = getLoginData();
  const isLoggedIn = !!loginData?.isLoggedIn;
  const userId     = loginData?.user?.user_id;

  // Load products
  useEffect(() => {
    setLoading(true);
    fetch(`${MEMBERSHIP_API}/products${q}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.status) {
          setProducts(d.data || []);
          setPeriod(d.period || null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshKey]);

  // Load user membership status from jkt48connect
  useEffect(() => {
    if (!isLoggedIn || !userId) return;
    fetch(`https://v5.jkt48connect.com/api/jkt48connect/membership/status/${userId}${q}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.status) setMembershipStatus(d.data);
      })
      .catch(() => {});
  }, [isLoggedIn, userId, refreshKey]);

  const handleSuccess = useCallback(() => {
    // Refresh products (stock updated) and membership status
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
            style={{ background: "linear-gradient(135deg, rgba(70,95,255,0.06) 0%, rgba(124,58,237,0.06) 100%)" }}
          >
            {/* Decorative circles */}
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-5"
              style={{ background: "linear-gradient(135deg, #465FFF, #7c3aed)" }} />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full opacity-5"
              style={{ background: "linear-gradient(135deg, #7c3aed, #465FFF)" }} />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #465FFF, #7c3aed)" }}>
                  <Ic.Crown s={26} c="white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800 dark:text-white">Membership Premium</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Akses penuh semua livestream JKT48 tanpa batas
                  </p>
                </div>
              </div>
              {period && (
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold self-start sm:self-auto"
                  style={{ background: "rgba(70,95,255,0.08)", border: "1px solid rgba(70,95,255,0.2)", color: "#465FFF" }}
                >
                  <Ic.Package s={13} c="#465FFF" />
                  Stok {monthNames[period.month - 1]} {period.year}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="p-6">

            {/* Active membership banner */}
            {membershipStatus && <MembershipBanner status={membershipStatus} />}

            {/* Products grid */}
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16">
                <div className="w-10 h-10 border-3 border-brand-100 border-t-brand-500 rounded-full animate-spin"
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

            {/* Login nudge */}
            {!isLoggedIn && !loading && products.length > 0 && (
              <div className="mt-6 p-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                    <Ic.Crown s={16} c="#9ca3af" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Punya akun? Login untuk mulai berlangganan.
                  </p>
                </div>
                <a
                  href="/signin"
                  className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #465FFF, #7c3aed)" }}
                >
                  Login Sekarang
                </a>
              </div>
            )}

            {/* Footer note */}
            {!loading && products.length > 0 && (
              <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
                Stok membership diperbarui setiap bulan. Pembayaran diproses via YoBasePay yang aman &amp; terenkripsi.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {buyingProduct && loginData && (
        <PaymentModal
          product={buyingProduct}
          onClose={() => setBuyingProduct(null)}
          onSuccess={handleSuccess}
          loginData={loginData}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
};

export default MembershipPage;
