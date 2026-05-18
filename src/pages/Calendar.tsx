import { useEffect, useState, useCallback } from "react";
import PageMeta from "../components/common/PageMeta";
import { RainbowButton } from "../components/common/rainbow-button";

// ── Constants ────────────────────────────────────────────────────────────────
const IDN_PLUS_API = "https://v2.jkt48connect.com/api/jkt48/idnplus?apikey=JKTCONNECT";
const THEATER_API = "https://v2.jkt48connect.com/api/jkt48/theater?apikey=JKTCONNECT";
const TICKETS_API = "https://v2.jkt48connect.com/api/tickets";
const DEFAULT_IMG = "https://res.cloudinary.com/haymzm4wp/image/upload/v1760105848/bi5ej2hgh0cc2uowu5xr.jpg";
const ALLOWED_THEATER_TYPES = ["SHOW", "EVENT"];

// ── Types ────────────────────────────────────────────────────────────────────
interface NormalizedShow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  scheduledAt: number | null;
  image: string;
  creator: string;
  type: string | null;
  referenceCode: string | null;
  isBirthday: boolean;
  birthdayMembers: any[];
  source: "idn" | "theater";
  price?: number;
  showId?: string;
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

interface TicketOrder {
  ticket_id: string;
  ref_id: string;
  ybp_trx_id: string;
  show_id: string;
  show_title: string;
  amount: number;
  amount_to_pay: number;
  fee: number;
  method: string;
  method_name: string;
  category: string;
  payment_url: string | null;
  checkout_url: string | null;
  nomor_va: string | null;
  qr_image: string | null;
  expired_at: string;
}

interface UserTicketStatus {
  has_ticket: boolean;
  has_pending: boolean;
  ticket: { ref_id: string; paid_at: string } | null;
  pending_ticket: { ref_id: string; expired_at: string; method?: string } | null;
}

type FilterType = "all" | "live" | "scheduled";
type ModalStep = "method" | "confirm" | "payment" | "success" | "already_paid";

// ── Auth helper ──────────────────────────────────────────────────────────────
function getLoginData() {
  try {
    const ls = localStorage.getItem("userLogin");
    if (ls) return JSON.parse(ls);
    const ss = sessionStorage.getItem("userLogin");
    if (ss) return JSON.parse(ss);
  } catch {}
  return null;
}

// ── Fee formatter ─────────────────────────────────────────────────────────────
function formatFee(m: PaymentMethod): string {
  if (m.fee_flat && m.fee_flat > 0) return `Rp ${m.fee_flat.toLocaleString("id-ID")}`;
  if (m.fee_percent && m.fee_percent > 0) return `${m.fee_percent}%`;
  if (typeof m.fee === "number" && m.fee > 0) return `Rp ${m.fee.toLocaleString("id-ID")}`;
  if (typeof m.fee === "string" && m.fee) return m.fee;
  return "Gratis";
}

