import React, { useEffect, useState, useCallback } from "react";
import PageMeta from "../components/common/PageMeta";

// ── Constants ─────────────────────────────────────────────────────────────────
const LOYALTY_API  = "https://v5.jkt48connect.com/api/loyalty";
const API_KEY      = "JKTCONNECT";
const q            = `?apikey=${API_KEY}`;
const ADMIN_USER_ID = "USR-BCCEADBE3FE94ABD08A5691F074027D3";

// ── Types ─────────────────────────────────────────────────────────────────────
interface LoyaltyBalance {
  balance: number;
  total_earned: number;
  total_spent: number;
  credit_count: number;
  debit_count: number;
  recent_transactions: Transaction[];
}

interface Transaction {
  id?: number;
  amount: number;
  type: "credit" | "debit";
  source: string;
  description: string;
  balance_after: number;
  created_at: string;
  ref_id?: string;
}

interface LoyaltyReward {
  id: number;
  reward_code: string;
  reward_name: string;
  reward_type: "discount" | "free_ticket" | "membership" | "bonus_point" | "custom";
  point_cost: number;
  discount_percent?: number;
  discount_max_rp?: number;
  ticket_source?: string;
  membership_type?: string;
  duration_days?: number;
  bonus_point_amount?: number;
  stock: number;
  stock_used: number;
  stock_remaining: number;
  is_featured: boolean;
  is_active: boolean;
  description?: string;
  image_url?: string;
  sort_order: number;
  can_redeem: boolean | null;
}

interface Redemption {
  id: number;
  reward_code: string;
  reward_name: string;
  reward_type: string;
  point_spent: number;
  voucher_code: string | null;
  status: "active" | "used" | "expired" | "cancelled";
  expired_at: string;
  used_at: string | null;
  created_at: string;
}

interface MysteryBoxConfig {
  tier: string;
  point_cost: number;
  prob_common: number;
  prob_rare: number;
  prob_epic: number;
  prob_legendary: number;
  pity_threshold: number;
  is_active: boolean;
}

interface MysteryBoxHistory {
  id: number;
  tier: string;
  rarity: string;
  rarity_emoji: string;
  reward_type: string;
  reward_label: string;
  reward_value: any;
  point_spent: number;
  pity_count_before: number;
  pity_count_after: number;
  created_at: string;
}

interface PityData {
  tier: string;
  pity_count: number;
  pity_threshold: number;
  rolls_until_pity: number;
}

// Admin types
interface AdminUser {
  user_id: string;
  username?: string;
  email?: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  total_txns: number;
  last_activity: string;
}

interface AdminOverview {
  points: { total_users: number; total_credited: number; total_debited: number };
  redemptions: { total_redemptions: number; active_redemptions: number; used_redemptions: number; total_point_spent: number };
  mystery_box: { total_opens: number; total_point_spent: number; legendary_count: number; epic_count: number };
  top_users: { user_id: string; balance: number }[];
}

type MainTab = "dashboard" | "rewards" | "mystery" | "history" | "redemptions" | "admin";
type AdminTab = "overview" | "users" | "rewards" | "transactions" | "redemptions" | "config";