// ── SVG Icons ────────────────────────────────────────────────────────────────
const IconCheck = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconClock = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconX = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconRefresh = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);
const IconTicket = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);
const IconTrash = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const IconExternalLink = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);
const IconCopy = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const IconChevronRight = ({ size = 16, color = "#9ca3af" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const IconChevronLeft = ({ size = 18, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const IconCalendar = ({ size = 13, color = "#9ca3af" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const IconAlertCircle = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// ── Normalize ────────────────────────────────────────────────────────────────
function normalizeShow(show: any, src: "idn" | "theater"): NormalizedShow {
  if (src === "idn") {
    return {
      id: show.slug || `idn-${show.id}`,
      title: show.title,
      description: show.idnliveplus?.description || null,
      status: show.status,
      scheduledAt: show.scheduled_at ? show.scheduled_at * 1000 : null,
      image: show.image_url || DEFAULT_IMG,
      creator: show.creator?.name || "JKT48",
      type: null, referenceCode: null,
      isBirthday: false, birthdayMembers: [],
      source: "idn",
      price: show.idnliveplus?.liveroom_price,
      showId: show.showId,
    };
  }
  let scheduledAt: number | null = null;
  if (show.date && show.start_time) {
    scheduledAt = new Date(`${show.date.split("T")[0]}T${show.start_time}+07:00`).getTime();
  } else if (show.date) {
    scheduledAt = new Date(show.date).getTime();
  }
  return {
    id: show.link || `theater-${show.schedule_id}`,
    title: show.title,
    description: show.short_description || null,
    status: scheduledAt && scheduledAt < Date.now() ? "past" : "scheduled",
    scheduledAt,
    image: show.poster || show.banner || DEFAULT_IMG,
    creator: "JKT48",
    type: show.type || "SHOW",
    referenceCode: show.reference_code || null,
    isBirthday: show.is_birthday_show || false,
    birthdayMembers: show.birthday_members || [],
    source: "theater",
  };
}

// ── Countdown ────────────────────────────────────────────────────────────────
function useCountdown(target: number | null, active: boolean) {
  const [cd, setCd] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  useEffect(() => {
    if (!target || !active) return;
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setCd({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff / 3600000) % 24),
        mins: Math.floor((diff / 60000) % 60),
        secs: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [target, active]);
  return cd;
}

// ── Payment Modal ─────────────────────────────────────────────────────────────
interface PaymentModalProps {
  show: NormalizedShow;
  onClose: () => void;
  onSuccess: (showId: string) => void;
  onCancelled: (showId: string) => void;
  loginData: any;
  pendingOrder?: { ref_id: string; expired_at: string } | null;
}

function PaymentModal({ show, onClose, onSuccess, onCancelled, loginData, pendingOrder }: PaymentModalProps) {
  const [step, setStep] = useState<ModalStep>(pendingOrder ? "payment" : "method");
  const [methods, setMethods] = useState<PaymentMethods>({});
  const [loadingMethods, setLoadingMethods] = useState(!pendingOrder);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [order, setOrder] = useState<TicketOrder | null>(null);
  const [creating, setCreating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [pollStatus, setPollStatus] = useState<"pending" | "paid" | "expired">("pending");
  const [paymentTimer, setPaymentTimer] = useState(0);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // If pending order: fetch its current status
  useEffect(() => {
    if (!pendingOrder) return;
    const fetchPending = async () => {
      try {
        const res = await fetch(`${TICKETS_API}/check/${pendingOrder.ref_id}?apikey=JKTCONNECT`);
        const data = await res.json();
        if (data.ticket_status === "paid") {
          setPollStatus("paid");
          setStep("success");
          onSuccess(show.id);
          return;
        }
        if (data.ticket_status === "expired") {
          setPollStatus("expired");
          setStep("method");
          return;
        }
        // Still pending — build minimal order object from check response
        setOrder({
          ticket_id: data.data?.ticket_id || "",
          ref_id: pendingOrder.ref_id,
          ybp_trx_id: "",
          show_id: show.id,
          show_title: show.title,
          amount: data.data?.amount || 7000,
          amount_to_pay: data.data?.amount_to_pay || data.data?.amount || 7000,
          fee: 0,
          method: data.data?.method || "",
          method_name: data.data?.method_name || "",
          category: "",
          payment_url: null,
          checkout_url: null,
          nomor_va: null,
          qr_image: null,
          expired_at: pendingOrder.expired_at,
        });
        setStep("payment");
      } catch {
        setStep("method");
      }
    };
    fetchPending();
  }, [pendingOrder]);

  // Load payment methods
  useEffect(() => {
    if (pendingOrder) return;
    fetch(`${TICKETS_API}/methods?apikey=JKTCONNECT`)
      .then((r) => r.json())
      .then((d) => {
        const raw = d.data?.payment_methods || {};
        const normalized: PaymentMethods = {};
        for (const [k, v] of Object.entries(raw)) {
          const key = k === "" ? "qris" : k;
          normalized[key] = v as PaymentMethod[];
        }
        setMethods(normalized);
      })
      .catch(() => setError("Gagal memuat metode pembayaran"))
      .finally(() => setLoadingMethods(false));
  }, [pendingOrder]);

  // Payment countdown timer
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
    let stopped = false;
    const poll = async () => {
      if (stopped) return;
      setChecking(true);
      try {
        const res = await fetch(`${TICKETS_API}/check/${order.ref_id}?apikey=JKTCONNECT`);
        const data = await res.json();
        if (data.ticket_status === "paid") {
          setPollStatus("paid");
          setStep("success");
          onSuccess(show.id);
          return;
        }
        if (data.ticket_status === "expired") {
          setPollStatus("expired");
          setChecking(false);
          return;
        }
      } catch {}
      setChecking(false);
      if (!stopped) setTimeout(poll, 15000);
    };
    const timer = setTimeout(poll, 5000);
    return () => { stopped = true; clearTimeout(timer); };
  }, [step, order]);

  const handleCreateOrder = async () => {
    if (!selectedMethod) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`${TICKETS_API}/buy?apikey=JKTCONNECT`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: loginData.user.user_id,
          show_id: show.id,
          show_title: show.title,
          show_source: show.source,
          show_image: show.image,
          show_date: show.scheduledAt ? new Date(show.scheduledAt).toISOString() : null,
          method: selectedMethod.channel_code,
          customer_name: loginData.user.full_name || loginData.user.username,
          customer_email: loginData.user.email,
        }),
      });
      const data = await res.json();
      if (!data.status) {
        if (res.status === 409) { setStep("already_paid"); return; }
        setError(data.message || "Gagal membuat order");
        return;
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
      const res = await fetch(`${TICKETS_API}/check/${order.ref_id}?apikey=JKTCONNECT`);
      const data = await res.json();
      if (data.ticket_status === "paid") {
        setPollStatus("paid");
        setStep("success");
        onSuccess(show.id);
      } else if (data.ticket_status === "expired") {
        setPollStatus("expired");
      }
    } catch {}
    setChecking(false);
  };

  const handleCancel = async () => {
    if (!order || cancelling) return;
    setCancelling(true);
    setError("");
    try {
      const res = await fetch(`${TICKETS_API}/cancel/${order.ref_id}?apikey=JKTCONNECT`, { method: "DELETE" });
      const data = await res.json();
      if (data.status) {
        onCancelled(show.id);
        onClose();
      } else {
        setError(data.message || "Gagal membatalkan order");
      }
    } catch {
      setError("Koneksi gagal saat membatalkan.");
    } finally {
      setCancelling(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const categoryLabel: Record<string, string> = {
    virtual_account: "Virtual Account",
    emoney: "E-Money / Dompet Digital",
    qris: "QRIS",
    retail: "Gerai Retail",
    pulsa: "Pulsa",
  };

  const orderedCats = ["virtual_account", "emoney", "qris", "retail", "pulsa"];
  const fmtTimer = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const timerDanger = paymentTimer < 300;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && step !== "payment") onClose(); }}
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ maxHeight: "92vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            {step === "confirm" && (
              <button onClick={() => setStep("method")} className="text-gray-400 hover:text-gray-600 mr-1">
                <IconChevronLeft />
              </button>
            )}
            <div>
              <h2 className="text-sm font-bold text-gray-800 dark:text-white">
                {step === "method" && "Pilih Metode Pembayaran"}
                {step === "confirm" && "Konfirmasi Pembelian"}
                {step === "payment" && "Selesaikan Pembayaran"}
                {step === "success" && "Pembelian Berhasil"}
                {step === "already_paid" && "Tiket Sudah Dimiliki"}
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{show.title}</p>
            </div>
          </div>
          {step !== "payment" && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">
              <IconX size={18} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* METHOD */}
          {step === "method" && (
            <div>
              <div className="flex gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-gray-700 mb-4">
                <img src={show.image} alt={show.title} className="w-16 h-10 object-cover rounded-lg flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 dark:text-white line-clamp-2">{show.title}</p>
                  <p className="text-xs text-brand-500 font-semibold mt-0.5">Rp 7.000</p>
                </div>
              </div>

              {error && (
                <div className="mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                  <IconAlertCircle size={14} />{error}
                </div>
              )}

              {loadingMethods ? (
                <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
                  <div className="w-5 h-5 border-2 border-gray-200 border-t-brand-500 rounded-full animate-spin" />
                  <span className="text-sm">Memuat metode...</span>
                </div>
              ) : (
                <div className="space-y-5">
                  {orderedCats.map((cat) => {
                    const items = methods[cat];
                    if (!items || items.length === 0) return null;
                    return (
                      <div key={cat}>
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
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
                                  <span className="text-xs font-black text-gray-600 dark:text-gray-300">
                                    {m.channel_code.slice(0, 2)}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-800 dark:text-white">{m.channel_name}</p>
                                  <p className="text-xs text-gray-400 dark:text-gray-500">Fee: {formatFee(m)}</p>
                                </div>
                              </div>
                              <IconChevronRight />
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
              <div className="flex gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-gray-700">
                <img src={show.image} alt={show.title} className="w-16 h-10 object-cover rounded-lg flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 dark:text-white line-clamp-2">{show.title}</p>
                  {show.scheduledAt && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {new Date(show.scheduledAt).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                {[
                  { label: "Harga Tiket", value: "Rp 7.000" },
                  { label: "Fee Pembayaran", value: formatFee(selectedMethod) },
                  { label: "Metode", value: selectedMethod.channel_name },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{row.label}</span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-white">{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-start gap-2">
                <IconAlertCircle size={13} color="#d97706" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Total yang dibayar mungkin sedikit berbeda karena fee dihitung oleh payment gateway saat transaksi dibuat.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                  <IconAlertCircle size={14} />{error}
                </div>
              )}

              <button
                onClick={handleCreateOrder}
                disabled={creating}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-bold transition-colors"
              >
                {creating
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Membuat Order...</>
                  : "Bayar Sekarang"}
              </button>
            </div>
          )}

          {/* PAYMENT */}
          {step === "payment" && order && (
            <div className="space-y-4">
              {/* Timer */}
              <div className={`flex items-center justify-between p-3 rounded-xl border ${
                timerDanger
                  ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20"
                  : "bg-brand-50 dark:bg-brand-500/10 border-brand-200 dark:border-brand-500/20"
              }`}>
                <div className="flex items-center gap-2">
                  <IconClock size={14} color={timerDanger ? "#ef4444" : "#465FFF"} />
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
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Ref ID</span>
                  <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300">{order.ref_id}</span>
                </div>
                {order.method_name && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Metode</span>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{order.method_name}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Total Bayar</span>
                  <span className="text-base font-black text-gray-800 dark:text-white">
                    Rp {order.amount_to_pay.toLocaleString("id-ID")}
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
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                        copied
                          ? "bg-green-50 dark:bg-green-500/10 text-green-600 border-green-200 dark:border-green-500/20"
                          : "bg-brand-50 dark:bg-brand-500/10 text-brand-500 border-brand-200 dark:border-brand-500/20"
                      }`}
                    >
                      {copied ? <><IconCheck size={12} />Disalin</> : <><IconCopy size={12} />Salin</>}
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

              {/* Payment URL */}
              {(order.checkout_url || order.payment_url) && !order.nomor_va && !order.qr_image && (
                <a
                  href={order.checkout_url || order.payment_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold transition-colors"
                >
                  <IconExternalLink size={14} color="white" />
                  Buka Halaman Pembayaran
                </a>
              )}

              {/* Expired */}
              {pollStatus === "expired" && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center gap-2">
                  <IconClock size={14} color="#ef4444" />
                  <span className="text-xs text-red-600 dark:text-red-400">Order sudah expired. Tutup dan buat order baru.</span>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                  <IconAlertCircle size={14} />{error}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleManualCheck}
                  disabled={checking || pollStatus === "expired"}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04] disabled:opacity-40 transition-colors"
                >
                  {checking
                    ? <><div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />Mengecek...</>
                    : <><IconRefresh size={14} />Cek Status</>}
                </button>

                {pollStatus !== "expired" && pollStatus !== "paid" && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-500/30 text-sm font-semibold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-40 transition-colors"
                  >
                    {cancelling
                      ? <div className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                      : <><IconTrash size={14} />Batalkan</>}
                  </button>
                )}
              </div>

              <button
                onClick={onClose}
                className="w-full py-2 text-xs text-gray-400 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
              >
                Tutup — pembayaran tetap berjalan
              </button>
            </div>
          )}

          {/* SUCCESS */}
          {step === "success" && (
            <div className="flex flex-col items-center text-center py-6 gap-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 flex items-center justify-center">
                <IconCheck size={32} color="#22c55e" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">Tiket Berhasil Dibeli!</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Pembayaran untuk <strong className="text-gray-700 dark:text-gray-200">{show.title}</strong> telah dikonfirmasi.
                </p>
              </div>
              <div className="w-full p-3 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 flex items-center gap-2">
                <IconCheck size={14} color="#16a34a" />
                <p className="text-xs text-green-700 dark:text-green-400 text-left">
                  Tiket tersimpan di akun kamu. Status show berubah menjadi <strong>Dibeli</strong>.
                </p>
              </div>
              <button onClick={onClose} className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold transition-colors">
                Selesai
              </button>
            </div>
          )}

          {/* ALREADY PAID */}
          {step === "already_paid" && (
            <div className="flex flex-col items-center text-center py-6 gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
                <IconTicket size={32} color="#3b82f6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">Sudah Punya Tiket!</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Kamu sudah membeli tiket untuk show ini sebelumnya.</p>
              </div>
              <button onClick={onClose} className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold transition-colors">
                Tutup
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Show Card ─────────────────────────────────────────────────────────────────
interface ShowCardProps {
  show: NormalizedShow;
  ticketStatus: UserTicketStatus | null;
  isLoggedIn: boolean;
  onBuy: (show: NormalizedShow) => void;
  onOpenPending: (show: NormalizedShow) => void;
}

function ShowCard({ show, ticketStatus, isLoggedIn, onBuy, onOpenPending }: ShowCardProps) {
  const isLive = show.status === "live";
  const showCountdown = !!show.scheduledAt && !isLive && show.scheduledAt > Date.now();
  const cd = useCountdown(show.scheduledAt, showCountdown);
  const isPaid = ticketStatus?.has_ticket;
  const isPending = ticketStatus?.has_pending && !isPaid;

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";

  return (
    <div
      className="show-schedule-card dark:bg-white/[0.03] dark:border-gray-800"
      style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", transition: "box-shadow 0.2s, transform 0.2s" }}
    >
      {/* Poster */}
      <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", overflow: "hidden", background: "#f3f4f6" }}>
        <img src={show.image} alt={show.title} style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)" }} />

        <div style={{ position: "absolute", top: 10, left: 10, display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: isLive ? "#DC1F2E" : "#465FFF", color: "#fff" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", ...(isLive ? { animation: "pulse 1.5s infinite" } : {}) }} />
          {isLive ? "LIVE" : "SCHEDULED"}
        </div>
        <div style={{ position: "absolute", top: 10, right: 10, padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", color: "rgba(255,255,255,0.9)" }}>
          {show.source === "idn" ? "IDN Live+" : "Theater"}
        </div>

        {isPaid && (
          <div style={{ position: "absolute", bottom: 8, left: 8, display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: "rgba(34,197,94,0.9)", color: "#fff" }}>
            <IconCheck size={10} color="#fff" /> Dibeli
          </div>
        )}
        {isPending && (
          <div style={{ position: "absolute", bottom: 8, left: 8, display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: "rgba(251,191,36,0.92)", color: "#000" }}>
            <IconClock size={10} color="#000" /> Menunggu Bayar
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        <h3 className="dark:text-white" style={{ margin: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "#111827", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {show.title}
        </h3>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {show.source === "theater" && show.type && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: show.type === "EVENT" ? "rgba(255,215,0,0.12)" : "rgba(220,31,46,0.12)", color: show.type === "EVENT" ? "#b45309" : "#DC1F2E", border: `1px solid ${show.type === "EVENT" ? "rgba(255,215,0,0.3)" : "rgba(220,31,46,0.25)"}` }}
              className={show.type === "EVENT" ? "dark:text-yellow-400" : "dark:text-red-400"}>
              {show.type}{show.referenceCode ? ` · ${show.referenceCode}` : ""}
            </span>
          )}
          <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "rgba(70,95,255,0.08)", color: "#465FFF", border: "1px solid rgba(70,95,255,0.2)", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <IconTicket size={10} color="#465FFF" /> Rp 7.000
          </span>
        </div>

        {showCountdown && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 10px", borderRadius: 10, background: "rgba(70,95,255,0.06)", border: "1px solid rgba(70,95,255,0.12)" }}>
            {[{ val: cd.days, label: "Hari" }, { val: cd.hours, label: "Jam" }, { val: cd.mins, label: "Mnt" }, { val: cd.secs, label: "Dtk" }].map((u, i) => (
              <div key={u.label} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                {i > 0 && <span style={{ fontSize: 16, fontWeight: 700, color: "rgba(70,95,255,0.4)", marginRight: 4 }}>:</span>}
                <div style={{ textAlign: "center", flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1, color: "#465FFF", fontVariantNumeric: "tabular-nums" }}>{String(u.val).padStart(2, "0")}</div>
                  <div style={{ fontSize: 9, fontWeight: 600, marginTop: 2, color: "rgba(70,95,255,0.6)", textTransform: "uppercase" }}>{u.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: "auto" }}>
          {show.scheduledAt && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <IconCalendar />
                <span className="dark:text-gray-400" style={{ fontSize: 12, color: "#6b7280" }}>{formatDate(show.scheduledAt)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <IconClock size={13} color="#9ca3af" />
                <span className="dark:text-gray-400" style={{ fontSize: 12, color: "#6b7280" }}>{formatTime(show.scheduledAt)}</span>
              </div>
            </>
          )}
        </div>

        {/* Action Button */}
        {isPaid ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 6, padding: "9px 16px", borderRadius: 10, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#16a34a", fontSize: 13, fontWeight: 700 }}
            className="dark:text-green-400">
            <IconCheck size={14} color="#16a34a" /> Tiket Sudah Dibeli
          </div>
        ) : isPending ? (
          <button
            onClick={() => onOpenPending(show)}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 6, padding: "9px 16px", borderRadius: 10, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", color: "#92400e", fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%", transition: "background 0.15s" }}
            className="dark:text-yellow-400 hover:bg-amber-100 dark:hover:bg-amber-500/15"
          >
            <IconClock size={14} color="#92400e" /> Lanjutkan Pembayaran
          </button>
        ) : !isLoggedIn ? (
          <a href="/signin" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 6, padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none", background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" }}
            className="dark:bg-white/10 dark:text-gray-300 dark:border-gray-700">
            Login untuk Beli Tiket
          </a>
        ) : (
          <RainbowButton
            onClick={() => onBuy(show)}
            className="w-full mt-1.5 flex items-center justify-center gap-1.5 text-[13px] font-bold py-[9px]"
          >
            <IconTicket size={14} color="white" />
            Beli Tiket — Rp 7.000
          </RainbowButton>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const ShowSchedulePage: React.FC = () => {
  const [shows, setShows] = useState<NormalizedShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [dataSource, setDataSource] = useState<"idn" | "theater" | null>(null);
  const [ticketStatuses, setTicketStatuses] = useState<Record<string, UserTicketStatus>>({});
  const [buyingShow, setBuyingShow] = useState<NormalizedShow | null>(null);
  const [pendingShow, setPendingShow] = useState<NormalizedShow | null>(null);
  const loginData = getLoginData();
  const isLoggedIn = !!loginData?.isLoggedIn;

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const res = await fetch(IDN_PLUS_API);
        const json = await res.json();
        if (json.status === 200 && Array.isArray(json.data) && json.data.length > 0) {
          const idnShows = json.data
            .filter((s: any) => (s.creator?.name || "").toLowerCase().includes("jkt48"))
            .map((s: any) => normalizeShow(s, "idn"))
            .sort((a: NormalizedShow, b: NormalizedShow) => (a.scheduledAt || 0) - (b.scheduledAt || 0));
          if (idnShows.length > 0) {
            setShows(idnShows); setDataSource("idn"); setLoading(false); return;
          }
        }
      } catch {}
      try {
        const res = await fetch(THEATER_API);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const theaterShows = json.data
            .filter((s: any) => ALLOWED_THEATER_TYPES.includes((s.type || "").toUpperCase()))
            .map((s: any) => normalizeShow(s, "theater"))
            .filter((s: NormalizedShow) => s.status !== "past")
            .sort((a: NormalizedShow, b: NormalizedShow) => (a.scheduledAt || 0) - (b.scheduledAt || 0));
          setShows(theaterShows); setDataSource("theater");
        }
      } catch {}
      setLoading(false);
    };
    fetchAll();
  }, []);

  useEffect(() => {
    if (!isLoggedIn || shows.length === 0) return;
    const userId = loginData.user.user_id;
    const fetchStatuses = async () => {
      const entries = await Promise.all(
        shows.map(async (show) => {
          try {
            const res = await fetch(`${TICKETS_API}/user/${userId}/show/${encodeURIComponent(show.id)}?apikey=JKTCONNECT`);
            const data = await res.json();
            return [show.id, data] as [string, UserTicketStatus];
          } catch {
            return [show.id, { has_ticket: false, has_pending: false, ticket: null, pending_ticket: null }] as [string, UserTicketStatus];
          }
        })
      );
      setTicketStatuses(Object.fromEntries(entries));
    };
    fetchStatuses();
  }, [shows, isLoggedIn]);

  const handleBuySuccess = useCallback((showId: string) => {
    setTicketStatuses((prev) => ({
      ...prev,
      [showId]: { has_ticket: true, has_pending: false, ticket: { ref_id: "", paid_at: new Date().toISOString() }, pending_ticket: null },
    }));
  }, []);

  const handleCancelled = useCallback((showId: string) => {
    setTicketStatuses((prev) => ({
      ...prev,
      [showId]: { has_ticket: false, has_pending: false, ticket: null, pending_ticket: null },
    }));
  }, []);

  const filtered = filter === "all" ? shows : shows.filter((s) => s.status === filter);
  const liveCount = shows.filter((s) => s.status === "live").length;
  const scheduledCount = shows.filter((s) => s.status === "scheduled").length;

  const filterTabs: { key: FilterType; label: string }[] = [
    { key: "all", label: "Semua" },
    { key: "live", label: "Live" },
    { key: "scheduled", label: "Scheduled" },
  ];

  return (
    <>
      <PageMeta title="Jadwal Show JKT48 | GiStream" description="Jadwal show JKT48 dari IDN Live Plus dan Theater" />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">

        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(70,95,255,0.08)", border: "1px solid rgba(70,95,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <IconCalendar size={22} color="#465FFF" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800 dark:text-white" style={{ margin: 0 }}>Jadwal Show JKT48</h1>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, marginTop: 3, display: "inline-block", background: dataSource === "idn" ? "rgba(70,95,255,0.08)" : "rgba(220,31,46,0.08)", color: dataSource === "idn" ? "#465FFF" : "#DC1F2E", border: `1px solid ${dataSource === "idn" ? "rgba(70,95,255,0.2)" : "rgba(220,31,46,0.2)"}` }}>
                  {dataSource === "idn" ? "IDN Live Plus" : dataSource === "theater" ? "Theater (Fallback)" : "Memuat..."}
                </span>
              </div>
            </div>
            {!loading && shows.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {liveCount > 0 && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 999, background: "rgba(220,31,46,0.08)", border: "1px solid rgba(220,31,46,0.2)" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#DC1F2E", animation: "pulse 1.5s infinite" }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#DC1F2E" }}>{liveCount} LIVE</span>
                  </div>
                )}
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 999, background: "rgba(70,95,255,0.08)", border: "1px solid rgba(70,95,255,0.2)" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#465FFF" }}>{scheduledCount} Scheduled</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 4, marginTop: 16, padding: 4, borderRadius: 12, background: "rgba(0,0,0,0.04)", width: "fit-content" }} className="dark:bg-white/[0.04]">
            {filterTabs.map((tab) => {
              const count = tab.key === "all" ? shows.length : shows.filter((s) => s.status === tab.key).length;
              const isActive = filter === tab.key;
              return (
                <button key={tab.key} onClick={() => setFilter(tab.key)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", transition: "all 0.15s", background: isActive ? "#fff" : "transparent", color: isActive ? "#111827" : "#6b7280", boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.10)" : "none" }}
                  className={isActive ? "dark:bg-white/10 dark:text-white" : "dark:text-gray-400"}
                >
                  {tab.label}
                  {!loading && count > 0 && (
                    <span style={{ padding: "1px 7px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: isActive ? "#465FFF" : "rgba(0,0,0,0.08)", color: isActive ? "#fff" : "#6b7280" }}
                      className={!isActive ? "dark:bg-white/10 dark:text-gray-400" : ""}
                    >{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "64px 0" }}>
              <div style={{ width: 36, height: 36, border: "3px solid rgba(70,95,255,0.15)", borderTop: "3px solid #465FFF", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <p style={{ margin: 0, fontSize: 14, color: "#9ca3af" }}>Memuat jadwal show...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "64px 0", textAlign: "center", gap: 12 }}>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Tidak ada show yang ditampilkan.</p>
              {filter !== "all" && (
                <button onClick={() => setFilter("all")} style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: "#465FFF", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Lihat Semua
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {filtered.map((show) => (
                <ShowCard
                  key={show.id}
                  show={show}
                  ticketStatus={ticketStatuses[show.id] || null}
                  isLoggedIn={isLoggedIn}
                  onBuy={(s) => setBuyingShow(s)}
                  onOpenPending={(s) => setPendingShow(s)}
                />
              ))}
            </div>
          )}
        </div>

        {!loading && filtered.length > 0 && (
          <div style={{ padding: "12px 24px", borderTop: "1px solid", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }} className="border-gray-100 dark:border-gray-800">
            <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
              Menampilkan <strong style={{ color: "#6b7280" }} className="dark:text-gray-300">{filtered.length}</strong> show
            </p>
            {!isLoggedIn && (
              <a href="/signin" style={{ fontSize: 11, fontWeight: 600, color: "#465FFF", textDecoration: "none" }}>
                Login untuk beli tiket
              </a>
            )}
          </div>
        )}

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
          .show-schedule-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.10); }
        `}</style>
      </div>

      {/* Modal beli baru */}
      {buyingShow && loginData && (
        <PaymentModal
          show={buyingShow}
          onClose={() => setBuyingShow(null)}
          onSuccess={handleBuySuccess}
          onCancelled={handleCancelled}
          loginData={loginData}
        />
      )}

      {/* Modal lanjutkan pending */}
      {pendingShow && loginData && ticketStatuses[pendingShow.id]?.pending_ticket && (
        <PaymentModal
          show={pendingShow}
          onClose={() => setPendingShow(null)}
          onSuccess={handleBuySuccess}
          onCancelled={handleCancelled}
          loginData={loginData}
          pendingOrder={ticketStatuses[pendingShow.id].pending_ticket}
        />
      )}
    </>
  );
};

export default ShowSchedulePage;