// ── Auth Helper ───────────────────────────────────────────────────────────────
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
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
  });
}
function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta",
  });
}
function numFmt(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const Ic = {
  Star:      ({ s=16,c="currentColor" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Gift:      ({ s=16,c="currentColor" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>,
  Box:       ({ s=16,c="currentColor" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  History:   ({ s=16,c="currentColor" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.15"/></svg>,
  Ticket:    ({ s=16,c="currentColor" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><line x1="9" y1="2" x2="9" y2="22"/></svg>,
  Shield:    ({ s=16,c="currentColor" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  TrendUp:   ({ s=16,c="currentColor" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  TrendDown: ({ s=16,c="currentColor" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>,
  Zap:       ({ s=16,c="currentColor" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  X:         ({ s=16,c="currentColor" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Check:     ({ s=16,c="currentColor" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Alert:     ({ s=14,c="currentColor" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Users:     ({ s=16,c="currentColor" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Settings:  ({ s=16,c="currentColor" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Copy:      ({ s=14,c="currentColor" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  Plus:      ({ s=14,c="currentColor" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Edit:      ({ s=14,c="currentColor" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Crown:     ({ s=16,c="currentColor" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h20M5 20V10l7-6 7 6v10"/><path d="M12 4l-7 6h14L12 4z"/></svg>,
  Sparkles:  ({ s=14,c="currentColor" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.88 5.47L19 10l-5.12 1.53L12 17l-1.88-5.47L5 10l5.12-1.53L12 3z"/><path d="M5 3l.88 2.47L8 6l-2.12.53L5 9l-.88-2.47L2 6l2.12-.53L5 3z"/></svg>,
  Refresh:   ({ s=14,c="currentColor" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  BarChart:  ({ s=16,c="currentColor" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  List:      ({ s=16,c="currentColor" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  Infinity:  ({ s=14,c="currentColor" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12c-2-2.5-4-4-6-4a4 4 0 0 0 0 8c2 0 4-1.5 6-4z"/><path d="M12 12c2 2.5 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.5-6 4z"/></svg>,
  Dice:      ({ s=20,c="currentColor" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="4"/><circle cx="8.5" cy="8.5" r="1.5" fill={c}/><circle cx="15.5" cy="8.5" r="1.5" fill={c}/><circle cx="12" cy="12" r="1.5" fill={c}/><circle cx="8.5" cy="15.5" r="1.5" fill={c}/><circle cx="15.5" cy="15.5" r="1.5" fill={c}/></svg>,
};

// ── Rarity Config ─────────────────────────────────────────────────────────────
const RARITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; glow: string }> = {
  common:    { label: "Common",    color: "#9ca3af", bg: "rgba(156,163,175,0.1)", border: "rgba(156,163,175,0.25)", glow: "rgba(156,163,175,0.2)" },
  rare:      { label: "Rare",      color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.3)",  glow: "rgba(59,130,246,0.25)" },
  epic:      { label: "Epic",      color: "#a855f7", bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.35)", glow: "rgba(168,85,247,0.3)" },
  legendary: { label: "Legendary", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)", glow: "rgba(245,158,11,0.3)" },
};

const TIER_CONFIG: Record<string, { label: string; color: string; gradient: string; emoji: string }> = {
  bronze:   { label: "Bronze",   color: "#cd7f32", gradient: "linear-gradient(135deg, #cd7f32, #a0522d)", emoji: "🥉" },
  silver:   { label: "Silver",   color: "#9ca3af", gradient: "linear-gradient(135deg, #9ca3af, #6b7280)", emoji: "🥈" },
  gold:     { label: "Gold",     color: "#f59e0b", gradient: "linear-gradient(135deg, #f59e0b, #d97706)", emoji: "🥇" },
  platinum: { label: "Platinum", color: "#465FFF", gradient: "linear-gradient(135deg, #465FFF, #7c3aed)", emoji: "💎" },
};

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ color = "#465FFF" }: { color?: string }) {
  return (
    <div className="w-5 h-5 rounded-full border-2 animate-spin"
      style={{ borderColor: `${color}33`, borderTopColor: color }} />
  );
}

// ── Mystery Box Opening Animation ────────────────────────────────────────────
interface BoxOpenResultProps {
  result: {
    tier: string; rarity: string; rarity_emoji: string;
    reward_type: string; reward_label: string;
    point_spent: number; new_balance: number;
    is_pity: boolean;
  };
  onClose: () => void;
}

function BoxOpenResult({ result, onClose }: BoxOpenResultProps) {
  const [phase, setPhase] = useState<"shake" | "open" | "reveal">("shake");
  const rarity = RARITY_CONFIG[result.rarity] ?? RARITY_CONFIG.common;
  const tier   = TIER_CONFIG[result.tier]     ?? TIER_CONFIG.bronze;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("open"),   800);
    const t2 = setTimeout(() => setPhase("reveal"), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}>
      <div className="relative flex flex-col items-center gap-6 max-w-sm w-full">
        <div className="absolute inset-0 rounded-3xl"
          style={{ background: `radial-gradient(ellipse at center, ${rarity.glow} 0%, transparent 70%)`, filter: "blur(20px)", transform: "scale(1.2)" }} />

        <div className="relative z-10 flex flex-col items-center gap-5 w-full">
          <div className="relative" style={{
            animation: phase === "shake"
              ? "boxShake 0.6s ease-in-out"
              : phase === "open"
              ? "boxBounce 0.4s ease-out"
              : "none",
            transform: phase === "reveal" ? "scale(0)" : "scale(1)",
            transition: phase === "reveal" ? "transform 0.3s ease-in" : "none",
          }}>
            <div className="w-28 h-28 rounded-2xl flex items-center justify-center"
              style={{ background: tier.gradient, boxShadow: `0 0 40px ${rarity.glow}` }}>
              <Ic.Box s={52} c="white" />
            </div>
            {phase === "open" && (
              <div className="absolute inset-0 rounded-2xl" style={{
                background: "radial-gradient(circle, rgba(255,255,255,0.4), transparent)",
                animation: "pulse 0.4s ease-out",
              }} />
            )}
          </div>

          {phase === "reveal" && (
            <div className="w-full rounded-3xl overflow-hidden"
              style={{
                background: "rgba(17,24,39,0.95)",
                border: `1px solid ${rarity.border}`,
                boxShadow: `0 0 30px ${rarity.glow}`,
                animation: "fadeInScale 0.4s ease-out",
              }}>
              <div className="p-6 flex flex-col items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{result.rarity_emoji}</span>
                  <span className="text-sm font-black uppercase tracking-widest"
                    style={{ color: rarity.color }}>{rarity.label}</span>
                  {result.is_pity && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: rarity.bg, color: rarity.color, border: `1px solid ${rarity.border}` }}>
                      PITY!
                    </span>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xl font-black text-white">{result.reward_label}</p>
                  <p className="text-sm text-gray-400 mt-1 capitalize">{result.reward_type.replace("_", " ")}</p>
                </div>
                <div className="w-full flex items-center justify-between text-xs text-gray-500 px-2">
                  <span>-{result.point_spent} pt digunakan</span>
                  <span>Saldo: <strong className="text-white">{numFmt(result.new_balance)} pt</strong></span>
                </div>
                <button onClick={onClose}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white"
                  style={{ background: tier.gradient }}>
                  Keren! ✨
                </button>
              </div>
            </div>
          )}

          {phase !== "reveal" && (
            <p className="text-sm text-gray-400">
              {phase === "shake" ? "Mengguncang kotak..." : "Membuka..."}
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes boxShake {
          0%,100%{transform:translateX(0) rotate(0)}
          15%{transform:translateX(-8px) rotate(-5deg)}
          30%{transform:translateX(8px) rotate(5deg)}
          45%{transform:translateX(-6px) rotate(-3deg)}
          60%{transform:translateX(6px) rotate(3deg)}
          75%{transform:translateX(-4px) rotate(-2deg)}
          90%{transform:translateX(4px) rotate(2deg)}
        }
        @keyframes boxBounce {
          0%{transform:scale(1)}50%{transform:scale(1.2)}100%{transform:scale(0.95)}
        }
        @keyframes fadeInScale {
          from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}
        }
        @keyframes pulse {
          0%{opacity:1}100%{opacity:0;transform:scale(1.5)}
        }
      `}</style>
    </div>
  );
}

// ── Redeem Confirm Modal ──────────────────────────────────────────────────────
function RedeemModal({ reward, balance, onClose, onConfirm, loading }: {
  reward: LoyaltyReward; balance: number;
  onClose: () => void; onConfirm: () => void; loading: boolean;
}) {
  const enough = balance >= reward.point_cost;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Ic.Gift s={15} c="#465FFF" />Konfirmasi Penukaran
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><Ic.X /></button>
          </div>
          <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/[0.03] space-y-2">
            <p className="text-sm font-bold text-gray-800 dark:text-white">{reward.reward_name}</p>
            {reward.description && <p className="text-xs text-gray-400">{reward.description}</p>}
          </div>
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
            {[
              { label: "Biaya Point", value: `${reward.point_cost.toLocaleString("id-ID")} pt`, highlight: true },
              { label: "Saldo Kamu", value: `${balance.toLocaleString("id-ID")} pt`, highlight: false },
              { label: "Sisa Setelah Tukar", value: `${(balance - reward.point_cost).toLocaleString("id-ID")} pt`, highlight: false },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">{row.label}</span>
                <span className={`text-xs font-bold ${row.highlight ? "text-brand-500" : "text-gray-700 dark:text-gray-300"}`}>{row.value}</span>
              </div>
            ))}
          </div>
          {!enough && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <Ic.Alert c="#ef4444" />Point tidak cukup. Butuh {(reward.point_cost - balance).toLocaleString("id-ID")} pt lagi.
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300">
              Batal
            </button>
            <button onClick={onConfirm} disabled={!enough || loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #465FFF, #7c3aed)" }}>
              {loading ? <Spinner color="white" /> : <><Ic.Check s={14} c="white" />Tukar Sekarang</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard Tab ────────────────────────────────────────────────────────────
function DashboardTab({ balance }: { userId: string; balance: LoyaltyBalance | null; onRefresh: () => void }) {
  if (!balance) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Spinner /><p className="text-sm text-gray-400">Memuat data...</p>
    </div>
  );

  const sourceEmoji: Record<string, string> = {
    membership: "👑", ticket: "🎫", admin: "⚡", bonus: "🎁",
    redeem: "🎯", mystery_box: "📦",
  };

  return (
    <div className="space-y-5">
      {/* Big balance card */}
      <div className="rounded-2xl overflow-hidden relative"
        style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)" }}>
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full opacity-10"
              style={{
                width: `${60 + i * 30}px`, height: `${60 + i * 30}px`,
                top: `${10 + i * 8}%`, right: `${-10 + i * 5}%`,
                background: "rgba(255,255,255,0.3)",
              }} />
          ))}
        </div>
        <div className="relative p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-indigo-300 uppercase tracking-widest mb-1">Saldo Point Kamu</p>
              <p className="text-4xl font-black text-white">{balance.balance.toLocaleString("id-ID")}</p>
              <p className="text-sm text-indigo-300 mt-0.5">loyalty points</p>
            </div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" }}>
              <Ic.Star s={22} c="#fbbf24" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total Diperoleh", value: balance.total_earned, icon: <Ic.TrendUp s={12} c="#86efac" />, color: "#86efac" },
              { label: "Total Dipakai",   value: balance.total_spent,  icon: <Ic.TrendDown s={12} c="#fca5a5" />, color: "#fca5a5" },
            ].map((stat, i) => (
              <div key={i} className="rounded-xl p-3"
                style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(10px)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  {stat.icon}
                  <span className="text-[10px] font-medium" style={{ color: stat.color }}>{stat.label}</span>
                </div>
                <p className="text-lg font-black text-white">{numFmt(stat.value)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Transaksi Masuk", value: balance.credit_count, icon: <Ic.TrendUp s={14} c="#10b981" />, color: "#10b981", bg: "rgba(16,185,129,0.08)" },
          { label: "Transaksi Keluar", value: balance.debit_count,  icon: <Ic.TrendDown s={14} c="#f59e0b" />, color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4"
            style={{ background: s.bg }}>
            <div className="flex items-center gap-2 mb-2">{s.icon}<span className="text-xs text-gray-500 dark:text-gray-400">{s.label}</span></div>
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Recent transactions */}
      {balance.recent_transactions.length > 0 && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.02] overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Ic.History s={13} c="#465FFF" />Transaksi Terbaru
            </p>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {balance.recent_transactions.map((tx, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
                  style={{ background: tx.type === "credit" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)" }}>
                  {sourceEmoji[tx.source] || "💫"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{tx.description}</p>
                  <p className="text-[10px] text-gray-400">{fmtDate(tx.created_at)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-black ${tx.type === "credit" ? "text-green-500" : "text-red-400"}`}>
                    {tx.type === "credit" ? "+" : ""}{tx.amount.toLocaleString("id-ID")} pt
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Rewards Tab ───────────────────────────────────────────────────────────────
function RewardsTab({ userId, balance, onRedeemSuccess }: {
  userId: string; balance: number; onRedeemSuccess: () => void;
}) {
  const [rewards, setRewards]     = useState<LoyaltyReward[]>([]);
  const [loading, setLoading]     = useState(true);
  const [redeemTarget, setRedeemTarget] = useState<LoyaltyReward | null>(null);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [toast, setToast]         = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    setLoading(true);
    // FIX: always pass user_id so API returns proper can_redeem boolean (not null)
    fetch(`${LOYALTY_API}/rewards${q}&user_id=${userId}`)
      .then(r => r.json())
      .then(d => setRewards(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const handleRedeem = async () => {
    if (!redeemTarget) return;
    setRedeemLoading(true);
    try {
      const res  = await fetch(`${LOYALTY_API}/redeem${q}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, reward_code: redeemTarget.reward_code }),
      });
      const data = await res.json();
      if (!data.status) { showToast(data.message || "Gagal menukar reward", "error"); return; }
      setRedeemTarget(null);
      showToast(`🎁 ${redeemTarget.reward_name} berhasil ditukar!`, "success");
      onRedeemSuccess();
    } catch { showToast("Koneksi gagal", "error"); }
    finally { setRedeemLoading(false); }
  };

  const rewardTypeLabel: Record<string, string> = {
    discount: "Diskon", free_ticket: "Tiket Gratis", membership: "Membership",
    bonus_point: "Bonus Point", custom: "Spesial",
  };
  const rewardTypeColor: Record<string, string> = {
    discount: "#10b981", free_ticket: "#f59e0b", membership: "#465FFF",
    bonus_point: "#a855f7", custom: "#ec4899",
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Spinner /><p className="text-sm text-gray-400">Memuat rewards...</p>
    </div>
  );

  return (
    <div className="space-y-4 relative">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl text-sm font-semibold flex items-center gap-2 shadow-lg transition-all ${
          toast.type === "success"
            ? "bg-green-500 text-white"
            : "bg-red-500 text-white"
        }`}>
          {toast.type === "success" ? <Ic.Check s={14} c="white" /> : <Ic.Alert s={14} c="white" />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Ic.Gift s={14} c="#465FFF" />Katalog Reward
        </p>
        <span className="text-xs text-gray-400">Saldo: <strong className="text-brand-500">{balance.toLocaleString("id-ID")} pt</strong></span>
      </div>

      {rewards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
            <Ic.Gift s={24} c="#9ca3af" />
          </div>
          <p className="text-sm text-gray-400">Belum ada reward tersedia</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rewards.map((rw) => {
            const color = rewardTypeColor[rw.reward_type] ?? "#465FFF";

            // FIX: properly handle stock=-1 (unlimited) vs finite stock
            const isUnlimited = rw.stock === -1 || rw.stock_remaining === -1;
            const stockRemaining = isUnlimited ? Infinity : (rw.stock_remaining ?? 0);
            const stockOut = !isUnlimited && stockRemaining <= 0;

            // FIX: can_redeem from API when user_id passed is always bool.
            // But fallback defensively: if null, compute locally from balance + stock
            const canBuy = rw.can_redeem === true ||
              (rw.can_redeem === null && balance >= rw.point_cost && !stockOut);

            // Button label logic
            const btnLabel = stockOut
              ? "Stok Habis"
              : rw.can_redeem === false && balance < rw.point_cost
              ? "Point Tidak Cukup"
              : "Tukar Sekarang";

            return (
              <div key={rw.id}
                className="rounded-2xl border bg-white dark:bg-white/[0.03] overflow-hidden transition-all hover:shadow-lg dark:hover:shadow-black/20"
                style={{ borderColor: rw.is_featured ? `${color}44` : undefined }}>
                {rw.is_featured && (
                  <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
                )}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ color, background: `${color}18`, border: `1px solid ${color}33` }}>
                          {rewardTypeLabel[rw.reward_type] ?? rw.reward_type}
                        </span>
                        {rw.is_featured && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                            ⭐ FEATURED
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-gray-800 dark:text-white">{rw.reward_name}</p>
                      {rw.description && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{rw.description}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-base font-black" style={{ color }}>
                        {rw.point_cost.toLocaleString("id-ID")}
                      </p>
                      <p className="text-[10px] text-gray-400">point</p>
                    </div>
                  </div>

                  {rw.reward_type === "discount" && rw.discount_percent && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>Diskon {rw.discount_percent}%</span>
                      {rw.discount_max_rp && <span>maks {fmtRp(rw.discount_max_rp)}</span>}
                    </div>
                  )}

                  {/* FIX: Stock display — unlimited shows ∞ badge, finite shows progress bar */}
                  {isUnlimited ? (
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                      <Ic.Infinity s={11} c="#9ca3af" />
                      <span>Stok tidak terbatas</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>Stok tersisa</span>
                        <span className={stockOut ? "text-red-500 font-bold" : ""}>
                          {rw.stock_remaining}/{rw.stock}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{
                            width: `${rw.stock > 0 ? (rw.stock_remaining / rw.stock) * 100 : 0}%`,
                            background: stockOut ? "#ef4444" : color,
                          }} />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => canBuy && !stockOut && setRedeemTarget(rw)}
                    disabled={!canBuy || stockOut}
                    className="w-full py-2.5 rounded-xl text-sm font-bold transition-all"
                    style={canBuy && !stockOut ? {
                      background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                      color: "white",
                    } : {
                      background: "rgba(107,114,128,0.1)",
                      color: "#9ca3af",
                      cursor: "not-allowed",
                    }}>
                    {btnLabel}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {redeemTarget && (
        <RedeemModal
          reward={redeemTarget}
          balance={balance}
          onClose={() => setRedeemTarget(null)}
          onConfirm={handleRedeem}
          loading={redeemLoading}
        />
      )}
    </div>
  );
}

// ── Mystery Box Tab ───────────────────────────────────────────────────────────
function MysteryBoxTab({ userId, balance, onSuccess }: {
  userId: string; balance: number; onSuccess: () => void;
}) {
  const [configs, setConfigs]   = useState<MysteryBoxConfig[]>([]);
  const [pity, setPity]         = useState<PityData[]>([]);
  const [history, setHistory]   = useState<MysteryBoxHistory[]>([]);
  const [loading, setLoading]   = useState(true);
  const [opening, setOpening]   = useState<string | null>(null);
  const [openResult, setOpenResult] = useState<any>(null);
  const [error, setError]       = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // FIX: fetch config and pity separately with individual error handling
      // so a slow mystery-box/config doesn't block pity display
      const [cfgR, pityR, histR] = await Promise.all([
        fetch(`${LOYALTY_API}/mystery-box/config${q}`)
          .then(r => r.json())
          .catch(() => ({ data: [] })),
        fetch(`${LOYALTY_API}/mystery-box/pity/${userId}${q}`)
          .then(r => r.json())
          .catch(() => ({ data: [] })),
        fetch(`${LOYALTY_API}/mystery-box/history/${userId}${q}&limit=10`)
          .then(r => r.json())
          .catch(() => ({ data: [] })),
      ]);
      setConfigs(cfgR.data || []);
      // FIX: normalize pity data — ensure pity_count is always a number (guard against BigInt/string)
      const normalizedPity: PityData[] = (pityR.data || []).map((p: any) => ({
        tier:             p.tier,
        pity_count:       Number(p.pity_count ?? 0),
        pity_threshold:   Number(p.pity_threshold ?? 0),
        rolls_until_pity: Number(p.rolls_until_pity ?? 0),
      }));
      setPity(normalizedPity);
      setHistory(histR.data || []);
    } catch {}
    setLoading(false);
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleOpen = async (tier: string, cost: number) => {
    if (balance < cost) { setError(`Saldo tidak cukup. Butuh ${cost.toLocaleString()} pt`); return; }
    setOpening(tier); setError("");
    try {
      const res  = await fetch(`${LOYALTY_API}/mystery-box/open${q}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, tier }),
      });
      const data = await res.json();
      if (!data.status) { setError(data.message || "Gagal buka box"); return; }
      setOpenResult(data.data);
      onSuccess();
    } catch { setError("Koneksi gagal"); }
    finally { setOpening(null); }
  };

  const getPityForTier = (tier: string) => pity.find(p => p.tier === tier);

  const rarityBadge = (rarity: string) => {
    const r = RARITY_CONFIG[rarity] ?? RARITY_CONFIG.common;
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
        style={{ color: r.color, background: r.bg, border: `1px solid ${r.border}` }}>
        {r.label}
      </span>
    );
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Spinner /><p className="text-sm text-gray-400">Memuat mystery box...</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
          <Ic.Alert c="#ef4444" />{error}
        </div>
      )}

      <div className="text-center space-y-1">
        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Saldo kamu: <span className="text-brand-500">{balance.toLocaleString("id-ID")} pt</span></p>
      </div>

      {/* Box cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {configs.filter(c => c.is_active).map((cfg) => {
          const tierCfg  = TIER_CONFIG[cfg.tier] ?? TIER_CONFIG.bronze;
          const pityData = getPityForTier(cfg.tier);
          const canOpen  = balance >= cfg.point_cost;

          // FIX: normalize pity values to numbers safely
          const pityCount     = Number(pityData?.pity_count     ?? 0);
          const pityThreshold = Number(pityData?.pity_threshold ?? cfg.pity_threshold ?? 0);
          const rollsUntil    = Math.max(0, pityThreshold - pityCount);
          const pityPct       = pityThreshold > 0 ? Math.min(1, pityCount / pityThreshold) * 100 : 0;

          return (
            <div key={cfg.tier} className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.02]">
              <div className="p-1" style={{ background: tierCfg.gradient }}>
                <div className="rounded-xl p-4 flex flex-col items-center gap-3"
                  style={{ background: "rgba(0,0,0,0.25)" }}>
                  <div className="text-4xl">{tierCfg.emoji}</div>
                  <div className="text-center">
                    <p className="text-base font-black text-white">{tierCfg.label} Box</p>
                    <p className="text-xs text-white/70 mt-0.5">{cfg.point_cost.toLocaleString()} pt</p>
                  </div>
                  <button
                    onClick={() => handleOpen(cfg.tier, cfg.point_cost)}
                    disabled={!canOpen || opening === cfg.tier}
                    className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                    style={{ background: "rgba(255,255,255,0.2)", color: "white", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.3)" }}>
                    {opening === cfg.tier
                      ? <><Spinner color="white" />Membuka...</>
                      : <><Ic.Dice s={16} c="white" />Buka Box</>}
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {/* Probabilities */}
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: "Common",    val: cfg.prob_common,    key: "common" },
                    { label: "Rare",      val: cfg.prob_rare,      key: "rare" },
                    { label: "Epic",      val: cfg.prob_epic,      key: "epic" },
                    { label: "Legendary", val: cfg.prob_legendary, key: "legendary" },
                  ].map((p) => {
                    const rc = RARITY_CONFIG[p.key];
                    return (
                      <div key={p.key} className="flex items-center justify-between px-2 py-1 rounded-lg"
                        style={{ background: rc.bg }}>
                        <span className="text-[10px] font-semibold" style={{ color: rc.color }}>{p.label}</span>
                        <span className="text-[10px] font-black" style={{ color: rc.color }}>{p.val}%</span>
                      </div>
                    );
                  })}
                </div>

                {/* FIX: Pity counter — always show, use normalized numbers */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Pity counter</span>
                    <span>
                      {pityCount}/{pityThreshold}
                      {rollsUntil > 0
                        ? <span className="ml-1 text-gray-300">({rollsUntil} lagi → Epic)</span>
                        : <span className="ml-1 font-bold" style={{ color: RARITY_CONFIG.epic.color }}>Epic terjamin!</span>
                      }
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pityPct}%`,
                        background: pityPct >= 80
                          ? RARITY_CONFIG.epic.color
                          : tierCfg.gradient,
                      }} />
                  </div>
                  {/* FIX: Show "no data yet" if pity row doesn't exist (user never opened this tier) */}
                  {!pityData && (
                    <p className="text-[10px] text-gray-400 italic">Belum pernah dibuka</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent history */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.02] overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Ic.History s={13} c="#465FFF" />Riwayat Box Terbaru
            </p>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {history.map((h) => {
              const t = TIER_CONFIG[h.tier] ?? TIER_CONFIG.bronze;
              return (
                <div key={h.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
                    style={{ background: t.gradient }}>
                    {t.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {rarityBadge(h.rarity)}
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{h.reward_label}</span>
                    </div>
                    {/* FIX: show pity_count_after from history so user can verify counter moved */}
                    <p className="text-[10px] text-gray-400">
                      {fmtDate(h.created_at)}
                      {h.pity_count_after !== undefined && (
                        <span className="ml-2 opacity-60">pity: {h.pity_count_before}→{h.pity_count_after}</span>
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">-{h.point_spent} pt</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {openResult && (
        <BoxOpenResult result={openResult} onClose={() => { setOpenResult(null); refresh(); }} />
      )}
    </div>
  );
}

// ── History Tab ───────────────────────────────────────────────────────────────
function HistoryTab({ userId }: { userId: string }) {
  const [txns, setTxns]         = useState<Transaction[]>([]);
  const [loading, setLoading]   = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage]         = useState(0);
  const [total, setTotal]       = useState(0);
  const limit = 20;

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const params = [
        `limit=${limit}`, `offset=${page * limit}`,
        typeFilter ? `type=${typeFilter}` : "",
      ].filter(Boolean).join("&");
      const res  = await fetch(`${LOYALTY_API}/history/${userId}${q}&${params}`);
      const data = await res.json();
      setTxns(data.data || []);
      setTotal(data.total || 0);
    } catch {}
    setLoading(false);
  }, [userId, typeFilter, page]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const sourceEmoji: Record<string, string> = {
    membership: "👑", ticket: "🎫", admin: "⚡", bonus: "🎁",
    redeem: "🎯", mystery_box: "📦",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Filter:</span>
        {["", "credit", "debit"].map((f) => (
          <button key={f} onClick={() => { setTypeFilter(f); setPage(0); }}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
              typeFilter === f ? "bg-brand-500 text-white" : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400"
            }`}>
            {f === "" ? "Semua" : f === "credit" ? "Masuk" : "Keluar"}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">{total} total</span>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.02] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-3">
            <Spinner /><p className="text-sm text-gray-400">Memuat...</p>
          </div>
        ) : txns.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">Tidak ada transaksi</div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {txns.map((tx, i) => (
              <div key={tx.id ?? i} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
                  style={{ background: tx.type === "credit" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.08)" }}>
                  {sourceEmoji[tx.source] || "💫"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{tx.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-400">{fmtDate(tx.created_at)}</span>
                    <span className="text-[10px] text-gray-300 dark:text-gray-600">·</span>
                    <span className="text-[10px] text-gray-400">Saldo: {(tx.balance_after || 0).toLocaleString()} pt</span>
                  </div>
                </div>
                <p className={`text-sm font-black flex-shrink-0 ${tx.type === "credit" ? "text-green-500" : "text-red-400"}`}>
                  {tx.type === "credit" ? "+" : ""}{tx.amount.toLocaleString()} pt
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {total > limit && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-700 disabled:opacity-40 text-gray-600 dark:text-gray-300">
            ← Sebelumnya
          </button>
          <span className="text-xs text-gray-400">Hal {page + 1} / {Math.ceil(total / limit)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * limit >= total}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-700 disabled:opacity-40 text-gray-600 dark:text-gray-300">
            Berikutnya →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Redemptions Tab ───────────────────────────────────────────────────────────
function RedemptionsTab({ userId }: { userId: string }) {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading]         = useState(true);
  const [copied, setCopied]           = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${LOYALTY_API}/redemptions/${userId}${q}&limit=50`)
      .then(r => r.json())
      .then(d => setRedemptions(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { color: string; bg: string }> = {
      active:    { color: "#10b981", bg: "rgba(16,185,129,0.1)" },
      used:      { color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
      expired:   { color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
      cancelled: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    };
    const style = map[s] ?? map.used;
    return (
      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
        style={{ color: style.color, background: style.bg }}>
        {s}
      </span>
    );
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Spinner /><p className="text-sm text-gray-400">Memuat redemptions...</p>
    </div>
  );

  if (redemptions.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
        <Ic.Ticket s={24} c="#9ca3af" />
      </div>
      <p className="text-sm text-gray-400">Belum ada penukaran reward</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {redemptions.map((r) => (
        <div key={r.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.02] p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-800 dark:text-white">{r.reward_name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{r.point_spent.toLocaleString()} pt digunakan</p>
            </div>
            {statusBadge(r.status)}
          </div>
          {r.voucher_code && r.status === "active" && (
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl"
              style={{ background: "rgba(70,95,255,0.06)", border: "1px solid rgba(70,95,255,0.2)" }}>
              <div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Kode Voucher</p>
                <p className="text-sm font-black font-mono tracking-widest text-brand-500">{r.voucher_code}</p>
              </div>
              <button onClick={() => handleCopy(r.voucher_code!)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: copied === r.voucher_code ? "rgba(16,185,129,0.1)" : "rgba(70,95,255,0.1)", color: copied === r.voucher_code ? "#10b981" : "#465FFF" }}>
                {copied === r.voucher_code ? <><Ic.Check s={11} c="#10b981" />Disalin</> : <><Ic.Copy s={11} />Salin</>}
              </button>
            </div>
          )}
          <div className="flex items-center gap-3 text-[10px] text-gray-400">
            <span>Ditukar: {fmtDateShort(r.created_at)}</span>
            {r.expired_at && <><span>·</span><span>Kadaluarsa: {fmtDateShort(r.expired_at)}</span></>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Admin Panel ───────────────────────────────────────────────────────────────
function AdminPanel() {
  const [tab, setTab]               = useState<AdminTab>("overview");
  const [loading, setLoading]       = useState(false);
  const [overview, setOverview]     = useState<AdminOverview | null>(null);
  const [users, setUsers]           = useState<AdminUser[]>([]);
  const [rewards, setRewards]       = useState<LoyaltyReward[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [redemptions, setRedemptions]   = useState<any[]>([]);
  const [config, setConfig]         = useState<any[]>([]);
  const [creditForm, setCreditForm] = useState({ user_id: "", amount: "", description: "" });
  const [creditLoading, setCreditLoading] = useState(false);
  const [creditMsg, setCreditMsg]   = useState<{ msg: string; ok: boolean } | null>(null);
  const [searchUser, setSearchUser] = useState("");

  // Admin: reward edit modal state
  const [editReward, setEditReward] = useState<LoyaltyReward | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg, setEditMsg]       = useState<{ msg: string; ok: boolean } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "overview") {
        const r = await fetch(`${LOYALTY_API}/admin/overview${q}`).then(r => r.json());
        setOverview(r.data || null);
      } else if (tab === "users") {
        const params = searchUser ? `&search=${encodeURIComponent(searchUser)}` : "";
        const r = await fetch(`${LOYALTY_API}/admin/users${q}${params}&limit=50`).then(r => r.json());
        setUsers(r.data || []);
      } else if (tab === "rewards") {
        const r = await fetch(`${LOYALTY_API}/admin/rewards${q}`).then(r => r.json());
        setRewards(r.data || []);
      } else if (tab === "transactions") {
        const r = await fetch(`${LOYALTY_API}/admin/transactions${q}&limit=50`).then(r => r.json());
        setTransactions(r.data || []);
      } else if (tab === "redemptions") {
        const r = await fetch(`${LOYALTY_API}/admin/redemptions${q}&limit=50`).then(r => r.json());
        setRedemptions(r.data || []);
      } else if (tab === "config") {
        const r = await fetch(`${LOYALTY_API}/admin/config${q}`).then(r => r.json());
        setConfig(r.data || []);
      }
    } catch {}
    setLoading(false);
  }, [tab, searchUser]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCredit = async () => {
    if (!creditForm.user_id || !creditForm.amount) return;
    setCreditLoading(true); setCreditMsg(null);
    try {
      const res  = await fetch(`${LOYALTY_API}/admin/credit${q}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: creditForm.user_id, amount: Number(creditForm.amount), description: creditForm.description }),
      });
      const data = await res.json();
      setCreditMsg({ msg: data.message || (data.status ? "Berhasil" : "Gagal"), ok: data.status });
      if (data.status) setCreditForm({ user_id: "", amount: "", description: "" });
    } catch { setCreditMsg({ msg: "Koneksi gagal", ok: false }); }
    finally { setCreditLoading(false); }
  };

  // FIX: Admin reward stock edit handler
  const handleEditRewardSave = async () => {
    if (!editReward) return;
    setEditLoading(true); setEditMsg(null);
    try {
      const res = await fetch(`${LOYALTY_API}/admin/rewards/${editReward.reward_code}${q}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reward_name:    editReward.reward_name,
          point_cost:     editReward.point_cost,
          stock:          editReward.stock,
          is_active:      editReward.is_active,
          is_featured:    editReward.is_featured,
          description:    editReward.description,
          discount_percent: editReward.discount_percent,
          discount_max_rp:  editReward.discount_max_rp,
          sort_order:     editReward.sort_order,
        }),
      });
      const data = await res.json();
      setEditMsg({ msg: data.message || (data.status ? "Berhasil disimpan" : "Gagal"), ok: !!data.status });
      if (data.status) {
        fetchData();
        setTimeout(() => setEditReward(null), 1000);
      }
    } catch { setEditMsg({ msg: "Koneksi gagal", ok: false }); }
    finally { setEditLoading(false); }
  };

  const tabs: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: "overview",     label: "Overview",     icon: <Ic.BarChart s={13} /> },
    { key: "users",        label: "Users",        icon: <Ic.Users s={13} /> },
    { key: "rewards",      label: "Rewards",      icon: <Ic.Gift s={13} /> },
    { key: "transactions", label: "Transactions", icon: <Ic.History s={13} /> },
    { key: "redemptions",  label: "Redemptions",  icon: <Ic.Ticket s={13} /> },
    { key: "config",       label: "Config",       icon: <Ic.Settings s={13} /> },
  ];

  const inputCls = "w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all";

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 overflow-hidden">
      {/* Admin Header */}
      <div className="px-6 py-4 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.05))", borderBottom: "1px solid rgba(245,158,11,0.2)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
            <Ic.Shield s={16} c="white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800 dark:text-white">Admin — Loyalty System</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Management Panel</p>
          </div>
        </div>
        <button onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/10 transition-colors">
          <Ic.Refresh s={12} />Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-amber-100 dark:border-amber-500/20 bg-white dark:bg-gray-900">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
              tab === t.key ? "border-amber-500 text-amber-600 dark:text-amber-400" : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 p-5">
        {loading ? (
          <div className="flex items-center justify-center py-10 gap-3">
            <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(245,158,11,0.2)", borderTopColor: "#f59e0b" }} />
            <span className="text-sm text-gray-400">Memuat...</span>
          </div>
        ) : (
          <>
            {/* OVERVIEW */}
            {tab === "overview" && overview && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Total Users",   value: numFmt(Number(overview.points.total_users)),   color: "#465FFF" },
                    { label: "Total Credited", value: numFmt(Number(overview.points.total_credited)), color: "#10b981" },
                    { label: "Total Debited", value: numFmt(Number(overview.points.total_debited)),  color: "#ef4444" },
                    { label: "Redemptions",   value: numFmt(Number(overview.redemptions.total_redemptions)), color: "#f59e0b" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.02] p-4">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{s.label}</p>
                      <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Box Dibuka",      value: numFmt(Number(overview.mystery_box.total_opens)),     icon: "📦", color: "#7c3aed" },
                    { label: "Legendary Drops", value: String(overview.mystery_box.legendary_count),          icon: "🌟", color: "#f59e0b" },
                    { label: "Epic Drops",      value: String(overview.mystery_box.epic_count),               icon: "✨", color: "#a855f7" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.02] p-4 flex items-center gap-3">
                      <span className="text-2xl">{s.icon}</span>
                      <div>
                        <p className="text-[10px] text-gray-400">{s.label}</p>
                        <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Top Users */}
                <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Top 10 Users by Balance</p>
                  </div>
                  <div className="divide-y divide-gray-50 dark:divide-gray-800">
                    {overview.top_users.map((u, i) => (
                      <div key={u.user_id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="text-xs font-black text-gray-400 w-5">#{i + 1}</span>
                        <p className="text-xs font-mono text-gray-600 dark:text-gray-300 flex-1 truncate">{u.user_id}</p>
                        <p className="text-xs font-black text-brand-500">{numFmt(Number(u.balance))} pt</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Admin Credit */}
                <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 p-4 space-y-3"
                  style={{ background: "rgba(245,158,11,0.04)" }}>
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <Ic.Zap s={13} c="#f59e0b" />Manual Credit Point
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input className={inputCls} placeholder="User ID" value={creditForm.user_id}
                      onChange={e => setCreditForm(f => ({ ...f, user_id: e.target.value }))} />
                    <input className={inputCls} type="number" placeholder="Amount (pt)" value={creditForm.amount}
                      onChange={e => setCreditForm(f => ({ ...f, amount: e.target.value }))} />
                    <input className={inputCls} placeholder="Deskripsi (opsional)" value={creditForm.description}
                      onChange={e => setCreditForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  {creditMsg && (
                    <div className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${creditMsg.ok ? "bg-green-50 dark:bg-green-500/10 text-green-600" : "bg-red-50 dark:bg-red-500/10 text-red-600"}`}>
                      {creditMsg.ok ? <Ic.Check s={12} /> : <Ic.Alert s={12} />}{creditMsg.msg}
                    </div>
                  )}
                  <button onClick={handleCredit} disabled={creditLoading || !creditForm.user_id || !creditForm.amount}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                    {creditLoading ? <Spinner color="white" /> : <><Ic.Plus s={12} c="white" />Credit Point</>}
                  </button>
                </div>
              </div>
            )}

            {/* USERS */}
            {tab === "users" && (
              <div className="space-y-3">
                <input className={inputCls} placeholder="Cari username, email, atau user ID..."
                  value={searchUser} onChange={e => setSearchUser(e.target.value)} />
                <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        {["User", "Balance", "Earned", "Spent", "Txns", "Last Activity"].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {users.map(u => (
                        <tr key={u.user_id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-700 dark:text-gray-300">{u.username || "—"}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{u.user_id.slice(0, 16)}…</p>
                          </td>
                          <td className="px-4 py-3 font-black text-brand-500 whitespace-nowrap">{numFmt(Number(u.balance))} pt</td>
                          <td className="px-4 py-3 text-green-500 whitespace-nowrap">{numFmt(Number(u.total_earned))}</td>
                          <td className="px-4 py-3 text-red-400 whitespace-nowrap">{numFmt(Number(u.total_spent))}</td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{u.total_txns}</td>
                          <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{u.last_activity ? fmtDateShort(u.last_activity) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {users.length === 0 && <p className="text-center py-8 text-sm text-gray-400">Tidak ada user</p>}
                </div>
              </div>
            )}

            {/* REWARDS — FIX: added Edit button per row for stock/config management */}
            {tab === "rewards" && (
              <div className="space-y-3">
                <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        {["Code", "Nama", "Tipe", "Biaya", "Stok", "Status", ""].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {rewards.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                          <td className="px-4 py-3 font-mono text-gray-500 whitespace-nowrap">{r.reward_code}</td>
                          <td className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">{r.reward_name}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400">
                              {r.reward_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">{r.point_cost.toLocaleString()} pt</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {/* FIX: show ∞ for stock=-1 */}
                            {r.stock === -1
                              ? <span className="flex items-center gap-1 text-brand-500 font-bold"><Ic.Infinity s={11} c="#465FFF" />∞</span>
                              : <span className={Number(r.stock_remaining) <= 0 ? "text-red-500 font-bold" : "text-gray-500"}>
                                  {r.stock_remaining}/{r.stock}
                                </span>
                            }
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.is_active ? "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400" : "bg-gray-100 dark:bg-white/10 text-gray-500"}`}>
                              {r.is_active ? "AKTIF" : "NON-AKTIF"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => { setEditReward({ ...r }); setEditMsg(null); }}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors">
                              <Ic.Edit s={10} c="currentColor" />Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rewards.length === 0 && <p className="text-center py-8 text-sm text-gray-400">Tidak ada reward</p>}
                </div>

                {/* FIX: Inline edit panel */}
                {editReward && (
                  <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 p-5 space-y-4"
                    style={{ background: "rgba(245,158,11,0.03)" }}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                        <Ic.Edit s={12} c="#f59e0b" />Edit Reward: <span className="font-mono">{editReward.reward_code}</span>
                      </p>
                      <button onClick={() => setEditReward(null)} className="text-gray-400 hover:text-gray-600 p-1">
                        <Ic.X s={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nama Reward</label>
                        <input className={inputCls} value={editReward.reward_name}
                          onChange={e => setEditReward(r => r ? { ...r, reward_name: e.target.value } : r)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Biaya Point</label>
                        <input className={inputCls} type="number" value={editReward.point_cost}
                          onChange={e => setEditReward(r => r ? { ...r, point_cost: Number(e.target.value) } : r)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Stok <span className="normal-case text-gray-400">(set -1 untuk unlimited)</span>
                        </label>
                        <input className={inputCls} type="number" value={editReward.stock}
                          onChange={e => setEditReward(r => r ? { ...r, stock: Number(e.target.value) } : r)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Sort Order</label>
                        <input className={inputCls} type="number" value={editReward.sort_order}
                          onChange={e => setEditReward(r => r ? { ...r, sort_order: Number(e.target.value) } : r)} />
                      </div>
                      {editReward.reward_type === "discount" && (
                        <>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Diskon %</label>
                            <input className={inputCls} type="number" value={editReward.discount_percent ?? ""}
                              onChange={e => setEditReward(r => r ? { ...r, discount_percent: Number(e.target.value) } : r)} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Maks Diskon (Rp)</label>
                            <input className={inputCls} type="number" value={editReward.discount_max_rp ?? ""}
                              onChange={e => setEditReward(r => r ? { ...r, discount_max_rp: Number(e.target.value) } : r)} />
                          </div>
                        </>
                      )}
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Deskripsi</label>
                        <input className={inputCls} value={editReward.description ?? ""}
                          onChange={e => setEditReward(r => r ? { ...r, description: e.target.value } : r)} />
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={editReward.is_active}
                            onChange={e => setEditReward(r => r ? { ...r, is_active: e.target.checked } : r)}
                            className="rounded" />
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Aktif</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={editReward.is_featured}
                            onChange={e => setEditReward(r => r ? { ...r, is_featured: e.target.checked } : r)}
                            className="rounded" />
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Featured</span>
                        </label>
                      </div>
                    </div>

                    {editMsg && (
                      <div className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${editMsg.ok ? "bg-green-50 dark:bg-green-500/10 text-green-600" : "bg-red-50 dark:bg-red-500/10 text-red-600"}`}>
                        {editMsg.ok ? <Ic.Check s={12} /> : <Ic.Alert s={12} />}{editMsg.msg}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button onClick={() => setEditReward(null)}
                        className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300">
                        Batal
                      </button>
                      <button onClick={handleEditRewardSave} disabled={editLoading}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                        {editLoading ? <Spinner color="white" /> : <><Ic.Check s={12} c="white" />Simpan Perubahan</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TRANSACTIONS */}
            {tab === "transactions" && (
              <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      {["User", "Amount", "Type", "Source", "Deskripsi", "Tanggal"].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {transactions.map((t, i) => (
                      <tr key={t.id ?? i} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="font-semibold text-gray-700 dark:text-gray-300">{t.username || "—"}</p>
                          <p className="text-[10px] font-mono text-gray-400">{(t.user_id || "").slice(0, 14)}…</p>
                        </td>
                        <td className={`px-4 py-3 font-black whitespace-nowrap ${t.type === "credit" ? "text-green-500" : "text-red-400"}`}>
                          {t.type === "credit" ? "+" : ""}{(t.amount || 0).toLocaleString()} pt
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.type === "credit" ? "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400"}`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{t.source}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap max-w-[200px] truncate">{t.description}</td>
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{t.created_at ? fmtDate(t.created_at) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {transactions.length === 0 && <p className="text-center py-8 text-sm text-gray-400">Tidak ada transaksi</p>}
              </div>
            )}

            {/* REDEMPTIONS */}
            {tab === "redemptions" && (
              <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      {["User", "Reward", "Tipe", "Point", "Voucher", "Status", "Tanggal"].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {redemptions.map((r, i) => (
                      <tr key={r.id ?? i} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="font-semibold text-gray-700 dark:text-gray-300">{r.username || "—"}</p>
                          <p className="text-[10px] font-mono text-gray-400">{(r.user_id || "").slice(0, 14)}…</p>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">{r.reward_name}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r.reward_type}</td>
                        <td className="px-4 py-3 font-bold text-brand-500 whitespace-nowrap">{(r.point_spent || 0).toLocaleString()} pt</td>
                        <td className="px-4 py-3 font-mono text-gray-500 whitespace-nowrap">{r.voucher_code || "—"}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.status === "active" ? "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400" :
                            r.status === "used"   ? "bg-gray-100 dark:bg-white/10 text-gray-500" :
                            "bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                          }`}>{r.status}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{r.created_at ? fmtDate(r.created_at) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {redemptions.length === 0 && <p className="text-center py-8 text-sm text-gray-400">Tidak ada redemptions</p>}
              </div>
            )}

            {/* CONFIG */}
            {tab === "config" && (
              <div className="space-y-3">
                {config.length === 0
                  ? <p className="text-center py-8 text-sm text-gray-400">Tidak ada config</p>
                  : config.map((cfg, i) => (
                    <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300 font-mono">{cfg.config_key}</p>
                        <span className="text-[10px] text-gray-400">{cfg.updated_at ? fmtDateShort(cfg.updated_at) : "—"}</span>
                      </div>
                      {cfg.description && <p className="text-xs text-gray-400">{cfg.description}</p>}
                      <pre className="text-[11px] bg-gray-50 dark:bg-white/[0.03] rounded-lg p-2 overflow-x-auto text-gray-600 dark:text-gray-300">
                        {typeof cfg.config_value === "object"
                          ? JSON.stringify(cfg.config_value, null, 2)
                          : String(cfg.config_value)}
                      </pre>
                    </div>
                  ))
                }
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const LoyaltyPage: React.FC = () => {
  const [activeTab, setActiveTab]         = useState<MainTab>("dashboard");
  const [balance, setBalance]             = useState<LoyaltyBalance | null>(null);
  const [refreshKey, setRefreshKey]       = useState(0);

  const loginData  = getLoginData();
  const isLoggedIn = !!loginData?.isLoggedIn;
  const userId     = loginData?.user?.user_id ?? "";
  const isAdmin    = userId === ADMIN_USER_ID;

  useEffect(() => {
    if (!isLoggedIn || !userId) return;
    fetch(`${LOYALTY_API}/balance/${userId}${q}`)
      .then(r => r.json())
      .then(d => { if (d.status) setBalance(d.data); })
      .catch(() => {});
  }, [isLoggedIn, userId, refreshKey]);

  const doRefresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const tabs: { key: MainTab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { key: "dashboard"   as MainTab, label: "Dashboard",  icon: <Ic.Star s={14} /> },
    { key: "rewards"     as MainTab, label: "Rewards",    icon: <Ic.Gift s={14} /> },
    { key: "mystery"     as MainTab, label: "Mystery Box",icon: <Ic.Box s={14} /> },
    { key: "history"     as MainTab, label: "Riwayat",    icon: <Ic.History s={14} /> },
    { key: "redemptions" as MainTab, label: "Voucherku",  icon: <Ic.Ticket s={14} /> },
    { key: "admin"       as MainTab, label: "Admin",      icon: <Ic.Shield s={14} />, adminOnly: true },
  ].filter(t => !t.adminOnly || isAdmin);

  return (
    <>
      <PageMeta
        title="Loyalty Points | JKT48Connect"
        description="Kumpulkan point, tukar reward, buka mystery box JKT48Connect"
      />
      <div className="space-y-6">
        {/* Page Header */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
          <div className="px-6 py-7 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 70%, #6d28d9 100%)" }}>
            {[...Array(12)].map((_, i) => (
              <div key={i} className="absolute rounded-full bg-white opacity-10"
                style={{
                  width: `${Math.random() * 4 + 2}px`, height: `${Math.random() * 4 + 2}px`,
                  top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
                }} />
            ))}
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.2)" }}>
                  <Ic.Star s={28} c="#fbbf24" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-white">Loyalty Points</h1>
                  <p className="text-sm text-indigo-300 mt-0.5">Kumpul point · Tukar reward · Buka mystery box</p>
                </div>
              </div>
              {isLoggedIn && balance && (
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 rounded-2xl"
                    style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.2)" }}>
                    <p className="text-[10px] text-indigo-300 font-semibold">Saldo Point</p>
                    <p className="text-xl font-black text-white">{balance.balance.toLocaleString("id-ID")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tabs nav */}
          <div className="flex overflow-x-auto border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-3.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                  activeTab === t.key
                    ? "border-brand-500 text-brand-600 dark:text-brand-400"
                    : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                }`}>
                {t.icon}{t.label}
                {t.key === "admin" && <Ic.Sparkles s={10} c="#f59e0b" />}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {!isLoggedIn ? (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-12 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center">
              <Ic.Star s={28} c="#465FFF" />
            </div>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Login untuk mengakses loyalty points</p>
            <a href="/signin" className="px-6 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, #465FFF, #7c3aed)" }}>
              Login Sekarang
            </a>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5">
            {activeTab === "dashboard"   && <DashboardTab userId={userId} balance={balance} onRefresh={doRefresh} />}
            {activeTab === "rewards"     && <RewardsTab userId={userId} balance={balance?.balance ?? 0} onRedeemSuccess={doRefresh} />}
            {activeTab === "mystery"     && <MysteryBoxTab userId={userId} balance={balance?.balance ?? 0} onSuccess={doRefresh} />}
            {activeTab === "history"     && <HistoryTab userId={userId} />}
            {activeTab === "redemptions" && <RedemptionsTab userId={userId} />}
            {activeTab === "admin" && isAdmin && <AdminPanel />}
          </div>
        )}
      </div>
    </>
  );
};

export default LoyaltyPage;
